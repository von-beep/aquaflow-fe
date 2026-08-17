import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatMoney } from '@/domain/money'
import { useAquaFlow } from '@/store/AquaFlowContext'

type Props = {
  open: boolean
  onClose: () => void
}

export function WalkInRefillModal({ open, onClose }: Props) {
  const { state, recordWalkIn } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const firstProductId = state.products[0]?.id ?? ''

  const [prodId, setProdId] = useState(firstProductId)
  const [qty, setQty] = useState('1')
  const [payment, setPayment] = useState<'Cash' | 'GCash' | 'Utang'>('Cash')
  const [customerId, setCustomerId] = useState('')
  const [fullOut, setFullOut] = useState('1')
  const [emptyIn, setEmptyIn] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = `${open}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    const p = state.products[0]
    setProdId(p?.id ?? '')
    setQty('1')
    setPayment('Cash')
    setCustomerId('')
    setFullOut('1')
    setEmptyIn('1')
    setError(null)
    setBusy(false)
  }

  const product = state.products.find((p) => p.id === prodId)
  const qtyNum = Math.max(1, Math.floor(Number(qty) || 1))
  const total = product ? product.price * qtyNum : 0

  function onQtyChange(value: string) {
    setQty(value)
    const n = Math.max(1, Math.floor(Number(value) || 1))
    setFullOut(String(n))
    setEmptyIn(String(n))
  }

  return (
    <Modal
      title="Walk-in refill"
      open={open}
      onClose={onClose}
      saveLabel={busy ? 'Saving…' : 'Complete sale'}
      onSave={async () => {
        if (busy) return false
        if (!product) {
          setError('Select a product')
          return false
        }
        if (payment === 'Utang' && !customerId) {
          setError('Select a customer for Utang')
          return false
        }
        setBusy(true)
        setError(null)
        try {
          const ok = await recordWalkIn({
            productId: product.id,
            qty: qtyNum,
            payment,
            fullOut: Number(fullOut) || 0,
            emptyIn: Number(emptyIn) || 0,
            customerId: customerId || null,
          })
          return ok
        } finally {
          setBusy(false)
        }
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
        Counter sale — recorded as completed with the selected product. Updates
        gallon inventory and today&apos;s sales.
      </p>

      {state.products.length === 0 ? (
        <p style={{ color: 'var(--red)', fontSize: 13 }}>
          No products yet. Add products under Inventory first.
        </p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="wi_prod">Product</label>
            <select
              id="wi_prod"
              value={prodId}
              onChange={(e) => setProdId(e.target.value)}
            >
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMoney(p.price, currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="wi_qty">Quantity</label>
            <input
              id="wi_qty"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => onQtyChange(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="wi_pay">Payment</label>
            <select
              id="wi_pay"
              value={payment}
              onChange={(e) =>
                setPayment(e.target.value as 'Cash' | 'GCash' | 'Utang')
              }
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Utang">Utang (ilista)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="wi_cust">
              Customer{payment === 'Utang' ? '' : ' (optional)'}
            </label>
            <select
              id="wi_cust"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required={payment === 'Utang'}
            >
              <option value="">
                {payment === 'Utang' ? 'Select customer…' : 'Walk-in (default)'}
              </option>
              {state.customers
                .filter((c) => c.name !== 'Walk-in')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="frow">
            <div className="field">
              <label htmlFor="wi_out">Full gallons out</label>
              <input
                id="wi_out"
                type="number"
                min={0}
                inputMode="numeric"
                value={fullOut}
                onChange={(e) => setFullOut(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="wi_in">Empty gallons in</label>
              <input
                id="wi_in"
                type="number"
                min={0}
                inputMode="numeric"
                value={emptyIn}
                onChange={(e) => setEmptyIn(e.target.value)}
              />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: -4 }}>
            Inventory: {state.inventory.full} full · {state.inventory.empty} empty
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, marginTop: 10 }}>
            Total: {formatMoney(total, currency)}
          </p>
        </>
      )}

      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>
      ) : null}
    </Modal>
  )
}
