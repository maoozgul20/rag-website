import { useState } from 'react'
import { api } from '../api.js'
import Controls from '../components/Controls.jsx'
import HitList from '../components/HitList.jsx'
import { Search, Sparkle, Info } from '../components/Icons.jsx'

const EXAMPLES = [
  'What is precision?',
  'What is the difference between classification and regression?',
  'How do I handle missing values in pandas?',
  'What is LangChain?',
]

export default function AskPage({ health }) {
  const [question, setQuestion] = useState('What is precision?')
  const [k, setK] = useState(3)
  const [mode, setMode] = useState('semantic')
  const [compare, setCompare] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const llmReady = health?.llm_configured

  async function submit(e) {
    e?.preventDefault()
    if (!question.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await api.ask({ question, k, mode, compare }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card search-card">
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="q">Your question</label>
          <div className="searchbox">
            <Search size={22} className="search-icon" />
            <input id="q" value={question} maxLength={500}
              onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your course notes…" />
            <button className="btn primary" disabled={loading || !llmReady}>
              {loading ? <><span className="spinner" /> Thinking</> : <><Sparkle size={18} /> Ask</>}
            </button>
          </div>
          <div className="examples">
            <span className="examples-label">Try</span>
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="chip" onClick={() => setQuestion(ex)}>{ex}</button>
            ))}
          </div>
          <div className="options">
            <Controls k={k} setK={setK} mode={mode} setMode={setMode} />
            <label className="check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              <span>Also answer <b>without</b> retrieval to compare (Step 6)</span>
              <span className="info" title="Runs a second answer with no retrieved notes, at the same time, so you can see what RAG adds."><Info size={18} /></span>
            </label>
          </div>
        </form>
        {!llmReady && health && (
          <p className="note warn">No LLM API key is set, so answers are off. Add LLM_API_KEY (free from console.groq.com) to .env or your Vercel settings. The Retrieval lab still works.</p>
        )}
        {loading && <p className="note">Searching the notes and asking the model. Usually 1–3 seconds (longer on the first request after a break).</p>}
        {error && <p className="note bad">{error}</p>}
      </div>

      {result && (
        <>
          <Confidence top={result.top_score} low={result.low_confidence} threshold={health?.low_score_threshold} />

          <div className={result.answer_without_rag != null ? 'answers two' : 'answers'}>
            <div className="card answer rag">
              <div className="answer-head">
                <h3><span className="tag accent">RAG</span> With your notes</h3>
                <span className="muted small">{result.seconds.with_rag}s</span>
              </div>
              <p className="answer-text">{result.answer_with_rag}</p>
            </div>
            {result.answer_without_rag != null && (
              <div className="card answer plain">
                <div className="answer-head">
                  <h3><span className="tag">Plain</span> Model only</h3>
                  <span className="muted small">{result.seconds.without_rag}s</span>
                </div>
                <p className="answer-text">{result.answer_without_rag}</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="row-between">
              <h3>Sources <span className="muted h-note">the passages the model saw</span></h3>
              <button className="btn ghost" onClick={() => setShowPrompt(!showPrompt)}>
                {showPrompt ? 'Hide' : 'Show'} full prompt
              </button>
            </div>
            {showPrompt && <pre className="prompt">{result.prompt}</pre>}
            <HitList hits={result.hits} />
          </div>
        </>
      )}
    </section>
  )
}

function Confidence({ top, low, threshold = 0.4 }) {
  return (
    <div className={low ? 'confidence low' : 'confidence high'}>
      <b>Top match {top.toFixed(3)}</b>
      {low
        ? ` — below ${threshold}, so the notes probably do not contain the answer. A grounded model should say "I do not know".`
        : ` — above ${threshold}, so the notes likely cover this question.`}
    </div>
  )
}
