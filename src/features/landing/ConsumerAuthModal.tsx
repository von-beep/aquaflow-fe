import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'
import type { ConsumerProfile } from '@/consumer/types'

type Mode = 'login' | 'register'

type Props = {
  open: boolean
  apiBaseUrl: string
  initialMode?: Mode
  onClose: () => void
  onSuccess: (token: string, consumer: ConsumerProfile) => void
}

export function ConsumerAuthModal({
  open,
  apiBaseUrl,
  initialMode = 'login',
  onClose,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = `${open}:${initialMode}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setMode(initialMode)
    setEmail('')
    setPassword('')
    setName('')
    setPhone('')
    setError(null)
    setBusy(false)
  }

  return (
    <Modal
      title={mode === 'login' ? 'Customer sign in' : 'Create customer account'}
      open={open}
      onClose={onClose}
      saveLabel={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
      onSave={async () => {
        if (busy) return false
        setError(null)
        if (!email.trim() || !password) {
          setError('Email and password are required')
          return false
        }
        if (mode === 'register' && !name.trim()) {
          setError('Name is required')
          return false
        }
        setBusy(true)
        try {
          const res =
            mode === 'login'
              ? await api.loginConsumer(apiBaseUrl, email.trim(), password)
              : await api.registerConsumer(apiBaseUrl, {
                  email: email.trim(),
                  password,
                  name: name.trim(),
                  phone: phone.trim(),
                })
          onSuccess(res.token, res.consumer)
          return true
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not sign in',
          )
          return false
        } finally {
          setBusy(false)
        }
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 12 }}>
        Sign in to place orders and track status across all AquaFlow stations.
      </p>

      {mode === 'register' ? (
        <>
          <div className="field">
            <label htmlFor="c_name">Full name</label>
            <input
              id="c_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="c_phone">Phone</label>
            <input
              id="c_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </>
      ) : null}

      <div className="field">
        <label htmlFor="c_email">Email</label>
        <input
          id="c_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="c_pass">Password</label>
        <input
          id="c_pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </div>

      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
      ) : null}

      <p style={{ fontSize: 13, marginTop: 4 }}>
        {mode === 'login' ? (
          <>
            No account?{' '}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0 4px', verticalAlign: 'baseline' }}
              onClick={() => {
                setMode('register')
                setError(null)
              }}
            >
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0 4px', verticalAlign: 'baseline' }}
              onClick={() => {
                setMode('login')
                setError(null)
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </Modal>
  )
}
