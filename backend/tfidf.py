"""Step 8 keyword search: TF-IDF written with NumPy only.

It gives the same numbers as scikit-learn's TfidfVectorizer() with default
settings (lowercase, words of 2+ letters, smooth idf, L2 norm). We write it
ourselves because scikit-learn + SciPy are too big for a free Vercel
function. tests/test_core.py checks it against scikit-learn.
"""
import re
from collections import Counter

import numpy as np

TOKEN = re.compile(r"(?u)\b\w\w+\b")   # scikit-learn's default token_pattern


def tokenize(text):
    return TOKEN.findall(text.lower())


class TfidfIndex:
    def __init__(self, vocab, idf, col_ptr, col_rows, col_vals, n_docs):
        self.vocab = vocab                    # word -> column number
        self.idf = idf
        # Column-wise sparse matrix: for word column c, the chunks that contain
        # it are col_rows[col_ptr[c]:col_ptr[c+1]] with weights col_vals[...]
        self.col_ptr, self.col_rows, self.col_vals = col_ptr, col_rows, col_vals
        self.n_docs = n_docs

    @classmethod
    def fit(cls, docs):
        counts = [Counter(tokenize(d)) for d in docs]
        df = Counter()
        for c in counts:
            df.update(c.keys())
        words = sorted(df)
        vocab = {w: i for i, w in enumerate(words)}
        n = len(docs)
        idf = np.array([np.log((1 + n) / (1 + df[w])) + 1.0 for w in words])

        columns = [[] for _ in words]
        for row, c in enumerate(counts):
            weights = {vocab[w]: tf * idf[vocab[w]] for w, tf in c.items()}
            norm = np.sqrt(sum(v * v for v in weights.values())) or 1.0
            for col, v in weights.items():
                columns[col].append((row, v / norm))

        col_ptr = np.zeros(len(words) + 1, dtype=np.int64)
        rows, vals = [], []
        for col, entries in enumerate(columns):
            col_ptr[col + 1] = col_ptr[col] + len(entries)
            for r, v in entries:
                rows.append(r)
                vals.append(v)
        return cls(vocab, idf, col_ptr, np.array(rows, dtype=np.int32),
                   np.array(vals, dtype=np.float64), n)

    def scores(self, query):
        """Cosine similarity between the query and every chunk."""
        c = Counter(w for w in tokenize(query) if w in self.vocab)
        out = np.zeros(self.n_docs)
        if not c:
            return out
        q = {self.vocab[w]: tf * self.idf[self.vocab[w]] for w, tf in c.items()}
        norm = np.sqrt(sum(v * v for v in q.values()))
        for col, v in q.items():
            s, e = self.col_ptr[col], self.col_ptr[col + 1]
            out[self.col_rows[s:e]] += (v / norm) * self.col_vals[s:e]
        return out

    def save(self, path):
        words = np.array(sorted(self.vocab, key=self.vocab.get))
        np.savez_compressed(path, words=words, idf=self.idf, col_ptr=self.col_ptr,
                            col_rows=self.col_rows, col_vals=self.col_vals,
                            n_docs=np.array([self.n_docs]))

    @classmethod
    def load(cls, path):
        d = np.load(path, allow_pickle=False)
        vocab = {str(w): i for i, w in enumerate(d["words"])}
        return cls(vocab, d["idf"], d["col_ptr"], d["col_rows"], d["col_vals"],
                   int(d["n_docs"][0]))
