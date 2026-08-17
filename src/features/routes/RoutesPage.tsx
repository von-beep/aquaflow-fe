import { useMemo, useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { Modal } from '@/components/Modal'
import { formatDateShort, formatTime, today, uid } from '@/domain/dates'
import { STATUS_CHIP } from '@/domain/status'
import type { Delivery, Rider } from '@/domain/types'
import { CompleteDeliveryModal } from '@/features/deliveries/CompleteDeliveryModal'
import { DeliveryFormModal } from '@/features/deliveries/DeliveryFormModal'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function RoutesPage() {
  const { state, flash, saveRider, removeRider } = useAquaFlow()
  const [rtDate, setRtDate] = useState(today())
  const [riderEdit, setRiderEdit] = useState<Rider | 'new' | null>(null)
  const [delivOpen, setDelivOpen] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<Delivery | null>(null)

  const dayDeliv = useMemo(
    () =>
      state.deliveries
        .filter((d) => d.date === rtDate && d.status !== 'Cancelled')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [state.deliveries, rtDate],
  )

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Rider Routes</h2>
          <div className="sub">
            Stops per rider para sa {formatDateShort(rtDate)} — parang dispatch board
          </div>
        </div>
        <div className="headbtns">
          <input
            type="date"
            value={rtDate}
            onChange={(e) => setRtDate(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1.5px solid var(--line)',
              borderRadius: 10,
              background: '#fff',
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={() => setRiderEdit('new')}>
            <ActionIcon name="plus" /> Add Rider
          </button>
          <button type="button" className="btn btn-blue" onClick={() => setDelivOpen(true)}>
            <ActionIcon name="plus" /> New Delivery
          </button>
        </div>
      </div>

      <div className="routegrid">
        {state.riders.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <b>No riders yet</b>
            Mag-add ng rider.
          </div>
        ) : (
          state.riders.map((r) => {
            const stops = dayDeliv.filter((d) => d.riderId === r.id)
            const done = stops.filter((s) => s.status === 'Completed').length
            return (
              <div className="routecard" key={r.id}>
                <div className="rh">
                  <span className="av">{r.name[0] || '?'}</span>
                  <div style={{ flex: 1 }}>
                    <div className="rn">Rider — {r.name}</div>
                    <div className="rs">
                      {stops.length} stop{stops.length === 1 ? '' : 's'} · {done} done
                      {r.hasAccount || r.email ? ' · /rider login' : ''}
                    </div>
                  </div>
                  <div className="rowact">
                    <button
                      type="button"
                      className="iconbtn"
                      style={{
                        background: 'transparent',
                        borderColor: 'rgba(255,255,255,.25)',
                        color: '#fff',
                      }}
                      onClick={() => setRiderEdit(r)}
                    >
                      <ActionIcon name="edit" />
                    </button>
                  </div>
                </div>
                {stops.length === 0 ? (
                  <div className="empty" style={{ padding: 22 }}>
                    <b>No stops</b>
                    Assign deliveries kay {r.name}.
                  </div>
                ) : (
                  stops.map((s, i) => {
                    const c = state.customers.find((x) => x.id === s.customerId)
                    return (
                      <div
                        className={`stop${s.status === 'Completed' ? ' done' : ''}`}
                        key={s.id}
                      >
                        <span className="sn">{s.status === 'Completed' ? '✓' : i + 1}</span>
                        <div className="si">
                          <div className="cn">
                            {c?.name ?? '—'}{' '}
                            <span
                              className="mono"
                              style={{ fontSize: 10.5, color: 'var(--muted)' }}
                            >
                              {formatTime(s.time)}
                            </span>
                          </div>
                          <div className="ca">
                            📍 {c?.addr ?? ''} · {s.qty} gal
                          </div>
                        </div>
                        {s.status !== 'Completed' ? (
                          <button
                            type="button"
                            className="btn btn-green btn-sm"
                            onClick={() => setCompleteTarget(s)}
                          >
                            Done
                          </button>
                        ) : (
                          <span className={`chip ${STATUS_CHIP[s.status]}`}>{s.status}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })
        )}
      </div>

      <RiderFormModal
        editing={riderEdit}
        onClose={() => setRiderEdit(null)}
        flash={flash}
        onSave={(data, id) => {
          void saveRider({ id: id ?? uid(), ...data })
        }}
        onRemove={(id) => {
          void removeRider(id)
        }}
      />

      <DeliveryFormModal open={delivOpen} deliveryId={null} onClose={() => setDelivOpen(false)} />
      <CompleteDeliveryModal
        delivery={completeTarget}
        onClose={() => setCompleteTarget(null)}
      />
    </>
  )
}

type RiderFormModalProps = {
  editing: Rider | 'new' | null
  onClose: () => void
  flash: (m: string) => void
  onSave: (
    data: Omit<Rider, 'id'> & { password?: string },
    id?: string,
  ) => void
  onRemove: (id: string) => void
}

function RiderFormModal({ editing, onClose, flash, onSave, onRemove }: RiderFormModalProps) {
  const blank = { name: '', phone: '', email: '' }
  const source =
    editing && editing !== 'new'
      ? {
          name: editing.name,
          phone: editing.phone,
          email: editing.email ?? '',
        }
      : blank
  const [name, setName] = useState(source.name)
  const [phone, setPhone] = useState(source.phone)
  const [email, setEmail] = useState(source.email)
  const [password, setPassword] = useState('')
  const key = editing === 'new' ? 'new' : editing?.id ?? ''
  const [synced, setSynced] = useState(key)
  if (key !== synced && editing) {
    setSynced(key)
    setName(source.name)
    setPhone(source.phone)
    setEmail(source.email)
    setPassword('')
  }

  const hasAccount =
    editing && editing !== 'new' ? Boolean(editing.hasAccount || editing.email) : false

  return (
    <Modal
      title={editing && editing !== 'new' ? 'Edit Rider' : 'Add Rider'}
      open={editing !== null}
      onClose={onClose}
      onSave={() => {
        if (!name.trim()) {
          flash('Rider name muna')
          return false
        }
        const em = email.trim().toLowerCase()
        const pw = password.trim()
        if (pw && pw.length < 8) {
          flash('Password must be at least 8 characters')
          return false
        }
        if (pw && !em && !hasAccount) {
          flash('Email required for rider login')
          return false
        }
        if (!hasAccount && (em || pw) && (!em || !pw)) {
          flash('Email and password required for /rider login')
          return false
        }
        onSave(
          {
            name: name.trim(),
            phone: phone.trim(),
            email: em || null,
            hasAccount: hasAccount || Boolean(em && pw),
            ...(pw ? { password: pw } : {}),
          },
          editing && editing !== 'new' ? editing.id : undefined,
        )
        return true
      }}
    >
      <div className="frow">
        <div className="field">
          <label htmlFor="f_n">Name</label>
          <input
            id="f_n"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="f_p">Phone</label>
          <input id="f_p" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink2)', margin: '4px 0 12px' }}>
        Optional login for the rider app at <b>/rider</b>
        {hasAccount ? ' — account already created; leave password blank to keep it.' : '.'}
      </p>
      <div className="field">
        <label htmlFor="f_re">Login email</label>
        <input
          id="f_re"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rider@example.com"
        />
      </div>
      <div className="field">
        <label htmlFor="f_rp">
          {hasAccount ? 'New password (optional)' : 'Password'}
        </label>
        <input
          id="f_rp"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={hasAccount ? 'Leave blank to keep current' : 'Min. 8 characters'}
        />
      </div>
      {editing && editing !== 'new' ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--red)' }}
          onClick={() => {
            if (!confirm('Remove rider?')) return
            onRemove(editing.id)
            onClose()
          }}
        >
          Remove rider
        </button>
      ) : null}
    </Modal>
  )
}
