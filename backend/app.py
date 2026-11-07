"""FastAPI app: every notebook step as an HTTP endpoint.

On Vercel this runs as a serverless function (see api/index.py). Locally:
    uvicorn api.index:app --reload --port 8000
API docs at http://localhost:8000/docs
"""
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import config
from .chunker import recursive_chunk
from .llm import ApiLLM, LLMError
from .rag import RAGPipeline


class SearchRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    k: int = Field(3, ge=1, le=20)
    mode: Literal["semantic", "hybrid"] = "semantic"


class AskRequest(SearchRequest):
    compare: bool = True


class CheckFactsRequest(SearchRequest):
    k: int = Field(5, ge=1, le=20)
    facts: List[str] = Field(..., min_length=1, max_length=5)


class ChunkTestRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    chunk_size: int = Field(60, ge=10, le=2000)
    chunk_overlap: int = Field(10, ge=0, le=500)


def _confidence(hits):
    # Hybrid hits: use the cosine part, which is on the same 0-1 scale as the threshold
    def cosine(h):
        return (h.get("semantic") or 0.0) if "semantic" in h else h["score"]
    top = max(cosine(h) for h in hits)
    return round(top, 3), top < config.LOW_SCORE_THRESHOLD


def create_app(pipeline_factory=None, llm=None):
    """pipeline_factory: a function returning a built RAGPipeline (tests pass a fake one)."""
    state = {"pipeline": None, "error": None, "llm": llm}
    lock = threading.Lock()

    if state["llm"] is None and config.LLM_API_KEY:
        state["llm"] = ApiLLM(config.LLM_API_KEY, config.LLM_BASE_URL, config.LLM_MODEL,
                              config.MAX_TOKENS, config.TEMPERATURE)

    def default_factory():
        from .embedder import OnnxEmbedder
        embedder = OnnxEmbedder(config.EMBED_REPO, config.CACHE_DIR)
        p = RAGPipeline(embedder.embed, config.CORPUS_DIR, config.INDEX_DIR,
                        config.CACHE_DIR / "index", config.EMBED_DIM,
                        config.CHUNK_SIZE, config.CHUNK_OVERLAP)
        p.build()
        return p

    factory = pipeline_factory or default_factory

    def rag() -> RAGPipeline:
        # Serverless functions have no "startup", so we build on the first
        # request and keep it in memory while the function stays warm.
        if state["pipeline"] is None:
            with lock:
                if state["pipeline"] is None:
                    try:
                        state["pipeline"] = factory()
                        state["error"] = None
                    except Exception as e:
                        state["error"] = str(e)
                        raise HTTPException(503, f"Could not load the index: {e}")
        return state["pipeline"]

    app = FastAPI(title="Course Notes RAG API", version="2.0")

    @app.get("/api/health")
    def health():
        t0 = time.time()
        try:
            rag()           # also warms up the function on page load
        except HTTPException:
            pass
        return {
            "status": "ok" if state["pipeline"] else "error",
            "index_ready": state["pipeline"] is not None,
            "index_error": state["error"],
            "llm_configured": state["llm"] is not None,
            "embed_model": config.EMBED_REPO,
            "llm_model": config.LLM_MODEL,
            "llm_provider": config.LLM_BASE_URL,
            "low_score_threshold": config.LOW_SCORE_THRESHOLD,
            "seconds": round(time.time() - t0, 2),
        }

    @app.get("/api/pipeline")
    def pipeline_info():
        p = rag()
        return {"corpus": p.corpus_stats(), "chunking": p.chunk_stats(), "index": p.index_stats()}

    @app.post("/api/chunk-test")
    def chunk_test(req: ChunkTestRequest):
        if req.chunk_overlap >= req.chunk_size:
            raise HTTPException(422, "chunk_overlap must be smaller than chunk_size")
        chunks = recursive_chunk(req.text, req.chunk_size, req.chunk_overlap)
        return {"chunks": chunks, "count": len(chunks)}

    @app.post("/api/retrieve")
    def retrieve(req: SearchRequest):
        hits = rag().search(req.question, req.k, req.mode)
        top, low = _confidence(hits)
        return {"question": req.question, "k": req.k, "mode": req.mode,
                "hits": hits, "top_score": top, "low_confidence": low}

    @app.post("/api/check-facts")
    def check_facts(req: CheckFactsRequest):
        hits = rag().check_facts(req.question, req.facts, req.k, req.mode)
        return {"question": req.question, "hits": hits,
                "found": {f: any(h["contains"][f] for h in hits) for f in req.facts}}

    @app.post("/api/prompt")
    def prompt(req: SearchRequest):
        hits = rag().search(req.question, req.k, req.mode)
        return {"prompt": RAGPipeline.build_prompt(req.question, hits), "hits": hits}

    @app.post("/api/ask")
    def ask(req: AskRequest):
        if state["llm"] is None:
            raise HTTPException(503, "No LLM API key set. Add LLM_API_KEY (free key from "
                                     "console.groq.com) to .env or the Vercel settings.")
        hits = rag().search(req.question, req.k, req.mode)
        prompt_text = RAGPipeline.build_prompt(req.question, hits)
        top, low = _confidence(hits)

        def timed(text):
            t = time.time()
            return state["llm"].ask(text), round(time.time() - t, 1)

        try:
            # Both answers are requested at the same time, so "compare" costs no extra wait
            with ThreadPoolExecutor(max_workers=2) as pool:
                with_rag = pool.submit(timed, prompt_text)
                without = pool.submit(timed, req.question) if req.compare else None
                answer_with, s_with = with_rag.result()
                answer_without, s_without = without.result() if without else (None, None)
        except LLMError as e:
            raise HTTPException(502, str(e))

        return {"question": req.question, "answer_with_rag": answer_with,
                "answer_without_rag": answer_without, "prompt": prompt_text, "hits": hits,
                "top_score": top, "low_confidence": low,
                "seconds": {"with_rag": s_with, "without_rag": s_without}}

    @app.post("/api/rebuild")
    def rebuild():
        info = rag().build(force=True)
        return {"rebuilt": True, **info, "chunks": len(rag().chunks)}

    return app
