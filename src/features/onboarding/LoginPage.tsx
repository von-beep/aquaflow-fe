import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'
import { AuthLayout, useAuthForm } from '@/features/onboarding/AuthLayout'
import { configuredApiBaseUrl } from '@/session/types'

export function LoginPage() {
  const { login, setApiBaseUrl } = useAquaFlow()
  const navigate = useNavigate()
  const { error, setError, busy, setBusy } = useAuthForm()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // Station app uses deploy env / default — platform ops keep API URL on /platform.
    setApiBaseUrl(configuredApiBaseUrl())
    try {
      await login(email.trim(), password)
      navigate('/admin/dashboard', { replace: true })
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
      title="Sign in"
      subtitle="Station owner or staff account"
      showStationAppLink={false}
    >
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label htmlFor="li_e">Email</label>
          <input
            id="li_e"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="li_p">Password</label>
          <input
            id="li_p"
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
        Delivery rider? <a href="/rider">Sign in at /rider</a>. Station accounts are created by
        your platform operator.
      </p>
    </AuthLayout>
  )
}
