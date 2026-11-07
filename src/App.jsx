import { useEffect, useState } from 'react'
import { api } from './api.js'
import AskPage from './pages/AskPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'
import ChunkerPage from './pages/ChunkerPage.jsx'
import RetrievalPage from './pages/RetrievalPage.jsx'
import { Sparkle, BookOpen, Grid, Flow, Moon, Sun, Plus } from './components/Icons.jsx'

const TABS = [
  {
    id: 'ask', label: 'Ask', Icon: Sparkle, step: 'Steps 5–7', Page: AskPage,
  },
  {
    id: 'retrieval', label: 'Retrieval lab', Icon: BookOpen, step: 'Steps 4 & 8', Page: RetrievalPage,
    title: 'Retrieval lab',
    blurb: 'Search the index without writing an answer. Change top-k, switch to hybrid search, and check whether a fact is really in the results.',
  },
  {
    id: 'chunker', label: 'Chunker', Icon: Grid, step: 'Step 1', Page: ChunkerPage,
    title: 'Chunker',
    blurb: 'Paste any text and see where the recursive splitter cuts it, and which part of each chunk is overlap.',
  },
  {
    id: 'pipeline', label: 'Pipeline', Icon: Flow, step: 'Steps 0–3', Page: PipelinePage,
    title: 'Pipeline',
    blurb: 'The files, chunks and vectors that every answer is searched from.',
  },
]

function readTheme() {
  try {
    const saved = localStorage.getItem('theme-v3')
    if (saved) return saved
  } catch { /* storage blocked */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [tab, setTab] = useState('ask')
  const [theme, setTheme] = useState(readTheme)
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)
  const [chatKey, setChatKey] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('theme-v3', next) } catch { /* storage blocked */ }
  }

  useEffect(() => {
    let stop = false
    const check = () =>
      api.health()
        .then((h) => { if (!stop) { setHealth(h); setHealthError(null) } })
        .catch((e) => { if (!stop) setHealthError(e.message) })
    check()
    // Re-check now and then; on Vercel this also keeps the function warm while the page is open
    const timer = setInterval(check, 60000)
    return () => { stop = true; clearInterval(timer) }
  }, [])

  const current = TABS.find((t) => t.id === tab)
  const { Page } = current

  function newChat() {
    setTab('ask')
    setChatKey((n) => n + 1)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab('ask') }}>
          <span className="logo" aria-hidden="true">n</span>
          <span className="brand-name">Course Notes</span>
        </a>

        <button className="new-chat" onClick={newChat}>
          <Plus size={17} /> <span>New question</span>
        </button>

        <nav className="nav" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'nav-item active' : 'nav-item'}
              aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <t.Icon size={18} />
              <span className="nav-label">{t.label}</span>
              <span className="nav-step">{t.step}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Status health={health} error={healthError} />
          <dl className="tech">
            <div><dt>Embeddings</dt><dd>all-MiniLM-L6-v2</dd></div>
            <div><dt>Index</dt><dd>FAISS IndexFlatIP</dd></div>
            <div><dt>Model</dt><dd>{health?.llm_model || 'not connected'}</dd></div>
          </dl>
          <button className="theme-btn" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      <main className={tab === 'ask' ? 'main main-chat' : 'main'} key={tab === 'ask' ? `ask-${chatKey}` : tab}>
        {current.title && (
          <header className="page-head">
            <span className="eyebrow">{current.step} of the notebook</span>
            <h1>{current.title}</h1>
            <p>{current.blurb}</p>
          </header>
        )}
        <Page health={health} />
      </main>
    </div>
  )
}

function Status({ health, error }) {
  if (error) return <div className="status bad" title={error}>Offline</div>
  if (!health) return <div className="status pending">Waking up</div>
  if (!health.index_ready) return <div className="status bad" title={health.index_error || ''}>Index error</div>
  if (!health.llm_configured) return <div className="status warn">Search only</div>
  return <div className="status ok">Ready</div>
}
