// The one authored motion moment (DESIGN.md → Motion): the year-so-far line draws once.
// Figures are an illustrative example, not real data.
const ACTUAL = "M0,110 L50,103 L100,95 L150,86 L200,77 L250,69 L300,61 L350,52 L400,42 L450,40"

export function YearHorizon() {
  return (
    <svg
      viewBox="0 0 600 132"
      role="img"
      aria-label="Example year: income so far rising through October, a dotted projection to December that ends below the goal line"
      className="my-6 block h-auto w-full overflow-visible"
    >
      <line x1="0" y1="18" x2="600" y2="18" className="stroke-muted-foreground/60 [stroke-dasharray:1_4]" strokeWidth="1" />
      <text x="600" y="11" textAnchor="end" className="fill-muted-foreground text-[12px]">
        goal $90k
      </text>
      <path d={`${ACTUAL} L450,110 Z`} className="fill-primary/10" />
      <path
        d={ACTUAL}
        pathLength={1}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary [stroke-dasharray:1] motion-safe:animate-draw"
      />
      <path d="M450,40 L500,34 L550,30 L600,26" fill="none" strokeWidth="2" className="stroke-tide [stroke-dasharray:3_5]" />
      <line x1="450" y1="34" x2="450" y2="116" strokeWidth="1" className="stroke-foreground/30" />
      <g className="fill-muted-foreground text-[12px]">
        <text x="0" y="130">Jan</text>
        <text x="300" y="130" textAnchor="middle">Jun</text>
        <text x="450" y="130" textAnchor="middle">today</text>
        <text x="600" y="130" textAnchor="end">Dec</text>
      </g>
    </svg>
  )
}
