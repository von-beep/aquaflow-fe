import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import type { ConsumerProfile } from '@/consumer/types'

type Props = {
  open: boolean
  apiBaseUrl: string
  token: string
  consumer: ConsumerProfile
  onClose: () => void
  onSaved: (consumer: ConsumerProfile) => void
}

export function ConsumerProfileModal({
  open,
  apiBaseUrl,
  token,
  consumer,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(consumer.name)
  const [phone, setPhone] = useState(consumer.phone)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = `${open}:${consumer.id}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setName(consumer.name)
    setPhone(consumer.phone)
    setError(null)
    setBusy(false)
  }

  return (
    <Modal
      title="My profile"
      open={open}
      onClose={onClose}
      saveLabel={busy ? 'Saving…' : 'Save'}
      onSave={async () => {
        if (busy) return false
        if (!name.trim()) {
          setError('Name is required')
          return false
        }
        setBusy(true)
        setError(null)
        try {
          const res = await api.updateConsumerMe(apiBaseUrl, token, {
            name: name.trim(),
            phone: phone.trim(),
          })
          onSaved(res.consumer)
          return true
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not save profile')
          return false
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="field">
        <label htmlFor="cp_email">Email</label>
        <input id="cp_email" value={consumer.email} disabled readOnly />
      </div>
      <div className="field">
        <label htmlFor="cp_name">Full name</label>
        <input
          id="cp_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="cp_phone">Phone</label>
        <input
          id="cp_phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
      ) : null}
    </Modal>
  )
}
