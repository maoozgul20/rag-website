// Small inline SVG icon set (stroke icons, inherit currentColor).
const make = (paths, { fill = false } = {}) =>
  function Icon({ size = 18, className = '' }) {
    return (
      <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
        fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
        strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </svg>
    )
  }

export const Sparkle = make(<path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5zM19 15.5c.3 2 1.2 2.9 3 3.2-1.8.3-2.7 1.2-3 3.3-.3-2.1-1.2-3-3-3.3 1.8-.3 2.7-1.2 3-3.2z" />, { fill: true })
export const BookOpen = make(<><path d="M2.5 5.5c3-1.2 6.2-1 9.5 1v13c-3.3-2-6.5-2.2-9.5-1z" /><path d="M21.5 5.5c-3-1.2-6.2-1-9.5 1v13c3.3-2 6.5-2.2 9.5-1z" /><path d="M5.5 9.5c1.5-.3 2.8-.1 4 .5M5.5 13c1.5-.3 2.8-.1 4 .5M14.5 10c1.2-.6 2.5-.8 4-.5M14.5 13.5c1.2-.6 2.5-.8 4-.5" /></>)
export const Grid = make(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>)
export const Flow = make(<><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6h7M6 8.5v7M8 16.5l8-9M8.5 18h7" /></>)
export const Moon = make(<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />)
export const Sun = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>)
export const Bolt = make(<path d="M13.5 2 4.5 13.5h7l-1 8.5 9-11.5h-7z" />, { fill: true })
export const Shield = make(<><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" fill="currentColor" stroke="none" /><path d="m8.5 12 2.5 2.5 4.5-5" stroke="var(--shield-ink, #04121f)" /></>)
export const Bars = make(<><rect x="3.5" y="13" width="4" height="8" rx="1" fill="currentColor" stroke="none" /><rect x="10" y="8.5" width="4" height="12.5" rx="1" fill="currentColor" stroke="none" /><rect x="16.5" y="3" width="4" height="18" rx="1" fill="currentColor" stroke="none" /></>)
export const Layers = make(<><path d="m12 3 9 4.5-9 4.5-9-4.5z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>)
export const Search = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const Brain = make(<><path d="M9.5 3.5a3 3 0 0 0-3 3 3 3 0 0 0-2.5 4.5A3 3 0 0 0 5 16a3 3 0 0 0 4.5 3.5V3.5z" /><path d="M14.5 3.5a3 3 0 0 1 3 3 3 3 0 0 1 2.5 4.5A3 3 0 0 1 19 16a3 3 0 0 1-4.5 3.5V3.5z" /><path d="M9.5 10H7.5M14.5 10h2M9.5 14.5H8M14.5 14.5H16" /></>)
export const Nodes = make(<><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="12" cy="12" r="2.5" /><path d="m6.5 6.5 3.7 3.7M17.5 6.5l-3.7 3.7M6.5 17.5l3.7-3.7M17.5 17.5l-3.7-3.7" /></>)
export const Info = make(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>)
export const Scissors = make(<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.2 8.2 20 20M8.2 15.8 20 4" /></>)
export const Database = make(<><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>)
export const Target = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>)
export const CheckCircle = make(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>)
export const FileText = make(<><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" /><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5" /></>)
export const Cube = make(<><path d="m12 2.5 8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z" /><path d="m3.5 7.25 8.5 4.75 8.5-4.75M12 12v9.5" /></>)
export const ArrowUp = make(<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />)
export const Sliders = make(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>)
export const Plus = make(<path d="M12 5v14M5 12h14" />)
export const Chevron = make(<path d="m6 9 6 6 6-6" />)
export const Scale = make(<><path d="M12 3v18M7 21h10M5 7h14" /><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></>)
export const Code = make(<path d="m8 7-5 5 5 5M16 7l5 5-5 5" />)
