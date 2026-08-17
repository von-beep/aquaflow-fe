import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'
import { StationLocationPicker } from '@/features/settings/StationLocationPicker'

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
  const [qrPhUrl, setQrPhUrl] = useState(state.settings.qrPhUrl)
  const [qrBusy, setQrBusy] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const qrFileRef = useRef<HTMLInputElement>(null)

  const settingsKey = `${state.settings.stationName}|${state.settings.phone}|${state.settings.address}|${state.settings.lat}|${state.settings.lng}|${state.settings.currency}|${state.settings.qrPhUrl}`
  const [syncedKey, setSyncedKey] = useState(settingsKey)
  if (settingsKey !== syncedKey) {
    setSyncedKey(settingsKey)
    setStationName(state.settings.stationName)
    setPhone(state.settings.phone)
    setAddress(state.settings.address)
    setLat(state.settings.lat)
    setLng(state.settings.lng)
    setCurrency(state.settings.currency)
    setQrPhUrl(state.settings.qrPhUrl)
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
      qrPhUrl,
    })
  }

  async function onQrPhFile(file: File | undefined) {
    if (!file || !session.token) {
      setQrError(session.token ? null : 'Sign in to upload QR Ph')
      return
    }
    if (!file.type.startsWith('image/')) {
      setQrError('Choose a PNG, JPEG, or WebP image')
      return
    }
    if (file.size > 600_000) {
      setQrError('Image is too large (max ~600KB)')
      return
    }
    setQrBusy(true)
    setQrError(null)
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
      const res = await api.uploadStationQrPh(
        session.apiBaseUrl,
        session.token,
        dataUrl,
      )
      const nextUrl = res.qrPhUrl ?? ''
      setQrPhUrl(nextUrl)
      await updateSettings({
        ...state.settings,
        stationName: stationName.trim() || state.settings.stationName,
        phone: phone.trim(),
        address: address.trim(),
        lat,
        lng,
        currency: currency.trim() || '₱',
        qrPhUrl: nextUrl,
      })
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setQrBusy(false)
      if (qrFileRef.current) qrFileRef.current.value = ''
    }
  }

  async function onClearQrPh() {
    if (!session.token) return
    if (!confirm('Remove the QR Ph image from checkout?')) return
    setQrBusy(true)
    setQrError(null)
    try {
      await api.deleteStationQrPh(session.apiBaseUrl, session.token)
      setQrPhUrl('')
      await updateSettings({
        ...state.settings,
        stationName: stationName.trim() || state.settings.stationName,
        phone: phone.trim(),
        address: address.trim(),
        lat,
        lng,
        currency: currency.trim() || '₱',
        qrPhUrl: '',
      })
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'Could not remove QR Ph')
    } finally {
      setQrBusy(false)
    }
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
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label htmlFor="s_qrph">QR Ph (GCash / Maya / InstaPay)</label>
                    <p style={{ fontSize: 12, color: 'var(--ink2)', margin: '0 0 8px' }}>
                      Upload your QR Ph code. Shoppers see it at checkout when they pay with
                      GCash or Maya.
                    </p>
                    {qrPhUrl ? (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={
                            qrPhUrl.startsWith('http')
                              ? qrPhUrl
                              : `${session.apiBaseUrl.replace(/\/$/, '')}${qrPhUrl}`
                          }
                          alt="Station QR Ph"
                          style={{
                            width: 160,
                            height: 160,
                            objectFit: 'contain',
                            border: '1px solid var(--line)',
                            borderRadius: 10,
                            background: '#fff',
                            padding: 8,
                          }}
                        />
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
                        No QR Ph uploaded yet.
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <input
                        ref={qrFileRef}
                        id="s_qrph"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => void onQrPhFile(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={qrBusy || !session.token}
                        onClick={() => qrFileRef.current?.click()}
                      >
                        {qrBusy ? 'Uploading…' : qrPhUrl ? 'Replace QR Ph' : 'Upload QR Ph'}
                      </button>
                      {qrPhUrl ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={qrBusy || !session.token}
                          onClick={() => void onClearQrPh()}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {qrError ? (
                      <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{qrError}</p>
                    ) : null}
                    {!session.token ? (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                        Sign in to upload a QR Ph for the landing page checkout.
                      </p>
                    ) : null}
                  </div>
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
      </div>
    </>
  )
}
