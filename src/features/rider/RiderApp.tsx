import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { ApiError } from '@/api/client'
import { IconDrop } from '@/app/icons'
import { formatMoney } from '@/domain/money'
import { today } from '@/domain/dates'
import {
  clearRiderSession,
  loadRiderSession,
  saveRiderSession,
} from '@/session/riderMeta'
import { defaultRiderSessionApiUrl, type RiderSession } from '@/session/types'
import { AuthLayout, useAuthForm } from '@/features/onboarding/AuthLayout'

type PayChoice = 'Cash' | 'GCash' | 'Maya' | 'Utang'

function absoluteUrl(apiBaseUrl: string, path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

function payLabel(payMode: string, prepaid: boolean): string {
  if (prepaid) return `Paid via ${payMode}`
  if (payMode === 'Utang') return 'Utang'
  return 'Cash on delivery'
}

function statusTone(status: string): 'done' | 'progress' | 'pending' | 'cancel' {
  if (status === 'Completed') return 'done'
  if (status === 'In Progress') return 'progress'
  if (status === 'Cancelled') return 'cancel'
  return 'pending'
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 5h6M8 3h8a1 1 0 011 1v2H7V4a1 1 0 011-1zM7 7h10v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RiderLogin({ onSignedIn }: { onSignedIn: (s: RiderSession) => void }) {
  const { error, setError, busy, setBusy } = useAuthForm()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const apiUrl = defaultRiderSessionApiUrl().replace(/\/$/, '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const auth = await api.login(apiUrl, email.trim(), password)
      if (auth.user.role !== 'rider' || !auth.user.riderId) {
        throw new ApiError(
          'Use /login for station owner or staff accounts',
          403,
          auth,
        )
      }
      const me = await api.getRiderMe(apiUrl, auth.token)
      const session: RiderSession = {
        apiBaseUrl: apiUrl,
        token: auth.token,
        email: auth.user.email,
        stationId: auth.station.id,
        stationName: auth.station.name,
        riderId: auth.user.riderId,
        riderName: me.rider.name,
      }
      saveRiderSession(session)
      onSignedIn(session)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Sign in failed',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Rider sign in"
      subtitle="Delivery stops for your station"
      showStationAppLink={false}
    >
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label htmlFor="rd_e">Email</label>
          <input
            id="rd_e"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="rd_p">Password</label>
          <input
            id="rd_p"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? (
          <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>
        ) : null}
        <button type="submit" className="btn btn-blue" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 14, color: 'var(--ink2)' }}>
        Account is created by your station owner.{' '}
        <Link to="/login">Station login</Link>
      </p>
    </AuthLayout>
  )
}

function CompletePanel({
  session,
  order,
  onDone,
  onCancel,
}: {
  session: RiderSession
  order: api.RiderAppOrder
  onDone: () => void
  onCancel: () => void
}) {
  const prepaid = order.payMode === 'GCash' || order.payMode === 'Maya'
  const [payment, setPayment] = useState<PayChoice>(
    prepaid ? (order.payMode as 'GCash' | 'Maya') : 'Cash',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const proofUrl = absoluteUrl(session.apiBaseUrl, order.paymentProofUrl)

  async function onComplete() {
    setBusy(true)
    setError(null)
    try {
      const pay: PayChoice = prepaid ? (order.payMode as 'GCash' | 'Maya') : payment
      await api.completeRiderOrder(session.apiBaseUrl, session.token, order.orderId, pay)
      onDone()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not complete',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rider-sheet-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="rider-sheet"
        role="dialog"
        aria-labelledby="rider-complete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="rider-complete-title">Complete delivery</h3>
        <p className="rider-sheet-cust">
          <b>{order.customerName}</b>
          <span>{order.customerAddr || 'No address'}</span>
          {order.landmark?.trim() ? (
            <span className="rider-landmark">{order.landmark.trim()}</span>
          ) : null}
        </p>
        <ul className="rider-sheet-lines">
          {order.lines.map((l) => (
            <li key={l.id}>
              <span>
                {l.qty}× {l.productName}
              </span>
              <b>{formatMoney(l.amount, '₱')}</b>
            </li>
          ))}
        </ul>
        <p className="rider-sheet-total">
          Total <b>{formatMoney(order.total, '₱')}</b>
        </p>

        {prepaid ? (
          <div className="rider-sheet-pay">
            <span className="rider-badge rider-badge-done">Paid · {order.payMode}</span>
            {proofUrl ? (
              <div className="rider-proof">
                <div className="rider-proof-label">Payment proof — verify before completing</div>
                <a href={proofUrl} target="_blank" rel="noreferrer">
                  <img src={proofUrl} alt={`${order.payMode} payment proof`} />
                </a>
              </div>
            ) : (
              <p className="rider-muted">No screenshot on file — confirm with station if needed.</p>
            )}
          </div>
        ) : (
          <div className="field">
            <label htmlFor="rd_pay">Collect payment</label>
            <select
              id="rd_pay"
              value={payment}
              onChange={(e) => setPayment(e.target.value as PayChoice)}
            >
              <option value="Cash">Cash on delivery</option>
              <option value="Utang">Utang (ilista)</option>
            </select>
          </div>
        )}

        {error ? <p className="rider-error">{error}</p> : null}

        <div className="rider-sheet-actions">
          <button
            type="button"
            className="btn btn-green"
            disabled={busy}
            onClick={() => void onComplete()}
          >
            {busy ? 'Saving…' : 'Complete transaction'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function RiderChangePasswordSheet({
  session,
  onClose,
}: {
  session: RiderSession
  onClose: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

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
      await api.changePassword(session.apiBaseUrl, session.token, {
        currentPassword,
        newPassword,
      })
      setDone(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
    <div className="rider-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rider-sheet"
        role="dialog"
        aria-labelledby="rider-pw-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="rider-pw-title">Change password</h3>
        {done ? (
          <>
            <p className="rider-muted" style={{ marginBottom: 14 }}>
              Password updated. Use the new password next time you sign in.
            </p>
            <button type="button" className="btn btn-blue" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="field">
              <label htmlFor="rd_pw_cur">Current password</label>
              <input
                id="rd_pw_cur"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="rd_pw_new">New password</label>
              <input
                id="rd_pw_new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="rd_pw_confirm">Confirm new password</label>
              <input
                id="rd_pw_confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            {error ? <p className="rider-error">{error}</p> : null}
            <div className="rider-sheet-actions">
              <button type="submit" className="btn btn-navy" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function RiderHome({
  session,
  onSignOut,
}: {
  session: RiderSession
  onSignOut: () => void
}) {
  const [date, setDate] = useState(today())
  const [orders, setOrders] = useState<api.RiderAppOrder[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completeOrder, setCompleteOrder] = useState<api.RiderAppOrder | null>(null)
  const [menuOrderId, setMenuOrderId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.listRiderOrders(session.apiBaseUrl, session.token, date)
      setOrders(res.orders)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSignOut()
        return
      }
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load stops',
      )
    } finally {
      setBusy(false)
    }
  }, [session.apiBaseUrl, session.token, date, onSignOut])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const stats = useMemo(() => {
    const open = orders.filter(
      (o) => o.status !== 'Completed' && o.status !== 'Cancelled',
    )
    const completed = orders.filter((o) => o.status === 'Completed')
    const earnings = completed.reduce((s, o) => s + o.total, 0)
    const itemsDelivered = completed.reduce(
      (s, o) => s + o.lines.reduce((n, l) => n + l.qty, 0),
      0,
    )
    return {
      openCount: open.length,
      completedCount: completed.length,
      earnings,
      itemsDelivered,
    }
  }, [orders])

  async function markInProgress(orderId: string) {
    setMenuOrderId(null)
    try {
      await api.patchRiderOrderStatus(
        session.apiBaseUrl,
        session.token,
        orderId,
        'In Progress',
      )
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Update failed',
      )
    }
  }

  const initial = (session.riderName.trim()[0] || '?').toUpperCase()

  return (
    <div className="rider-app">
      <header className="rider-header">
        <div className="rider-brand">
          <span className="rider-logo" aria-hidden="true">
            <IconDrop />
          </span>
          <div>
            <div className="rider-title">
              Aqua<span>Flow</span> Rider
            </div>
            <div className="rider-sub">
              Rider {session.riderName} · {session.stationName}
            </div>
          </div>
        </div>
        <div className="rider-profile">
          <button
            type="button"
            className="rider-avatar"
            title="Profile"
            aria-label="Profile menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((v) => !v)}
          >
            {initial}
          </button>
          {profileOpen ? (
            <div className="rider-profile-menu">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  setChangePwOpen(true)
                }}
              >
                Change password
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  if (confirm('Sign out of rider app?')) onSignOut()
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="rider-body">
        <div className="rider-toolbar">
          <div className="rider-date-field">
            <label htmlFor="rd_date">Date</label>
            <input
              id="rd_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="rider-refresh"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <IconRefresh />
            Refresh
          </button>
          <div className="rider-stat rider-stat-open">
            <span className="rider-stat-num">{stats.openCount}</span>
            <span className="rider-stat-label">Open orders</span>
          </div>
          <div className="rider-stat rider-stat-done">
            <span className="rider-stat-icon" aria-hidden="true">
              <IconCheck />
            </span>
            <span className="rider-stat-num">{stats.completedCount}</span>
            <span className="rider-stat-label">Deliveries completed</span>
          </div>
        </div>

        {error ? <p className="rider-error">{error}</p> : null}

        {busy && !orders.length ? <p className="rider-muted">Loading stops…</p> : null}

        {!busy && orders.length === 0 ? (
          <div className="rider-empty">
            <b>No assigned stops</b>
            <span>Ask the station to assign deliveries to you for this date.</span>
          </div>
        ) : null}

        <div className="rider-list">
          {orders.map((o) => {
            const open = o.status !== 'Completed' && o.status !== 'Cancelled'
            const prepaid = o.payMode === 'GCash' || o.payMode === 'Maya'
            const tone = statusTone(o.status)
            const itemCount = o.lines.reduce((n, l) => n + l.qty, 0)
            const menuOpen = menuOrderId === o.orderId

            return (
              <article className="rider-card" key={o.orderId}>
                <div className="rider-card-top">
                  <div className="rider-card-identity">
                    <span className={`rider-status-dot rider-status-dot-${tone}`} aria-hidden="true">
                      {tone === 'done' ? <IconCheck /> : null}
                    </span>
                    <div>
                      <h3 className="rider-card-name">{o.customerName || 'Customer'}</h3>
                      <p className="rider-card-meta">
                        {(o.time || '').slice(0, 5)} · {itemCount} item
                        {itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="rider-badge-wrap">
                    <button
                      type="button"
                      className={`rider-badge rider-badge-${tone}`}
                      aria-expanded={menuOpen}
                      onClick={() =>
                        setMenuOrderId(menuOpen ? null : o.orderId)
                      }
                    >
                      {o.status}
                      <IconChevron />
                    </button>
                    {menuOpen ? (
                      <div className="rider-menu">
                        {open && o.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => void markInProgress(o.orderId)}
                          >
                            Mark In Progress
                          </button>
                        ) : null}
                        {open ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOrderId(null)
                              setCompleteOrder(o)
                            }}
                          >
                            Complete delivery
                          </button>
                        ) : null}
                        {!open ? (
                          <button type="button" disabled>
                            No actions
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rider-card-loc">
                  <span className="rider-pin" aria-hidden="true">
                    <IconPin />
                  </span>
                  <div>
                    <div>{o.customerAddr || 'No address'}</div>
                    {o.landmark?.trim() ? (
                      <div className="rider-landmark">{o.landmark.trim()}</div>
                    ) : null}
                    {o.customerPhone ? (
                      <a className="rider-phone" href={`tel:${o.customerPhone}`}>
                        {o.customerPhone}
                      </a>
                    ) : null}
                  </div>
                </div>

                <ul className="rider-items">
                  {o.lines.map((l) => (
                    <li key={l.id}>
                      {l.qty}x {l.productName}
                    </li>
                  ))}
                </ul>

                <div className="rider-card-pay">
                  <b>{formatMoney(o.total, '₱')}</b>
                  <span>{payLabel(o.payMode, prepaid)}</span>
                </div>

                {open ? (
                  <div className="rider-card-actions">
                    {o.status === 'Pending' ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void markInProgress(o.orderId)}
                      >
                        Start
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-green btn-sm"
                      onClick={() => setCompleteOrder(o)}
                    >
                      Complete
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {orders.length > 0 ? (
          <div className="rider-footer-stats">
            <div className="rider-foot-card rider-foot-earn">
              <span className="rider-foot-icon" aria-hidden="true">
                <IconCash />
              </span>
              <div>
                <b>{formatMoney(stats.earnings, '₱')}</b>
                <span>Total Earnings</span>
              </div>
            </div>
            <div className="rider-foot-card rider-foot-items">
              <span className="rider-foot-icon" aria-hidden="true">
                <IconClipboard />
              </span>
              <div>
                <b>{stats.itemsDelivered}</b>
                <span>Items Delivered</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {completeOrder ? (
        <CompletePanel
          session={session}
          order={completeOrder}
          onCancel={() => setCompleteOrder(null)}
          onDone={() => {
            setCompleteOrder(null)
            void refresh()
          }}
        />
      ) : null}

      {changePwOpen ? (
        <RiderChangePasswordSheet
          session={session}
          onClose={() => setChangePwOpen(false)}
        />
      ) : null}
    </div>
  )
}

export function RiderApp() {
  const [session, setSession] = useState<RiderSession | null>(() => loadRiderSession())

  function signOut() {
    clearRiderSession()
    setSession(null)
  }

  if (!session) {
    return <RiderLogin onSignedIn={setSession} />
  }

  return <RiderHome session={session} onSignOut={signOut} />
}
