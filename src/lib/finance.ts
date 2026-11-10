import type {
  Category,
  Client,
  ClientStatus,
  DateRangeKey,
  Settings,
  Transaction,
  TransactionStatus,
  TransactionType,
  ViewFilters,
} from '../types'
import {
  getDateRange,
  inDateRange,
  monthKeyFromISO,
  monthKeyOffset,
  monthLabel,
  monthRange,
  rangeBucketMode,
  shortDateLabel,
  todayISO,
  toISO,
} from './date'

export interface MoneySettings {
  locale: string
  currency: string
}

const currencyCache = new Map<string, Intl.NumberFormat>()

function currencyFormatter(settings: MoneySettings, compact = false, decimals?: number) {
  const key = `${settings.locale}|${settings.currency}|${compact}|${decimals ?? 'auto'}`
  const cached = currencyCache.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: decimals ?? (compact ? 0 : 2),
    maximumFractionDigits: decimals ?? (compact ? 1 : 2),
  })
  currencyCache.set(key, formatter)
  return formatter
}

export function formatMoney(
  cents: number,
  settings: MoneySettings,
  options?: { compact?: boolean; decimals?: number; signed?: boolean },
): string {
  const value = (cents || 0) / 100
  const formatted = currencyFormatter(
    settings,
    options?.compact ?? false,
    options?.decimals,
  ).format(value)
  if (options?.signed && cents > 0) return `+${formatted}`
  return formatted
}

export function formatCompact(cents: number, settings: MoneySettings): string {
  return formatMoney(cents, settings, { compact: true, decimals: 0 })
}

export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[,\s]/g, '').replace(/^\$/, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  const wholeCents = Number(whole) * 100
  const fractionCents = Number(fraction.padEnd(2, '0'))
  const cents = wholeCents + fractionCents
  if (!Number.isSafeInteger(cents) || cents <= 0) return null
  return cents
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export interface FinanceSummary {
  incomeAll: number
  incomePaid: number
  incomePending: number
  incomeOverdue: number
  expenseAll: number
  expensePaid: number
  expenseOutstanding: number
  expenseOverdue: number
  netProfit: number
  expectedNet: number
  margin: number
  count: number
  incomeCount: number
  expenseCount: number
  paidCount: number
  pendingCount: number
  overdueCount: number
  completion: number
}

export function summarize(transactions: Transaction[]): FinanceSummary {
  let incomeAll = 0
  let incomePaid = 0
  let incomeOverdue = 0
  let expenseAll = 0
  let expensePaid = 0
  let expenseOverdue = 0
  let paidCount = 0
  let pendingCount = 0
  let overdueCount = 0
  let incomeCount = 0
  let expenseCount = 0

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      incomeCount += 1
      incomeAll += transaction.amountCents
      if (transaction.status === 'Paid') incomePaid += transaction.amountCents
      if (transaction.status === 'Overdue') incomeOverdue += transaction.amountCents
    } else {
      expenseCount += 1
      expenseAll += transaction.amountCents
      if (transaction.status === 'Paid') expensePaid += transaction.amountCents
      if (transaction.status === 'Overdue') expenseOverdue += transaction.amountCents
    }
    if (transaction.status === 'Paid') paidCount += 1
    else if (transaction.status === 'Pending') pendingCount += 1
    else overdueCount += 1
  }

  const incomePending = incomeAll - incomePaid
  const expenseOutstanding = expenseAll - expensePaid
  const netProfit = incomePaid - expensePaid
  const expectedNet = incomeAll - expenseAll

  return {
    incomeAll,
    incomePaid,
    incomePending,
    incomeOverdue,
    expenseAll,
    expensePaid,
    expenseOutstanding,
    expenseOverdue,
    netProfit,
    expectedNet,
    margin: incomePaid > 0 ? (netProfit / incomePaid) * 100 : 0,
    count: transactions.length,
    incomeCount,
    expenseCount,
    paidCount,
    pendingCount,
    overdueCount,
    completion: incomeAll > 0 ? (incomePaid / incomeAll) * 100 : 0,
  }
}

export interface ClientStats {
  clientId: string
  totalRevenue: number
  totalPaid: number
  outstanding: number
  overdue: number
  transactionCount: number
  incomeCount: number
  lastActivity: string | null
  lastPaymentDate: string | null
}

export function computeClientStats(transactions: Transaction[]): Map<string, ClientStats> {
  const map = new Map<string, ClientStats>()

  for (const transaction of transactions) {
    if (!transaction.clientId) continue
    let stats = map.get(transaction.clientId)
    if (!stats) {
      stats = {
        clientId: transaction.clientId,
        totalRevenue: 0,
        totalPaid: 0,
        outstanding: 0,
        overdue: 0,
        transactionCount: 0,
        incomeCount: 0,
        lastActivity: null,
        lastPaymentDate: null,
      }
      map.set(transaction.clientId, stats)
    }

    stats.transactionCount += 1
    if (!stats.lastActivity || transaction.date > stats.lastActivity) {
      stats.lastActivity = transaction.date
    }

    if (transaction.type === 'income') {
      stats.incomeCount += 1
      stats.totalRevenue += transaction.amountCents
      if (transaction.status === 'Paid') {
        stats.totalPaid += transaction.amountCents
        if (
          transaction.paymentDate &&
          (!stats.lastPaymentDate || transaction.paymentDate > stats.lastPaymentDate)
        ) {
          stats.lastPaymentDate = transaction.paymentDate
        }
      } else {
        stats.outstanding += transaction.amountCents
        if (transaction.status === 'Overdue') stats.overdue += transaction.amountCents
      }
    }
  }

  return map
}

export function emptyClientStats(clientId: string): ClientStats {
  return {
    clientId,
    totalRevenue: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    transactionCount: 0,
    incomeCount: 0,
    lastActivity: null,
    lastPaymentDate: null,
  }
}

export interface CategoryStats {
  categoryId: string
  type: TransactionType
  totalAll: number
  totalPaid: number
  outstanding: number
  count: number
}

export function computeCategoryStats(transactions: Transaction[]): Map<string, CategoryStats> {
  const map = new Map<string, CategoryStats>()
  for (const transaction of transactions) {
    if (!transaction.categoryId) continue
    let stats = map.get(transaction.categoryId)
    if (!stats) {
      stats = {
        categoryId: transaction.categoryId,
        type: transaction.type,
        totalAll: 0,
        totalPaid: 0,
        outstanding: 0,
        count: 0,
      }
      map.set(transaction.categoryId, stats)
    }
    stats.totalAll += transaction.amountCents
    stats.count += 1
    if (transaction.status === 'Paid') stats.totalPaid += transaction.amountCents
    else stats.outstanding += transaction.amountCents
  }
  return map
}

export function computeMonthlyStats(transactions: Transaction[]): Map<string, FinanceSummary> {
  const groups = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    const key = monthKeyFromISO(transaction.date)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(transaction)
  }
  return new Map([...groups.entries()].map(([key, rows]) => [key, summarize(rows)]))
}

export function computeGrowth(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export interface MonthSeriesPoint {
  key: string
  label: string
  income: number
  expenses: number
  net: number
  expectedIncome: number
  pendingIncome: number
  count: number
}

export function monthlySeries(
  transactions: Transaction[],
  months: number,
  now = new Date(),
): MonthSeriesPoint[] {
  const points: MonthSeriesPoint[] = []
  for (let offset = -(months - 1); offset <= 0; offset += 1) {
    const key = monthKeyOffset(offset, now)
    const rows = transactions.filter((transaction) => monthKeyFromISO(transaction.date) === key)
    const summary = summarize(rows)
    points.push({
      key,
      label: monthLabel(key, false),
      income: summary.incomePaid / 100,
      expenses: summary.expensePaid / 100,
      net: summary.netProfit / 100,
      expectedIncome: summary.incomeAll / 100,
      pendingIncome: summary.incomePending / 100,
      count: summary.count,
    })
  }
  return points
}

export interface ChartBucket {
  key: string
  label: string
  fullLabel: string
  income: number
  expenses: number
  expectedIncome: number
  expectedExpenses: number
  net: number
  count: number
}

export function rangeSeries(
  transactions: Transaction[],
  rangeKey: DateRangeKey,
  now = new Date(),
): ChartBucket[] {
  const range = getDateRange(rangeKey, now)
  const mode = rangeBucketMode(rangeKey)
  const filtered = transactions.filter((transaction) => inDateRange(transaction.date, range))
  const buckets = new Map<string, ChartBucket>()

  const ensureBucket = (key: string) => {
    if (!buckets.has(key)) {
      if (mode === 'day') {
        buckets.set(key, {
          key,
          label: shortDateLabel(key),
          fullLabel: shortDateLabel(key),
          income: 0,
          expenses: 0,
          expectedIncome: 0,
          expectedExpenses: 0,
          net: 0,
          count: 0,
        })
      } else {
        buckets.set(key, {
          key,
          label: monthLabel(key, false),
          fullLabel: monthLabel(key, true),
          income: 0,
          expenses: 0,
          expectedIncome: 0,
          expectedExpenses: 0,
          net: 0,
          count: 0,
        })
      }
    }
    return buckets.get(key)!
  }

  if (mode === 'day') {
    let startISO = range.startISO
    if (!startISO) {
      const earliest = filtered.reduce(
        (min, transaction) => (transaction.date < min ? transaction.date : min),
        todayISO(now),
      )
      startISO = earliest
    }
    const cursor = new Date(`${startISO}T00:00:00`)
    const end = new Date(`${range.endISO}T00:00:00`)
    while (cursor <= end) {
      ensureBucket(toISO(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    let startKey = range.startISO
      ? monthKeyFromISO(range.startISO)
      : monthKeyFromISO(
          filtered.reduce(
            (min, transaction) => (transaction.date < min ? transaction.date : min),
            todayISO(now),
          ),
        )
    const endKey = monthKeyFromISO(range.endISO)
    let [y, m] = startKey.split('-').map(Number)
    while (true) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      ensureBucket(key)
      if (key === endKey) break
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  }

  for (const transaction of filtered) {
    const key = mode === 'day' ? transaction.date : monthKeyFromISO(transaction.date)
    const bucket = ensureBucket(key)
    bucket.count += 1
    if (transaction.type === 'income') {
      bucket.expectedIncome += transaction.amountCents / 100
      if (transaction.status === 'Paid') bucket.income += transaction.amountCents / 100
    } else {
      bucket.expectedExpenses += transaction.amountCents / 100
      if (transaction.status === 'Paid') bucket.expenses += transaction.amountCents / 100
    }
  }

  const list = [...buckets.values()]
  for (const bucket of list) bucket.net = bucket.income - bucket.expenses
  return list
}

export interface MonthCell {
  key: string
  summary: FinanceSummary
}

export function monthCellsForYear(transactions: Transaction[], year: number): MonthCell[] {
  const cells: MonthCell[] = []
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    const rows = transactions.filter((transaction) => monthKeyFromISO(transaction.date) === key)
    cells.push({ key, summary: summarize(rows) })
  }
  return cells
}

export function filterTransactions(
  transactions: Transaction[],
  filters: ViewFilters,
  search: string,
  clients: Client[],
  categories: Category[],
): Transaction[] {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const term = search.trim().toLowerCase()

  return transactions.filter((transaction) => {
    if (filters.month !== 'all' && monthKeyFromISO(transaction.date) !== filters.month) return false
    if (filters.type !== 'all' && transaction.type !== filters.type) return false
    if (filters.category === 'uncategorized') {
      if (transaction.categoryId) return false
    } else if (filters.category !== 'all' && transaction.categoryId !== filters.category) {
      return false
    }
    if (filters.client !== 'all' && transaction.clientId !== filters.client) return false
    if (filters.status === 'unpaid' && transaction.status === 'Paid') return false
    if (
      filters.status !== 'all' &&
      filters.status !== 'unpaid' &&
      transaction.status !== filters.status
    ) {
      return false
    }

    if (!term) return true
    const clientName = transaction.clientId
      ? clientById.get(transaction.clientId)?.name ?? ''
      : ''
    const company = transaction.clientId
      ? clientById.get(transaction.clientId)?.company ?? ''
      : ''
    const categoryName = transaction.categoryId
      ? categoryById.get(transaction.categoryId)?.name ?? ''
      : ''
    const haystack = [
      transaction.name,
      transaction.notes,
      transaction.paymentMethod ?? '',
      clientName,
      company,
      categoryName,
      transaction.type,
      transaction.status,
      transaction.date,
      (transaction.amountCents / 100).toFixed(2),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
}

export function sortTransactions(transactions: Transaction[], sort: string): Transaction[] {
  const sorted = [...transactions]
  switch (sort) {
    case 'date-asc':
      sorted.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
      break
    case 'amount-desc':
      sorted.sort((a, b) => b.amountCents - a.amountCents)
      break
    case 'amount-asc':
      sorted.sort((a, b) => a.amountCents - b.amountCents)
      break
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'date-desc':
    default:
      sorted.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
      break
  }
  return sorted
}

export interface TransactionGroup {
  key: string
  label: string
  color?: string
  transactions: Transaction[]
  summary: FinanceSummary
}

export function groupTransactions(
  transactions: Transaction[],
  group: 'month' | 'category',
  categories: Category[],
): TransactionGroup[] {
  const groups = new Map<string, Transaction[]>()
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  for (const transaction of transactions) {
    let key: string
    if (group === 'month') {
      key = monthKeyFromISO(transaction.date)
    } else {
      key = transaction.categoryId || 'uncategorized'
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(transaction)
  }

  const result: TransactionGroup[] = [...groups.entries()].map(([key, rows]) => {
    if (group === 'month') {
      return {
        key,
        label: monthLabel(key, true),
        transactions: rows,
        summary: summarize(rows),
      }
    }
    const category = categoryById.get(key)
    return {
      key,
      label: category?.name ?? 'Uncategorized',
      color: category?.color ?? '#6f6f6b',
      transactions: rows,
      summary: summarize(rows),
    }
  })

  if (group === 'month') {
    result.sort((a, b) => b.key.localeCompare(a.key))
  } else {
    result.sort((a, b) => {
      const typeA = a.transactions[0]?.type ?? 'income'
      const typeB = b.transactions[0]?.type ?? 'income'
      if (typeA !== typeB) return typeA === 'income' ? -1 : 1
      return a.label.localeCompare(b.label)
    })
  }

  return result
}

export interface StatusStat {
  status: TransactionStatus
  count: number
  amount: number
}

export function statusStats(transactions: Transaction[]): StatusStat[] {
  const statuses: TransactionStatus[] = ['Paid', 'Pending', 'Overdue']
  return statuses.map((status) => {
    const rows = transactions.filter((transaction) => transaction.status === status)
    return {
      status,
      count: rows.length,
      amount: rows.reduce((sum, transaction) => sum + transaction.amountCents, 0),
    }
  })
}

export interface ClientBreakdown {
  client: Client
  revenue: number
  outstanding: number
  transactionCount: number
}

export function revenueByClient(
  transactions: Transaction[],
  clients: Client[],
): ClientBreakdown[] {
  const stats = computeClientStats(transactions)
  return clients
    .map((client) => {
      const item = stats.get(client.id)
      return {
        client,
        revenue: item?.totalPaid ?? 0,
        outstanding: item?.outstanding ?? 0,
        transactionCount: item?.transactionCount ?? 0,
      }
    })
    .filter((item) => item.revenue > 0 || item.outstanding > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

export interface CategoryBreakdown {
  category: Category
  amount: number
  total: number
  count: number
}

export function breakdownByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: TransactionType,
  paidOnly = true,
): CategoryBreakdown[] {
  const stats = computeCategoryStats(transactions)
  return categories
    .filter((category) => category.type === type)
    .map((category) => {
      const item = stats.get(category.id)
      return {
        category,
        amount: paidOnly ? item?.totalPaid ?? 0 : item?.totalAll ?? 0,
        total: item?.totalAll ?? 0,
        count: item?.count ?? 0,
      }
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function getMonthCompletion(transactions: Transaction[]): number {
  return summarize(transactions).completion
}

export function clientStatusTone(status: ClientStatus): 'green' | 'blue' | 'yellow' | 'gray' {
  switch (status) {
    case 'Active':
      return 'green'
    case 'Lead':
      return 'blue'
    case 'Inactive':
      return 'yellow'
    default:
      return 'gray'
  }
}

export function monthlyLabel(key: string): string {
  return monthLabel(key, true)
}

export function monthBounds(key: string) {
  return monthRange(key)
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function csvCell(value: unknown): string {
  const raw = value == null ? '' : String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export function transactionsToCsv(
  transactions: Transaction[],
  clients: Client[],
  categories: Category[],
  settings: Settings,
): string {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const headers = [
    'Transaction Name',
    'Client',
    'Company',
    'Category',
    'Type',
    'Amount',
    `Currency`,
    'Month',
    'Date',
    'Status',
    'Payment Date',
    'Payment Method',
    'Notes',
    'Attachments',
  ]
  const rows = transactions.map((transaction) => {
    const client = transaction.clientId ? clientById.get(transaction.clientId) : undefined
    const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined
    return [
      transaction.name,
      client?.name ?? '',
      client?.company ?? '',
      category?.name ?? 'Uncategorized',
      transaction.type === 'income' ? 'Income' : 'Expense',
      (transaction.amountCents / 100).toFixed(2),
      settings.currency,
      monthLabel(monthKeyFromISO(transaction.date), true),
      transaction.date,
      transaction.status,
      transaction.paymentDate ?? '',
      transaction.paymentMethod ?? '',
      transaction.notes,
      transaction.attachments.map((attachment) => attachment.name).join(' | '),
    ]
  })
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Keep the blob alive briefly so the browser can finish reading it.
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const STATUS_TONE: Record<TransactionStatus, 'green' | 'yellow' | 'red'> = {
  Paid: 'green',
  Pending: 'yellow',
  Overdue: 'red',
}

export const TYPE_COLOR: Record<TransactionType, string> = {
  income: 'var(--green)',
  expense: 'var(--red)',
}
