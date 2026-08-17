import { useEffect, useId, type ReactNode } from 'react'

type ModalProps = {
  title: string
  open: boolean
  onClose: () => void
  onSave?: () => boolean | void | Promise<boolean | void>
  children: ReactNode
  saveLabel?: string
  cancelLabel?: string
  hideFooter?: boolean
  hideHeader?: boolean
  modalClassName?: string
  /** Stack above another open modal (same base overlay z-index otherwise). */
  elevated?: boolean
}

export function Modal({
  title,
  open,
  onClose,
  onSave,
  children,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  hideFooter = false,
  hideHeader = false,
  modalClassName = '',
  elevated = false,
}: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`overlay open${elevated ? ' overlay-elevated' : ''}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`modal${modalClassName ? ` ${modalClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {!hideHeader ? (
          <div className="modal-h">
            <h3 id={titleId}>{title}</h3>
            <button
              type="button"
              className="iconbtn"
              onClick={onClose}
              aria-label="Close"
              style={{ border: 'none' }}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : (
          <h3 id={titleId} className="sr-only">
            {title}
          </h3>
        )}
        <div className="modal-b">{children}</div>
        {!hideFooter && (
          <div className="modal-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {cancelLabel}
            </button>
            {onSave && (
              <button
                type="button"
                className="btn btn-blue"
                onClick={() => {
                  void Promise.resolve(onSave()).then((ok) => {
                    if (ok !== false) onClose()
                  })
                }}
              >
                {saveLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
