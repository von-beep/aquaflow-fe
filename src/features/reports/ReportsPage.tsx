import { useMemo, useState } from 'react'
import { daysAgo, formatDateShort, formatTime, today } from '@/domain/dates'
import { customerName, productName, riderName } from '@/domain/lookups'
import { formatMoney } from '@/domain/money'
import { STATUS_CHIP } from '@/domain/status'
import { downloadBlob } from '@/store/persistence'
import { useAquaFlow } from '@/store/AquaFlowContext'

function IconPrint() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
      />
    </svg>
  )
}

export function ReportsPage() {
  const { state, flash } = useAquaFlow()
  const [fromDraft, setFromDraft] = useState(daysAgo(6))
  const [toDraft, setToDraft] = useState(today())
  const [repFrom, setRepFrom] = useState(daysAgo(6))
  const [repTo, setRepTo] = useState(today())
  const currency = state.settings.currency || '₱'

  const rows = useMemo(
    () =>
      state.deliveries
        .filter((d) => d.date >= repFrom && d.date <= repTo && d.status !== 'Cancelled')
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [state.deliveries, repFrom, repTo],
  )

  const done = rows.filter((d) => d.status === 'Completed')
  const sales = done.filter((d) => d.paid).reduce((a, b) => a + Number(b.amount), 0)
  const utangSales = done.filter((d) => !d.paid).reduce((a, b) => a + Number(b.amount), 0)
  const gallons = done.reduce((a, b) => a + Number(b.qty), 0)
  const coll = state.payments
    .filter((p) => p.ts >= repFrom && p.ts <= repTo)
    .reduce((a, b) => a + Number(b.amount), 0)

  const byRider = new Map<string, { n: number; g: number; amt: number }>()
  done.forEach((d) => {
    const n = riderName(state.riders, d.riderId)
    const cur = byRider.get(n) ?? { n: 0, g: 0, amt: 0 }
    cur.n++
    cur.g += Number(d.qty)
    cur.amt += Number(d.amount)
    byRider.set(n, cur)
  })

  function exportCSV() {
    let csv = 'Date,Time,Customer,Address,Order,Qty,Rider,Status,Paid,Mode,Amount\n'
    state.deliveries
      .filter((d) => d.date >= repFrom && d.date <= repTo && d.status !== 'Cancelled')
      .forEach((d) => {
        const c = state.customers.find((x) => x.id === d.customerId)
        csv +=
          [
            d.date,
            d.time,
            `"${c?.name ?? ''}"`,
            `"${c?.addr ?? ''}"`,
            `"${productName(state.products, d.prodId)}"`,
            d.qty,
            `"${riderName(state.riders, d.riderId)}"`,
            d.status,
            d.paid ? 'Yes' : 'No',
            d.payMode,
            Number(d.amount).toFixed(2),
          ].join(',') + '\n'
      })
    downloadBlob(csv, `aquaflow-report-${repFrom}-to-${repTo}.csv`, 'text/csv')
    flash('CSV exported ✓')
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Reports</h2>
          <div className="sub">Sales, deliveries, at rider performance per date range</div>
        </div>
        <div className="headbtns">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <IconPrint /> Print
          </button>
          <button type="button" className="btn btn-navy" onClick={exportCSV}>
            <IconDownload /> Export CSV
          </button>
        </div>
      </div>

      <div className="card noprint" style={{ marginBottom: 15 }}>
        <div
          className="card-b"
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="rF">From</label>
            <input
              id="rF"
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="rT">To</label>
            <input
              id="rT"
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-blue"
            onClick={() => {
              setRepFrom(fromDraft)
              setRepTo(toDraft)
            }}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kg">
          <div className="lbl">Cash/GCash Sales</div>
          <div className="val">{formatMoney(sales, currency)}</div>
        </div>
        <div className="kpi ko">
          <div className="lbl">Utang Sales</div>
          <div className="val">{formatMoney(utangSales, currency)}</div>
        </div>
        <div className="kpi kb">
          <div className="lbl">Gallons Delivered</div>
          <div className="val">{gallons.toLocaleString()}</div>
          <div className="note">{done.length} completed deliveries</div>
        </div>
        <div className="kpi kp">
          <div className="lbl">Collections Received</div>
          <div className="val">{formatMoney(coll, currency)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 15 }}>
        <div className="card-h">
          <h3>Rider Performance</h3>
        </div>
        <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Rider</th>
                <th className="num">Deliveries</th>
                <th className="num">Gallons</th>
                <th className="num">Amount Handled</th>
              </tr>
            </thead>
            <tbody>
              {[...byRider.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([n, v]) => (
                <tr key={n}>
                  <td style={{ fontWeight: 700 }}>{n}</td>
                  <td className="num">{v.n}</td>
                  <td className="num">{v.g}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {formatMoney(v.amt, currency)}
                  </td>
                </tr>
              ))}
              {byRider.size === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty">
                      <b>No data</b>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>
            All Deliveries · {repFrom} → {repTo}
          </h3>
        </div>
        <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Rider</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <b>No deliveries in range</b>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id}>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      {formatDateShort(d.date)} {formatTime(d.time)}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {customerName(state.customers, d.customerId)}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {d.qty}x {productName(state.products, d.prodId)}
                    </td>
                    <td>{riderName(state.riders, d.riderId)}</td>
                    <td>
                      <span className={`chip ${STATUS_CHIP[d.status]}`}>{d.status}</span>
                    </td>
                    <td>
                      {d.status !== 'Completed' ? (
                        '—'
                      ) : d.paid ? (
                        <span className="chip c-green">{d.payMode}</span>
                      ) : (
                        <span className="chip c-red">UTANG</span>
                      )}
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatMoney(d.amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
