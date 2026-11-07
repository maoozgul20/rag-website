"""Step 2: all-MiniLM-L6-v2 embeddings, run with ONNX Runtime instead of PyTorch.

Same model and same mean pooling as the notebook, so the vectors (and the
retrieval scores) match. ONNX Runtime is about 10x smaller than PyTorch,
which is what lets this fit in a free Vercel function.

The model files (~90 MB) are downloaded from the Hugging Face Hub the first
time and cached. They are public, so no token or credits are needed.
"""
import os
import shutil
import urllib.request
from pathlib import Path

import numpy as np

# Two public copies of the same model in ONNX format; the second is a backup.
SOURCES = [
    "https://huggingface.co/{repo}/resolve/main/{file}",
    "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/{file}",
]
FILES = {"tokenizer.json": "tokenizer.json", "model.onnx": "onnx/model.onnx"}


def _download(repo, remote, dest):
    errors = []
    for pattern in SOURCES:
        url = pattern.format(repo=repo, file=remote)
        tmp = dest.with_suffix(dest.suffix + ".part")
        try:
            with urllib.request.urlopen(url, timeout=60) as r, open(tmp, "wb") as f:
                shutil.copyfileobj(r, f)
            os.replace(tmp, dest)
            return
        except Exception as e:          # try the next source
            errors.append(f"{url}: {e}")
            tmp.unlink(missing_ok=True)
    raise RuntimeError("Could not download the embedding model:\n" + "\n".join(errors))


class OnnxEmbedder:
    def __init__(self, repo, cache_dir):
        import onnxruntime as ort
        from tokenizers import Tokenizer

        folder = Path(cache_dir) / repo.replace("/", "__")
        folder.mkdir(parents=True, exist_ok=True)
        for local, remote in FILES.items():
            if not (folder / local).exists():
                _download(repo, remote, folder / local)

        self.tokenizer = Tokenizer.from_file(str(folder / "tokenizer.json"))
        # Same settings as the notebook: pad the batch, cut at 256 tokens
        self.tokenizer.enable_truncation(max_length=256)
        self.tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1      # Vercel free tier has 1 CPU
        self.session = ort.InferenceSession(str(folder / "model.onnx"), opts,
                                            providers=["CPUExecutionProvider"])
        self.inputs = {i.name for i in self.session.get_inputs()}

    def embed(self, texts, batch_size=32):
        vectors = []
        for i in range(0, len(texts), batch_size):
            enc = self.tokenizer.encode_batch(texts[i:i + batch_size])
            ids = np.array([e.ids for e in enc], dtype=np.int64)
            mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
            feed = {"input_ids": ids, "attention_mask": mask,
                    "token_type_ids": np.zeros_like(ids)}
            feed = {k: v for k, v in feed.items() if k in self.inputs}
            output = self.session.run(None, feed)[0]        # (batch, tokens, 384)
            # Mean pooling: average the token vectors, ignoring padding
            m = mask[..., None].astype(np.float32)
            vectors.append((output * m).sum(1) / np.clip(m.sum(1), 1e-9, None))
        return np.vstack(vectors).astype("float32")
