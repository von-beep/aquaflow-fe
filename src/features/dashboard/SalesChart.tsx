import { daysAgo, formatDateShort } from '@/domain/dates'
import { salesOn } from '@/domain/sales'
import type { AquaFlowState } from '@/domain/types'

type SalesChartProps = {
  state: AquaFlowState
}

export function SalesChart({ state }: SalesChartProps) {
  const days = [...Array(7)].map((_, i) => daysAgo(6 - i))
  const data = days.map((d) => salesOn(state, d))
  const max = Math.max(100, ...data)
  const W = 560
  const H = 200
  const pl = 44
  const pb = 26
  const pt = 12
  const x = (i: number) => pl + ((W - pl - 10) * i) / 6
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max)
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${pl},${H - pb} ${pts} ${x(6)},${H - pb}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} aria-label="Sales last 7 days">
      {[0, 1, 2, 3].map((i) => {
        const yy = pt + ((H - pt - pb) * i) / 3
        const v = Math.round((max * (3 - i)) / 3)
        const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
        return (
          <g key={i}>
            <line x1={pl} y1={yy} x2={W - 4} y2={yy} stroke="#DDE8F2" />
            <text
              x={pl - 6}
              y={yy + 4}
              textAnchor="end"
              fontSize="9"
              fill="#8494A8"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          </g>
        )
      })}
      <polyline points={area} fill="rgba(14,99,196,.09)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#0E63C4"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => (
        <circle
          key={days[i]}
          cx={x(i)}
          cy={y(v)}
          r="3.5"
          fill="#fff"
          stroke="#0E63C4"
          strokeWidth="2"
        />
      ))}
      {days.map((d, i) => (
        <text
          key={d}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9.5"
          fill="#3C5068"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {formatDateShort(d)}
        </text>
      ))}
    </svg>
  )
}
