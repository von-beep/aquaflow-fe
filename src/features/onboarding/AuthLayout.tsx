import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const shell: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  fontFamily: 'var(--font-ui)',
  color: 'var(--ink)',
  padding: '2rem 1.25rem',
}

const card: CSSProperties = {
  maxWidth: 420,
  margin: '0 auto',
  background: 'var(--panel)',
  borderRadius: 'var(--r)',
  boxShadow: 'var(--shadow)',
  border: '1px solid var(--line)',
  padding: '1.5rem',
}

export function AuthLayout({
  title,
  subtitle,
  children,
  showStationAppLink = true,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  /** Footer link to /admin — hide on platform ops login. */
  showStationAppLink?: boolean
}) {
  return (
    <div style={shell}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 600 }}>
            Aqua<span style={{ color: 'var(--blue)' }}>Flow</span>
          </h1>
        </Link>
        <h2 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>{title}</h2>
        {subtitle ? (
          <p style={{ color: 'var(--ink2)', fontSize: 14, marginTop: 6 }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={card}>{children}</div>
      {showStationAppLink ? (
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13 }}>
          <Link to="/admin" style={{ color: 'var(--blue)' }}>
            Open station app
          </Link>
        </p>
      ) : null}
    </div>
  )
}

export function useAuthForm() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return { error, setError, busy, setBusy }
}

export type { FormEvent }
