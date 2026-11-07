import { Layers, Search, Brain, Nodes } from './Icons.jsx'

// Shared top-k slider and semantic/hybrid switch.
export default function Controls({ k, setK, mode, setMode, maxK = 10 }) {
  const pct = ((k - 1) / (maxK - 1)) * 100
  return (
    <div className="controls">
      <label className="control">
        <span className="control-label"><Layers /> Top-k: <b>{k}</b></span>
        <input type="range" min="1" max={maxK} value={k} style={{ '--pct': `${pct}%` }}
          onChange={(e) => setK(Number(e.target.value))} />
      </label>
      <div className="control">
        <span className="control-label"><Search /> Search</span>
        <div className="segmented">
          {['semantic', 'hybrid'].map((m) => (
            <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m === 'semantic' ? <><Brain /> Semantic (FAISS)</> : <><Nodes /> Hybrid (+TF-IDF)</>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
