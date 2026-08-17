import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { productName } from '@/domain/lookups'
import { formatMoney } from '@/domain/money'
import type { Delivery } from '@/domain/types'
import { useAquaFlow } from '@/store/AquaFlowContext'

type CompleteDeliveryModalProps = {
  delivery: Delivery | null
  onClose: () => void
}

export function CompleteDeliveryModal({ delivery, onClose }: CompleteDeliveryModalProps) {
  const { state, completeDeliveryRemote } = useAquaFlow()
  const [payment, setPayment] = useState<'Cash' | 'GCash' | 'Utang'>('Cash')
  const [fullOut, setFullOut] = useState(String(delivery?.qty ?? 0))
  const [emptyIn, setEmptyIn] = useState(String(delivery?.qty ?? 0))

  const open = Boolean(delivery)
  const syncKey = delivery?.id ?? ''
  const [synced, setSynced] = useState(syncKey)
  if (syncKey !== synced && delivery) {
    setSynced(syncKey)
    setPayment('Cash')
    setFullOut(String(delivery.qty))
    setEmptyIn(String(delivery.qty))
  }

  if (!delivery) return null

  const customer = state.customers.find((c) => c.id === delivery.customerId)
  const pname = productName(state.products, delivery.prodId)
  const currency = state.settings.currency || '₱'

  return (
    <Modal
      title="Complete Delivery"
      open={open}
      onClose={onClose}
      saveLabel="Complete"
      onSave={async () => {
        return completeDeliveryRemote(delivery.id, {
          payment,
          fullOut: Number(fullOut) || 0,
          emptyIn: Number(emptyIn) || 0,
          productName: pname,
        })
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 13 }}>
        <b>{customer?.name ?? ''}</b> · {delivery.qty}x {pname} ·{' '}
        <b className="mono">{formatMoney(delivery.amount, currency)}</b>
      </div>
      <div className="field">
        <label htmlFor="f_pm">Payment</label>
        <select
          id="f_pm"
          value={payment}
          onChange={(e) => setPayment(e.target.value as 'Cash' | 'GCash' | 'Utang')}
        >
          <option value="Cash">Cash</option>
          <option value="GCash">GCash</option>
          <option value="Utang">Utang (ilista)</option>
        </select>
      </div>
      <div className="frow">
        <div className="field">
          <label htmlFor="f_out">Full Gallons Delivered</label>
          <input
            id="f_out"
            type="number"
            inputMode="numeric"
            value={fullOut}
            onChange={(e) => setFullOut(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f_in">Empty Gallons Collected</label>
          <input
            id="f_in"
            type="number"
            inputMode="numeric"
            value={emptyIn}
            onChange={(e) => setEmptyIn(e.target.value)}
          />
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: -4 }}>
        Auto-update ang gallon inventory at customer gallons-on-hand.
      </div>
    </Modal>
  )
}
