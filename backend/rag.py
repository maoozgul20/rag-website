"""The RAG pipeline: notebook Steps 0b, 1b, 3, 4, 5, 7 and 8 in one class.

Speed trick for Vercel: the chunk embeddings, FAISS index and TF-IDF matrix
are built ONCE on your computer by build_index.py and committed to
backend/index/. On Vercel the function only loads them (milliseconds) and
embeds the one question you ask. If the saved index is missing or out of
date, it builds one on the spot (slower, about 10-30 s the first time).
"""
import hashlib
import json
import os
import time
from pathlib import Path

import numpy as np

from .chunker import recursive_chunk
from .flatindex import FlatIPIndex, normalize_l2
from .tfidf import TfidfIndex


class RAGPipeline:
    def __init__(self, embed_fn, corpus_dir, index_dir, fallback_dir=None,
                 dim=384, chunk_size=300, chunk_overlap=50):
        self.embed_fn = embed_fn            # list[str] -> float32 (n, dim)
        self.corpus_dir = Path(corpus_dir)
        self.index_dir = Path(index_dir)
        self.fallback_dir = Path(fallback_dir) if fallback_dir else self.index_dir
        self.dim, self.chunk_size, self.chunk_overlap = dim, chunk_size, chunk_overlap
        self.docs, self.chunks, self.sources = {}, [], []
        self.index = None
        self.tfidf = None
        self.build_info = {}

    # ---------- Step 0b ----------
    def load_corpus(self):
        files = sorted(self.corpus_dir.glob("*.txt"))
        if not files:
            raise FileNotFoundError(
                f"No .txt files in {self.corpus_dir}. Put the 13 course files in backend/data.")
        self.docs = {p.name: p.read_text(encoding="utf-8", errors="replace") for p in files}

    # ---------- Step 1b ----------
    def chunk_corpus(self):
        self.chunks, self.sources = [], []
        for name, text in self.docs.items():
            for c in recursive_chunk(text, self.chunk_size, self.chunk_overlap):
                self.chunks.append(c)
                self.sources.append(name)

    def fingerprint(self):
        h = hashlib.sha256(f"{self.chunk_size}|{self.chunk_overlap}|{self.dim}".encode())
        for name, text in self.docs.items():
            h.update(name.encode())
            h.update(text.encode("utf-8", errors="replace"))
        return h.hexdigest()

    # ---------- Steps 2-3: load the saved index, or build it ----------
    def _try_load(self, folder, fp):
        meta = folder / "meta.json"
        if not (meta.exists() and (folder / "rag.index").exists() and (folder / "tfidf.npz").exists()):
            return False
        if json.loads(meta.read_text()).get("fingerprint") != fp:
            return False
        self.index = FlatIPIndex.read(folder / "rag.index")
        self.tfidf = TfidfIndex.load(folder / "tfidf.npz")
        return self.index.ntotal == len(self.chunks)

    def build(self, force=False):
        start = time.time()
        self.load_corpus()
        self.chunk_corpus()
        fp = self.fingerprint()

        for folder in dict.fromkeys([self.index_dir, self.fallback_dir]):
            if not force and self._try_load(folder, fp):
                self.build_info = {"source": f"loaded saved index ({folder.name})",
                                   "reused_saved_index": True,
                                   "seconds": round(time.time() - start, 2)}
                return self.build_info

        vectors = self.embed_fn(self.chunks)
        normalize_l2(vectors)                       # length 1 -> inner product = cosine
        self.index = FlatIPIndex(self.dim)          # same as faiss.IndexFlatIP
        self.index.add(vectors)
        self.tfidf = TfidfIndex.fit(self.chunks)
        saved_to = self.save(fp)
        self.build_info = {"source": f"built fresh, saved to {saved_to}",
                           "reused_saved_index": False,
                           "seconds": round(time.time() - start, 2)}
        return self.build_info

    def save(self, fp):
        # Save to backend/index if we can write there, else to the cache (/tmp on Vercel)
        for folder in dict.fromkeys([self.index_dir, self.fallback_dir]):
            try:
                folder.mkdir(parents=True, exist_ok=True)
                if not os.access(folder, os.W_OK):
                    continue
                self.index.write(folder / "rag.index")      # FAISS file format
                self.tfidf.save(folder / "tfidf.npz")
                (folder / "meta.json").write_text(json.dumps({
                    "fingerprint": fp, "chunks": len(self.chunks),
                    "chunk_size": self.chunk_size, "chunk_overlap": self.chunk_overlap}))
                return str(folder)
            except OSError:
                continue
        return "nowhere (read-only)"

    # ---------- stats ----------
    def corpus_stats(self):
        files = [{"name": n, "characters": len(t)} for n, t in self.docs.items()]
        return {"files": files, "total_files": len(files),
                "total_characters": sum(f["characters"] for f in files)}

    def chunk_stats(self):
        lengths = [len(c) for c in self.chunks]
        return {"documents": len(self.docs), "chunks": len(self.chunks),
                "chunk_size": self.chunk_size, "chunk_overlap": self.chunk_overlap,
                "average_length": round(sum(lengths) / len(lengths), 1),
                "longest": max(lengths), "shortest": min(lengths),
                "examples": self.chunks[:2]}

    def index_stats(self):
        return {"type": "IndexFlatIP (Flat, exact search; FAISS file, NumPy search)",
                "dimension": self.index.d,
                "vectors": self.index.ntotal, **self.build_info}

    # ---------- Step 4a ----------
    def _query_vector(self, question):
        return normalize_l2(self.embed_fn([question]))

    def retrieve(self, question, k=5):
        k = max(1, min(k, self.index.ntotal))
        scores, ids = self.index.search(self._query_vector(question), k)
        return [{"rank": r + 1, "score": float(scores[0][r]),
                 "source": self.sources[int(ids[0][r])], "chunk": self.chunks[int(ids[0][r])]}
                for r in range(k)]

    # ---------- Step 8 ----------
    def hybrid_retrieve(self, question, k=5, candidates=20):
        candidates = max(k, min(candidates, self.index.ntotal))
        scores, ids = self.index.search(self._query_vector(question), candidates)
        sem = {int(ids[0][i]): float(scores[0][i]) for i in range(candidates)}

        key_scores = self.tfidf.scores(question)
        key_top = key_scores.argsort()[::-1][:candidates]
        key = {int(i): float(key_scores[i]) for i in key_top}

        combined = {}
        for i, s in sem.items():
            combined[i] = combined.get(i, 0) + s
        max_key = (max(key.values()) if key else 1.0) or 1.0
        for i, s in key.items():
            combined[i] = combined.get(i, 0) + s / max_key

        ranked = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:k]
        return [{"rank": r + 1, "score": float(s), "semantic": sem.get(i),
                 "keyword": key.get(i, 0.0) / max_key,
                 "source": self.sources[i], "chunk": self.chunks[i]}
                for r, (i, s) in enumerate(ranked)]

    def search(self, question, k=3, mode="semantic"):
        return self.hybrid_retrieve(question, k) if mode == "hybrid" else self.retrieve(question, k)

    # ---------- Step 4c ----------
    def check_facts(self, question, facts, k=5, mode="semantic"):
        hits = self.search(question, k, mode)
        for h in hits:
            h["contains"] = {f: f in h["chunk"] for f in facts}
        return hits

    # ---------- Step 5 ----------
    @staticmethod
    def build_prompt(question, hits):
        context = ""
        for i, hit in enumerate(hits, start=1):
            context += f"\n[Source {i}: {hit['source']}]\n{hit['chunk']}\n"
        return ("Answer the question using ONLY the context below. "
                'If the answer is not in the context, say "I do not know". '
                "Do not guess. Cite the source file for each fact you use.\n"
                f"\nContext:{context}"
                f"\nQuestion: {question}\nAnswer:")


def fake_embedder(dim=384):
    """Word-hashing stand-in for tests. Not a real model."""
    def embed(texts):
        out = np.zeros((len(texts), dim), dtype="float32")
        for r, t in enumerate(texts):
            for w in t.lower().split():
                w = w.strip(".,?!:;()[]\"'")
                if w:
                    out[r, int(hashlib.md5(w.encode()).hexdigest(), 16) % dim] += 1.0
            if not out[r].any():
                out[r, 0] = 1.0
        return out
    return embed
