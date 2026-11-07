// Decorative hero illustration: glowing notes page, book stack and graduation cap.
export default function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 420 330" aria-hidden="true">
      <defs>
        <linearGradient id="ha-doc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1d4ed8" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="ha-book1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="ha-book2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#312e81" /><stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="ha-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0f2fe" /><stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
        <linearGradient id="ha-cap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" /><stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <filter id="ha-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Glowing platform rings */}
      <ellipse cx="215" cy="278" rx="190" ry="32" fill="none" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="2" filter="url(#ha-glow)" />
      <ellipse cx="215" cy="278" rx="140" ry="20" fill="#22d3ee" fillOpacity="0.08" />
      <path d="M40 270 C 120 215, 330 210, 405 250" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Book stack */}
      <g>
        <rect x="205" y="236" width="170" height="34" rx="6" fill="url(#ha-book2)" />
        <rect x="213" y="242" width="156" height="20" rx="3" fill="url(#ha-page)" opacity="0.9" />
        <path d="M218 247h146M218 252h146M218 257h146" stroke="#818cf8" strokeOpacity="0.6" />

        <rect x="215" y="203" width="160" height="34" rx="6" fill="url(#ha-book1)" />
        <rect x="223" y="209" width="146" height="20" rx="3" fill="url(#ha-page)" opacity="0.9" />
        <path d="M228 214h136M228 219h136M228 224h136" stroke="#60a5fa" strokeOpacity="0.6" />

        <rect x="208" y="170" width="158" height="34" rx="6" fill="url(#ha-book2)" />
        <rect x="216" y="176" width="144" height="20" rx="3" fill="url(#ha-page)" opacity="0.9" />
        <path d="M221 181h134M221 186h134M221 191h134" stroke="#818cf8" strokeOpacity="0.6" />
      </g>

      {/* Graduation cap */}
      <g>
        <path d="M262 128 v24 q48 16 96 0 v-24" fill="url(#ha-cap)" stroke="#38bdf8" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M310 88 L395 112 L310 136 L225 112 Z" fill="url(#ha-cap)" stroke="#38bdf8" strokeWidth="1.5" filter="url(#ha-glow)" />
        <circle cx="310" cy="112" r="4" fill="#f59e0b" />
        <path d="M310 112 L372 120 L372 160" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M366 158 h12 l3 26 h-18 z" fill="#f59e0b" />
      </g>

      {/* Notes page */}
      <g transform="rotate(-9 175 150)" filter="url(#ha-glow)">
        <rect x="110" y="48" width="132" height="190" rx="10" fill="url(#ha-doc)" stroke="#67e8f9" strokeWidth="2" />
        <rect x="128" y="70" width="58" height="9" rx="4.5" fill="#a5f3fc" />
        <g stroke="#67e8f9" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.85">
          <path d="M128 98h96M128 116h84M128 134h96M128 152h70M128 170h90M128 188h60" />
        </g>
        <path d="M100 236 q 0 -14 14 -14 h 122 q 14 0 14 14 q 0 14 -14 14 h -122 q -14 0 -14 -14z" fill="#0ea5e9" fillOpacity="0.35" stroke="#67e8f9" strokeWidth="1.5" />
      </g>

      {/* Sparkles */}
      <g fill="#67e8f9">
        <circle cx="70" cy="70" r="2.5" opacity="0.8" />
        <circle cx="96" cy="150" r="2" opacity="0.6" />
        <circle cx="400" cy="70" r="2.5" opacity="0.7" />
        <circle cx="405" cy="200" r="2" opacity="0.6" />
        <circle cx="250" cy="30" r="2" opacity="0.7" />
        <circle cx="60" cy="230" r="1.8" opacity="0.5" />
      </g>
    </svg>
  )
}
