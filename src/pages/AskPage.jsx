import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import Controls from '../components/Controls.jsx'
import HitList from '../components/HitList.jsx'
import Markdown from '../components/Markdown.jsx'
import { ArrowUp, Sliders, BookOpen, Scale, Code, Chevron } from '../components/Icons.jsx'

const EXAMPLES = [
  { q: 'What is precision?', hint: 'Evaluation metrics' },
  { q: 'What is the difference between classification and regression?', hint: 'Machine learning basics' },
  { q: 'How do I handle missing values in pandas?', hint: 'Data handling' },
  { q: 'What is LangChain?', hint: 'Honest test: not in the notes' },
]

const prettySource = (s) => s.replace(/^\d+_/, '').replace(/\.\w+$/, '').replace(/_/g, ' ')

// One chip per source file, listing the ranks of its passages
function groupSources(hits) {
  const groups = new Map()
  for (const h of hits) groups.set(h.source, [...(groups.get(h.source) || []), h.rank])
  return [...groups]
}

export default function AskPage({ health }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [k, setK] = useState(3)
  const [mode, setMode] = useState('semantic')
  const [compare, setCompare] = useState(true)
  const [showOptions, setShowOptions] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  const llmReady = health?.llm_configured
  const busy = messages.some((m) => m.loading)

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // Grow the message box with its content
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [draft])

  async function ask(text) {
    const question = text.trim()
    if (!question || busy || !llmReady) return
    const id = Date.now()
    setDraft('')
    setShowOptions(false)
    setMessages((m) => [...m, { id, question, loading: true, k }])
    let patch
    try {
      patch = { result: await api.ask({ question, k, mode, compare }) }
    } catch (err) {
      patch = { error: err.message }
    }
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, ...patch, loading: false } : msg)))
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      ask(draft)
    }
  }

  return (
    <div className="chat">
      <div className="thread">
        {messages.length === 0 ? (
          <div className="welcome">
            <span className="welcome-mark" aria-hidden="true">n</span>
            <h1>What do you want to know?</h1>
            <p>Answers come from your Week 1–8 course notes, with the exact passages they used.</p>
            <div className="starters">
              {EXAMPLES.map((ex) => (
                <button key={ex.q} className="starter" disabled={!llmReady} onClick={() => ask(ex.q)}>
                  <span className="starter-q">{ex.q}</span>
                  <span className="starter-hint">{ex.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Exchange key={m.id} msg={m} threshold={health?.low_score_threshold} />)
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        {!llmReady && health && (
          <p className="note warn">Answers are off because no LLM_API_KEY is set. Add a free key from console.groq.com to .env or to your Vercel settings. The Retrieval lab still works.</p>
        )}
        {showOptions && (
          <div className="options-pop" role="dialog" aria-label="Answer options">
            <Controls k={k} setK={setK} mode={mode} setMode={setMode} />
            <label className="check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              <span className="check-box" aria-hidden="true" />
              <span>Also answer <b>without</b> the notes, to compare (Step 6)</span>
            </label>
          </div>
        )}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(draft) }}>
          <label className="sr-only" htmlFor="q">Your question</label>
          <textarea id="q" ref={inputRef} rows={1} value={draft} maxLength={500}
            placeholder="Ask about your course notes…" onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} />
          <div className="composer-bar">
            <button type="button" className={showOptions ? 'pill-btn on' : 'pill-btn'}
              onClick={() => setShowOptions(!showOptions)} aria-expanded={showOptions}>
              <Sliders size={16} /> <span>Top-k {k} · {mode === 'semantic' ? 'Semantic' : 'Hybrid'}{compare ? ' · Compare' : ''}</span>
            </button>
            <button className="send" disabled={!draft.trim() || busy || !llmReady} aria-label="Send question">
              {busy ? <span className="spinner" /> : <ArrowUp size={19} />}
            </button>
          </div>
        </form>
        <p className="composer-hint">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  )
}

function Exchange({ msg, threshold = 0.4 }) {
  const [panel, setPanel] = useState(null)
  const r = msg.result
  const toggle = (name) => setPanel(panel === name ? null : name)

  return (
    <div className="exchange">
      <div className="user-msg"><p>{msg.question}</p></div>

      <div className="bot-msg">
        <span className="bot-avatar" aria-hidden="true">n</span>
        <div className="bot-body">
          {msg.loading && (
            <div className="thinking" role="status">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              Reading the {msg.k} closest passages…
            </div>
          )}

          {msg.error && <p className="note bad">{msg.error}</p>}

          {r && (
            <>
              <div className="meta">
                <span className={r.low_confidence ? 'badge low' : 'badge high'}
                  title={r.low_confidence
                    ? `Best passage scored below ${threshold}, so the notes probably do not cover this.`
                    : `Best passage scored above ${threshold}.`}>
                  {r.low_confidence ? 'Weak match' : 'Strong match'} · {r.top_score.toFixed(2)}
                </span>
                <span className="meta-time">{r.seconds.with_rag}s</span>
              </div>

              <Markdown>{r.answer_with_rag}</Markdown>

              <div className="source-chips">
                {groupSources(r.hits).map(([source, ranks]) => (
                  <button key={source} className="source-chip" onClick={() => setPanel('sources')} title={source}>
                    {ranks.map((n) => <b key={n}>{n}</b>)} {prettySource(source)}
                  </button>
                ))}
              </div>

              <div className="tools">
                <ToolBtn on={panel === 'sources'} onClick={() => toggle('sources')} Icon={BookOpen}>
                  Passages ({r.hits.length})
                </ToolBtn>
                {r.answer_without_rag != null && (
                  <ToolBtn on={panel === 'compare'} onClick={() => toggle('compare')} Icon={Scale}>
                    Compare with model only
                  </ToolBtn>
                )}
                <ToolBtn on={panel === 'prompt'} onClick={() => toggle('prompt')} Icon={Code}>
                  Prompt
                </ToolBtn>
              </div>

              {panel === 'sources' && <div className="panel"><HitList hits={r.hits} /></div>}
              {panel === 'compare' && (
                <div className="panel compare">
                  <div className="panel-head">
                    <span>Model only, no notes</span><span className="meta-time">{r.seconds.without_rag}s</span>
                  </div>
                  <Markdown>{r.answer_without_rag}</Markdown>
                </div>
              )}
              {panel === 'prompt' && <pre className="panel prompt">{r.prompt}</pre>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ on, onClick, Icon, children }) {
  return (
    <button type="button" className={on ? 'tool on' : 'tool'} onClick={onClick} aria-expanded={on}>
      <Icon size={15} /> {children} <Chevron size={14} className="tool-chev" />
    </button>
  )
}
