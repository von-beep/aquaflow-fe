import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

type Props = {
  open: boolean
  apiBaseUrl: string
  token: string
  onClose: () => void
  onChanged?: () => void
}

export function ConsumerAddressesModal({
  open,
  apiBaseUrl,
  token,
  onClose,
  onChanged,
}: Props) {
  const [addresses, setAddresses] = useState<api.ConsumerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('Home')
  const [address, setAddress] = useState('')
  const [asDefault, setAsDefault] = useState(false)
  const [busy, setBusy] = useState(false)

  function reload() {
    setLoading(true)
    setError(null)
    void api
      .listConsumerAddresses(apiBaseUrl, token)
      .then((res) => {
        setAddresses(res.addresses)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Failed to load addresses')
      })
  }

  const key = `${open}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setLabel('Home')
    setAddress('')
    setAsDefault(false)
    setError(null)
    setBusy(false)
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    let cancelled = false
    void api
      .listConsumerAddresses(apiBaseUrl, token)
      .then((res) => {
        if (cancelled) return
        setAddresses(res.addresses)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Failed to load addresses')
      })
    return () => {
      cancelled = true
    }
  }, [open, apiBaseUrl, token])

  return (
    <Modal
      title="Delivery addresses"
      open={open}
      onClose={onClose}
      cancelLabel="Close"
      elevated
    >
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink2)' }}>Loading…</p>
      ) : null}

      {!loading && addresses.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          No saved addresses yet. Add one below.
        </p>
      ) : null}

      {addresses.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
          {addresses.map((a) => (
            <li
              key={a.id}
              style={{
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <div>
                <b style={{ fontSize: 13 }}>
                  {a.label}
                  {a.isDefault ? (
                    <span className="chip c-blue" style={{ marginLeft: 8 }}>
                      Default
                    </span>
                  ) : null}
                </b>
                <div style={{ fontSize: 13, marginTop: 4 }}>{a.address}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {!a.isDefault ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      void api
                        .updateConsumerAddress(apiBaseUrl, token, a.id, {
                          isDefault: true,
                        })
                        .then(() => {
                          reload()
                          onChanged?.()
                        })
                        .catch((err: unknown) =>
                          setError(
                            err instanceof ApiError
                              ? err.message
                              : 'Could not update',
                          ),
                        )
                    }}
                  >
                    Set default
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={() => {
                    if (!confirm('Delete this address?')) return
                    void api
                      .deleteConsumerAddress(apiBaseUrl, token, a.id)
                      .then(() => {
                        reload()
                        onChanged?.()
                      })
                      .catch((err: unknown) =>
                        setError(
                          err instanceof ApiError
                            ? err.message
                            : 'Could not delete',
                        ),
                      )
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <h4 style={{ fontSize: 13, margin: '0 0 10px' }}>Add address</h4>
      <div className="field">
        <label htmlFor="ca_label">Label</label>
        <input
          id="ca_label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Home, Work…"
        />
      </div>
      <div className="field">
        <label htmlFor="ca_addr">Address</label>
        <input
          id="ca_addr"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, barangay, city…"
        />
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          marginBottom: 12,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={asDefault}
          onChange={(e) => setAsDefault(e.target.checked)}
        />
        Set as default
      </label>

      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
      ) : null}

      <button
        type="button"
        className="btn btn-blue"
        disabled={busy || !address.trim()}
        onClick={() => {
          setBusy(true)
          setError(null)
          void api
            .createConsumerAddress(apiBaseUrl, token, {
              label: label.trim() || 'Home',
              address: address.trim(),
              isDefault: asDefault,
            })
            .then(() => {
              setAddress('')
              setLabel('Home')
              setAsDefault(false)
              reload()
              onChanged?.()
            })
            .catch((err: unknown) =>
              setError(
                err instanceof ApiError ? err.message : 'Could not save address',
              ),
            )
            .finally(() => setBusy(false))
        }}
      >
        {busy ? 'Saving…' : 'Save address'}
      </button>
    </Modal>
  )
}
