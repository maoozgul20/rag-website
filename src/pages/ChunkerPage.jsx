import { useState } from 'react'
import { api } from '../api.js'

const SAMPLE = 'First sentence here. Second sentence here.\n\nNew paragraph starts here. It keeps going for a while.'

// Step 1a: try the recursive chunker on any text and see where it cuts.
export default function ChunkerPage() {
  const [text, setText] = useState(SAMPLE)
  const [size, setSize] = useState(60)
  const [overlap, setOverlap] = useState(10)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function run() {
    setError(null)
    try {
      setResult(await api.chunkTest({ text, chunk_size: size, chunk_overlap: overlap }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="card">
        <p className="intro">
          The recursive chunker cuts at paragraph breaks first, then line breaks, then sentence ends,
          then spaces. Each chunk also carries the first <b>overlap</b> characters of the next one.
        </p>
        <label className="label">Text</label>
        <textarea className="input area" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="controls">
          <label className="control">
            <span>Chunk size: <b>{size}</b></span>
            <input type="range" min="20" max="600" value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="control">
            <span>Overlap: <b>{overlap}</b></span>
            <input type="range" min="0" max="100" value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} />
          </label>
        </div>
        <button className="btn primary" onClick={run}>Chunk it</button>
        {error && <p className="note bad">{error}</p>}
      </div>

      {result && (
        <div className="card">
          <h3>{result.count} chunk{result.count === 1 ? '' : 's'}</h3>
          <ol className="chunk-list">
            {result.chunks.map((c, i) => {
              const next = result.chunks[i + 1]
              const ov = next ? Math.min(overlap, next.length) : 0
              const main = ov ? c.slice(0, c.length - ov) : c
              const tail = ov ? c.slice(c.length - ov) : ''
              return (
                <li key={i}>
                  <div className="muted small">Chunk {i + 1} · {c.length} characters</div>
                  <pre className="chunk">{main}<mark title="Overlap copied from the next chunk">{tail}</mark></pre>
                </li>
              )
            })}
          </ol>
          <p className="muted small">Highlighted text is the overlap copied from the start of the next chunk.</p>
        </div>
      )}
    </section>
  )
}
