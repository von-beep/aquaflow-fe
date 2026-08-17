import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatMoney } from '@/domain/money'
import { formatDateTime, formatOrderPlaced } from '@/domain/dates'
import { customerCancelReason } from '@/domain/cancelReason'
import { STATUS_CHIP } from '@/domain/status'
import type { DeliveryStatus } from '@/domain/types'
import { DELIVERY_STATUSES } from '@/domain/types'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

type Props = {
  apiBaseUrl: string
  token: string
  refreshKey?: number
  /** Checkout orderIds with status changes since the consumer last viewed Orders. */
  updatedOrderIds?: string[]
}

type OrderGroup = {
  orderId: string
  lines: api.ConsumerOrder[]
  total: number
  status: DeliveryStatus
  representative: api.ConsumerOrder
}

function asStatus(s: string): DeliveryStatus {
  return DELIVERY_STATUSES.includes(s as DeliveryStatus)
    ? (s as DeliveryStatus)
    : 'Pending'
}

function groupConsumerOrders(orders: api.ConsumerOrder[]): OrderGroup[] {
  const map = new Map<string, api.ConsumerOrder[]>()
  for (const o of orders) {
    const key = o.orderId || o.id
    const arr = map.get(key)
    if (arr) arr.push(o)
    else map.set(key, [o])
  }
  const groups: OrderGroup[] = []
  for (const [orderId, lines] of map) {
    const statuses = new Set(lines.map((l) => asStatus(l.status)))
    let status: DeliveryStatus = asStatus(lines[0]!.status)
    if (statuses.has('In Progress')) status = 'In Progress'
    else if (statuses.has('Pending')) status = 'Pending'
    else if (statuses.has('Completed') && statuses.size === 1) status = 'Completed'
    else if (statuses.has('Cancelled') && statuses.size === 1) status = 'Cancelled'
    groups.push({
      orderId,
      lines,
      total: lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
      status,
      representative: lines[0]!,
    })
  }
  return groups
}

export function ConsumerOrdersPanel({
  apiBaseUrl,
  token,
  refreshKey = 0,
  updatedOrderIds = [],
}: Props) {
  const [orders, setOrders] = useState<api.ConsumerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<OrderGroup | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [riderTarget, setRiderTarget] = useState<api.ConsumerOrder | null>(null)
  const groups = useMemo(() => groupConsumerOrders(orders), [orders])
  const updatedSet = useMemo(() => new Set(updatedOrderIds), [updatedOrderIds])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setActionError(null)
    void api
      .listConsumerOrders(apiBaseUrl, token)
      .then((res) => {
        if (cancelled) return
        setOrders(res.orders)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      })
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, token, refreshKey])

  function openCancel(group: OrderGroup) {
    if (group.status !== 'Pending') return
    setCancelTarget(group)
    setReason('')
    setReasonError(null)
    setActionError(null)
  }

  function closeCancel() {
    if (cancellingId) return
    setCancelTarget(null)
    setReason('')
    setReasonError(null)
  }

  if (loading) {
    return <p style={{ color: 'var(--ink2)', fontSize: 13 }}>Loading your orders…</p>
  }
  if (error) {
    return <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
  }
  if (orders.length === 0) {
    return (
      <div className="empty">
        <b>No orders yet</b>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          Place an Order Now at any station — it will show up here with live status.
        </span>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {actionError ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{actionError}</p>
      ) : null}
      <table className="tbl">
        <thead>
          <tr>
            <th>Order Place</th>
            <th>Station</th>
            <th>Order</th>
            <th>Status</th>
            <th className="num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const o = g.representative
            const canCancel = g.status === 'Pending'
            const cancelReason =
              g.status === 'Cancelled' ? customerCancelReason(o.note) : null
            return (
              <tr key={g.orderId}>
                <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                  {formatOrderPlaced(o.date, o.time)}
                  {g.status === 'Completed' && o.completedAt ? (
                    <>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>
                        Done · {formatDateTime(o.completedAt)}
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
                  <b>{o.stationName}</b>
                </td>
                <td style={{ fontSize: 12.5 }}>
                  {g.lines.map((line) => (
                    <div key={line.id} style={{ marginBottom: 4 }}>
                      {line.qty}× {line.productName}
                      {g.lines.length > 1 ? (
                        <small style={{ color: 'var(--muted)' }}>
                          {' '}
                          · {formatMoney(line.amount, line.currency)}
                        </small>
                      ) : null}
                    </div>
                  ))}
                  {o.payMode ? (
                    <small style={{ color: 'var(--muted)' }}>
                      {o.payMode === 'Cash' ? 'COD' : o.payMode}
                    </small>
                  ) : null}
                  {cancelReason ? (
                    <>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>
                        Reason: {cancelReason}
                      </small>
                    </>
                  ) : null}
                </td>
                <td>
                  <span className={`chip ${STATUS_CHIP[g.status]}`}>{g.status}</span>
                  {updatedSet.has(g.orderId) ? (
                    <span className="lp-order-updated">Updated</span>
                  ) : null}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {formatMoney(g.total, o.currency)}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setRiderTarget(o)}
                    >
                      Rider
                    </button>
                    {canCancel ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red)' }}
                        disabled={cancellingId === g.orderId}
                        onClick={() => openCancel(g)}
                      >
                        Cancel
                      </button>
                    ) : g.status === 'In Progress' ? (
                      <small style={{ color: 'var(--muted)' }}>Can’t cancel</small>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <Modal
        title="Cancel order"
        open={cancelTarget !== null}
        onClose={closeCancel}
        cancelLabel="Keep order"
        saveLabel={cancellingId ? 'Cancelling…' : 'Cancel order'}
        elevated
        onSave={async () => {
          if (!cancelTarget || cancellingId) return false
          const trimmed = reason.trim()
          if (!trimmed) {
            setReasonError('Please state a reason for cancelling')
            return false
          }
          setCancellingId(cancelTarget.orderId)
          setReasonError(null)
          setActionError(null)
          try {
            const res = await api.cancelConsumerOrder(
              apiBaseUrl,
              token,
              cancelTarget.orderId,
              trimmed,
            )
            if (res.orders?.length) {
              const byId = new Map(res.orders.map((o) => [o.id, o]))
              setOrders((prev) => prev.map((o) => byId.get(o.id) ?? o))
            } else {
              void api.listConsumerOrders(apiBaseUrl, token).then((r) => {
                setOrders(r.orders)
              })
            }
            setCancelTarget(null)
            setReason('')
            return true
          } catch (err) {
            setReasonError(
              err instanceof ApiError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : 'Could not cancel order',
            )
            void api.listConsumerOrders(apiBaseUrl, token).then((res) => {
              setOrders(res.orders)
            })
            return false
          } finally {
            setCancellingId(null)
          }
        }}
      >
        {cancelTarget ? (
          <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
            {cancelTarget.lines.length > 1
              ? `${cancelTarget.lines.length} items`
              : `${cancelTarget.representative.qty}× ${cancelTarget.representative.productName}`}{' '}
            from <b>{cancelTarget.representative.stationName}</b>
            {' · '}
            Total {formatMoney(
              cancelTarget.total,
              cancelTarget.representative.currency,
            )}
            . The station will see your reason.
          </p>
        ) : null}
        <div className="field">
          <label htmlFor="cancel_reason">Reason for cancelling</label>
          <textarea
            id="cancel_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Ordered by mistake, change of plans…"
            required
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        {reasonError ? (
          <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{reasonError}</p>
        ) : null}
      </Modal>

      <Modal
        title="Delivery Rider Info"
        open={riderTarget !== null}
        onClose={() => setRiderTarget(null)}
        hideHeader
        hideFooter
        elevated
        modalClassName="modal-rider"
      >
        {riderTarget ? (
          <div className="rider-info">
            <div className="rider-info-avatar" aria-hidden="true">
              <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="36" cy="36" r="36" fill="#143a66" />
                <ellipse cx="36" cy="58" rx="22" ry="14" fill="#f5c542" />
                <circle cx="36" cy="34" r="14" fill="#c68642" />
                <path
                  d="M18 30c2-12 12-18 18-18s16 6 18 18c-4-3-10-5-18-5s-14 2-18 5z"
                  fill="#f5c542"
                />
                <path
                  d="M20 28c1.5-8 8-13 16-13s14.5 5 16 13"
                  stroke="#e0a820"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <rect x="28" y="24" width="16" height="5" rx="2.5" fill="#1a2a40" opacity="0.35" />
                <circle cx="30" cy="33" r="1.6" fill="#2a1a10" />
                <circle cx="42" cy="33" r="1.6" fill="#2a1a10" />
                <path
                  d="M32 39c1.2 2 2.8 3 4 3s2.8-1 4-3"
                  stroke="#2a1a10"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <h4 className="rider-info-title">Delivery Rider Info</h4>
            {riderTarget.riderName ? (
              <div className="rider-info-rows">
                <div className="rider-info-row">
                  <div className="rider-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="3.5" />
                      <path
                        strokeLinecap="round"
                        d="M5.5 19c1.5-3.2 3.8-4.8 6.5-4.8S17 15.8 18.5 19"
                      />
                    </svg>
                  </div>
                  <div className="rider-info-meta">
                    <span className="rider-info-label">Name</span>
                    <div className="rider-info-value">{riderTarget.riderName}</div>
                  </div>
                </div>
                <div className="rider-info-row">
                  <div className="rider-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.5 4.5c.4-.4 1-.5 1.5-.3l2.2.9c.6.2 1 .8.9 1.4l-.4 2.2a1.2 1.2 0 0 1-.7.9l-1.3.5a11 11 0 0 0 5.2 5.2l.5-1.3c.2-.4.5-.6.9-.7l2.2-.4c.6-.1 1.2.3 1.4.9l.9 2.2c.2.5.1 1.1-.3 1.5l-1.2 1.2c-.5.5-1.2.7-1.9.5A15.5 15.5 0 0 1 5 8.6c-.2-.7 0-1.4.5-1.9l1-1.2z"
                      />
                    </svg>
                  </div>
                  <div className="rider-info-meta">
                    <span className="rider-info-label">Contact Number</span>
                    <div className="rider-info-value">
                      {riderTarget.riderPhone ? (
                        <a href={`tel:${riderTarget.riderPhone.replace(/\s+/g, '')}`}>
                          {riderTarget.riderPhone}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                          No contact number on file
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rider-info-empty">
                No rider assigned yet. The station will assign one when your order is
                prepared for delivery.
              </p>
            )}
            <button
              type="button"
              className="rider-info-close"
              onClick={() => setRiderTarget(null)}
            >
              Close
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
