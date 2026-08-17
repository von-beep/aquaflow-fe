import { useMemo, useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { Modal } from '@/components/Modal'
import { totalUtang } from '@/domain/balance'
import { formatDateShort, today } from '@/domain/dates'
import { customerName } from '@/domain/lookups'
import { formatMoney } from '@/domain/money'
import type { Payment } from '@/domain/types'
import { ReceivePaymentModal } from '@/features/utang/CreditModals'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function CollectionsPage() {
  const { state, flash, removePayment } = useAquaFlow()
  const [payOpen, setPayOpen] = useState(false)
  const [editPay, setEditPay] = useState<Payment | null>(null)
  const currency = state.settings.currency || '₱'

  const rows = useMemo(
    () => [...state.payments].sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.payments],
  )

  const month = rows
    .filter((p) => p.ts.startsWith(today().slice(0, 7)))
    .reduce((a, b) => a + Number(b.amount), 0)

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Collections</h2>
          <div className="sub">
            Collected this month:{' '}
            <b className="mono" style={{ color: 'var(--green)' }}>
              {formatMoney(month, currency)}
            </b>{' '}
            · Pending:{' '}
            <b className="mono" style={{ color: 'var(--red)' }}>
              {formatMoney(totalUtang(state), currency)}
            </b>
          </div>
        </div>
        <div className="headbtns">
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
                <th>Date</th>
                <th>Customer</th>
                <th>Mode</th>
                <th>Note</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <b>No collections yet</b>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {formatDateShort(p.ts)}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {customerName(state.customers, p.customerId)}
                    </td>
                    <td>
                      <span className={`chip ${p.mode === 'GCash' ? 'c-blue' : 'c-green'}`}>
                        {p.mode || 'Cash'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{p.note || ''}</td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>
                      {formatMoney(p.amount, currency)}
                    </td>
                    <td>
                      <div className="rowact">
                        <button
                          type="button"
                          className="iconbtn"
                          onClick={() => setEditPay(p)}
                        >
                          <ActionIcon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="iconbtn del"
                            onClick={() => {
                            if (!confirm('Delete entry?')) return
                            void removePayment(p.id)
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

      <ReceivePaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
      <EditPaymentModal payment={editPay} onClose={() => setEditPay(null)} />
    </>
  )
}

function EditPaymentModal({
  payment,
  onClose,
}: {
  payment: Payment | null
  onClose: () => void
}) {
  const { state, savePayment } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const [amount, setAmount] = useState(String(payment?.amount ?? ''))
  const [note, setNote] = useState(payment?.note ?? '')
  const key = payment?.id ?? ''
  const [synced, setSynced] = useState(key)
  if (payment && key !== synced) {
    setSynced(key)
    setAmount(String(payment.amount))
    setNote(payment.note || '')
  }

  return (
    <Modal
      title="Edit Bayad"
      open={payment !== null}
      onClose={onClose}
      onSave={async () => {
        if (!payment) return false
        const a = Number(amount) || 0
        await savePayment({
          ...payment,
          amount: a,
          note: note.trim(),
        })
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
