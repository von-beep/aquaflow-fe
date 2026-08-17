import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { customerBalance } from '@/domain/balance'
import { today, uid } from '@/domain/dates'
import { formatMoney } from '@/domain/money'
import type { Payment, UtangEntry } from '@/domain/types'
import { useAquaFlow } from '@/store/AquaFlowContext'

type CustomerPickProps = {
  open: boolean
  defaultCustomerId?: string
  onClose: () => void
}

export function AddUtangModal({ open, defaultCustomerId, onClose }: CustomerPickProps) {
  const { state, saveUtang, flash } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? state.customers[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const syncKey = `${open}:${defaultCustomerId ?? ''}`
  const [synced, setSynced] = useState(syncKey)
  if (open && syncKey !== synced) {
    setSynced(syncKey)
    setCustomerId(defaultCustomerId ?? state.customers[0]?.id ?? '')
    setAmount('')
    setNote('')
  }

  return (
    <Modal
      title="Add Utang"
      open={open}
      onClose={onClose}
      onSave={async () => {
        const a = Number(amount) || 0
        if (a <= 0) {
          flash('Magkano?')
          return false
        }
        await saveUtang({
          id: uid(),
          ts: today(),
          customerId,
          amount: a,
          note: note.trim(),
        })
        return true
      }}
    >
      <div className="field">
        <label htmlFor="f_c">Customer</label>
        <select
          id="f_c"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          {state.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — bal{' '}
              {formatMoney(customerBalance(c.id, state.utang, state.payments), currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f_a">Amount {currency}</label>
        <input
          id="f_a"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="f_n">Note</label>
        <input
          id="f_n"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. 3 gallons"
        />
      </div>
    </Modal>
  )
}

export function ReceivePaymentModal({ open, defaultCustomerId, onClose }: CustomerPickProps) {
  const { state, savePayment, flash } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? state.customers[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'Cash' | 'GCash'>('Cash')
  const [note, setNote] = useState('')
  const syncKey = `${open}:${defaultCustomerId ?? ''}`
  const [synced, setSynced] = useState(syncKey)
  if (open && syncKey !== synced) {
    setSynced(syncKey)
    setCustomerId(defaultCustomerId ?? state.customers[0]?.id ?? '')
    setAmount('')
    setMode('Cash')
    setNote('')
  }

  return (
    <Modal
      title="Receive Payment"
      open={open}
      onClose={onClose}
      onSave={async () => {
        const a = Number(amount) || 0
        if (a <= 0) {
          flash('Magkano?')
          return false
        }
        await savePayment({
          id: uid(),
          ts: today(),
          customerId,
          amount: a,
          mode,
          note: note.trim(),
        })
        return true
      }}
    >
      <div className="field">
        <label htmlFor="f_c">Customer</label>
        <select
          id="f_c"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          {state.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — bal{' '}
              {formatMoney(customerBalance(c.id, state.utang, state.payments), currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="frow">
        <div className="field">
          <label htmlFor="f_a">Amount {currency}</label>
          <input
            id="f_a"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="f_m">Mode</label>
          <select
            id="f_m"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'Cash' | 'GCash')}
          >
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="f_n">Note</label>
        <input
          id="f_n"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. partial"
        />
      </div>
    </Modal>
  )
}

export type LedgerRow =
  | (UtangEntry & { type: 'utang' })
  | (Payment & { type: 'bayad' })

export function EditLedgerModal({
  entry,
  onClose,
}: {
  entry: LedgerRow | null
  onClose: () => void
}) {
  const { state, saveUtang, savePayment } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const [amount, setAmount] = useState(String(entry?.amount ?? ''))
  const [note, setNote] = useState(entry?.note ?? '')
  const key = entry ? `${entry.type}-${entry.id}` : ''
  const [synced, setSynced] = useState(key)
  if (entry && key !== synced) {
    setSynced(key)
    setAmount(String(entry.amount))
    setNote(entry.note || '')
  }

  return (
    <Modal
      title={entry?.type === 'utang' ? 'Edit Utang' : 'Edit Bayad'}
      open={entry !== null}
      onClose={onClose}
      onSave={async () => {
        if (!entry) return false
        const a = Number(amount) || 0
        if (entry.type === 'utang') {
          await saveUtang({
            ...entry,
            amount: a,
            note: note.trim(),
          })
        } else {
          await savePayment({
            ...entry,
            amount: a,
            note: note.trim(),
          })
        }
        return true
      }}
    >
      <div className="field">
        <label htmlFor="f_a">Amount {currency}</label>
        <input
          id="f_a"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="f_n">Note</label>
        <input id="f_n" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
