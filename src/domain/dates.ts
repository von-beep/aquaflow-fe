export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/** Local calendar date `YYYY-MM-DD` (not UTC — UTC breaks PH "Today" filters). */
export function today(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return today(d)
}

export function formatDateShort(isoDate: string): string {
  return new Date(isoDate + 'T00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  const H = Number(h)
  return `${H % 12 || 12}:${m} ${H < 12 ? 'AM' : 'PM'}`
}

/** Format an ISO datetime for display (Asia/Manila-friendly local string). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format delivery date + time (`YYYY-MM-DD` + `HH:mm`) like `formatDateTime`
 * (e.g. "Aug 10, 2026, 12:30 PM") using Asia/Manila.
 */
export function formatOrderPlaced(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  if (!date) return ''
  const t = (time || '00:00').trim()
  const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t)
  const hh = hm ? hm[1]!.padStart(2, '0') : '00'
  const mm = hm ? hm[2]! : '00'
  const ss = hm?.[3] ?? '00'
  return formatDateTime(`${date}T${hh}:${mm}:${ss}.000+08:00`)
}

/** Current instant as ISO-8601 with Asia/Manila (+08:00) offset. */
export function nowIsoInManila(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000+08:00`
}

export function formatSavedAt(date = new Date()): string {
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}
