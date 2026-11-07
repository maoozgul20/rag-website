"""Build the search index ONCE on your computer, then commit backend/index/.

    pip install -r requirements.txt
    python build_index.py

It reads backend/data/*.txt, chunks them, embeds every chunk with
all-MiniLM-L6-v2 and saves:
    backend/index/rag.index   FAISS IndexFlatIP (Step 3)
    backend/index/tfidf.npz   keyword index for hybrid search (Step 8)
    backend/index/meta.json   fingerprint, so the site knows the index matches the files

Run it again whenever you add or change a .txt file.
"""
import sys

from backend import config
from backend.embedder import OnnxEmbedder
from backend.rag import RAGPipeline


def main():
    print("Loading all-MiniLM-L6-v2 (downloads ~90 MB the first time)...")
    embedder = OnnxEmbedder(config.EMBED_REPO, config.CACHE_DIR)
    p = RAGPipeline(embedder.embed, config.CORPUS_DIR, config.INDEX_DIR, None,
                    config.EMBED_DIM, config.CHUNK_SIZE, config.CHUNK_OVERLAP)
    info = p.build(force="--force" in sys.argv)

    c, k = p.corpus_stats(), p.chunk_stats()
    print(f"\nFiles: {c['total_files']}, characters: {c['total_characters']:,}")
    print(f"Chunks: {k['chunks']} (avg {k['average_length']}, longest {k['longest']}, "
          f"shortest {k['shortest']})")
    print(f"Index: {p.index.ntotal} vectors x {p.index.d} dimensions -> {info['source']}")

    print("\nSanity check, should match notebook Step 4a (~0.662 from 12_evaluation_metrics.txt):")
    for h in p.retrieve("What is precision?", 3):
        print(f"  Rank {h['rank']} | score {h['score']:.3f} | {h['source']}")

    # Prove the saved file is a real FAISS index and NumPy search matches FAISS
    try:
        import faiss
        import numpy as np
        from backend.flatindex import normalize_l2
        real = faiss.read_index(str(config.INDEX_DIR / "rag.index"))
        q = normalize_l2(embedder.embed(["What is precision?"]))
        f_scores, f_ids = real.search(q, 5)
        n_scores, n_ids = p.index.search(q, 5)
        same = (f_ids == n_ids).all() and np.allclose(f_scores, n_scores, atol=1e-5)
        print(f"\nFAISS check: faiss.read_index loaded {real.ntotal} vectors; "
              f"same top-5 as the NumPy search: {bool(same)}")
    except ImportError:
        print("\n(faiss-cpu not installed, skipped the FAISS comparison)")


if __name__ == "__main__":
    main()
