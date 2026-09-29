const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconSound = ({ on }) => (
  <svg {...base}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {on ? (
      <>
        <path d="M15.5 9a4 4 0 0 1 0 6" />
        <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
      </>
    ) : (
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    )}
  </svg>
)
export const IconReset = () => (
  <svg {...base}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v4h4" />
  </svg>
)
export const IconExpand = () => (
  <svg {...base}>
    <path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconArrow = ({ dir = 'right' }) => (
  <svg {...base} style={{ transform: { right: 'none', left: 'rotate(180deg)', down: 'rotate(90deg)', up: 'rotate(-90deg)' }[dir] }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const IconTune = () => (
  <svg {...base}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
)
export const IconPlay = ({ playing }) => (
  <svg {...base}>{playing ? <path d="M8 5.5v13M16 5.5v13" /> : <path d="M7.5 5.5l11 6.5-11 6.5z" />}</svg>
)
export const IconList = () => (
  <svg {...base}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.8" cy="6.5" r="0.9" fill="currentColor" />
    <circle cx="4.8" cy="12" r="0.9" fill="currentColor" />
    <circle cx="4.8" cy="17.5" r="0.9" fill="currentColor" />
  </svg>
)
