import type { ReactNode } from 'react'

type IconProps = {
  className?: string
}

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconDrop({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.7s6.5 7 6.5 12a6.5 6.5 0 11-13 0c0-5 6.5-12 6.5-12z"
      />
    </Svg>
  )
}

export function IconDash({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  )
}

export function IconTruck({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.2" />
      <circle cx="18.5" cy="18.5" r="2.2" />
    </Svg>
  )
}

export function IconCust({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 21v-2a4 4 0 00-3-3.87M16.5 3.13a4 4 0 010 7.75"
      />
    </Svg>
  )
}

export function IconUtang({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4h13a2 2 0 012 2v14l-3-2-3 2-3-2-3 2-3-2V4zM8.5 9h6M8.5 13h6"
      />
    </Svg>
  )
}

export function IconGal({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 2h6v3.5c2.5 1.5 4 4 4 7v6.5a3 3 0 01-3 3H8a3 3 0 01-3-3V12.5c0-3 1.5-5.5 4-7V2z"
      />
      <path strokeLinecap="round" d="M5.5 14h13" />
    </Svg>
  )
}

export function IconRoute({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19h6.5a3.5 3.5 0 000-7h-7a3.5 3.5 0 010-7H15"
      />
    </Svg>
  )
}

export function IconPay({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path strokeLinecap="round" d="M2 10h20" />
      <circle cx="7" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconRep({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  )
}

export function IconSet({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 00.33 1.86l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.86-.33 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.1-1.55 1.7 1.7 0 00-1.87.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.33-1.86 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1.1 1.7 1.7 0 00-.33-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.86.33h.01a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.33 1.86v.01a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z"
      />
    </Svg>
  )
}

export function IconChat({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.4 8.4 0 01-1.2 4.3 8.5 8.5 0 01-7.3 4.2 8.4 8.4 0 01-4.3-1.2L3 21l2.2-5.2A8.4 8.4 0 014.5 11.5a8.5 8.5 0 014.2-7.3 8.4 8.4 0 014.3-1.2h.5a8.5 8.5 0 017.5 8.5z"
      />
    </Svg>
  )
}
