/** Store / API shape: `HH:mm` (24h). */

const HM_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/** Normalize unknown DB/API time to `HH:mm`, or null if unset/invalid. */
export function parseHm(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const h = String(value.getHours()).padStart(2, '0')
    const m = String(value.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  if (typeof value !== 'string') return null
  const m = HM_RE.exec(value.trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatAmPm(hm: string): string {
  const parsed = parseHm(hm)
  if (!parsed) return hm
  const [hs, ms] = parsed.split(':')
  let h = Number(hs)
  const min = ms ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${min} ${ampm}`
}

export function formatOpenHoursLabel(
  openTime: string | null | undefined,
  closeTime: string | null | undefined,
): string {
  const open = parseHm(openTime ?? null)
  const close = parseHm(closeTime ?? null)
  if (!open || !close) return 'Hours not set'
  return `${formatAmPm(open)} – ${formatAmPm(close)}`
}

/**
 * Whether the station is open at `nowHm` (`HH:mm`).
 * Supports overnight windows when close < open (e.g. 22:00–06:00).
 * Close time is treated as exclusive end of the open window.
 */
export function isOpenAt(
  openTime: string | null | undefined,
  closeTime: string | null | undefined,
  nowHm: string,
): boolean | null {
  const open = parseHm(openTime ?? null)
  const close = parseHm(closeTime ?? null)
  const now = parseHm(nowHm)
  if (!open || !close || !now) return null
  if (open === close) return true // 24h
  if (open < close) return now >= open && now < close
  return now >= open || now < close
}
