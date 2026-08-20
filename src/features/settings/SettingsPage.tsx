import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'
import { StationLocationPicker } from '@/features/settings/StationLocationPicker'

const PAYMENT_PRESETS = ['GCash', 'Maya', 'BPI', 'BDO', 'UnionBank', 'GoTyme', 'ShopeePay', 'GrabPay']

function absoluteQr(apiUrl: string, path: string): string {
  if (path.startsWith('http')) return path
  return `${apiUrl.replace(/\/$/, '')}${path}`
}

function PaymentMethodsCard({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [methods, setMethods] = useState<api.StationPaymentMethod[]>([])
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function refresh() {
    const res = await api.listPaymentMethods(apiUrl, token)
    setMethods(res.methods)
  }

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per token/url
  }, [apiUrl, token])

  async function addMethod(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    setError(null)
    try {
      await api.createPaymentMethod(apiUrl, token, trimmed)
      setCustomName('')
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not add payment method',
      )
    } finally {
      setAdding(false)
    }
  }

  async function removeMethod(m: api.StationPaymentMethod) {
    if (!confirm(`Remove ${m.name} from checkout options?`)) return
    setBusyId(m.id)
    setError(null)
    try {
      await api.deletePaymentMethod(apiUrl, token, m.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove method')
    } finally {
      setBusyId(null)
    }
  }

  async function onQrFile(m: api.StationPaymentMethod, file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose a PNG, JPEG, or WebP image')
      return
    }
    if (file.size > 600_000) {
      setError('Image is too large (max ~600KB)')
      return
    }
    setBusyId(m.id)
    setError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result)
          else reject(new Error('Could not read image'))
        }
        reader.onerror = () => reject(new Error('Could not read image'))
        reader.readAsDataURL(file)
      })
      await api.uploadPaymentMethodQr(apiUrl, token, m.id, dataUrl)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusyId(null)
      const input = fileRefs.current[m.id]
      if (input) input.value = ''
    }
  }

  async function clearQr(m: api.StationPaymentMethod) {
    if (!confirm(`Remove the ${m.name} QR from checkout?`)) return
    setBusyId(m.id)
    setError(null)
    try {
      await api.deletePaymentMethodQr(apiUrl, token, m.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove QR')
    } finally {
      setBusyId(null)
    }
  }

  const existing = new Set(methods.map((m) => m.name.toLowerCase()))
  const presetOptions = PAYMENT_PRESETS.filter((p) => !existing.has(p.toLowerCase()))

  return (
    <div className="card card-span-4">
      <div className="card-h">
        <h3>Payment methods</h3>
      </div>
      <div className="card-b">
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 14 }}>
          Add platforms (GCash, Maya, BPI, …) and upload each QR. Only methods with a QR
          appear at consumer checkout (plus Cash on Delivery).
        </p>

        {methods.length > 0 ? (
          <div className="pay-methods-grid">
            {methods.map((m) => {
              const busy = busyId === m.id
              return (
                <div key={m.id} className="pay-method-tile">
                  <div className="pay-method-tile-h">
                    <div className="pay-method-tile-name">{m.name}</div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => void removeMethod(m)}
                    >
                      Delete
                    </button>
                  </div>
                  {m.qrUrl ? (
                    <img
                      src={absoluteQr(apiUrl, m.qrUrl)}
                      alt={`${m.name} payment QR`}
                      className="pay-method-tile-qr"
                    />
                  ) : (
                    <p className="pay-method-tile-empty">
                      No QR uploaded — hidden on checkout.
                    </p>
                  )}
                  <input
                    ref={(el) => {
                      fileRefs.current[m.id] = el
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => void onQrFile(m, e.target.files?.[0])}
                  />
                  <div className="pay-method-tile-actions">
                    <button
                      type="button"
                      className="btn btn-navy btn-sm"
                      disabled={busy}
                      onClick={() => fileRefs.current[m.id]?.click()}
                    >
                      {busy ? 'Working…' : m.qrUrl ? 'Replace QR' : 'Upload QR'}
                    </button>
                    {m.qrUrl ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void clearQr(m)}
                      >
                        Remove QR
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
            No payment platforms yet — add one below.
          </p>
        )}

        <div className="pay-methods-add">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink2)' }}>
            Add payment platform
          </div>
          {presetOptions.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {presetOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={adding}
                  onClick={() => void addMethod(name)}
                >
                  + {name}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void addMethod(customName)
            }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Custom name (e.g. Landbank)"
              maxLength={32}
              style={{ flex: '1 1 160px' }}
            />
            <button
              type="submit"
              className="btn btn-blue"
              disabled={adding || !customName.trim()}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>

        {error ? (
          <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function TeamInvitesCard({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [invites, setInvites] = useState<api.CreatedInvite['invite'][]>([])
  const [email, setEmail] = useState('')
  const [lastLink, setLastLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const res = await api.listInvites(apiUrl, token)
      setInvites(res.invites)
    } catch {
      /* ignore list errors in UI */
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per token/url
  }, [apiUrl, token])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.createInvite(apiUrl, token, email.trim() || undefined)
      const link = `${window.location.origin}${res.invite.inviteUrlPath}`
      setLastLink(link)
      setEmail('')
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not create invite',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>Team invites</h3>
      </div>
      <div className="card-b">
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Invite staff to the same station (7-day link). They share this station account.
        </p>
        <form onSubmit={(e) => void onCreate(e)}>
          <div className="field">
            <label htmlFor="inv_email">Email (optional)</label>
            <input
              id="inv_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
          ) : null}
          <button type="submit" className="btn btn-navy" disabled={busy}>
            {busy ? 'Creating…' : 'Create invite link'}
          </button>
        </form>
        {lastLink ? (
          <p style={{ fontSize: 13, marginTop: 12, wordBreak: 'break-all' }}>
            Share: <a href={lastLink}>{lastLink}</a>
          </p>
        ) : null}
        {invites.length ? (
          <ul style={{ marginTop: 14, fontSize: 13, color: 'var(--ink2)', paddingLeft: 18 }}>
            {invites.slice(0, 5).map((inv) => (
              <li key={inv.id}>
                {inv.accepted ? 'Accepted' : 'Open'} · {inv.email ?? 'any email'} ·{' '}
                {new Date(inv.expiresAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function ChangePasswordCard({
  apiUrl,
  token,
  onFlash,
}: {
  apiUrl: string
  token: string
  onFlash: (msg: string) => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(apiUrl, token, {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onFlash('Password updated')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update password',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>Update password</h3>
      </div>
      <div className="card-b">
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Change the password for the account you are signed in with.
        </p>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="pw_cur">Current password</label>
            <input
              id="pw_cur"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pw_new">New password</label>
            <input
              id="pw_new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pw_confirm">Confirm new password</label>
            <input
              id="pw_confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
          ) : null}
          <button type="submit" className="btn btn-navy" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BillingCard({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [billing, setBilling] = useState<api.BillingStatus['billing'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const res = await api.getBilling(apiUrl, token)
      setBilling(res.billing)
      setError(null)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load billing',
      )
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per token/url
  }, [apiUrl, token])

  async function onUpgrade() {
    setBusy(true)
    setError(null)
    try {
      const res = await api.startBillingCheckout(apiUrl, token)
      window.location.assign(res.checkoutUrl)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Checkout failed',
      )
      setBusy(false)
    }
  }

  async function onCancel() {
    if (!window.confirm('Cancel the Xendit subscription for this station?')) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.cancelBilling(apiUrl, token)
      setBilling(res.billing)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Cancel failed',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>Billing</h3>
      </div>
      <div className="card-b">
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Active plan or unexpired trial required for cloud features. Payments via Xendit (PHP).
        </p>
        {billing ? (
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Status: <strong>{billing.planStatus}</strong>
            {billing.billingInterval ? ` · ${billing.billingInterval}` : ''}
            {billing.planExpiresAt ? ` · expires ${billing.planExpiresAt}` : ''}
            {billing.trialEndsAt ? ` · trial ends ${billing.trialEndsAt}` : ''}
            <br />
            Entitled: {billing.entitled ? 'yes' : 'no'}
            {billing.configured
              ? ` · ${billing.currency} ${billing.amount}/mo`
              : ' · Xendit not configured on API'}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>Loading…</p>
        )}
        {error ? (
          <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-blue"
            disabled={busy || billing?.configured === false}
            onClick={() => void onUpgrade()}
          >
            {busy ? 'Opening…' : 'Upgrade with Xendit'}
          </button>
          {billing?.xenditPlanId ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => void onCancel()}
            >
              Cancel subscription
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

function IconDownload() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
      />
    </svg>
  )
}

export function SettingsPage() {
  const {
    state,
    updateSettings,
    downloadBackup,
    restoreBackup,
    resetAllData,
    session,
    flash,
  } = useAquaFlow()

  const [stationName, setStationName] = useState(state.settings.stationName)
  const [phone, setPhone] = useState(state.settings.phone)
  const [address, setAddress] = useState(state.settings.address)
  const [lat, setLat] = useState<number | null>(state.settings.lat)
  const [lng, setLng] = useState<number | null>(state.settings.lng)
  const [currency, setCurrency] = useState(state.settings.currency)
  const [openTime, setOpenTime] = useState(state.settings.openTime || '08:00')
  const [closeTime, setCloseTime] = useState(state.settings.closeTime || '18:00')
  const fileRef = useRef<HTMLInputElement>(null)

  const settingsKey = `${state.settings.stationName}|${state.settings.phone}|${state.settings.address}|${state.settings.lat}|${state.settings.lng}|${state.settings.currency}|${state.settings.openTime}|${state.settings.closeTime}`
  const [syncedKey, setSyncedKey] = useState(settingsKey)
  if (settingsKey !== syncedKey) {
    setSyncedKey(settingsKey)
    setStationName(state.settings.stationName)
    setPhone(state.settings.phone)
    setAddress(state.settings.address)
    setLat(state.settings.lat)
    setLng(state.settings.lng)
    setCurrency(state.settings.currency)
    setOpenTime(state.settings.openTime || '08:00')
    setCloseTime(state.settings.closeTime || '18:00')
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    await updateSettings({
      stationName: stationName.trim() || 'Station Manager',
      phone: phone.trim(),
      address: address.trim(),
      lat,
      lng,
      currency: currency.trim() || '₱',
      owner: state.settings.owner || '',
      openTime: openTime.trim(),
      closeTime: closeTime.trim(),
      gcashQrUrl: state.settings.gcashQrUrl,
      mayaQrUrl: state.settings.mayaQrUrl,
    })
  }

  async function onFileChange(file: File | undefined) {
    if (!file) return
    await restoreBackup(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onReset() {
    if (!confirm('Sigurado ka? Mabubura LAHAT.')) return
    if (!confirm('Last chance — full reset?')) return
    resetAllData()
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Settings</h2>
          <div className="sub">Station info at data tools</div>
        </div>
      </div>

      <div className="setgrid">
        <div className="card card-wide">
          <div className="card-h">
            <h3>Station Info</h3>
          </div>
          <div className="card-b">
            <form onSubmit={(e) => void onSave(e)}>
              <div className="settings-station-cols">
                <div>
                  <div className="field">
                    <label htmlFor="s_n">Station Name</label>
                    <input
                      id="s_n"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="s_p">Phone</label>
                    <input id="s_p" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="s_c">Currency</label>
                    <input
                      id="s_c"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    />
                  </div>
                  <div className="settings-hours-row">
                    <div className="field">
                      <label htmlFor="s_open">Opens</label>
                      <input
                        id="s_open"
                        type="time"
                        value={openTime || '08:00'}
                        onChange={(e) => setOpenTime(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="s_close">Closes</label>
                      <input
                        id="s_close"
                        type="time"
                        value={closeTime || '18:00'}
                        onChange={(e) => setCloseTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
                    Shown on the landing page (Asia/Manila). Overnight hours are supported
                    (e.g. 10:00 PM – 6:00 AM).
                  </p>
                  <button type="submit" className="btn btn-blue">
                    Save Settings
                  </button>
                </div>
                <div>
                  <StationLocationPicker
                    apiBaseUrl={session.apiBaseUrl}
                    value={{ address, lat, lng }}
                    onChange={(next) => {
                      setAddress(next.address)
                      setLat(next.lat)
                      setLng(next.lng)
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        {session.token ? (
          <ChangePasswordCard
            apiUrl={session.apiBaseUrl}
            token={session.token}
            onFlash={flash}
          />
        ) : null}

        {session.token && session.userRole === 'owner' ? (
          <TeamInvitesCard apiUrl={session.apiBaseUrl} token={session.token} />
        ) : null}

        {session.token && session.userRole === 'owner' ? (
          <BillingCard apiUrl={session.apiBaseUrl} token={session.token} />
        ) : null}

        <div className="card">
          <div className="card-h">
            <h3>Backup &amp; Restore</h3>
          </div>
          <div className="card-b">
            <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 13 }}>
              Offline-first: naka-save lahat sa device na ito. I-download regularly ang backup file.
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-navy" onClick={downloadBackup}>
                <IconDownload /> Download Backup
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
              >
                Restore from File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => void onFileChange(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Danger Zone</h3>
          </div>
          <div className="card-b">
            <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 13 }}>
              I-reset lahat ng station data. Hindi maibabalik maliban kung may backup.
            </p>
            <button type="button" className="btn btn-red" onClick={onReset}>
              Reset All Data
            </button>
          </div>
        </div>

        {session.token ? (
          <PaymentMethodsCard apiUrl={session.apiBaseUrl} token={session.token} />
        ) : (
          <div className="card card-span-4">
            <div className="card-h">
              <h3>Payment methods</h3>
            </div>
            <div className="card-b">
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                Sign in to add payment platforms and upload QR codes for checkout.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
