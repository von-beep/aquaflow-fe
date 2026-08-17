import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconDrop } from '@/app/icons'
import { MOBILE_NAV_IDS, NAV_PAGES } from '@/app/nav'
import { Toast } from '@/components/Toast'
import * as api from '@/api/client'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function AppShell() {
  const navigate = useNavigate()
  const { state, lastSavedLabel, toast, session, logout } = useAquaFlow()
  const mobilePages = NAV_PAGES.filter((p) => MOBILE_NAV_IDS.includes(p.id))
  const stationLabel = state.settings.stationName || 'Station Manager'
  const signedIn = Boolean(session.token)
  const [chatUnread, setChatUnread] = useState(0)

  function onSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const refreshChatUnread = useCallback(async () => {
    if (!session.token) {
      setChatUnread(0)
      return
    }
    try {
      const res = await api.getStationChatUnreadCount(
        session.apiBaseUrl,
        session.token,
      )
      setChatUnread(res.unreadCount)
    } catch {
      /* keep previous */
    }
  }, [session.apiBaseUrl, session.token])

  useEffect(() => {
    void refreshChatUnread()
    if (!session.token) return
    const id = window.setInterval(() => {
      void refreshChatUnread()
    }, 20_000)
    return () => window.clearInterval(id)
  }, [session.token, refreshChatUnread])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>
            <span className="lg">
              <IconDrop />
            </span>
            Aqua<span className="b">Flow</span>
          </h1>
          <button type="button" className="store" onClick={() => navigate('/admin/settings')}>
            {stationLabel}
          </button>
          {signedIn ? (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                color: 'var(--ink2)',
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {session.email}
              {session.userRole ? ` · ${session.userRole}` : ''}
            </p>
          ) : null}
        </div>
        <nav className="nav" aria-label="Main">
          {NAV_PAGES.map(({ path, label, Icon, id }) => (
            <NavLink key={path} to={path}>
              <Icon />
              <span className="nav-chat-label">
                {label}
                {id === 'chat' && chatUnread > 0 ? (
                  <span className="chat-unread" aria-label={`${chatUnread} unread`}>
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="savebar">
          <span className="dot" aria-hidden="true" />
          <span>{lastSavedLabel}</span>
        </div>
        {signedIn ? (
          <div style={{ padding: '0 14px 14px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: 13 }}
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 14px 14px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: 13 }}
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </div>
        )}
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <nav className="mnav" aria-label="Mobile">
        {mobilePages.map(({ path, shortLabel, Icon, id }) => (
          <NavLink key={path} to={path}>
            <Icon />
            <span className="nav-chat-label">
              {shortLabel}
              {id === 'chat' && chatUnread > 0 ? (
                <span className="chat-unread" aria-hidden="true">
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              ) : null}
            </span>
          </NavLink>
        ))}
      </nav>

      <Toast message={toast} />
    </div>
  )
}
