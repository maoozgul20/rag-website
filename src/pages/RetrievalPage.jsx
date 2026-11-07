import { useState } from 'react'
import { api } from '../api.js'
import Controls from '../components/Controls.jsx'
import HitList from '../components/HitList.jsx'

// Steps 4a/4b/7/8: search only (fast, no LLM). Plus the Step 4c fact check.
export default function RetrievalPage() {
  const [question, setQuestion] = useState('What is precision?')
  const [k, setK] = useState(3)
  const [mode, setMode] = useState('semantic')
  const [factsText, setFactsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const facts = factsText.split(',').map((f) => f.trim()).filter(Boolean).slice(0, 5)

  async function run(e) {
    e?.preventDefault()
    if (!question.trim()) return
    setLoading(true); setError(null)
    try {
      const body = { question, k, mode }
      setResult(facts.length
        ? { ...(await api.checkFacts({ ...body, facts })), facts }
        : { ...(await api.retrieve(body)), facts: [] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function loadSplitTest() {
    setQuestion('What accuracy did fine-tuning reach on SMS spam, and what is RAG?')
    setK(5)
    setFactsText('0.991, Retrieval-Augmented Generation')
  }

  return (
    <section>
      <div className="card">
        <form onSubmit={run}>
          <label className="label">Question</label>
          <div className="ask-row">
            <input className="input" value={question} maxLength={500} onChange={(e) => setQuestion(e.target.value)} />
            <button className="btn primary" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
          </div>
          <Controls k={k} setK={setK} mode={mode} setMode={setMode} maxK={20} />
          <label className="label">Facts to check (optional, comma separated, Step 4c)</label>
          <input className="input" value={factsText} placeholder="e.g. 0.991, Retrieval-Augmented Generation"
            onChange={(e) => setFactsText(e.target.value)} />
          <div className="examples">
            <button type="button" className="chip" onClick={loadSplitTest}>Load the split-answer test</button>
            <button type="button" className="chip" onClick={() => { setQuestion('What is LangChain?'); setFactsText('') }}>Honest test: LangChain</button>
          </div>
        </form>
        {error && <p className="note bad">{error}</p>}
      </div>

      {result && (
        <div className="card results">
          {result.found ? (
            <div className="found">
              {Object.entries(result.found).map(([f, ok]) => (
                <span key={f} className={ok ? 'fact yes' : 'fact no'}>
                  {ok ? 'Found' : 'Not found'}: {f}
                </span>
              ))}
            </div>
          ) : (
            <p className={result.low_confidence ? 'note warn' : 'note'}>
              Top score {result.top_score.toFixed(3)}
              {result.low_confidence ? ' — low: the notes probably do not answer this.' : ''}
            </p>
          )}
          <HitList hits={result.hits} facts={result.facts} />
        </div>
      )}
    </section>
  )
}
