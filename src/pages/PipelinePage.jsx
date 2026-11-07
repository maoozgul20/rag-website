import { useEffect, useState } from 'react'
import { api } from '../api.js'

// Steps 0b, 1b, 2, 3: what the index was built from.
export default function PipelinePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [rebuilding, setRebuilding] = useState(false)

  const load = () => api.pipeline().then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  async function rebuild() {
    setRebuilding(true); setError(null)
    try { await api.rebuild(); await load() } catch (e) { setError(e.message) } finally { setRebuilding(false) }
  }

  if (error) return <div className="card"><p className="note bad">{error}</p></div>
  if (!data) return <div className="card"><p className="muted">Loading…</p></div>

  const { corpus, chunking, index } = data
  const maxChars = Math.max(...corpus.files.map((f) => f.characters))

  return (
    <section>
      <div className="stats">
        <Stat label="Files" value={corpus.total_files} />
        <Stat label="Characters" value={corpus.total_characters.toLocaleString()} />
        <Stat label="Chunks" value={chunking.chunks.toLocaleString()} />
        <Stat label="Vector size" value={index.dimension} />
      </div>

      <div className="card">
        <div className="row-between">
          <h3>Step 0b · Corpus</h3>
          <button className="btn ghost" onClick={rebuild} disabled={rebuilding}>
            {rebuilding ? 'Rebuilding…' : 'Rebuild index'}
          </button>
        </div>
        <p className="muted small">To add files: put them in backend/data, run <code>python build_index.py</code>, commit and redeploy. (Rebuild here only lasts until the server sleeps.)</p>
        <ul className="files">
          {corpus.files.map((f) => (
            <li key={f.name}>
              <span className="file-name">{f.name}</span>
              <span className="file-bar"><span style={{ width: `${(f.characters / maxChars) * 100}%` }} /></span>
              <span className="file-count">{f.characters.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Step 1b · Chunking</h3>
        <table className="table">
          <tbody>
            <tr><td>Chunk size / overlap</td><td>{chunking.chunk_size} / {chunking.chunk_overlap} characters</td></tr>
            <tr><td>Average chunk length</td><td>{chunking.average_length} characters</td></tr>
            <tr><td>Longest chunk</td><td>{chunking.longest} characters (size + overlap)</td></tr>
            <tr><td>Shortest chunk</td><td>{chunking.shortest} characters</td></tr>
          </tbody>
        </table>
        <h4>Example chunks</h4>
        {chunking.examples.map((c, i) => <pre key={i} className="chunk">{c}</pre>)}
      </div>

      <div className="card">
        <h3>Steps 2–3 · Embeddings and FAISS index</h3>
        <table className="table">
          <tbody>
            <tr><td>Index type</td><td>{index.type}</td></tr>
            <tr><td>Dimension</td><td>{index.dimension}</td></tr>
            <tr><td>Vectors in index</td><td>{index.vectors.toLocaleString()}</td></tr>
            <tr><td>Index source</td><td>{index.source}</td></tr>
            <tr><td>Build time</td><td>{index.seconds}s</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return <div className="stat"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}
