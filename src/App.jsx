import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from './api.js'
import AskPage from './pages/AskPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'
import ChunkerPage from './pages/ChunkerPage.jsx'
import RetrievalPage from './pages/RetrievalPage.jsx'
import HeroArt from './components/HeroArt.jsx'
import { Sparkle, BookOpen, Grid, Flow, Moon, Sun } from './components/Icons.jsx'

const TABS = [
  {
    id: 'ask', label: 'Ask', Icon: Sparkle, step: 'Steps 5–7', Page: AskPage,
    title: 'Ask your notes anything.',
    blurb: 'Answers are written from passages found in your Week 1–8 course notes, and every passage it used is shown underneath.',
  },
  {
    id: 'retrieval', label: 'Retrieval lab', Icon: BookOpen, step: 'Steps 4 and 8', Page: RetrievalPage,
    title: 'See what the search finds.',
    blurb: 'Search the index without writing an answer. Change top-k, switch to hybrid search, and check whether a fact is really in the results.',
  },
  {
    id: 'chunker', label: 'Chunker', Icon: Grid, step: 'Step 1', Page: ChunkerPage,
    title: 'Watch notes become chunks.',
    blurb: 'Paste any text and see where the recursive splitter cuts it, and which part of each chunk is overlap.',
  },
  {
    id: 'pipeline', label: 'Pipeline', Icon: Flow, step: 'Steps 0–3', Page: PipelinePage,
    title: 'What the index is made of.',
    blurb: 'The 13 files, 1,342 chunks and 384-number vectors that every answer is searched from.',
  },
]

function readTheme() {
  try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
}

export default function App() {
  const [tab, setTab] = useState('ask')
  const [theme, setTheme] = useState(readTheme)
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* storage blocked */ }
  }, [theme])

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

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab('ask') }}>
            <span className="logo" aria-hidden="true"><span>n</span></span>
            <span className="brand-name">Course Notes</span>
          </a>

          <Tabs tab={tab} setTab={setTab} />

          <div className="topbar-right">
            <Status health={health} error={healthError} />
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>
      </header>

      <div className="app">
        <section className="hero">
          <div className="hero-copy" key={current.id}>
            <span className="step-chip">{current.step} of the notebook</span>
            <h1>{current.title}</h1>
            <p>{current.blurb}</p>
          </div>
          <HeroArt />
        </section>

        <main className="page" key={current.id}>
          <Page health={health} />
        </main>

        <footer className="footer">
          <dl className="footer-tech">
            <div><dt>Embeddings</dt><dd>all-MiniLM-L6-v2</dd></div>
            <div><dt>Vector index</dt><dd>FAISS IndexFlatIP</dd></div>
            <div><dt>Answers</dt><dd>{health?.llm_model || 'not connected'}</dd></div>
          </dl>
        </footer>
      </div>
    </>
  )
}

// Tab bar with a highlight pill that slides to the active tab
function Tabs({ tab, setTab }) {
  const refs = useRef({})
  const [pill, setPill] = useState(null)

  useLayoutEffect(() => {
    const place = () => {
      const el = refs.current[tab]
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    place()
    window.addEventListener('resize', place)
    document.fonts?.ready.then(place)
    return () => window.removeEventListener('resize', place)
  }, [tab])

  return (
    <nav className="tabs" aria-label="Sections">
      {pill && <span className="tab-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
      {TABS.map((t) => (
        <button key={t.id} ref={(el) => { refs.current[t.id] = el }}
          className={tab === t.id ? 'tab active' : 'tab'}
          aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
          <t.Icon size={17} /> <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Status({ health, error }) {
  if (error) return <div className="status bad" title={error}>Offline</div>
  if (!health) return <div className="status pending">Waking up</div>
  if (!health.index_ready) return <div className="status bad" title={health.index_error || ''}>Index error</div>
  if (!health.llm_configured) return <div className="status warn">Search only</div>
  return <div className="status ok">Ready</div>
}
