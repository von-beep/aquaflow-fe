import { useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { customerBalance, totalUtang } from '@/domain/balance'
import { formatDateShort } from '@/domain/dates'
import { formatMoney } from '@/domain/money'
import {
  AddUtangModal,
  EditLedgerModal,
  ReceivePaymentModal,
  type LedgerRow,
} from '@/features/utang/CreditModals'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function UtangPage() {
  const { state, flash, removeUtang, removePayment } = useAquaFlow()
  const [viewId, setViewId] = useState<string | null>(null)
  const [utangOpen, setUtangOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<LedgerRow | null>(null)
  const currency = state.settings.currency || '₱'

  const detailCustomer = viewId
    ? state.customers.find((x) => x.id === viewId)
    : undefined

  if (viewId && !detailCustomer) {
    setViewId(null)
  }

  if (viewId && detailCustomer) {
    const c = detailCustomer
    const bal = customerBalance(c.id, state.utang, state.payments)
    const totalIn = state.utang
      .filter((u) => u.customerId === c.id)
      .reduce((a, b) => a + Number(b.amount), 0)
    const totalOut = state.payments
      .filter((p) => p.customerId === c.id)
      .reduce((a, b) => a + Number(b.amount), 0)
    const rows: LedgerRow[] = [
      ...state.utang
        .filter((u) => u.customerId === c.id)
        .map((u) => ({ ...u, type: 'utang' as const })),
      ...state.payments
        .filter((p) => p.customerId === c.id)
        .map((p) => ({ ...p, type: 'bayad' as const })),
    ].sort((a, b) => b.ts.localeCompare(a.ts))

    return (
      <>
        <div className="pagehead">
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewId(null)}
              style={{ marginBottom: 9 }}
            >
              ← Back
            </button>
            <h2>{c.name}</h2>
            <div className="sub">
              📍 {c.addr || ''} · {c.phone || ''}
            </div>
          </div>
          <div className="headbtns">
            <button type="button" className="btn btn-orange" onClick={() => setUtangOpen(true)}>
              <ActionIcon name="plus" /> Add Utang
            </button>
            <button type="button" className="btn btn-green" onClick={() => setPayOpen(true)}>
              <ActionIcon name="check" /> Receive Payment
            </button>
          </div>
        </div>

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <div className={`kpi ${bal > 0 ? 'ko' : 'kg'}`}>
            <div className="lbl">Current Balance</div>
            <div className="val">{formatMoney(bal, currency)}</div>
          </div>
          <div className="kpi kb">
            <div className="lbl">Total Inutang</div>
            <div className="val">{formatMoney(totalIn, currency)}</div>
          </div>
          <div className="kpi kg">
            <div className="lbl">Total Nabayaran</div>
            <div className="val">{formatMoney(totalOut, currency)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Ledger History</h3>
          </div>
          <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">
                        <b>No entries</b>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.type}-${r.id}`}>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {formatDateShort(r.ts)}
                      </td>
                      <td>
                        {r.type === 'utang' ? (
                          <span className="chip c-red">UTANG</span>
                        ) : (
                          <span className="chip c-green">
                            BAYAD{r.mode ? ` · ${r.mode}` : ''}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{r.note || ''}</td>
                      <td
                        className="num"
                        style={{
                          fontWeight: 700,
                          color: r.type === 'utang' ? 'var(--red)' : 'var(--green)',
                        }}
                      >
                        {r.type === 'utang' ? '+' : '−'}
                        {formatMoney(r.amount, currency)}
                      </td>
                      <td>
                        <div className="rowact">
                          <button
                            type="button"
                            className="iconbtn"
                            onClick={() => setEditEntry(r)}
                          >
                            <ActionIcon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="iconbtn del"
                            onClick={() => {
                              if (!confirm('Delete entry?')) return
                              if (r.type === 'utang') void removeUtang(r.id)
                              else void removePayment(r.id)
                            }}
                          >
                            <ActionIcon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AddUtangModal
          open={utangOpen}
          defaultCustomerId={c.id}
          onClose={() => setUtangOpen(false)}
        />
        <ReceivePaymentModal
          open={payOpen}
          defaultCustomerId={c.id}
          onClose={() => setPayOpen(false)}
        />
        <EditLedgerModal entry={editEntry} onClose={() => setEditEntry(null)} />
      </>
    )
  }

  const list = state.customers
    .map((c) => ({ ...c, bal: customerBalance(c.id, state.utang, state.payments) }))
    .sort((a, b) => b.bal - a.bal)

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Suki Credit / Utang List</h2>
          <div className="sub">
            Kabuuang utang:{' '}
            <b className="mono" style={{ color: 'var(--red)' }}>
              {formatMoney(totalUtang(state), currency)}
            </b>{' '}
            · click a row para sa full ledger
          </div>
        </div>
        <div className="headbtns">
          <button
            type="button"
            className="btn btn-orange"
            onClick={() => {
              if (!state.customers.length) {
                flash('Mag-add muna ng customer')
                return
              }
              setUtangOpen(true)
            }}
          >
            <ActionIcon name="plus" /> Add Utang
          </button>
          <button
            type="button"
            className="btn btn-green"
            onClick={() => {
              if (!state.customers.length) {
                flash('Mag-add muna ng customer')
                return
              }
              setPayOpen(true)
            }}
          >
            <ActionIcon name="check" /> Receive Payment
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Address</th>
                <th className="num">Balance</th>
                <th>Last Transaction</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <b>No customers</b>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const last = [
                    ...state.utang.filter((u) => u.customerId === c.id),
                    ...state.payments.filter((p) => p.customerId === c.id),
                  ].sort((a, b) => b.ts.localeCompare(a.ts))[0]
                  return (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setViewId(c.id)}
                    >
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.addr || ''}</td>
                      <td
                        className="num"
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: c.bal > 0 ? 'var(--red)' : 'var(--green)',
                        }}
                      >
                        {formatMoney(c.bal, currency)}
                      </td>
                      <td className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {last ? formatDateShort(last.ts) : '—'}
                      </td>
                      <td>
                        {c.bal <= 0 ? (
                          <span className="chip c-green">CLEAR</span>
                        ) : (
                          <span className="chip c-red">MAY UTANG</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUtangModal open={utangOpen} onClose={() => setUtangOpen(false)} />
      <ReceivePaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
    </>
  )
}
