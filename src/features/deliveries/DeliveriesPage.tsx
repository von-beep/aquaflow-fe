import { useEffect, useMemo, useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { Modal } from '@/components/Modal'
import { formatDateTime, formatOrderPlaced, today } from '@/domain/dates'
import { groupDeliveries, type DeliveryGroup } from '@/domain/deliveryGroups'
import { productName, riderName } from '@/domain/lookups'
import { formatMoney } from '@/domain/money'
import { customerCancelReason, isCustomerCancelled } from '@/domain/cancelReason'
import { gcashReferenceFromNote } from '@/domain/gcashRef'
import { DELIVERY_STATUSES, type DeliveryStatus } from '@/domain/types'
import { CompleteOrderModal } from '@/features/deliveries/CompleteOrderModal'
import { DeliveryFormModal } from '@/features/deliveries/DeliveryFormModal'
import { useAquaFlow } from '@/store/AquaFlowContext'

const FILTERS = ['Today', 'All', ...DELIVERY_STATUSES] as const
/** Completed goes through Finish Transaction (inventory + payment). */
const STATUS_EDIT_OPTIONS = DELIVERY_STATUSES.filter((s) => s !== 'Completed')

export function DeliveriesPage() {
  const { state, patchOrderFields, removeDelivery, refreshOnlineOrders, session } =
    useAquaFlow()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Today')
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formReadOnly, setFormReadOnly] = useState(false)
  const [completeGroup, setCompleteGroup] = useState<DeliveryGroup | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const currency = state.settings.currency || '₱'

  function absoluteProofUrl(path: string | null | undefined): string | null {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${session.apiBaseUrl.replace(/\/$/, '')}${path}`
  }

  function changeRider(orderId: string, riderId: string) {
    void patchOrderFields(orderId, { riderId })
  }

  function changeStatus(group: DeliveryGroup, status: DeliveryStatus) {
    if (group.status === status) return
    if (status === 'Completed') {
      setCompleteGroup(group)
      return
    }
    void patchOrderFields(group.orderId, { status })
    if (filter !== 'Today' && filter !== 'All' && filter !== status) {
      setFilter('All')
    }
  }

  useEffect(() => {
    void refreshOnlineOrders()
  }, [refreshOnlineOrders])

  const groups = useMemo(() => {
    let matched = [...state.deliveries]
    if (filter === 'Today') matched = matched.filter((d) => d.date === today())
    else if (filter !== 'All') matched = matched.filter((d) => d.status === filter)
    if (q) {
      const qq = q.toLowerCase()
      matched = matched.filter((d) => {
        const c = state.customers.find((x) => x.id === d.customerId)
        return ((c?.name ?? '') + (c?.addr ?? '')).toLowerCase().includes(qq)
      })
    }
    const keys = new Set(matched.map((d) => d.orderId || d.id))
    const scoped = state.deliveries.filter((d) => keys.has(d.orderId || d.id))
    return groupDeliveries(scoped)
  }, [state.deliveries, state.customers, filter, q])

  function openNew() {
    setEditId(null)
    setFormReadOnly(false)
    setFormOpen(true)
  }

  function openEdit(id: string) {
    setEditId(id)
    setFormReadOnly(false)
    setFormOpen(true)
  }

  function openView(id: string) {
    setEditId(id)
    setFormReadOnly(true)
    setFormOpen(true)
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Deliveries</h2>
          <div className="sub">Schedule, track, at i-complete ang mga delivery</div>
        </div>
        <div className="headbtns">
          <div className="search">
            <ActionIcon name="search" />
            <input
              placeholder="Search customer / address…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-blue" onClick={openNew}>
            <ActionIcon name="plus" /> New Delivery
          </button>
        </div>
      </div>

      <div className="filterchips">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
          <table className="tbl tbl-align-top">
            <thead>
              <tr>
                <th>Order Place</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Rider</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="num">Total Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      <b>No deliveries</b>
                      Mag-add ng bagong delivery.
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map((g) => {
                  const c = state.customers.find((x) => x.id === g.customerId)
                  const cancelReason =
                    g.status === 'Cancelled' ? customerCancelReason(g.note) : null
                  const locked =
                    g.status === 'Completed' || g.status === 'Cancelled'
                  const gcashRef =
                    g.payMode === 'GCash' ? gcashReferenceFromNote(g.note) : null
                  const proofHref = absoluteProofUrl(g.paymentProofUrl)
                  const payLabel =
                    g.payMode === 'Cash'
                      ? 'COD'
                      : g.payMode === 'GCash'
                        ? gcashRef
                          ? `GCash · ${gcashRef}`
                          : 'GCash'
                        : g.payMode === 'Maya'
                          ? 'Maya'
                          : g.payMode
                  return (
                    <tr key={g.orderId}>
                      <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {formatOrderPlaced(g.date, g.time)}
                        {g.status === 'Completed' && g.completedAt ? (
                          <>
                            <br />
                            <small style={{ color: 'var(--muted)' }}>
                              Done · {formatDateTime(g.completedAt)}
                            </small>
                          </>
                        ) : null}
                        {g.lines.length > 1 ? (
                          <>
                            <br />
                            <small style={{ color: 'var(--muted)' }}>
                              {g.lines.length} items
                            </small>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <b>{c?.name ?? '—'}</b>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>{c?.addr ?? ''}</small>
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {g.lines.map((d) => (
                          <div key={d.id} style={{ marginBottom: 4 }}>
                            {d.qty}x {productName(state.products, d.prodId)}
                            {g.lines.length > 1 ? (
                              <small style={{ color: 'var(--muted)' }}>
                                {' '}
                                · {formatMoney(d.amount, currency)}
                              </small>
                            ) : null}
                          </div>
                        ))}
                      </td>
                      <td>
                        <select
                          className="tbl-select"
                          aria-label={`Rider for ${c?.name ?? 'order'}`}
                          value={g.riderId || ''}
                          disabled={locked}
                          onChange={(e) => changeRider(g.orderId, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {state.riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                          {g.riderId &&
                          !state.riders.some((r) => r.id === g.riderId) ? (
                            <option value={g.riderId}>
                              {riderName(state.riders, g.riderId)}
                            </option>
                          ) : null}
                        </select>
                      </td>
                      <td>
                        <select
                          className="tbl-select"
                          aria-label={`Status for ${c?.name ?? 'order'}`}
                          value={
                            g.status === 'Completed' ? 'Completed' : g.status
                          }
                          disabled={locked}
                          onChange={(e) =>
                            changeStatus(g, e.target.value as DeliveryStatus)
                          }
                        >
                          {g.status === 'Completed' ? (
                            <option value="Completed">Completed</option>
                          ) : null}
                          {STATUS_EDIT_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {g.status !== 'Completed' ? (
                          g.status === 'Cancelled' ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                maxWidth: 220,
                              }}
                            >
                              <span className="chip c-gray">
                                {isCustomerCancelled(g.note)
                                  ? 'By customer'
                                  : 'Cancelled'}
                              </span>
                              {cancelReason ? (
                                <small
                                  style={{
                                    color: 'var(--ink2)',
                                    lineHeight: 1.4,
                                    fontSize: 12,
                                  }}
                                >
                                  <span style={{ color: 'var(--muted)' }}>Reason: </span>
                                  {cancelReason}
                                </small>
                              ) : null}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {g.payMode ? (
                                <span className="chip c-blue" title={g.note || undefined}>
                                  {payLabel}
                                </span>
                              ) : null}
                              {proofHref ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setProofUrl(proofHref)}
                                >
                                  View payment proof
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-green btn-sm"
                                onClick={() => setCompleteGroup(g)}
                              >
                                <ActionIcon name="check" /> Finish Transaction
                              </button>
                            </div>
                          )
                        ) : g.paid ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span className="chip c-green" title={g.note || undefined}>
                              PAID · {payLabel}
                            </span>
                            {proofHref ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setProofUrl(proofHref)}
                              >
                                View payment proof
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="chip c-red">UTANG</span>
                        )}
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(g.total, currency)}
                      </td>
                      <td>
                        <div className="rowact">
                          {locked ? (
                            <button
                              type="button"
                              className="iconbtn"
                              title={
                                g.status === 'Cancelled'
                                  ? 'View cancellation details'
                                  : 'View delivery order details'
                              }
                              onClick={() => openView(g.lines[0]!.id)}
                            >
                              <ActionIcon name="eye" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="iconbtn"
                              title="Edit"
                              onClick={() => openEdit(g.lines[0]!.id)}
                            >
                              <ActionIcon name="edit" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="iconbtn del"
                            title="Delete order"
                            onClick={() => {
                              if (
                                !confirm(
                                  g.lines.length > 1
                                    ? `Delete all ${g.lines.length} items in this order?`
                                    : 'Delete delivery record?',
                                )
                              ) {
                                return
                              }
                              for (const line of g.lines) {
                                void removeDelivery(line.id)
                              }
                            }}
                          >
                            <ActionIcon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeliveryFormModal
        open={formOpen}
        deliveryId={editId}
        readOnly={formReadOnly}
        onClose={() => {
          setFormOpen(false)
          setEditId(null)
          setFormReadOnly(false)
        }}
      />
      <CompleteOrderModal
        group={completeGroup}
        onClose={() => setCompleteGroup(null)}
      />
      <Modal
        title="Payment proof"
        open={Boolean(proofUrl)}
        onClose={() => setProofUrl(null)}
        cancelLabel="Close"
        elevated
      >
        {proofUrl ? (
          <a href={proofUrl} target="_blank" rel="noreferrer">
            <img
              src={proofUrl}
              alt="Payment screenshot"
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 10,
                background: '#fff',
              }}
            />
          </a>
        ) : null}
      </Modal>
    </>
  )
}
