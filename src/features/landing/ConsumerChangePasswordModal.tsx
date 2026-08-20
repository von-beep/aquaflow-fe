import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { ApiError } from '@/api/client'
import * as api from '@/api/client'

type Props = {
  open: boolean
  apiBaseUrl: string
  token: string
  onClose: () => void
}

export function ConsumerChangePasswordModal({
  open,
  apiBaseUrl,
  token,
  onClose,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const key = `${open}`
  const [synced, setSynced] = useState(key)
  if (open && key !== synced) {
    setSynced(key)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
    setBusy(false)
  }

  return (
    <Modal
      title="Change password"
      open={open}
      onClose={onClose}
      saveLabel={busy ? 'Updating…' : success ? 'Done' : 'Update password'}
      onSave={async () => {
        if (busy) return false
        if (success) {
          onClose()
          return false
        }
        if (!currentPassword || !newPassword) {
          setError('Current and new password are required')
          setSuccess(null)
          return false
        }
        if (newPassword.length < 6) {
          setError('New password must be at least 6 characters')
          setSuccess(null)
          return false
        }
        if (newPassword !== confirmPassword) {
          setError('New password and confirmation do not match')
          setSuccess(null)
          return false
        }
        setBusy(true)
        setError(null)
        setSuccess(null)
        try {
          await api.changeConsumerPassword(apiBaseUrl, token, {
            currentPassword,
            newPassword,
          })
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setSuccess('Password updated. Use it next time you sign in.')
          return false
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not update password',
          )
          return false
        } finally {
          setBusy(false)
        }
      }}
    >
      {success ? (
        <p style={{ color: 'var(--green)', fontSize: 14, marginBottom: 8 }}>{success}</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="ccp_cur">Current password</label>
            <input
              id="ccp_cur"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="ccp_new">New password</label>
            <input
              id="ccp_new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="ccp_confirm">Confirm new password</label>
            <input
              id="ccp_confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>
        </>
      )}
      {error ? (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>
      ) : null}
    </Modal>
  )
}
