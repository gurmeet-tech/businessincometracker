import type { DateRangeKey } from '../types'

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: '3m', label: 'Last 3 months' },
  { key: '6m', label: 'Last 6 months' },
  { key: 'this-year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

export function todayISO(now = new Date()): string {
  return toISO(now)
}

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function monthKeyFromISO(value: string): string {
  return value.slice(0, 7)
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthKeyOffset(offset: number, now = new Date()): string {
  return currentMonthKey(new Date(now.getFullYear(), now.getMonth() + offset, 1))
}

export function addMonthsToKey(key: string, amount: number): string {
  const [y, m] = key.split('-').map(Number)
  return currentMonthKey(new Date(y, m - 1 + amount, 1))
}

export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number)
  const short = MONTH_SHORT[(m || 1) - 1]
  return withYear ? `${short} ${y}` : short
}

export function monthLabelLong(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_LONG[(m || 1) - 1]} ${y}`
}

export function monthRange(key: string): { startISO: string; endISO: string; days: number } {
  const [y, m] = key.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return { startISO: toISO(start), endISO: toISO(end), days: end.getDate() }
}

export function daysInMonth(key: string): number {
  return monthRange(key).days
}

export function formatDate(value: string, locale = 'en-US', opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, opts ?? { month: 'short', day: 'numeric', year: 'numeric' }).format(
    parseISODate(value),
  )
}

export function formatDateShort(value: string, locale = 'en-US'): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
    parseISODate(value),
  )
}

export function formatLongDate(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function relativeDay(value: string): string {
  const today = todayISO()
  if (value === today) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (value === toISO(yesterday)) return 'Yesterday'
  return formatDateShort(value)
}

export function daysBetween(fromISO: string, toISOValue: string): number {
  const from = parseISODate(fromISO).getTime()
  const to = parseISODate(toISOValue).getTime()
  return Math.round((to - from) / 86_400_000)
}

export interface DateRange {
  startISO: string | null
  endISO: string
}

export function getDateRange(key: DateRangeKey, now = new Date()): DateRange {
  const endISO = toISO(now)
  switch (key) {
    case '7d': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      return { startISO: toISO(start), endISO }
    }
    case '30d': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      return { startISO: toISO(start), endISO }
    }
    case 'this-month':
      return { startISO: `${currentMonthKey(now)}-01`, endISO }
    case 'last-month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevKey = currentMonthKey(prev)
      const range = monthRange(prevKey)
      return { startISO: range.startISO, endISO: range.endISO }
    }
    case '3m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { startISO: toISO(start), endISO }
    }
    case '6m': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      return { startISO: toISO(start), endISO }
    }
    case 'this-year':
      return { startISO: `${now.getFullYear()}-01-01`, endISO }
    case 'all':
    default:
      return { startISO: null, endISO }
  }
}

export function inDateRange(iso: string, range: DateRange): boolean {
  if (range.startISO && iso < range.startISO) return false
  return iso <= range.endISO
}

export function monthKeysBetween(startISO: string, endISO: string): string[] {
  const keys: string[] = []
  const [sy, sm] = startISO.split('-').map(Number)
  const [ey, em] = endISO.split('-').map(Number)
  let year = sy
  let month = sm
  while (year < ey || (year === ey && month <= em)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return keys
}

export function rangeBucketMode(key: DateRangeKey): 'day' | 'month' {
  if (key === '7d' || key === '30d' || key === 'this-month' || key === 'last-month') return 'day'
  return 'month'
}

export function shortDateLabel(iso: string): string {
  const date = parseISODate(iso)
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`
}

export function weekdayIndexMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7
}
