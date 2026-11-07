// All calls to the FastAPI backend go through this one helper.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server returned ${res.status} with no JSON. Is the backend running?`)
  }
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join('; ')
      : data.detail
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),
  pipeline: () => request('/api/pipeline'),
  chunkTest: (body) => request('/api/chunk-test', body),
  retrieve: (body) => request('/api/retrieve', body),
  checkFacts: (body) => request('/api/check-facts', body),
  prompt: (body) => request('/api/prompt', body),
  ask: (body) => request('/api/ask', body),
  rebuild: () => request('/api/rebuild', {}),
}
