import { describe, expect, it } from 'vitest'
import {
  formatAmPm,
  formatOpenHoursLabel,
  isOpenAt,
  parseHm,
} from './hours'

describe('parseHm', () => {
  it('normalizes HH:mm and HH:mm:ss', () => {
    expect(parseHm('8:00')).toBe('08:00')
    expect(parseHm('08:30:00')).toBe('08:30')
  })

  it('rejects invalid', () => {
    expect(parseHm('25:00')).toBeNull()
    expect(parseHm('')).toBeNull()
  })
})

describe('formatOpenHoursLabel', () => {
  it('formats AM/PM range', () => {
    expect(formatOpenHoursLabel('08:00', '18:00')).toBe('8:00 AM – 6:00 PM')
  })

  it('shows unset when missing', () => {
    expect(formatOpenHoursLabel(null, '18:00')).toBe('Hours not set')
  })
})

describe('isOpenAt', () => {
  it('handles same-day window', () => {
    expect(isOpenAt('08:00', '18:00', '08:00')).toBe(true)
    expect(isOpenAt('08:00', '18:00', '17:59')).toBe(true)
    expect(isOpenAt('08:00', '18:00', '18:00')).toBe(false)
    expect(isOpenAt('08:00', '18:00', '07:59')).toBe(false)
  })

  it('handles overnight window', () => {
    expect(isOpenAt('22:00', '06:00', '23:00')).toBe(true)
    expect(isOpenAt('22:00', '06:00', '05:00')).toBe(true)
    expect(isOpenAt('22:00', '06:00', '12:00')).toBe(false)
  })

  it('treats equal open/close as 24h', () => {
    expect(isOpenAt('00:00', '00:00', '15:00')).toBe(true)
  })
})

describe('formatAmPm', () => {
  it('formats noon and midnight', () => {
    expect(formatAmPm('00:00')).toBe('12:00 AM')
    expect(formatAmPm('12:00')).toBe('12:00 PM')
  })
})
