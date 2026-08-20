import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ActionIcon } from '@/components/ActionIcon'
import { ApiError, login, registerPlatformAdmin } from '@/api/client'
import * as api from '@/api/client'
import { AuthLayout, useAuthForm } from '@/features/onboarding/AuthLayout'
import { configuredApiBaseUrl } from '@/session/types'
import '@/styles/platform.css'

const TOKEN_KEY = 'aquaFlow_platform_token_v1'
const API_KEY = 'aquaFlow_platform_api_v1'

type PlatSection = 'dashboard' | 'account' | 'stations'

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase() || '?'
}

function IconUser() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconBadge() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2l3 2 4-.5-.5 4L21 12l-2.5 3.5.5 4-4-.5-3 2-3-2-4 .5.5-4L3 12l2.5-3.5L5 4.5 9 5l3-3z"
      />
    </svg>
  )
}

function IconId() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" d="M7 10h4M7 14h10" />
    </svg>
  )
}

function IconHome() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8.5z"
      />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      />
    </svg>
  )
}

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
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('admin@aquaflow.local')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [secretCode, setSecretCode] = useState('')
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

  const [platformUser, setPlatformUser] = useState<api.AuthMeUser | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState<string | null>(null)
  const [section, setSection] = useState<PlatSection>('dashboard')
  const [stationDetail, setStationDetail] = useState<api.PlatformStationDetail | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

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

  async function openStationDetail(stationId: string) {
    if (!token) return
    setDetailBusy(true)
    setDetailError(null)
    try {
      const detail = await api.getPlatformStation(apiUrl, token, stationId)
      setStationDetail(detail)
    } catch (err) {
      setStationDetail(null)
      setDetailError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load station',
      )
    } finally {
      setDetailBusy(false)
    }
  }

  function closeStationDetail() {
    setStationDetail(null)
    setDetailError(null)
  }

  function closeCreateModal() {
    if (createBusy) return
    setCreateOpen(false)
    setCreateError(null)
  }

  function applySession(session: Awaited<ReturnType<typeof login>>) {
    if (!session.user.isPlatformAdmin) {
      setError('This account is not a platform admin')
      return false
    }
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(API_KEY, apiUrl)
    setToken(session.token)
    setPlatformUser({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      stationId: session.user.stationId,
      riderId: session.user.riderId ?? null,
      isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
    })
    return true
  }

  async function refresh(authToken: string, base: string) {
    setListError(null)
    try {
      const [stationsRes, meRes] = await Promise.all([
        api.listPlatformStations(base, authToken),
        api.getAuthMe(base, authToken),
      ])
      if (!meRes.user.isPlatformAdmin) {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setPlatformUser(null)
        setListError('This account is not a platform admin')
        return
      }
      setPlatformUser(meRes.user)
      setStations(stationsRes.stations)
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
        setPlatformUser(null)
      }
    }
  }

  useEffect(() => {
    if (token) void refresh(token, apiUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function openPasswordModal() {
    setPwError(null)
    setPwOk(null)
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPwOpen(true)
  }

  function closePasswordModal() {
    if (pwBusy) return
    setPwOpen(false)
    setPwError(null)
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setPwError(null)
    setPwOk(null)
    if (pwNew.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError('New password and confirmation do not match')
      return
    }
    setPwBusy(true)
    try {
      await api.changePassword(apiUrl, token, {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      })
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setPwOk('Password updated')
      setPwOpen(false)
    } catch (err) {
      setPwError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update password',
      )
    } finally {
      setPwBusy(false)
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await login(apiUrl, email.trim(), password)
      applySession(session)
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

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setBusy(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setBusy(false)
      return
    }
    try {
      const session = await registerPlatformAdmin(apiUrl, {
        secretCode,
        email: email.trim(),
        password,
      })
      applySession(session)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Registration failed',
      )
    } finally {
      setBusy(false)
    }
  }

  function onLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setPlatformUser(null)
    setStations([])
    setPwOk(null)
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
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}
          role="tablist"
          aria-label="Platform auth"
        >
          <button
            type="button"
            className={authMode === 'signin' ? 'btn btn-navy' : 'btn btn-ghost'}
            style={{ flex: 1 }}
            onClick={() => {
              setAuthMode('signin')
              setError(null)
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'btn btn-navy' : 'btn btn-ghost'}
            style={{ flex: 1 }}
            onClick={() => {
              setAuthMode('register')
              setError(null)
              setEmail('')
            }}
          >
            Register
          </button>
        </div>

        {authMode === 'signin' ? (
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
        ) : (
          <form onSubmit={(e) => void onRegister(e)}>
            <div className="field">
              <label htmlFor="plat_reg_api">API URL</label>
              <input
                id="plat_reg_api"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="plat_secret">Registration code</label>
              <input
                id="plat_secret"
                type="password"
                autoComplete="off"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="plat_reg_e">Email</label>
              <input
                id="plat_reg_e"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="plat_reg_p">Password</label>
              <input
                id="plat_reg_p"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="plat_reg_p2">Confirm password</label>
              <input
                id="plat_reg_p2"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error ? (
              <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>
            ) : null}
            <button type="submit" className="btn btn-navy" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Creating account…' : 'Create platform account'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 12 }}>
              Requires the platform registration code configured on the API. Creates an ops admin,
              not a water station.
            </p>
          </form>
        )}
      </AuthLayout>
    )
  }

  return (
    <div className="plat">
      <aside className="plat-side" aria-label="Platform sidebar">
        <div className="plat-brand">
          Aqua<span>Flow</span> platform
        </div>

        {platformUser ? (
          <div className="plat-profile">
            <div className="plat-avatar" aria-hidden="true">
              {initialsFromEmail(platformUser.email)}
            </div>
            <div className="plat-email">{platformUser.email}</div>
            <div className="plat-meta">
              <div className="plat-meta-row">
                <IconUser />
                <div>
                  <span className="label">Role</span>
                  <strong>{platformUser.role}</strong>
                </div>
              </div>
              <div className="plat-meta-row">
                <IconBadge />
                <div>
                  <span className="label">Access</span>
                  <strong>
                    {platformUser.isPlatformAdmin ? 'Platform admin' : 'Standard'}
                  </strong>
                </div>
              </div>
              <div className="plat-meta-row">
                <IconId />
                <div>
                  <span className="label">User ID</span>
                  <strong>{platformUser.id}</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn plat-pw-btn"
              onClick={openPasswordModal}
            >
              Change Password
            </button>
          </div>
        ) : null}

        <nav className="plat-nav" aria-label="Platform">
          <button
            type="button"
            className={section === 'dashboard' && !stationDetail ? 'active' : undefined}
            onClick={() => {
              closeStationDetail()
              setSection('dashboard')
            }}
          >
            <IconHome />
            Dashboard
          </button>
          <button
            type="button"
            className={section === 'account' ? 'active' : undefined}
            onClick={() => {
              closeStationDetail()
              setSection('account')
            }}
          >
            <IconUser />
            My account
          </button>
          <button
            type="button"
            className={section === 'stations' && !stationDetail ? 'active' : undefined}
            onClick={() => {
              closeStationDetail()
              setSection('stations')
            }}
          >
            <IconGrid />
            All stations
          </button>
          <button type="button" className="danger" onClick={onLogout}>
            <IconLogout />
            Sign out
          </button>
        </nav>
      </aside>

      <main className="plat-main">
        <h1>
          {stationDetail
            ? stationDetail.station.name
            : section === 'account'
              ? 'My account'
              : section === 'stations'
                ? 'All stations'
                : 'Dashboard'}
        </h1>

        {listError ? <p className="plat-flash error">{listError}</p> : null}
        {createOk ? <p className="plat-flash">{createOk}</p> : null}
        {pwOk ? <p className="plat-flash">{pwOk}</p> : null}
        {detailError ? <p className="plat-flash error">{detailError}</p> : null}
        {detailBusy ? <p className="plat-flash">Loading station…</p> : null}

        {stationDetail ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 14 }}
              onClick={closeStationDetail}
            >
              ← Back to stations
            </button>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h">
                <h3>Station info</h3>
              </div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Name</div>
                    <strong>{stationDetail.settings.stationName || stationDetail.station.name}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Slug / ID</div>
                    <span>
                      {stationDetail.station.slug} · {stationDetail.station.id}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Plan</div>
                    <strong>{stationDetail.station.planStatus}</strong>
                    <div style={{ color: 'var(--ink2)', marginTop: 2 }}>
                      Expires{' '}
                      {stationDetail.station.planExpiresAt ??
                        stationDetail.station.trialEndsAt ??
                        '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Phone</div>
                    <span>{stationDetail.settings.phone || '—'}</span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Owner (settings)</div>
                    <span>{stationDetail.settings.owner || '—'}</span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Currency</div>
                    <span>{stationDetail.settings.currency || '—'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Address</div>
                    <span>{stationDetail.settings.address || '—'}</span>
                  </div>
                </div>

                {stationDetail.users.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--ink2)', marginBottom: 8, fontWeight: 700 }}>
                      Accounts
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {stationDetail.users.map((u) => (
                        <li key={u.id} style={{ marginBottom: 4 }}>
                          {u.email} <span style={{ color: 'var(--ink2)' }}>({u.role})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h">
                <h3>Products ({stationDetail.products.length})</h3>
              </div>
              <div className="card-b" style={{ overflowX: 'auto' }}>
                {stationDetail.products.length === 0 ? (
                  <div className="plat-stations-empty">No products</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ padding: '8px 6px' }}>Name</th>
                        <th style={{ padding: '8px 6px' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationDetail.products.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '10px 6px' }}>{p.name}</td>
                          <td style={{ padding: '10px 6px' }}>
                            {stationDetail.settings.currency}
                            {p.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <h3>Riders ({stationDetail.riders.length})</h3>
              </div>
              <div className="card-b" style={{ overflowX: 'auto' }}>
                {stationDetail.riders.length === 0 ? (
                  <div className="plat-stations-empty">No riders</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                        <th style={{ padding: '8px 6px' }}>Name</th>
                        <th style={{ padding: '8px 6px' }}>Phone</th>
                        <th style={{ padding: '8px 6px' }}>Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationDetail.riders.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '10px 6px' }}>{r.name}</td>
                          <td style={{ padding: '10px 6px' }}>{r.phone || '—'}</td>
                          <td style={{ padding: '10px 6px' }}>
                            {r.email ?? (r.hasAccount ? '—' : 'No account')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : null}

        {!stationDetail && section === 'account' && platformUser ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h">
              <h3>Account details</h3>
            </div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Email</div>
                  <strong>{platformUser.email}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Role</div>
                  <strong>{platformUser.role}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>Access</div>
                  <strong>
                    {platformUser.isPlatformAdmin ? 'Platform admin' : 'Standard'}
                  </strong>
                </div>
                <div>
                  <div style={{ color: 'var(--ink2)', marginBottom: 4 }}>User ID</div>
                  <span style={{ wordBreak: 'break-all' }}>{platformUser.id}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 14 }}
                onClick={openPasswordModal}
              >
                Change password
              </button>
            </div>
          </div>
        ) : null}

        {!stationDetail && section !== 'account' ? (
          <div className="card">
            <div className="card-h">
              <h3>All stations</h3>
              <button
                type="button"
                className="btn btn-blue btn-sm"
                onClick={openCreateModal}
                aria-label="Create station"
                title="Create station"
              >
                <ActionIcon name="plus" />
              </button>
            </div>
            <div className="card-b" style={{ overflowX: 'auto' }}>
              {stations.length === 0 ? (
                <div className="plat-stations-empty">No stations yet. Create one with +.</div>
              ) : (
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
                          <button
                            type="button"
                            onClick={() => void openStationDetail(s.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              font: 'inherit',
                              fontWeight: 700,
                              color: 'var(--blue)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              textDecoration: 'underline',
                              textUnderlineOffset: 2,
                            }}
                          >
                            {s.name}
                          </button>
                          <br />
                          <span style={{ color: 'var(--ink2)' }}>
                            {s.slug} · {s.id}
                          </span>
                        </td>
                        <td style={{ padding: '10px 6px' }}>{s.planStatus}</td>
                        <td style={{ padding: '10px 6px' }}>{s.billingInterval ?? '—'}</td>
                        <td style={{ padding: '10px 6px' }}>
                          {s.planExpiresAt ?? s.trialEndsAt ?? '—'}
                        </td>
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
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Modal
        title="Change password"
        open={pwOpen}
        onClose={closePasswordModal}
        hideFooter
      >
        <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
          Update the password for {platformUser?.email ?? 'your platform account'}.
        </p>
        <form onSubmit={(e) => void onChangePassword(e)}>
          <div className="field">
            <label htmlFor="plat_pw_cur">Current password</label>
            <input
              id="plat_pw_cur"
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="plat_pw_new">New password</label>
            <input
              id="plat_pw_new"
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="plat_pw_confirm">Confirm new password</label>
            <input
              id="plat_pw_confirm"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {pwError ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{pwError}</p>
          ) : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closePasswordModal}
              disabled={pwBusy}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-blue" disabled={pwBusy}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </Modal>

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
