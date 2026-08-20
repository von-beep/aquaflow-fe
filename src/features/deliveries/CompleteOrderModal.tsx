import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { productName } from '@/domain/lookups'
import { formatMoney } from '@/domain/money'
import { gcashReferenceFromNote } from '@/domain/gcashRef'
import { isOnlinePrepaid } from '@/domain/payMode'
import type { DeliveryGroup } from '@/domain/deliveryGroups'
import { useAquaFlow } from '@/store/AquaFlowContext'

type Props = {
  group: DeliveryGroup | null
  onClose: () => void
}

export function CompleteOrderModal({ group, onClose }: Props) {
  const { state, completeOrderRemote, session } = useAquaFlow()
  const [payment, setPayment] = useState<'Cash' | 'GCash' | 'Maya' | 'Utang'>('Cash')

  const open = Boolean(group)
  const syncKey = group?.orderId ?? ''
  const [synced, setSynced] = useState(syncKey)
  if (syncKey !== synced && group) {
    setSynced(syncKey)
    setPayment('Cash')
  }

  if (!group) return null

  const prepaidOnline = isOnlinePrepaid(group.payMode)
  const legacyRef =
    group.payMode === 'GCash' ? gcashReferenceFromNote(group.note) : null
  const effectivePayment = prepaidOnline ? group.payMode : payment

  const customer = state.customers.find((c) => c.id === group.customerId)
  const currency = state.settings.currency || '₱'
  const openLines = group.lines.filter(
    (l) => l.status !== 'Completed' && l.status !== 'Cancelled',
  )
  const proofUrl = group.paymentProofUrl
    ? group.paymentProofUrl.startsWith('http')
      ? group.paymentProofUrl
      : `${session.apiBaseUrl.replace(/\/$/, '')}${group.paymentProofUrl}`
    : null

  return (
    <Modal
      title="Finish Transaction"
      open={open}
      onClose={onClose}
      saveLabel="Complete order"
      onSave={async () => {
        return completeOrderRemote(group.orderId, { payment: effectivePayment })
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 13 }}>
        <b>{customer?.name ?? ''}</b>
        {openLines.length > 1 ? ` · ${openLines.length} items` : null}
        {' · '}
        <b className="mono">{formatMoney(group.total, currency)}</b>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', fontSize: 13 }}>
        {openLines.map((l) => (
          <li
            key={l.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              padding: '4px 0',
              borderBottom: '1px solid var(--line2)',
            }}
          >
            <span>
              {l.qty}× {productName(state.products, l.prodId)}
            </span>
            <b>{formatMoney(l.amount, currency)}</b>
          </li>
        ))}
      </ul>
      {prepaidOnline ? (
        <div style={{ marginBottom: 12, fontSize: 13 }}>
          <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Payment</div>
          <span className="chip c-blue">{group.payMode}</span>
          {legacyRef ? (
            <small style={{ marginLeft: 8, color: 'var(--muted)' }}>
              Ref · {legacyRef}
            </small>
          ) : null}
          {proofUrl ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 12 }}>
                Payment screenshot
              </div>
              <a href={proofUrl} target="_blank" rel="noreferrer">
                <img
                  src={proofUrl}
                  alt={`${group.payMode} payment proof`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 220,
                    objectFit: 'contain',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    background: '#fff',
                  }}
                />
              </a>
            </div>
          ) : null}
          <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '8px 0 0' }}>
            Already paid via {group.payMode} at checkout — no payment choice needed.
          </p>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="ord_pm">Payment</label>
          <select
            id="ord_pm"
            value={payment}
            onChange={(e) =>
              setPayment(e.target.value as 'Cash' | 'GCash' | 'Maya' | 'Utang')
            }
          >
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
            <option value="Maya">Maya</option>
            <option value="Utang">Utang (ilista)</option>
          </select>
        </div>
      )}
      <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
        Completes all open items in this order and updates gallon inventory (full out /
        empty in = each line qty).
      </p>
    </Modal>
  )
}
