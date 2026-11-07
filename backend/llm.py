"""Step 6: generation through an OpenAI-compatible chat API.

Default is Groq (free tier, very fast). The same code works with OpenRouter,
DeepSeek, or any other OpenAI-compatible provider by changing LLM_BASE_URL,
LLM_MODEL and LLM_API_KEY. Uses only the Python standard library.
"""
import json
import urllib.error
import urllib.request


class LLMError(Exception):
    pass


class ApiLLM:
    def __init__(self, api_key, base_url, model, max_tokens=300, temperature=0.2):
        self.api_key, self.base_url, self.model = api_key, base_url, model
        self.max_tokens, self.temperature = max_tokens, temperature

    def ask(self, prompt):
        body = json.dumps({
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
        }).encode()
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions", data=body, method="POST",
            headers={"Authorization": f"Bearer {self.api_key}",
                     "Content-Type": "application/json",
                     "User-Agent": "course-notes-rag/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=50) as r:
                data = json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:300]
            hint = {401: " (check LLM_API_KEY)", 402: " (provider credits used up)",
                    404: " (check LLM_MODEL / LLM_BASE_URL)",
                    429: " (rate limit, wait a moment and try again)"}.get(e.code, "")
            raise LLMError(f"LLM API error {e.code}{hint}: {detail}") from e
        except urllib.error.URLError as e:
            raise LLMError(f"Could not reach the LLM API: {e.reason}") from e
        try:
            return data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError) as e:
            raise LLMError(f"Unexpected LLM response: {str(data)[:300]}") from e
