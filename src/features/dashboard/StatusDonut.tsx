import type { Delivery } from '@/domain/types'

const DCOLORS = ['#168A45', '#0E63C4', '#E0760E', '#6247C0', '#8494A8']

type StatusDonutProps = {
  deliveries: Delivery[]
}

export function StatusDonut({ deliveries }: StatusDonutProps) {
  const entries = (
    [
      ['Completed', deliveries.filter((x) => x.status === 'Completed').length],
      ['In Progress', deliveries.filter((x) => x.status === 'In Progress').length],
      ['Pending', deliveries.filter((x) => x.status === 'Pending').length],
    ] as [string, number][]
  ).filter((e) => e[1] > 0)

  const total = entries.reduce((a, b) => a + b[1], 0)
  if (!total) {
    return (
      <div className="empty">
        <b>No deliveries today</b>
        Mag-schedule ng delivery.
      </div>
    )
  }

  let start = 0
  const arcs = entries.map((e, i) => {
    const frac = e[1] / total
    const end = start + frac * Math.PI * 2
    const x1 = 60 + 44 * Math.sin(start)
    const y1 = 60 - 44 * Math.cos(start)
    const x2 = 60 + 44 * Math.sin(end)
    const y2 = 60 - 44 * Math.cos(end)
    const color = DCOLORS[i]
    const seg =
      frac >= 0.999 ? (
        <circle
          key={e[0]}
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke={color}
          strokeWidth="20"
        />
      ) : (
        <path
          key={e[0]}
          d={`M${x1} ${y1} A44 44 0 ${frac > 0.5 ? 1 : 0} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="20"
        />
      )
    start = end
    return seg
  })

  return (
    <div className="donutwrap">
      <svg
        viewBox="0 0 120 120"
        style={{ width: 128, height: 128, flex: 'none' }}
        aria-label="Delivery status today"
      >
        {arcs}
        <text
          x="60"
          y="57"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          fill="#0C1E33"
        >
          {total}
        </text>
        <text
          x="60"
          y="71"
          textAnchor="middle"
          fontSize="7.5"
          fill="#8494A8"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          TOTAL
        </text>
      </svg>
      <div className="dlegend">
        {entries.map((e, i) => (
          <div className="dr" key={e[0]}>
            <i style={{ background: DCOLORS[i] }} />
            {e[0]}
            <span className="pc">{e[1]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
