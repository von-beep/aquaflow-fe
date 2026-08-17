import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/Modal'
import { ApiError, login } from '@/api/client'
import * as api from '@/api/client'
import { AuthLayout, useAuthForm } from '@/features/onboarding/AuthLayout'
import { configuredApiBaseUrl } from '@/session/types'

const TOKEN_KEY = 'aquaFlow_platform_token_v1'
const API_KEY = 'aquaFlow_platform_api_v1'

function loadStored(): { token: string; apiUrl: string } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const stored = localStorage.getItem(API_KEY)?.trim().replace(/\/$/, '') ?? ''
    const envUrl = configuredApiBaseUrl()
    // Drop stale localhost from older sessions when VITE_API_URL is set.
    const apiUrl =
      !stored || stored === 'http://localhost:3001' || stored === 'http://127.0.0.1:3001'
        ? envUrl
        : stored
    if (!token) return null
    return { token, apiUrl }
  } catch {
    return null
  }
}

export function PlatformAdminPage() {
  const stored = loadStored()
  const { error, setError, busy, setBusy } = useAuthForm()
  const [apiUrl, setApiUrl] = useState(() => stored?.apiUrl ?? configuredApiBaseUrl())
  const [email, setEmail] = useState('admin@aquaflow.local')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(stored?.token ?? null)
  const [stations, setStations] = useState<api.PlatformStation[]>([])
  const [listError, setListError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState<string | null>(null)

  const [planOpen, setPlanOpen] = useState(false)
  const [planStation, setPlanStation] = useState<api.PlatformStation | null>(null)
  const [planInterval, setPlanInterval] = useState<api.BillingInterval>('monthly')
  const [expiryMode, setExpiryMode] = useState<api.ExpiryMode>('auto')
  const [manualExpiry, setManualExpiry] = useState('')
  const [planBusy, setPlanBusy] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  function previewAutoExpiry(interval: api.BillingInterval): string {
    const d = new Date()
    if (interval === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
    else d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d.toISOString().slice(0, 10)
  }

  function openCreateModal() {
    setCreateError(null)
    setNewName('')
    setNewEmail('')
    setNewPassword('')
    setCreateOpen(true)
  }

  function closeCreateModal() {
    if (createBusy) return
    setCreateOpen(false)
    setCreateError(null)
  }

  async function refresh(authToken: string, base: string) {
    setListError(null)
    try {
      const res = await api.listPlatformStations(base, authToken)
      setStations(res.stations)
    } catch (err) {
      setListError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load stations',
      )
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      }
    }
  }

  useEffect(() => {
    if (token) void refresh(token, apiUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await login(apiUrl, email.trim(), password)
      if (!session.user.isPlatformAdmin) {
        setError('This account is not a platform admin')
        return
      }
      localStorage.setItem(TOKEN_KEY, session.token)
      localStorage.setItem(API_KEY, apiUrl)
      setToken(session.token)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Login failed',
      )
    } finally {
      setBusy(false)
    }
  }

  function onLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setStations([])
  }

  async function onCreateStation(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setCreateBusy(true)
    setCreateError(null)
    try {
      const res = await api.createPlatformStation(apiUrl, token, {
        stationName: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
      })
      setCreateOk(
        `Created “${res.station.name}” · owner ${res.owner.email} (14-day trial). They can sign in at /login.`,
      )
      setCreateOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      await refresh(token, apiUrl)
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Create failed',
      )
    } finally {
      setCreateBusy(false)
    }
  }

  async function onSuspend(id: string) {
    if (!token) return
    if (!window.confirm(`Suspend station ${id}? Users will not be able to log in.`)) return
    try {
      await api.suspendStation(apiUrl, token, id)
      await refresh(token, apiUrl)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Suspend failed')
    }
  }

  async function onUnsuspend(id: string) {
    if (!token) return
    try {
      await api.unsuspendStation(apiUrl, token, id)
      await refresh(token, apiUrl)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Unsuspend failed')
    }
  }

  function openPlanModal(station: api.PlatformStation) {
    setPlanStation(station)
    setPlanInterval(station.billingInterval ?? 'monthly')
    setExpiryMode(station.planExpiresAt ? 'manual' : 'auto')
    setManualExpiry(station.planExpiresAt ?? previewAutoExpiry(station.billingInterval ?? 'monthly'))
    setPlanError(null)
    setPlanOpen(true)
  }

  function closePlanModal() {
    if (planBusy) return
    setPlanOpen(false)
    setPlanStation(null)
    setPlanError(null)
  }

  async function onSavePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !planStation) return
    setPlanBusy(true)
    setPlanError(null)
    const input: api.PlanActivateInput = {
      billingInterval: planInterval,
      expiryMode,
      ...(expiryMode === 'manual' ? { planExpiresAt: manualExpiry } : {}),
    }
    try {
      if (planStation.planStatus === 'active') {
        await api.setStationBillingInterval(apiUrl, token, planStation.id, input)
      } else {
        await api.activateStation(apiUrl, token, planStation.id, input)
      }
      setPlanOpen(false)
      setPlanStation(null)
      await refresh(token, apiUrl)
    } catch (err) {
      setPlanError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Plan update failed',
      )
    } finally {
      setPlanBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Platform ops"
        subtitle="Create stations · list · suspend"
        showStationAppLink={false}
      >
        <form onSubmit={(e) => void onLogin(e)}>
          <div className="field">
            <label htmlFor="plat_api">API URL</label>
            <input
              id="plat_api"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="plat_e">Admin email</label>
            <input
              id="plat_e"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="plat_p">Password</label>
            <input
              id="plat_p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>
          ) : null}
          <button type="submit" className="btn btn-navy" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        padding: '1.5rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem' }}>
            Aqua<span style={{ color: 'var(--blue)' }}>Flow</span> platform
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink2)' }}>
            Create stations · suspend / unsuspend
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-blue" onClick={openCreateModal}>
            Create station
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void refresh(token, apiUrl)}>
            Refresh
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Sign out
          </button>
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </header>

      {listError ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{listError}</p>
      ) : null}
      {createOk ? (
        <p style={{ color: 'var(--ink2)', fontSize: 13, marginBottom: 12 }}>{createOk}</p>
      ) : null}

      <div className="card">
        <div className="card-h">
          <h3>All stations</h3>
        </div>
        <div className="card-b" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th style={{ padding: '8px 6px' }}>Plan</th>
                <th style={{ padding: '8px 6px' }}>Renewal</th>
                <th style={{ padding: '8px 6px' }}>Expires</th>
                <th style={{ padding: '8px 6px' }}>Users</th>
                <th style={{ padding: '8px 6px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 6px' }}>
                    <strong>{s.name}</strong>
                    <br />
                    <span style={{ color: 'var(--ink2)' }}>
                      {s.slug} · {s.id}
                    </span>
                  </td>
                  <td style={{ padding: '10px 6px' }}>{s.planStatus}</td>
                  <td style={{ padding: '10px 6px' }}>{s.billingInterval ?? '—'}</td>
                  <td style={{ padding: '10px 6px' }}>{s.planExpiresAt ?? '—'}</td>
                  <td style={{ padding: '10px 6px' }}>{s.userCount}</td>
                  <td style={{ padding: '10px 6px' }}>
                    {s.id === 's_platform' ? (
                      <span style={{ color: 'var(--ink2)' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.planStatus === 'suspended' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-blue"
                            onClick={() => void onUnsuspend(s.id)}
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <>
                            {(s.planStatus === 'trial' || s.planStatus === 'active') && (
                              <button
                                type="button"
                                className="btn btn-sm btn-navy"
                                onClick={() => openPlanModal(s)}
                              >
                                {s.planStatus === 'trial' ? 'Activate' : 'Renewal'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => void onSuspend(s.id)}
                            >
                              Suspend
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title="Create station"
        open={createOpen}
        onClose={closeCreateModal}
        hideFooter
      >
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Creates a trial station and owner account. Share the email/password so they can sign in at
          /login.
        </p>
        <form onSubmit={(e) => void onCreateStation(e)}>
          <div className="field">
            <label htmlFor="ns_name">Station name</label>
            <input
              id="ns_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="ns_email">Owner email</label>
            <input
              id="ns_email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ns_pass">Owner password (min 8)</label>
            <input
              id="ns_pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {createError ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{createError}</p>
          ) : null}
          <div className="modal-f" style={{ padding: '12px 0 0', margin: 0 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closeCreateModal}
              disabled={createBusy}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-blue" disabled={createBusy}>
              {createBusy ? 'Creating…' : 'Create station'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={
          planStation?.planStatus === 'active'
            ? `Renewal · ${planStation?.name ?? ''}`
            : `Activate · ${planStation?.name ?? ''}`
        }
        open={planOpen}
        onClose={closePlanModal}
        hideFooter
      >
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Manual plan (no Xendit charge). Sets the station to <strong>active</strong> and records
          renewal interval + expiry for ops tracking. Sync is blocked after the expiry date.
        </p>
        <form onSubmit={(e) => void onSavePlan(e)}>
          <div className="field">
            <label htmlFor="plan_interval">Billing interval</label>
            <select
              id="plan_interval"
              value={planInterval}
              onChange={(e) => {
                const next = e.target.value as api.BillingInterval
                setPlanInterval(next)
                if (expiryMode === 'auto') {
                  setManualExpiry(previewAutoExpiry(next))
                }
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
            <legend style={{ fontSize: 13, marginBottom: 8 }}>Expiry date</legend>
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="radio"
                name="expiry_mode"
                checked={expiryMode === 'auto'}
                onChange={() => {
                  setExpiryMode('auto')
                  setManualExpiry(previewAutoExpiry(planInterval))
                }}
              />
              Automatic ({planInterval === 'monthly' ? '+1 month' : '+1 year'} →{' '}
              {previewAutoExpiry(planInterval)})
            </label>
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <input
                type="radio"
                name="expiry_mode"
                checked={expiryMode === 'manual'}
                onChange={() => setExpiryMode('manual')}
              />
              Set manually
            </label>
            {expiryMode === 'manual' ? (
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="plan_expires">Expires on</label>
                <input
                  id="plan_expires"
                  type="date"
                  value={manualExpiry}
                  onChange={(e) => setManualExpiry(e.target.value)}
                  required
                />
              </div>
            ) : null}
          </fieldset>
          {planError ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{planError}</p>
          ) : null}
          <div className="modal-f" style={{ padding: '12px 0 0', margin: 0 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closePlanModal}
              disabled={planBusy}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-blue" disabled={planBusy}>
              {planBusy
                ? 'Saving…'
                : planStation?.planStatus === 'active'
                  ? 'Save renewal'
                  : 'Activate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
