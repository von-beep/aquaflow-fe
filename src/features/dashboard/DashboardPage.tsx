import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionIcon } from '@/components/ActionIcon'
import { customerBalance, totalUtang } from '@/domain/balance'
import { formatTime, today } from '@/domain/dates'
import { deliveriesOn, salesOn } from '@/domain/sales'
import { formatMoney } from '@/domain/money'
import { STATUS_CHIP } from '@/domain/status'
import { SalesChart } from '@/features/dashboard/SalesChart'
import { StatusDonut } from '@/features/dashboard/StatusDonut'
import { DeliveryFormModal } from '@/features/deliveries/DeliveryFormModal'
import { WalkInRefillModal } from '@/features/dashboard/WalkInRefillModal'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function DashboardPage() {
  const { state } = useAquaFlow()
  const [delivOpen, setDelivOpen] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const currency = state.settings.currency || '₱'
  const t = deliveriesOn(state, today())
  const done = t.filter((x) => x.status === 'Completed').length
  const prog = t.filter((x) => x.status === 'In Progress').length
  const pend = t.filter((x) => x.status === 'Pending').length
  const inv = state.inventory
  const utangAccts = state.customers.filter(
    (c) => customerBalance(c.id, state.utang, state.payments) > 0,
  )
  const todaySales = salesOn(state, today())
  const recent = [...state.deliveries]
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 6)
  const topUt = state.customers
    .map((c) => ({
      c,
      bal: customerBalance(c.id, state.utang, state.payments),
      last: [...state.utang.filter((u) => u.customerId === c.id)].sort((a, b) =>
        b.ts.localeCompare(a.ts),
      )[0],
    }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 5)

  const dateLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Dashboard</h2>
          <div className="sub">
            {state.settings.stationName} · {dateLabel}
          </div>
        </div>
        <div className="headbtns">
          <button type="button" className="btn btn-ghost" onClick={() => setWalkInOpen(true)}>
            <ActionIcon name="plus" /> Walk-in Refill
          </button>
          <button type="button" className="btn btn-blue" onClick={() => setDelivOpen(true)}>
            <ActionIcon name="plus" /> New Delivery
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kg">
          <div className="lbl">Deliveries Today</div>
          <div className="val">{t.length}</div>
          <div className="note">
            Completed {done} · In Progress {prog} · Pending {pend}
          </div>
        </div>
        <div className="kpi kb">
          <div className="lbl">Gallon Inventory</div>
          <div className="val">{(inv.full + inv.empty).toLocaleString()}</div>
          <div className="note">
            {inv.full} Full · {inv.empty} Empty
          </div>
        </div>
        <div className="kpi kp">
          <div className="lbl">Suki / Utang Balance</div>
          <div className="val">{formatMoney(totalUtang(state), currency)}</div>
          <div className="note">{utangAccts.length} customers</div>
        </div>
        <div className="kpi ko">
          <div className="lbl">Today&apos;s Sales</div>
          <div className="val">{formatMoney(todaySales, currency)}</div>
          <div className="note">Completed deliveries today</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-h">
            <h3>Sales · Last 7 Days</h3>
            <span className="chip c-green">Today: {formatMoney(todaySales, currency)}</span>
          </div>
          <div className="card-b">
            <SalesChart state={state} />
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <h3>Delivery Status · Today</h3>
          </div>
          <div className="card-b">
            <StatusDonut deliveries={t} />
          </div>
        </div>
      </div>

      <div className="grid2b">
        <div className="card">
          <div className="card-h">
            <h3>Recent Deliveries</h3>
            <Link to="/admin/deliveries" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">
                        <b>No deliveries yet</b>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recent.map((d) => {
                    const c = state.customers.find((x) => x.id === d.customerId)
                    return (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 700 }}>{c?.name ?? '—'}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c?.addr ?? ''}</td>
                        <td>
                          <span className={`chip ${STATUS_CHIP[d.status]}`}>{d.status}</span>
                        </td>
                        <td className="mono" style={{ fontSize: 11.5 }}>
                          {formatTime(d.time)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Top Utang Accounts</h3>
            <Link to="/admin/utang" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Balance</th>
                  <th>Last Transaction</th>
                </tr>
              </thead>
              <tbody>
                {topUt.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty">
                        <b>Walang utang</b>
                      </div>
                    </td>
                  </tr>
                ) : (
                  topUt.map((x) => (
                    <tr key={x.c.id}>
                      <td style={{ fontWeight: 700 }}>{x.c.name}</td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--red)' }}>
                        {formatMoney(x.bal, currency)}
                      </td>
                      <td className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {x.last
                          ? new Date(x.last.ts + 'T00:00').toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeliveryFormModal
        open={delivOpen}
        deliveryId={null}
        onClose={() => setDelivOpen(false)}
      />
      <WalkInRefillModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
    </>
  )
}
