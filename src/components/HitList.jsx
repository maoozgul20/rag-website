import { useState } from 'react'

// Shows retrieved chunks: rank, score bar, source file, chunk text.
// facts (optional): list of strings; each chunk is marked if it contains them (Step 4c).
export default function HitList({ hits, facts = [] }) {
  if (!hits?.length) return null
  return (
    <ol className="hits">
      {hits.map((h) => <Hit key={h.rank} hit={h} facts={facts} />)}
    </ol>
  )
}

function Hit({ hit, facts }) {
  const [open, setOpen] = useState(false)
  const isHybrid = 'semantic' in hit
  // Cosine scores run 0–1; hybrid combined scores run 0–2
  const pct = Math.max(0, Math.min(100, (hit.score / (isHybrid ? 2 : 1)) * 100))
  const preview = hit.chunk.length > 220 && !open ? hit.chunk.slice(0, 220) + '…' : hit.chunk

  return (
    <li className="hit">
      <div className="hit-head">
        <span className="rank">#{hit.rank}</span>
        <span className="source">{hit.source.replace(/^\d+_/, '').replace(/\.\w+$/, '').replace(/_/g, ' ')}</span>
        <span className="score">
          {isHybrid ? 'combined ' : 'score '}
          <b>{hit.score.toFixed(3)}</b>
        </span>
      </div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      {isHybrid && (
        <div className="sub-scores">
          semantic {hit.semantic == null ? '—' : hit.semantic.toFixed(3)} · keyword {hit.keyword.toFixed(3)}
        </div>
      )}
      <pre className="chunk" onClick={() => setOpen(!open)} title="Click to expand">{preview}</pre>
      {facts.length > 0 && (
        <div className="facts">
          {facts.map((f) => (
            <span key={f} className={hit.contains?.[f] ? 'fact yes' : 'fact no'}>
              {hit.contains?.[f] ? '✓' : '✗'} {f}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}
