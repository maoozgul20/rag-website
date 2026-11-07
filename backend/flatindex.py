"""A NumPy version of FAISS IndexFlatIP, so the Vercel function doesn't need FAISS.

Why: the FAISS library adds about 65 MB, which pushed the Vercel function over
its 225 MB limit. IndexFlatIP is "Flat" (exact) search: it multiplies the
question vector with EVERY stored vector and keeps the top k. NumPy does the
same multiplication, so the scores and ranking are identical.

It reads and writes the same rag.index file format FAISS uses, so
build_index.py can still use real FAISS on your computer, and this class
loads that file on Vercel. tests/test_core.py checks both give the same results.

File layout of a FAISS IndexFlatIP (45-byte header, then the vectors):
    b"IxFI" | d:int32 | ntotal:int64 | 2 x int64 (unused) | is_trained:uint8 |
    metric:int32 (0 = inner product) | count:uint64 | count x float32
"""
import struct

import numpy as np

_HEADER = struct.Struct("<4siqqqBiQ")


def normalize_l2(x):
    """Same as faiss.normalize_L2: scale every row to length 1, in place."""
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    x /= np.maximum(norms, 1e-12)
    return x


class FlatIPIndex:
    def __init__(self, d):
        self.d = d
        self.vectors = np.zeros((0, d), dtype="float32")

    @property
    def ntotal(self):
        return self.vectors.shape[0]

    def add(self, x):
        self.vectors = np.vstack([self.vectors, np.asarray(x, dtype="float32")])

    def search(self, q, k):
        """Return (scores, ids), each shaped (n_queries, k), best first."""
        scores = np.asarray(q, dtype="float32") @ self.vectors.T
        k = min(k, self.ntotal)
        top = np.argpartition(-scores, k - 1, axis=1)[:, :k]
        rows = np.arange(scores.shape[0])[:, None]
        order = np.argsort(-scores[rows, top], axis=1, kind="stable")
        ids = top[rows, order]
        return scores[rows, ids], ids

    def write(self, path):
        n = self.ntotal
        with open(path, "wb") as f:
            f.write(_HEADER.pack(b"IxFI", self.d, n, 1 << 20, 1 << 20, 1, 0, n * self.d))
            f.write(self.vectors.astype("<f4").tobytes())

    @classmethod
    def read(cls, path):
        data = open(path, "rb").read()
        fourcc, d, ntotal, _, _, _, metric, count = _HEADER.unpack_from(data, 0)
        if fourcc != b"IxFI" or metric != 0:
            raise ValueError(f"{path} is not a FAISS IndexFlatIP file")
        vectors = np.frombuffer(data, dtype="<f4", count=count, offset=_HEADER.size)
        index = cls(d)
        index.vectors = vectors.reshape(ntotal, d).astype("float32")
        return index
