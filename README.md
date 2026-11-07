# Course Notes RAG — free Vercel version

The Week 8 Day 2 RAG notebook as a website: a **React frontend** and a
**FastAPI backend**, both deployed together on **one free Vercel project**.
No paid server, no GPU.

| Notebook step | Website |
|---|---|
| 0b Load corpus, 1 Chunk | Same code, `backend/chunker.py` (unchanged) |
| 2 Embed (all-MiniLM-L6-v2) | **Same model**, run with ONNX Runtime instead of PyTorch |
| 3 FAISS IndexFlatIP, save/load | **Same**, built once by `build_index.py`, loaded by the site |
| 4 Retrieve top-k, 4c fact check | Retrieval lab page |
| 5 Augmented prompt | Same prompt text; "Show full prompt" button |
| 6 Generate with and without RAG | **Groq API** (Llama 3.1 8B), both answers in parallel |
| 7 Honest test (score < 0.4) | Automatic warning banner |
| 8 Hybrid search (TF-IDF) | Same formula, rewritten in NumPy |

## Why it is fast on free Vercel

1. **No PyTorch.** PyTorch is too big for a free Vercel function. ONNX Runtime
   runs the exact same MiniLM model at about a tenth of the size. The whole
   function is about 230 MB, which fits under Vercel's limit.
2. **The index is built once, on your computer.** `build_index.py` embeds all
   1,342 chunks and saves the FAISS index into `backend/index/`. You commit it,
   and Vercel just loads it (milliseconds). Each question only embeds one sentence.
3. **Answers come from Groq**, which generates hundreds of tokens per second.
   An answer takes about 1–2 seconds instead of 20–90 s with local Qwen.
4. **"With RAG" and "without RAG" run at the same time**, so the comparison costs no extra wait.

The first request after the site has been idle is slower (about 5–10 s),
because Vercel starts the function and downloads the 90 MB MiniLM model.
After that, requests are fast until it goes idle again.

## What changed from the notebook (tell your teacher)

- **The answer model is Llama 3.1 8B on Groq, not DeepSeek-V3 or local Qwen.**
  The Hugging Face credits for DeepSeek ran out (402 error), and local models
  need a server Vercel's free plan cannot provide. Groq's free tier is fast and needs no card.
  Any OpenAI-compatible provider works by changing three settings.
- **Retrieval is unchanged:** same chunker, same embedding model, same FAISS
  index type, same prompt, same hybrid formula. So the scores should match the
  notebook (for example about 0.662 for "What is precision?").
- **TF-IDF is written in NumPy**, because scikit-learn is too big for Vercel.
  A test checks it gives the same numbers as scikit-learn.

---

## Setup (about 15 minutes)

You need **Python 3.10+**, **Node.js 18+** and a **GitHub** account.

### 1. Add the 13 course files
Put the `.txt` files from your Kaggle dataset into `backend/data/`.

### 2. Get a free Groq API key
Sign up at **console.groq.com**, open **API Keys**, create a key. Then copy
`.env.example` to `.env` and paste the key:
```
LLM_API_KEY=gsk_your_key_here
```
Never commit `.env` (it is in `.gitignore`).

### 3. Build the index (once)
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate      Mac/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python build_index.py
```
You should see 13 files, 1,342 chunks, and a sanity check where "What is
precision?" scores about **0.662** from `12_evaluation_metrics.txt`. If that
matches, the website will give the same retrieval results as your notebook.

This creates `backend/index/rag.index`, `tfidf.npz` and `meta.json`. **Commit
these files.** (If you skip this step, the site still works but builds the
index on its first request, which takes much longer.)

### 4. Run locally
Terminal 1, backend:
```bash
uvicorn api.index:app --port 8000
```
Terminal 2, frontend:
```bash
npm install
npm run dev
```
Open **http://localhost:5173**. The badge should say **Ready**.

### 5. Check it
1. **Pipeline:** 13 files, 276,888 characters, 1,342 chunks, 384 dimensions.
2. **Retrieval lab:** "What is precision?" k=3 → top score about 0.662.
3. **Retrieval lab → Load the split-answer test:** both facts *Not found* (same as Step 4c).
4. **Ask:** "What is precision?" → RAG answer gives TP / (TP + FP).
5. **Ask:** "What is LangChain?" → orange low-confidence banner.

### 6. Deploy to Vercel (when you are ready)
1. Push the project to a GitHub repository (including `backend/data` and `backend/index`).
2. On **vercel.com → Add New → Project**, import the repository. Leave Root Directory as the project root.
   Vercel detects Vite for the frontend and `api/index.py` for the backend.
3. In **Settings → Environment Variables**, add `LLM_API_KEY` with your Groq key.
4. Click **Deploy**. Open the URL and run the checks from step 5.

Frontend and backend share one URL, so no CORS setup is needed.

---

## Project structure

```
├── api/index.py          Vercel entry point (the backend function)
├── backend/
│   ├── app.py            FastAPI endpoints
│   ├── rag.py            corpus, chunks, FAISS, retrieval, hybrid, prompt
│   ├── chunker.py        Step 1a recursive chunker (from the notebook)
│   ├── embedder.py       MiniLM with ONNX Runtime + mean pooling
│   ├── tfidf.py          TF-IDF in NumPy (matches scikit-learn)
│   ├── llm.py            OpenAI-compatible API client (Groq by default)
│   ├── config.py         settings from environment / .env
│   ├── data/             ← your 13 .txt files
│   └── index/            ← created by build_index.py, commit it
├── src/                  React frontend (pages: Ask, Retrieval lab, Chunker, Pipeline)
├── build_index.py        build the index once
├── tests/test_core.py    11 tests (no model download needed)
├── vercel.json           routes /api/* to the backend, the rest to React
└── requirements.txt      backend packages for Vercel
```

## API endpoints

| Method | Path | Step | What it does |
|---|---|---|---|
| GET | `/api/health` | – | Status (also warms up the function) |
| GET | `/api/pipeline` | 0b, 1b, 3 | Files, chunk stats, index info |
| POST | `/api/chunk-test` | 1a | Chunk any text |
| POST | `/api/retrieve` | 4, 7, 8 | Top-k chunks, top score, low-confidence flag |
| POST | `/api/check-facts` | 4c | Marks which chunks contain given facts |
| POST | `/api/prompt` | 5 | The augmented prompt |
| POST | `/api/ask` | 6, 7 | Answers with and without RAG |

Interactive docs when running locally: http://localhost:8000/docs

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `LLM_API_KEY` | – | **Required** for the Ask page |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Any OpenAI-compatible API |
| `LLM_MODEL` | `llama-3.1-8b-instant` | Model name at that provider |
| `MAX_TOKENS` / `TEMPERATURE` | `300` / `0.2` | Same as the notebook |
| `LOW_SCORE_THRESHOLD` | `0.4` | Honest-test warning level |

To use DeepSeek directly instead: `LLM_BASE_URL=https://api.deepseek.com/v1`,
`LLM_MODEL=` the chat model name from DeepSeek's docs, and a DeepSeek key (paid, but cheap).

## Limits of the free setup

- **Groq free tier has rate limits.** Heavy use can return "429 rate limit"; wait a moment.
- **Cold starts:** first request after idle takes about 5–10 s.
- **Adding files:** add the `.txt`, run `python build_index.py`, commit, push. The
  "Rebuild index" button only lasts until the function sleeps.
- Weaknesses from the notebook remain: 300-character chunks, and the 0.991
  accuracy chunk is still hard to retrieve (Step 4c).

## Tests
```bash
pytest -q        # 11 passed
```
