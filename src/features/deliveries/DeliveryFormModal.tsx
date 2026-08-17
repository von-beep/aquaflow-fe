import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatDateTime, formatOrderPlaced, today, uid } from '@/domain/dates'
import { formatMoney } from '@/domain/money'
import { customerCancelReason, isCustomerCancelled } from '@/domain/cancelReason'
import { DELIVERY_STATUSES, type Delivery, type DeliveryStatus } from '@/domain/types'
import { useAquaFlow } from '@/store/AquaFlowContext'

type DeliveryFormModalProps = {
  open: boolean
  deliveryId: string | null
  prefillCustomerId?: string
  /** Read-only order details (e.g. completed deliveries). */
  readOnly?: boolean
  onClose: () => void
}

export function DeliveryFormModal({
  open,
  deliveryId,
  prefillCustomerId,
  readOnly = false,
  onClose,
}: DeliveryFormModalProps) {
  const { state, saveDelivery, flash } = useAquaFlow()
  const existing = deliveryId ? state.deliveries.find((d) => d.id === deliveryId) : undefined
  const currency = state.settings.currency || '₱'
  const locked = readOnly && Boolean(existing)

  const defaults = (): Omit<Delivery, 'id' | 'paid' | 'payMode'> => ({
    date: existing?.date ?? today(),
    time: existing?.time ?? new Date().toTimeString().slice(0, 5),
    customerId:
      existing?.customerId ??
      prefillCustomerId ??
      state.customers[0]?.id ??
      '',
    riderId: existing?.riderId ?? state.riders[0]?.id ?? '',
    prodId: existing?.prodId ?? state.products[0]?.id ?? '',
    qty: existing?.qty ?? 1,
    amount: existing?.amount ?? state.products[0]?.price ?? 0,
    status: existing?.status ?? 'Pending',
    note: existing?.note ?? '',
    orderId: existing?.orderId ?? '',
  })

  const [form, setForm] = useState(defaults)
  const syncKey = `${open}:${deliveryId ?? 'new'}:${prefillCustomerId ?? ''}:${readOnly}`
  const [synced, setSynced] = useState(syncKey)
  if (open && syncKey !== synced) {
    setSynced(syncKey)
    setForm(defaults())
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function recalcAmount(prodId: string, qty: number) {
    const p = state.products.find((x) => x.id === prodId)
    if (p) setField('amount', p.price * qty)
  }

  const customer = state.customers.find((c) => c.id === form.customerId)
  const product = state.products.find((p) => p.id === form.prodId)
  const rider = state.riders.find((r) => r.id === form.riderId)

  if (locked && existing) {
    return (
      <Modal
        title="Delivery order details"
        open={open}
        onClose={onClose}
        cancelLabel="Close"
      >
        <dl className="detail-list">
          <div>
            <dt>Order Place</dt>
            <dd>{formatOrderPlaced(existing.date, existing.time)}</dd>
          </div>
          {existing.completedAt ? (
            <div>
              <dt>Completed</dt>
              <dd>{formatDateTime(existing.completedAt)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Customer</dt>
            <dd>
              {customer?.name ?? '—'}
              {customer?.phone ? (
                <>
                  <br />
                  <small style={{ color: 'var(--muted)' }}>{customer.phone}</small>
                </>
              ) : null}
              {customer?.addr ? (
                <>
                  <br />
                  <small style={{ color: 'var(--muted)' }}>{customer.addr}</small>
                </>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>
              {existing.qty}× {product?.name ?? 'Product'}
            </dd>
          </div>
          <div>
            <dt>Product Amount</dt>
            <dd>
              {product
                ? formatMoney(product.price, currency)
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Total Amount</dt>
            <dd>{formatMoney(existing.amount, currency)}</dd>
          </div>
          <div>
            <dt>Rider</dt>
            <dd>{rider?.name ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{existing.status}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>
              {existing.paid
                ? `Paid · ${existing.payMode || '—'}`
                : existing.status === 'Completed'
                  ? 'Utang'
                  : existing.payMode === 'Cash'
                    ? 'Cash on Delivery'
                    : existing.payMode || '—'}
            </dd>
          </div>
          {existing.status === 'Cancelled' ? (
            <div>
              <dt>Cancellation reason</dt>
              <dd>
                {customerCancelReason(existing.note) ??
                  (isCustomerCancelled(existing.note)
                    ? 'Cancelled by customer (no reason given)'
                    : existing.note.trim() || '—')}
              </dd>
            </div>
          ) : existing.note ? (
            <div>
              <dt>Note</dt>
              <dd>{existing.note}</dd>
            </div>
          ) : null}
        </dl>
      </Modal>
    )
  }

  return (
    <Modal
      title={deliveryId ? 'Edit Delivery' : 'New Delivery'}
      open={open}
      onClose={onClose}
      onSave={async () => {
        if (!state.customers.length) {
          flash('Mag-add muna ng customer')
          return false
        }
        const payload = {
          date: form.date,
          time: form.time,
          customerId: form.customerId,
          riderId: form.riderId,
          prodId: form.prodId,
          qty: Number(form.qty) || 1,
          amount: Number(form.amount) || 0,
          status: form.status,
          note: existing?.note ?? form.note ?? '',
        }
        const next: Delivery = deliveryId
          ? {
              ...existing!,
              ...payload,
            }
          : (() => {
              const id = uid()
              return {
                id,
                orderId: id,
                paid: false,
                payMode: '',
                ...payload,
              }
            })()
        await saveDelivery(next)
        return true
      }}
    >
      {!state.customers.length ? (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
          Mag-add muna ng customer.
        </div>
      ) : null}
      <div className="frow">
        <div className="field">
          <label htmlFor="f_d">Date</label>
          <input
            id="f_d"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f_t">Time</label>
          <input
            id="f_t"
            type="time"
            value={form.time}
            onChange={(e) => setField('time', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f_c">Customer</label>
        <select
          id="f_c"
          value={form.customerId}
          onChange={(e) => setField('customerId', e.target.value)}
        >
          {state.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.addr}
            </option>
          ))}
        </select>
      </div>
      <div className="frow">
        <div className="field">
          <label htmlFor="f_p">Product</label>
          <select
            id="f_p"
            value={form.prodId}
            onChange={(e) => {
              const prodId = e.target.value
              setField('prodId', prodId)
              recalcAmount(prodId, Number(form.qty) || 1)
            }}
          >
            {state.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatMoney(p.price, currency)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f_q">Qty (gallons)</label>
          <input
            id="f_q"
            type="number"
            inputMode="numeric"
            value={form.qty}
            onChange={(e) => {
              const qty = Number(e.target.value) || 1
              setField('qty', qty)
              recalcAmount(form.prodId, qty)
            }}
          />
        </div>
      </div>
      <div className="frow">
        <div className="field">
          <label htmlFor="f_r">Rider</label>
          <select
            id="f_r"
            value={form.riderId}
            onChange={(e) => setField('riderId', e.target.value)}
          >
            <option value="">Unassigned</option>
            {state.riders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f_pa">Product Amount {currency}</label>
          <input
            id="f_pa"
            type="number"
            inputMode="decimal"
            value={state.products.find((p) => p.id === form.prodId)?.price ?? 0}
            readOnly
            disabled
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f_a">Total Amount {currency}</label>
        <input
          id="f_a"
          type="number"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setField('amount', Number(e.target.value) || 0)}
        />
      </div>
      <div className="field">
        <label htmlFor="f_st">Status</label>
        <select
          id="f_st"
          value={form.status}
          onChange={(e) => setField('status', e.target.value as DeliveryStatus)}
        >
          {DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  )
}
