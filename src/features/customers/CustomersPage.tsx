import { useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { Modal } from '@/components/Modal'
import { customerBalance } from '@/domain/balance'
import { uid } from '@/domain/dates'
import { formatMoney } from '@/domain/money'
import type { Customer } from '@/domain/types'
import { DeliveryFormModal } from '@/features/deliveries/DeliveryFormModal'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function CustomersPage() {
  const { state, flash, saveCustomer, removeCustomer } = useAquaFlow()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | null>(null)
  const currency = state.settings.currency || '₱'

  const rows = state.customers.filter((c) =>
    (c.name + c.addr + c.phone).toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Customers</h2>
          <div className="sub">
            {state.customers.length} records · gallons out = containers na hawak ng customer
          </div>
        </div>
        <div className="headbtns">
          <div className="search">
            <ActionIcon name="search" />
            <input
              placeholder="Search name / address…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-blue" onClick={() => setEditing('new')}>
            <ActionIcon name="plus" /> Add Customer
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-b" style={{ padding: '6px 18px 10px', overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th className="num">Gallons Out</th>
                <th className="num">Deliveries</th>
                <th className="num">Utang Bal.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <b>No customers yet</b>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const n = state.deliveries.filter(
                    (d) => d.customerId === c.id && d.status === 'Completed',
                  ).length
                  const b = customerBalance(c.id, state.utang, state.payments)
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{c.name}</b>
                        {c.note ? (
                          <>
                            <br />
                            <small style={{ color: 'var(--muted)' }}>{c.note}</small>
                          </>
                        ) : null}
                      </td>
                      <td style={{ fontSize: 12.5 }}>📍 {c.addr || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {c.gallonsOut || 0}
                      </td>
                      <td className="num">{n}</td>
                      <td
                        className="num"
                        style={{
                          fontWeight: 700,
                          color: b > 0 ? 'var(--red)' : 'var(--green)',
                        }}
                      >
                        {formatMoney(b, currency)}
                      </td>
                      <td>
                        <div className="rowact">
                          <button
                            type="button"
                            className="iconbtn"
                            title="New delivery"
                            onClick={() => setPrefillCustomerId(c.id)}
                          >
                            <ActionIcon name="truck" />
                          </button>
                          <button
                            type="button"
                            className="iconbtn"
                            onClick={() => setEditing(c)}
                          >
                            <ActionIcon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="iconbtn del"
                            onClick={() => {
                              if (
                                !confirm(
                                  'Delete customer, deliveries, utang, and payments niya?',
                                )
                              )
                                return
                              void removeCustomer(c.id)
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

      <CustomerFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        flash={flash}
        onSave={(data, id) => {
          void saveCustomer({ id: id ?? uid(), ...data })
        }}
      />

      <DeliveryFormModal
        open={prefillCustomerId !== null}
        deliveryId={null}
        prefillCustomerId={prefillCustomerId ?? undefined}
        onClose={() => setPrefillCustomerId(null)}
      />
    </>
  )
}

type CustomerFormModalProps = {
  editing: Customer | 'new' | null
  onClose: () => void
  flash: (m: string) => void
  onSave: (data: Omit<Customer, 'id'>, id?: string) => void
}

function CustomerFormModal({ editing, onClose, flash, onSave }: CustomerFormModalProps) {
  const blank = { name: '', phone: '', addr: '', gallonsOut: 0, note: '' }
  const source = editing && editing !== 'new' ? editing : blank
  const [name, setName] = useState(source.name)
  const [addr, setAddr] = useState(source.addr)
  const [phone, setPhone] = useState(source.phone)
  const [gallonsOut, setGallonsOut] = useState(String(source.gallonsOut || 0))
  const [note, setNote] = useState(source.note)

  const key = editing === 'new' ? 'new' : editing?.id ?? ''
  const [synced, setSynced] = useState(key)
  if (key !== synced && editing) {
    setSynced(key)
    setName(source.name)
    setAddr(source.addr)
    setPhone(source.phone)
    setGallonsOut(String(source.gallonsOut || 0))
    setNote(source.note)
  }

  return (
    <Modal
      title={editing && editing !== 'new' ? 'Edit Customer' : 'Add Customer'}
      open={editing !== null}
      onClose={onClose}
      onSave={() => {
        if (!name.trim()) {
          flash('Name muna')
          return false
        }
        onSave(
          {
            name: name.trim(),
            addr: addr.trim(),
            phone: phone.trim(),
            gallonsOut: Number(gallonsOut) || 0,
            note: note.trim(),
          },
          editing && editing !== 'new' ? editing.id : undefined,
        )
        return true
      }}
    >
      <div className="field">
        <label htmlFor="f_n">Name</label>
        <input
          id="f_n"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maria Santos"
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="f_a">Address</label>
        <input
          id="f_a"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="e.g. Phase 2, Block 12"
        />
      </div>
      <div className="frow">
        <div className="field">
          <label htmlFor="f_p">Phone</label>
          <input id="f_p" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f_g">Gallons on Hand</label>
          <input
            id="f_g"
            type="number"
            inputMode="numeric"
            value={gallonsOut}
            onChange={(e) => setGallonsOut(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f_note">Note</label>
        <input
          id="f_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. MWF delivery, suki since 2023"
        />
      </div>
    </Modal>
  )
}
