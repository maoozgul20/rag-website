"""Tests that run without downloading any model.

    pip install -r requirements-dev.txt
    pytest -q
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.chunker import recursive_chunk
from backend.flatindex import FlatIPIndex, normalize_l2
from backend.llm import ApiLLM, LLMError
from backend.rag import RAGPipeline, fake_embedder
from backend.tfidf import TfidfIndex

DOCS = {
    "12_evaluation_metrics.txt":
        "Precision is TP divided by TP plus FP. Low precision means lots of false alarms.\n\n"
        "Precision looks at the model's alerts, recall looks at reality.\n\n"
        "Recall is TP divided by TP plus FN.",
    "13_sms_spam_finetuning.txt":
        "We fine-tuned DistilBERT on SMS spam.\n\n"
        "The fine-tuned model reached accuracy 0.991 on the test set.",
    "06_rag_concepts.txt":
        "Retrieval-Augmented Generation (RAG) gives retrieved chunks to a language model.\n\n"
        "Top-k retrieval returns the k most similar chunks.",
}


def make_pipeline(tmp_path):
    data = tmp_path / "data"
    data.mkdir(exist_ok=True)
    for name, text in DOCS.items():
        (data / name).write_text(text)
    p = RAGPipeline(fake_embedder(), data, tmp_path / "index")
    p.build()
    return p


# ---------- Step 1a ----------
def test_chunker_matches_notebook():
    test = ("First sentence here. Second sentence here.\n\nNew paragraph "
            "starts here. It keeps going for a while.")
    assert recursive_chunk(test, 60, 10) == [
        "First sentence here. Second sentence here.\n\nNew paragr",
        "New paragraph starts here. It keeps going for a while.",
    ]


# ---------- Step 8: our TF-IDF must equal scikit-learn's ----------
def test_tfidf_matches_sklearn(tmp_path):
    sk = pytest.importorskip("sklearn.feature_extraction.text")
    docs = [c for t in DOCS.values() for c in recursive_chunk(t)] + [
        "Pandas silently skipped the missing values; check isnull().sum() first!",
        "Classification predicts categories, regression predicts numbers.",
    ]
    mine = TfidfIndex.fit(docs)
    vec = sk.TfidfVectorizer().fit(docs)
    matrix = vec.transform(docs)
    for q in ["What is precision?", "SMS spam accuracy 0.991", "missing values pandas", "zzz"]:
        expected = (vec.transform([q]) @ matrix.T).toarray()[0]
        assert np.allclose(mine.scores(q), expected, atol=1e-9), q
    # save/load keeps the same numbers
    mine.save(tmp_path / "t.npz")
    again = TfidfIndex.load(tmp_path / "t.npz")
    assert np.allclose(again.scores("precision recall"), mine.scores("precision recall"))


# ---------- Step 3: NumPy flat index == FAISS IndexFlatIP ----------
def test_flat_index_matches_faiss(tmp_path):
    faiss = pytest.importorskip("faiss")
    rng = np.random.RandomState(42)
    x = normalize_l2(rng.randn(1342, 384).astype("float32"))
    q = normalize_l2(rng.randn(4, 384).astype("float32"))

    # FAISS writes the file, our class reads it (what happens on Vercel)
    real = faiss.IndexFlatIP(384)
    real.add(x)
    faiss.write_index(real, str(tmp_path / "f.index"))
    mine = FlatIPIndex.read(tmp_path / "f.index")
    fs, fi = real.search(q, 10)
    ms, mi = mine.search(q, 10)
    assert (fi == mi).all() and np.allclose(fs, ms, atol=1e-5)

    # Our class writes the file, FAISS reads it
    mine.write(tmp_path / "m.index")
    back = faiss.read_index(str(tmp_path / "m.index"))
    assert back.ntotal == 1342 and (back.search(q, 10)[1] == fi).all()

    # normalize_l2 behaves like faiss.normalize_L2
    a = rng.randn(3, 384).astype("float32")
    b = a.copy()
    faiss.normalize_L2(a)
    assert np.allclose(a, normalize_l2(b), atol=1e-6)


# ---------- Steps 2-3: build, save, reload ----------
def test_index_saved_and_reused(tmp_path):
    p = make_pipeline(tmp_path)
    assert (tmp_path / "index" / "rag.index").exists()
    info = p.build()
    assert info["reused_saved_index"] is True
    assert p.index.ntotal == len(p.chunks)


def test_index_rebuilt_when_files_change(tmp_path):
    p = make_pipeline(tmp_path)
    (tmp_path / "data" / "new.txt").write_text("A brand new document about LangChain.")
    assert p.build()["reused_saved_index"] is False


# ---------- API ----------
class FakeLLM:
    def ask(self, prompt):
        return f"echo: {prompt[:25]}"


class BrokenLLM:
    def ask(self, prompt):
        raise LLMError("LLM API error 429 (rate limit)")


def client(tmp_path, llm=FakeLLM()):
    return TestClient(create_app(pipeline_factory=lambda: make_pipeline(tmp_path), llm=llm))


def test_health_and_pipeline(tmp_path):
    c = client(tmp_path)
    h = c.get("/api/health").json()
    assert h["index_ready"] and h["llm_configured"]
    r = c.get("/api/pipeline").json()
    assert r["corpus"]["total_files"] == 3
    assert r["index"]["vectors"] == r["chunking"]["chunks"]


def test_retrieve_both_modes(tmp_path):
    c = client(tmp_path)
    for mode in ("semantic", "hybrid"):
        r = c.post("/api/retrieve", json={"question": "What is precision?", "k": 2, "mode": mode}).json()
        assert r["hits"][0]["source"] == "12_evaluation_metrics.txt"
        assert len(r["hits"]) == 2


def test_check_facts(tmp_path):
    r = client(tmp_path).post("/api/check-facts", json={
        "question": "accuracy 0.991 SMS spam", "k": 3, "mode": "hybrid", "facts": ["0.991"]}).json()
    assert r["found"]["0.991"] is True


def test_ask(tmp_path):
    r = client(tmp_path).post("/api/ask", json={"question": "What is precision?", "k": 2}).json()
    assert r["answer_with_rag"].startswith("echo: Answer the question")
    assert r["answer_without_rag"] == "echo: What is precision?"
    assert "[Source 1:" in r["prompt"]


def test_ask_errors(tmp_path):
    assert client(tmp_path, BrokenLLM()).post("/api/ask", json={"question": "x"}).status_code == 502
    no_key = TestClient(create_app(pipeline_factory=lambda: make_pipeline(tmp_path), llm=None))
    assert no_key.post("/api/ask", json={"question": "x"}).status_code == 503


def test_validation(tmp_path):
    c = client(tmp_path)
    assert c.post("/api/retrieve", json={"question": "", "k": 3}).status_code == 422
    assert c.post("/api/retrieve", json={"question": "x", "k": 99}).status_code == 422
    assert c.post("/api/chunk-test", json={"text": "a", "chunk_size": 20, "chunk_overlap": 20}).status_code == 422


# ---------- Step 6: the API client talks OpenAI format ----------
def test_api_llm_against_fake_openai_server():
    seen = {}

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            seen["path"] = self.path
            seen["auth"] = self.headers["Authorization"]
            seen["body"] = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            code = 401 if seen["auth"] == "Bearer bad" else 200
            payload = {"error": "bad key"} if code == 401 else \
                {"choices": [{"message": {"content": "  Precision = TP/(TP+FP)  "}}]}
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

        def log_message(self, *a):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/v1"
    try:
        llm = ApiLLM("key123", base, "test-model", 300, 0.2)
        assert llm.ask("hi") == "Precision = TP/(TP+FP)"
        assert seen["path"] == "/v1/chat/completions"
        assert seen["auth"] == "Bearer key123"
        assert seen["body"]["model"] == "test-model"
        assert seen["body"]["max_tokens"] == 300 and seen["body"]["temperature"] == 0.2
        with pytest.raises(LLMError, match="401"):
            ApiLLM("bad", base, "m").ask("hi")
    finally:
        server.shutdown()
