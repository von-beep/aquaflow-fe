type ActionIconProps = {
  name: 'plus' | 'edit' | 'trash' | 'check' | 'search' | 'truck' | 'eye'
}

export function ActionIcon({ name }: ActionIconProps) {
  if (name === 'plus') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
      </svg>
    )
  }
  if (name === 'eye') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (name === 'edit') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
        />
      </svg>
    )
  }
  if (name === 'trash') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
        />
      </svg>
    )
  }
  if (name === 'check') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
    )
  }
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.2" />
      <circle cx="18.5" cy="18.5" r="2.2" />
    </svg>
  )
}
