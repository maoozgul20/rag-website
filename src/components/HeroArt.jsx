// The hero animation: one short loop of what RAG does.
// A question drops onto a page of notes, a scan line runs down the page,
// three lines get highlighted (the retrieved chunks) with their scores,
// then the highlights collapse into an answer.
// All motion is CSS (see .scene in styles.css); reduced motion shows the final frame.

const LINES = [
  { y: 112, w: 210 }, { y: 134, w: 182 }, { y: 156, w: 224 }, { y: 178, w: 160 },
  { y: 200, w: 214 }, { y: 222, w: 190 }, { y: 244, w: 226 }, { y: 266, w: 150 },
]
// Which lines are "retrieved", in rank order, with a score
const HITS = [
  { line: 2, score: '0.66' },
  { line: 5, score: '0.59' },
  { line: 6, score: '0.58' },
]

export default function HeroArt() {
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 420 380">
        {/* Notes page */}
        <g className="scene-page">
          <rect x="40" y="70" width="270" height="250" rx="14" className="page-sheet" />
          <line x1="70" y1="70" x2="70" y2="320" className="page-margin" />
          {LINES.map((l, i) => (
            <rect key={i} x="84" y={l.y - 4} width={l.w - 30} height="7" rx="3.5" className="page-line" />
          ))}
        </g>

        {/* Highlighter strokes on the retrieved lines */}
        {HITS.map((h, i) => {
          const l = LINES[h.line]
          return (
            <g key={i} className={`scene-hit hit-${i + 1}`}>
              <rect x="78" y={l.y - 10} width={l.w - 18} height="19" rx="5" className="marker" />
              <rect x="84" y={l.y - 4} width={l.w - 30} height="7" rx="3.5" className="page-line on-marker" />
              <g className="score-tag" transform={`translate(${l.w + 70} ${l.y - 11})`}>
                <rect width="52" height="22" rx="11" />
                <text x="26" y="15.5">{h.score}</text>
              </g>
            </g>
          )
        })}

        {/* Scan line */}
        <rect x="46" y="96" width="258" height="3" rx="1.5" className="scan" />

        {/* Question bubble */}
        <g className="scene-question">
          <rect x="96" y="22" width="228" height="38" rx="19" />
          <text x="210" y="46">What is precision?</text>
        </g>

        {/* Answer card */}
        <g className="scene-answer">
          <rect x="150" y="270" width="250" height="84" rx="16" className="answer-card" />
          <rect x="150" y="270" width="6" height="84" rx="3" className="answer-edge" />
          <rect x="172" y="291" width="150" height="8" rx="4" className="answer-line l1" />
          <rect x="172" y="309" width="200" height="8" rx="4" className="answer-line l2" />
          <rect x="172" y="327" width="120" height="8" rx="4" className="answer-line l3" />
          <path d="M372 295 l4 4 l8 -9" className="answer-check" />
        </g>
      </svg>
    </div>
  )
}
