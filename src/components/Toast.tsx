type ToastProps = {
  message: string | null
}

export function Toast({ message }: ToastProps) {
  return (
    <div className={`toast${message ? ' show' : ''}`} role="status" aria-live="polite">
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{message ?? ''}</span>
    </div>
  )
}
