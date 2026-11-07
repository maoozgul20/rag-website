"""Vercel entry point. Vercel runs the `app` object as a serverless function.

All /api/* requests are sent here by the rewrite in vercel.json.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app  # noqa: E402

app = create_app()
