import { useState } from 'react'

// Retrieved passages: rank, source file, score drawn as a highlighter stroke, passage text.
// facts (optional): strings to check; each passage is marked if it contains them (Step 4c).
export default function HitList({ hits, facts = [] }) {
  if (!hits?.length) return null
  return (
    <ol className="hits">
      {hits.map((h, i) => <Hit key={`${h.rank}-${h.source}-${h.score}`} hit={h} facts={facts} index={i} />)}
    </ol>
  )
}

const prettySource = (s) => s.replace(/^\d+_/, '').replace(/\.\w+$/, '').replace(/_/g, ' ')

function Hit({ hit, facts, index }) {
  const [open, setOpen] = useState(false)
  const isHybrid = 'semantic' in hit
  // Cosine scores run 0–1; hybrid combined scores run 0–2
  const pct = Math.max(2, Math.min(100, (hit.score / (isHybrid ? 2 : 1)) * 100))
  // Notes have many blank lines; squeeze them so passages read as text
  const clean = hit.chunk.replace(/\s*\n\s*\n\s*/g, '\n').trim()
  const preview = clean.replace(/\s+/g, ' ')
  const long = preview.length > 220
  const text = open ? clean : (long ? preview.slice(0, 220).trimEnd() + '…' : preview)

  return (
    <li className="hit" style={{ '--i': index }}>
      <span className="rank" aria-label={`Rank ${hit.rank}`}>{hit.rank}</span>
      <div className="hit-body">
        <div className="hit-head">
          <span className="source" title={hit.source}>{prettySource(hit.source)}</span>
          <span className="score">
            <span className="muted">{isHybrid ? 'combined' : 'score'}</span> <b>{hit.score.toFixed(3)}</b>
          </span>
        </div>
        <div className="bar" aria-hidden="true"><div style={{ '--w': `${pct}%` }} /></div>
        {isHybrid && (
          <div className="sub-scores">
            meaning {hit.semantic == null ? '—' : hit.semantic.toFixed(3)}, keywords {hit.keyword.toFixed(3)}
          </div>
        )}
        <p className="chunk-text">{text}</p>
        {long && (
          <button type="button" className="link-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Show less' : 'Show whole passage'}
          </button>
        )}
        {facts.length > 0 && (
          <div className="facts">
            {facts.map((f) => (
              <span key={f} className={hit.contains?.[f] ? 'fact yes' : 'fact no'}>
                {hit.contains?.[f] ? 'Contains' : 'Missing'} “{f}”
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
