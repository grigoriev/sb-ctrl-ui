/** A small progress ring with the percentage in the middle. */
export function Ring({ pct }: Readonly<{ pct: number }>) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const done = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <svg width="38" height="38" viewBox="0 0 36 36" role="img" aria-label={`${done}% transferred`}>
      <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(circumference * done) / 100} ${circumference}`}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fontSize="11">
        {done}
      </text>
    </svg>
  )
}
