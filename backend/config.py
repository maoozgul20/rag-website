"""Settings. Every value can be set with an environment variable.

Locally you can put them in a `.env` file in the project root.
On Vercel, set them in Project Settings -> Environment Variables.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"


def _load_dotenv():
    # Tiny .env reader so we don't need an extra package
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

ON_VERCEL = bool(os.getenv("VERCEL"))

# Course .txt files (Step 0b) and the prebuilt index (Steps 2-3)
CORPUS_DIR = Path(os.getenv("CORPUS_DIR", BACKEND / "data"))
INDEX_DIR = Path(os.getenv("INDEX_DIR", BACKEND / "index"))

# Vercel can only write to /tmp. Model files and a rebuilt index go there.
CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp/rag-cache" if ON_VERCEL else BACKEND / ".cache"))

# Chunking (Step 1)
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 300))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))

# Embedding model (Step 2): same model as the notebook, ONNX format
EMBED_REPO = os.getenv("EMBED_REPO", "sentence-transformers/all-MiniLM-L6-v2")
EMBED_DIM = 384

# Generation (Step 6): any OpenAI-compatible API. Default: Groq (free, fast).
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-20b")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 300))
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.2))

# Honest test (Step 7)
LOW_SCORE_THRESHOLD = float(os.getenv("LOW_SCORE_THRESHOLD", 0.4))
