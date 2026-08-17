import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'
import { AuthLayout, useAuthForm } from '@/features/onboarding/AuthLayout'
import { configuredApiBaseUrl } from '@/session/types'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { setApiBaseUrl, acceptInvite } = useAquaFlow()
  const navigate = useNavigate()
  const { error, setError, busy, setBusy } = useAuthForm()
  const apiUrl = configuredApiBaseUrl()
  const [preview, setPreview] = useState<{
    stationName: string
    email: string | null
    expiresAt: string
  } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setPreview(null)
    setLoadError(null)
    setApiBaseUrl(apiUrl)
    void api
      .getInvite(apiUrl, token)
      .then((res) => {
        if (cancelled) return
        setPreview({
          stationName: res.invite.stationName,
          email: res.invite.email,
          expiresAt: res.invite.expiresAt,
        })
        if (res.invite.email) setEmail(res.invite.email)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Invite not found',
        )
      })
    return () => {
      cancelled = true
    }
  }, [token, apiUrl, setApiBaseUrl])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setBusy(true)
    setApiBaseUrl(apiUrl)
    try {
      await acceptInvite(token, { email: email.trim(), password })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not accept invite',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Join a station"
      subtitle={preview ? preview.stationName : 'Staff invite'}
    >
      {loadError ? (
        <p style={{ color: 'var(--red)', fontSize: 13 }}>
          {loadError}{' '}
          <Link to="/login" style={{ color: 'var(--blue)' }}>
            Sign in
          </Link>
        </p>
      ) : !preview ? (
        <p style={{ color: 'var(--ink2)', fontSize: 13 }}>Loading invite…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)}>
          <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
            Expires {new Date(preview.expiresAt).toLocaleString()}
          </p>
          <div className="field">
            <label htmlFor="inv_e">Email</label>
            <input
              id="inv_e"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={Boolean(preview.email)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="inv_p">Choose password</label>
            <input
              id="inv_p"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>
          ) : null}
          <button type="submit" className="btn btn-blue" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Joining…' : 'Accept invite'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
