import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatMoney } from '@/domain/money'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

const NEW_ADDRESS = '__new__'

export type CartLine = {
  product: api.PublicProduct
  qty: number
}

type Props = {
  open: boolean
  apiBaseUrl: string
  stationId: string
  stationName: string
  currency: string
  /** Online methods that have a QR (from public catalog). */
  paymentMethods?: api.PublicPaymentMethod[]
  lines: CartLine[]
  consumerToken: string
  prefillName?: string
  prefillPhone?: string
  addressesVersion?: number
  onClose: () => void
  onPlaced?: () => void
  onManageAddresses?: () => void
  onClearCart?: () => void
}

function absoluteMedia(apiBaseUrl: string, path: string): string {
  if (path.startsWith('http')) return path
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

export function CartCheckoutModal({
  open,
  apiBaseUrl,
  stationId,
  stationName,
  currency,
  paymentMethods = [],
  lines,
  consumerToken,
  prefillName = '',
  prefillPhone = '',
  addressesVersion = 0,
  onClose,
  onPlaced,
  onManageAddresses,
  onClearCart,
}: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<api.ConsumerAddress[]>([])
  const [selectedId, setSelectedId] = useState(NEW_ADDRESS)
  const [address, setAddress] = useState('')
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [newLabel, setNewLabel] = useState('Home')
  const [note, setNote] = useState('')
  const [payMode, setPayMode] = useState('Cash')
  const [paymentProof, setPaymentProof] = useState<string | null>(null)
  const [proofName, setProofName] = useState('')
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const onlineMethods = useMemo(
    () => paymentMethods.filter((m) => Boolean(m.qrUrl)),
    [paymentMethods],
  )
  const methodNames = useMemo(
    () => onlineMethods.map((m) => m.name).join('\0'),
    [onlineMethods],
  )
  const selectedMethod = onlineMethods.find((m) => m.name === payMode) ?? null
  const selectedQrUrl = selectedMethod?.qrUrl ?? null
  const needsProof = payMode !== 'Cash'

  useEffect(() => {
    if (!open) return
    if (payMode !== 'Cash' && !onlineMethods.some((m) => m.name === payMode)) {
      setPayMode('Cash')
    }
  }, [open, payMode, methodNames, onlineMethods])

  const key = `${open}:${stationId}:${lines.map((l) => `${l.product.id}:${l.qty}`).join('|')}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setName(prefillName)
    setPhone(prefillPhone)
    setNote('')
    setPayMode('Cash')
    setPaymentProof(null)
    setProofName('')
    setError(null)
    setSuccess(null)
    setBusy(false)
    setSaveNewAddress(false)
    setNewLabel('Home')
  }

  useEffect(() => {
    if (!open || !consumerToken) return
    let cancelled = false
    setAddrLoading(true)
    void api
      .listConsumerAddresses(apiBaseUrl, consumerToken)
      .then((res) => {
        if (cancelled) return
        setAddresses(res.addresses)
        const prev = selectedIdRef.current
        const kept =
          prev !== NEW_ADDRESS
            ? res.addresses.find((a) => a.id === prev)
            : undefined
        if (kept) {
          setSelectedId(kept.id)
          setAddress(kept.address)
        } else {
          const def =
            res.addresses.find((a) => a.isDefault) ?? res.addresses[0] ?? null
          if (def) {
            setSelectedId(def.id)
            setAddress(def.address)
          } else {
            setSelectedId(NEW_ADDRESS)
            if (prev !== NEW_ADDRESS) setAddress('')
          }
        }
        setAddrLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setAddresses([])
        setSelectedId(NEW_ADDRESS)
        setAddrLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, apiBaseUrl, consumerToken, addressesVersion])

  const usingNew = selectedId === NEW_ADDRESS
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0)

  function onSelectAddress(id: string) {
    setSelectedId(id)
    if (id === NEW_ADDRESS) {
      setAddress('')
      return
    }
    const found = addresses.find((a) => a.id === id)
    if (found) setAddress(found.address)
  }

  return (
    <Modal
      title="Checkout"
      open={open && lines.length > 0}
      onClose={onClose}
      saveLabel={success ? 'Close' : busy ? 'Placing…' : 'Place order'}
      elevated
      onSave={async () => {
        if (busy || lines.length === 0) return false
        if (success) {
          onClose()
          return false
        }
        if (!consumerToken) {
          setError('Sign in required to checkout')
          return false
        }
        if (!name.trim() || !phone.trim() || !address.trim()) {
          setError('Name, phone, and address are required')
          return false
        }
        if (needsProof && !paymentProof) {
          setError(`Upload a ${payMode} payment screenshot`)
          return false
        }
        setBusy(true)
        setError(null)
        try {
          if (usingNew && saveNewAddress) {
            await api.createConsumerAddress(apiBaseUrl, consumerToken, {
              label: newLabel.trim() || 'Home',
              address: address.trim(),
              isDefault: addresses.length === 0,
            })
          }
          const res = await api.createPublicOrder(
            apiBaseUrl,
            stationId,
            {
              items: lines.map((l) => ({
                productId: l.product.id,
                qty: l.qty,
              })),
              customerName: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
              note: note.trim() || undefined,
              payMode,
              paymentProof: needsProof ? paymentProof ?? undefined : undefined,
            },
            consumerToken,
          )
          const payLabel = needsProof
            ? `${payMode} (screenshot attached)`
            : 'Cash on Delivery'
          const itemCount = res.items?.length ?? lines.length
          setSuccess(
            `Order placed with ${stationName} (${itemCount} item${itemCount > 1 ? 's' : ''}). Total ${formatMoney(res.amount, currency)}. ${payLabel}.`,
          )
          onClearCart?.()
          onPlaced?.()
          return false
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not place order',
          )
          return false
        } finally {
          setBusy(false)
        }
      }}
    >
      {success ? (
        <p style={{ fontSize: 14, color: 'var(--green)', marginBottom: 8 }}>{success}</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
            {lines.map((l) => (
              <li
                key={l.product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 13,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--line2)',
                }}
              >
                <span>
                  {l.qty}× {l.product.name}
                </span>
                <b>{formatMoney(l.product.price * l.qty, currency)}</b>
              </li>
            ))}
          </ul>
          <p style={{ fontWeight: 800, marginBottom: 14 }}>
            Subtotal: {formatMoney(subtotal, currency)}
          </p>

          <div className="field">
            <label htmlFor="co_name">Your name</label>
            <input
              id="co_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="co_phone">Phone</label>
            <input
              id="co_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="field">
            <label htmlFor="co_addr_pick">Delivery address</label>
            {addrLoading ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading addresses…</p>
            ) : (
              <select
                id="co_addr_pick"
                value={selectedId}
                onChange={(e) => onSelectAddress(e.target.value)}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                    {a.isDefault ? ' (default)' : ''} — {a.address}
                  </option>
                ))}
                <option value={NEW_ADDRESS}>
                  {addresses.length === 0
                    ? 'Enter delivery address…'
                    : 'Use a different address…'}
                </option>
              </select>
            )}
          </div>
          {usingNew ? (
            <>
              <div className="field">
                <label htmlFor="co_addr">Address</label>
                <input
                  id="co_addr"
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
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={saveNewAddress}
                  onChange={(e) => setSaveNewAddress(e.target.checked)}
                />
                Save to my addresses
              </label>
              {saveNewAddress ? (
                <div className="field">
                  <label htmlFor="co_addr_label">Label</label>
                  <input
                    id="co_addr_label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--ink2)', margin: '0 0 12px' }}>
              {address}
            </p>
          )}
          {onManageAddresses ? (
            <p style={{ margin: '0 0 12px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onManageAddresses}
              >
                Manage addresses
              </button>
            </p>
          ) : null}
          <div className="field">
            <label id="co_pay_label">Mode of payment</label>
            <div className="choices" role="radiogroup" aria-labelledby="co_pay_label">
              <label className="choice">
                <input
                  type="radio"
                  name="co_pay"
                  checked={payMode === 'Cash'}
                  onChange={() => {
                    setPayMode('Cash')
                    setPaymentProof(null)
                    setProofName('')
                  }}
                />
                Cash on Delivery
              </label>
              {onlineMethods.map((m) => (
                <label className="choice" key={m.id}>
                  <input
                    type="radio"
                    name="co_pay"
                    checked={payMode === m.name}
                    onChange={() => {
                      setPayMode(m.name)
                      setPaymentProof(null)
                      setProofName('')
                    }}
                  />
                  {m.name}
                </label>
              ))}
            </div>
            {onlineMethods.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                Online payment is not set up for this station yet — use Cash on Delivery.
              </p>
            ) : null}
          </div>
          {needsProof ? (
            <>
              {selectedQrUrl ? (
                <div className="field" style={{ textAlign: 'center' }}>
                  <label>Scan {payMode} QR to pay</label>
                  <img
                    src={absoluteMedia(apiBaseUrl, selectedQrUrl)}
                    alt={`${stationName} ${payMode} QR`}
                    style={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      margin: '8px auto 0',
                      display: 'block',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      background: '#fff',
                      padding: 10,
                    }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Pay with {payMode}, then upload your payment screenshot.
                  </p>
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="co_proof">Payment screenshot</label>
                <input
                  ref={proofInputRef}
                  id="co_proof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!file.type.startsWith('image/')) {
                      setError('Choose a PNG, JPEG, or WebP screenshot')
                      return
                    }
                    if (file.size > 700_000) {
                      setError('Screenshot is too large (max ~700KB)')
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setPaymentProof(reader.result)
                        setProofName(file.name)
                        setError(null)
                      }
                    }
                    reader.onerror = () => setError('Could not read screenshot')
                    reader.readAsDataURL(file)
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => proofInputRef.current?.click()}
                  >
                    {paymentProof ? 'Replace screenshot' : 'Upload screenshot'}
                  </button>
                  {paymentProof ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setPaymentProof(null)
                        setProofName('')
                        if (proofInputRef.current) proofInputRef.current.value = ''
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                  {proofName ? (
                    <small style={{ color: 'var(--muted)' }}>{proofName}</small>
                  ) : null}
                </div>
                {paymentProof ? (
                  <img
                    src={paymentProof}
                    alt="Payment screenshot preview"
                    style={{
                      marginTop: 10,
                      maxWidth: '100%',
                      maxHeight: 180,
                      objectFit: 'contain',
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      background: '#fff',
                    }}
                  />
                ) : null}
              </div>
            </>
          ) : null}
          <div className="field">
            <label htmlFor="co_note">Note (optional)</label>
            <input
              id="co_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Landmark, preferred time…"
            />
          </div>
        </>
      )}
      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>
      ) : null}
    </Modal>
  )
}
