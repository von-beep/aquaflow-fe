import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { formatMoney } from '@/domain/money'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

const NEW_ADDRESS = '__new__'

type Props = {
  open: boolean
  apiBaseUrl: string
  stationId: string
  stationName: string
  currency: string
  paymentMethods?: api.PublicPaymentMethod[]
  product: api.PublicProduct | null
  consumerToken: string
  prefillName?: string
  prefillPhone?: string
  /** Bump when addresses are edited elsewhere so the picker reloads. */
  addressesVersion?: number
  onClose: () => void
  onPlaced?: () => void
  onManageAddresses?: () => void
}

function absoluteMedia(apiBaseUrl: string, path: string): string {
  if (path.startsWith('http')) return path
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

export function OrderNowModal({
  open,
  apiBaseUrl,
  stationId,
  stationName,
  currency,
  paymentMethods = [],
  product,
  consumerToken,
  prefillName = '',
  prefillPhone = '',
  addressesVersion = 0,
  onClose,
  onPlaced,
  onManageAddresses,
}: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<api.ConsumerAddress[]>([])
  const [selectedId, setSelectedId] = useState(NEW_ADDRESS)
  const [address, setAddress] = useState('')
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [newLabel, setNewLabel] = useState('Home')
  const [qty, setQty] = useState('1')
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

  const key = `${open}:${product?.id ?? ''}:${stationId}:${prefillName}:${prefillPhone}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setName(prefillName)
    setPhone(prefillPhone)
    setAddress('')
    setSelectedId(NEW_ADDRESS)
    setSaveNewAddress(false)
    setNewLabel('Home')
    setQty('1')
    setNote('')
    setPayMode('Cash')
    setPaymentProof(null)
    setProofName('')
    setError(null)
    setSuccess(null)
    setBusy(false)
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

  const qtyNum = Math.max(1, Math.floor(Number(qty) || 1))
  const total = product ? product.price * qtyNum : 0
  const usingNew = selectedId === NEW_ADDRESS

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
      title={product ? `Order — ${product.name}` : 'Order Now'}
      open={open && product !== null}
      onClose={onClose}
      saveLabel={success ? 'Close' : busy ? 'Placing…' : 'Place order'}
      onSave={async () => {
        if (!product || busy) return false
        if (success) {
          onClose()
          return false
        }
        if (!consumerToken) {
          setError('Sign in required to place an order')
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
              productId: product.id,
              qty: qtyNum,
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
            ? `${payMode} (screenshot attached) — station will verify payment`
            : 'Cash on Delivery'
          setSuccess(
            `Order placed with ${stationName}. Total ${formatMoney(res.amount, res.currency || currency)}. ${payLabel}.`,
          )
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
      {product ? (
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          {stationName} · {formatMoney(product.price, currency)} each
        </p>
      ) : null}

      {success ? (
        <p style={{ fontSize: 14, color: 'var(--green)', marginBottom: 8 }}>{success}</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="ord_name">Your name</label>
            <input
              id="ord_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ord_phone">Phone</label>
            <input
              id="ord_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ord_addr_pick">Delivery address</label>
            {addrLoading ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                Loading saved addresses…
              </p>
            ) : (
              <select
                id="ord_addr_pick"
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
                <label htmlFor="ord_addr">Address</label>
                <input
                  id="ord_addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  placeholder="Street, barangay, city…"
                  required
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
                  <label htmlFor="ord_addr_label">Label</label>
                  <input
                    id="ord_addr_label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Home, Work…"
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
            <label htmlFor="ord_qty">Quantity</label>
            <input
              id="ord_qty"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="field">
            <label id="ord_pay_label">Mode of payment</label>
            <div className="choices" role="radiogroup" aria-labelledby="ord_pay_label">
              <label className="choice">
                <input
                  type="radio"
                  name="ord_pay"
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
                    name="ord_pay"
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
                <label htmlFor="ord_proof">Payment screenshot</label>
                <input
                  ref={proofInputRef}
                  id="ord_proof"
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
            <label htmlFor="ord_note">Note (optional)</label>
            <input
              id="ord_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Landmark, preferred time…"
            />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Total: {formatMoney(total, currency)}
          </p>
        </>
      )}

      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
      ) : null}
    </Modal>
  )
}
