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
    setLoading(true); setError(null); setResult(null); setShowPrompt(false)
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
            <input id="q" value={question} maxLength={500} autoComplete="off"
              onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about your course notes" />
            <button className={loading ? 'btn primary busy' : 'btn primary'} disabled={loading || !llmReady}>
              {loading ? <><span className="spinner" /> Searching</> : <><Sparkle size={17} /> Ask</>}
            </button>
          </div>
          <div className="examples">
            <span className="examples-label">Try</span>
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className={question === ex ? 'chip on' : 'chip'}
                onClick={() => setQuestion(ex)}>{ex}</button>
            ))}
          </div>
          <div className="options">
            <Controls k={k} setK={setK} mode={mode} setMode={setMode} />
            <label className="check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              <span className="check-box" aria-hidden="true" />
              <span>Also answer <b>without</b> your notes, to compare (Step 6)</span>
              <span className="info" title="Runs a second answer with no retrieved notes, at the same time, so you can see what retrieval adds."><Info size={17} /></span>
            </label>
          </div>
        </form>
        {!llmReady && health && (
          <p className="note warn">Answers are off because no LLM_API_KEY is set. Add a free key from console.groq.com to .env or to your Vercel settings. The Retrieval lab still works.</p>
        )}
        {error && <p className="note bad">{error}</p>}
      </div>

      {loading && <Working k={k} />}

      {result && (
        <div className="results">
          <Confidence top={result.top_score} low={result.low_confidence} threshold={health?.low_score_threshold} />

          <div className={result.answer_without_rag != null ? 'answers two' : 'answers'}>
            <article className="card answer rag">
              <div className="answer-head">
                <h3><span className="tag accent">With your notes</span></h3>
                <span className="muted small">{result.seconds.with_rag}s</span>
              </div>
              <p className="answer-text">{result.answer_with_rag}</p>
            </article>
            {result.answer_without_rag != null && (
              <article className="card answer plain">
                <div className="answer-head">
                  <h3><span className="tag">Model only</span></h3>
                  <span className="muted small">{result.seconds.without_rag}s</span>
                </div>
                <p className="answer-text">{result.answer_without_rag}</p>
              </article>
            )}
          </div>

          <div className="card sources">
            <div className="row-between">
              <h3>Passages it used <span className="muted h-note">from your notes, best match first</span></h3>
              <button className="btn ghost" onClick={() => setShowPrompt(!showPrompt)} aria-expanded={showPrompt}>
                {showPrompt ? 'Hide full prompt' : 'Show full prompt'}
              </button>
            </div>
            {showPrompt && <pre className="prompt">{result.prompt}</pre>}
            <HitList hits={result.hits} />
          </div>
        </div>
      )}
    </section>
  )
}

// Shown while waiting: lines on a page being highlighted one after another
function Working({ k }) {
  return (
    <div className="card working" role="status">
      <div className="working-lines" aria-hidden="true">
        {Array.from({ length: Math.min(k, 5) }, (_, i) => (
          <span key={i} style={{ '--i': i }} />
        ))}
      </div>
      <p>Finding the {k} closest passages and writing the answer…</p>
    </div>
  )
}

function Confidence({ top, low, threshold = 0.4 }) {
  return (
    <div className={low ? 'confidence low' : 'confidence high'}>
      <span className="confidence-score">{top.toFixed(2)}</span>
      <span>
        <b>{low ? 'Your notes probably do not cover this.' : 'Your notes cover this question.'}</b>{' '}
        {low
          ? `The best passage scored below ${threshold}, so a grounded answer should say "I do not know".`
          : `The best passage scored above ${threshold}.`}
      </span>
    </div>
  )
}
