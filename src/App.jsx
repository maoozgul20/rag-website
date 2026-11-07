import { useEffect, useState } from 'react'
import { api } from './api.js'
import AskPage from './pages/AskPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'
import ChunkerPage from './pages/ChunkerPage.jsx'
import RetrievalPage from './pages/RetrievalPage.jsx'
import HeroArt from './components/HeroArt.jsx'
import {
  Sparkle, BookOpen, Grid, Flow, Moon, Sun, Bolt, Shield, Bars, Layers,
  Target, CheckCircle, Scissors, FileText, Database, Cube,
} from './components/Icons.jsx'

const TABS = [
  {
    id: 'ask', label: 'Ask', Icon: Sparkle, step: '5–7', Page: AskPage,
    kicker: 'Ask the notes',
    title: <>Ask anything from <em>Weeks 1–8</em>.</>,
    blurb: 'Every answer is built from passages found in your course notes, and you can see the passages it used.',
    features: [[Bolt, 'Instant Answers'], [Shield, 'Reliable Sources'], [Bars, 'Smart Search']],
  },
  {
    id: 'retrieval', label: 'Retrieval Lab', Icon: BookOpen, step: '4 & 8', Page: RetrievalPage,
    kicker: 'Retrieval lab',
    title: <>See what the search <em>really finds</em>.</>,
    blurb: 'Search the FAISS index without generating an answer. Compare top-k values, semantic vs hybrid search, and check facts.',
    features: [[Target, 'Top-k Tuning'], [Layers, 'Semantic + Hybrid'], [CheckCircle, 'Fact Check']],
  },
  {
    id: 'chunker', label: 'Chunker', Icon: Grid, step: '1', Page: ChunkerPage,
    kicker: 'Chunker',
    title: <>Watch text get <em>cut into chunks</em>.</>,
    blurb: 'Try the recursive splitter on any text and see exactly where each cut and overlap lands.',
    features: [[Scissors, 'Recursive Splits'], [Layers, 'Live Overlap'], [FileText, 'Any Text']],
  },
  {
    id: 'pipeline', label: 'Pipeline', Icon: Flow, step: '0–3', Page: PipelinePage,
    kicker: 'Pipeline',
    title: <>What the index is <em>made of</em>.</>,
    blurb: 'The files, chunks and vectors behind every answer, from raw notes to a searchable FAISS index.',
    features: [[FileText, 'Corpus'], [Cube, 'Embeddings'], [Database, 'FAISS Index']],
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
      <div className="bg-art" aria-hidden="true">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave1" x1="0" x2="1">
              <stop offset="0" stopColor="#0ea5e9" stopOpacity="0.0" />
              <stop offset="0.5" stopColor="#0ea5e9" stopOpacity="0.18" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" x2="1">
              <stop offset="0" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M0 300 C 360 200, 700 380, 1440 160 L1440 400 L0 400 Z" fill="url(#wave1)" />
          <path d="M0 340 C 400 260, 900 400, 1440 300 L1440 400 L0 400 Z" fill="url(#wave2)" />
          <path d="M0 300 C 360 200, 700 380, 1440 160" fill="none" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1.5" />
        </svg>
      </div>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo" aria-hidden="true">P</div>
            <div className="brand-text">
              <span className="brand-name">Course Notes</span>
              <span className="brand-sub">Study Smarter, Not Harder</span>
            </div>
          </div>

          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'}
                aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <t.Icon /> <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="topbar-right">
            <Status health={health} error={healthError} />
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="app">
        <section className="hero" key={current.id}>
          <div className="hero-copy">
            <div className="pills">
              <span className="pill kicker"><Sparkle size={14} /> {current.kicker}</span>
              <span className="pill"><Layers size={15} /> Steps: {current.step}</span>
            </div>
            <h1>{current.title}</h1>
            <p>{current.blurb}</p>
            <div className="features">
              {current.features.map(([Icon, text]) => (
                <span key={text} className="feature"><Icon size={18} /> {text}</span>
              ))}
            </div>
          </div>
          <HeroArt />
        </section>

        <main>
          <Page health={health} />
        </main>

        <footer className="footer">
          <div className="footer-motto">
            <span className="line" /><Sparkle size={18} />
            <span>Learn</span><i>•</i><span>Explore</span><i>•</i><span>Discover</span>
            <span className="line" />
          </div>
          <div className="footer-tech">
            <span>Embeddings <b>all-MiniLM-L6-v2</b></span>
            <span>Vector DB <b>FAISS IndexFlatIP</b></span>
            <span>Generator <b>{health?.llm_model || '—'}</b></span>
          </div>
        </footer>
      </div>
    </>
  )
}

function Status({ health, error }) {
  if (error) return <div className="status bad" title={error}>Offline</div>
  if (!health) return <div className="status pending">Waking up…</div>
  if (!health.index_ready) return <div className="status bad" title={health.index_error || ''}>Index error</div>
  if (!health.llm_configured) return <div className="status warn">Retrieval only</div>
  return <div className="status ok">Ready</div>
}
