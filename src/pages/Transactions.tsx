import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FilterX,
  ListFilter,
  Paperclip,
  Plus,
  Save,
  Search,
  Table2,
  Trash2,
} from 'lucide-react'
import type {
  SortKey,
  Transaction,
  ViewConfig,
  ViewFilters,
  ViewMode,
} from '../types'
import { useData } from '../context/DataContext'
import { useTransactionDrawer } from '../components/TransactionDrawer'
import { useToast } from '../context/ToastContext'
import { useAsyncAction } from '../hooks/useAsyncAction'
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  MenuDivider,
  MenuItem,
  Modal,
  PageHeader,
  Popover,
  Segmented,
  StatusBadge,
  TypeBadge as TypeBadgeComponent,
  useConfirm,
} from '../components/ui'
import {
  formatMoney,
  filterTransactions,
  groupTransactions,
  sortTransactions,
  summarize,
  transactionsToCsv,
  downloadText,
} from '../lib/finance'
import {
  currentMonthKey,
  formatDate,
  monthKeyFromISO,
  monthLabel,
  monthLabelLong,
  monthRange,
  parseISODate,
  todayISO,
  toISO,
  weekdayIndexMondayFirst,
} from '../lib/date'

const DEFAULT_FILTERS: ViewFilters = {
  month: 'all',
  type: 'all',
  category: 'all',
  client: 'all',
  status: 'all',
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: 'Date · newest first' },
  { value: 'date-asc', label: 'Date · oldest first' },
  { value: 'amount-desc', label: 'Amount · high to low' },
  { value: 'amount-asc', label: 'Amount · low to high' },
  { value: 'name-asc', label: 'Name · A to Z' },
]

function viewSummary(config: ViewConfig): string {
  const parts: string[] = []
  if (config.filters.month !== 'all') parts.push(monthLabel(config.filters.month, true))
  if (config.filters.type !== 'all')
    parts.push(config.filters.type === 'income' ? 'Income' : 'Expenses')
  if (config.filters.status === 'unpaid') parts.push('Unpaid')
  else if (config.filters.status !== 'all') parts.push(config.filters.status)
  if (config.group !== 'none') parts.push(`Grouped by ${config.group}`)
  return parts.length > 0 ? parts.join(' · ') : 'All transactions'
}

export function TransactionsPage() {
  const { transactions, clients, categories, savedViews, settings, saveView, deleteView } = useData()
  const { openDrawer } = useTransactionDrawer()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { run: runViewAction, busy: savingView } = useAsyncAction()
  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState<ViewFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [group, setGroup] = useState<'none' | 'month' | 'category'>('none')
  const [view, setView] = useState<ViewMode>('table')
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey())

  useEffect(() => {
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const category = searchParams.get('category')
    const client = searchParams.get('client')
    setFilters((current) => {
      let next = current
      if (type === 'income' || type === 'expense') next = { ...next, type }
      if (status && ['Paid', 'Pending', 'Overdue', 'unpaid'].includes(status)) {
        next = { ...next, status: status as ViewFilters['status'] }
      }
      if (month && /^\d{4}-\d{2}$/.test(month)) next = { ...next, month }
      if (category) next = { ...next, category }
      if (client) next = { ...next, client }
      return next
    })
    if (month) setCalendarMonth(month)
  }, [searchParams])

  useEffect(() => {
    if (filters.month !== 'all') setCalendarMonth(filters.month)
  }, [filters.month])

  const months = useMemo(() => {
    const keys = new Set(transactions.map((transaction) => monthKeyFromISO(transaction.date)))
    return [...keys].sort((a, b) => b.localeCompare(a))
  }, [transactions])

  const filtered = useMemo(
    () => filterTransactions(transactions, filters, search, clients, categories),
    [transactions, filters, search, clients, categories],
  )
  const sorted = useMemo(() => sortTransactions(filtered, sort), [filtered, sort])
  const totals = useMemo(() => summarize(filtered), [filtered])
  const grouped = useMemo(
    () => (group === 'none' ? [] : groupTransactions(sorted, group, categories)),
    [sorted, group, categories],
  )

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const activeFilterCount =
    (filters.month !== 'all' ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.client !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0)

  const currentConfig: ViewConfig = { filters, sort, group, view, search }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
    setActiveViewId(null)
  }

  const patchFilters = (patch: Partial<ViewFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setActiveViewId(null)
  }

  const applyView = (viewId: string) => {
    const saved = savedViews.find((item) => item.id === viewId)
    if (!saved) return
    setFilters(saved.config.filters)
    setSearch(saved.config.search ?? '')
    setSort(saved.config.sort)
    setGroup(saved.config.group)
    setView(saved.config.view)
    setActiveViewId(saved.id)
    if (saved.config.filters.month !== 'all') setCalendarMonth(saved.config.filters.month)
    toast(`Applied “${saved.name}”.`, 'info')
  }

  const openSaveView = () => {
    setSaveName(activeViewId ? savedViews.find((view) => view.id === activeViewId)?.name ?? '' : '')
    setSaveOpen(true)
  }

  const handleSaveView = async () => {
    if (!saveName.trim()) return
    const succeeded = await runViewAction(
      async () => {
        const saved = await saveView(saveName.trim(), currentConfig)
        setActiveViewId(saved.id)
        setSaveOpen(false)
      },
      { success: 'Database view saved.' },
    )
    return succeeded
  }

  const handleDeleteView = async (id: string, name: string) => {
    const shouldDelete = await confirm({
      title: 'Delete saved view?',
      message: `“${name}” will be removed. Your transaction records are not affected.`,
      confirmLabel: 'Delete view',
      destructive: true,
    })
    if (!shouldDelete) return
    const succeeded = await runViewAction(() => deleteView(id), {
      success: 'Saved view deleted.',
    })
    if (succeeded) {
      if (activeViewId === id) setActiveViewId(null)
    }
  }

  const exportFiltered = () => {
    const csv = transactionsToCsv(sorted, clients, categories, settings)
    downloadText(`transactions-${todayISO()}.csv`, csv, 'text/csv')
    toast(`${sorted.length} transactions exported.`, 'success')
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const cycleSort = (field: 'date' | 'amount') => {
    let next: SortKey
    if (field === 'date') next = sort === 'date-desc' ? 'date-asc' : 'date-desc'
    else next = sort === 'amount-desc' ? 'amount-asc' : 'amount-desc'
    setSort(next)
    setActiveViewId(null)
  }

  const sortIcon = (field: 'date' | 'amount') => {
    const ascending = field === 'date' ? sort === 'date-asc' : sort === 'amount-asc'
    const active = field === 'date' ? sort.startsWith('date') : sort.startsWith('amount')
    if (!active) return <ArrowUpDown size={11} className="sort-icon muted" />
    return ascending ? (
      <ArrowUp size={11} className="sort-icon active" />
    ) : (
      <ArrowDown size={11} className="sort-icon active" />
    )
  }

  const calendarTxs = useMemo(
    () =>
      sorted.filter(
        (transaction) => monthKeyFromISO(transaction.date) === calendarMonth,
      ),
    [sorted, calendarMonth],
  )

  const calendarDays = useMemo(() => {
    const { days } = monthRange(calendarMonth)
    const first = parseISODate(`${calendarMonth}-01`)
    const sundayFirst = settings.weekStart === 'sunday'
    const leading = sundayFirst ? first.getDay() : weekdayIndexMondayFirst(first)
    const cells = Math.ceil((leading + days) / 7) * 7
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - leading)
    return Array.from({ length: cells }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
      const iso = toISO(date)
      const dayTxs = calendarTxs.filter((transaction) => transaction.date === iso)
      return {
        iso,
        day: date.getDate(),
        inMonth: iso.startsWith(calendarMonth),
        isToday: iso === todayISO(),
        transactions: dayTxs,
      }
    })
  }, [calendarMonth, calendarTxs, settings.weekStart])

  const moveCalendar = (amount: number) => {
    const [year, month] = calendarMonth.split('-').map(Number)
    const next = new Date(year, month - 1 + amount, 1)
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    setCalendarMonth(key)
    setFilters((current) => ({ ...current, month: key }))
    setActiveViewId(null)
  }

  const renderRow = (transaction: Transaction) => {
    const client = transaction.clientId ? clientById.get(transaction.clientId) : null
    const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : null
    return (
      <tr
        key={transaction.id}
        className="db-row"
        onClick={() => openDrawer(transaction)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openDrawer(transaction)
          }
        }}
      >
        <td className="name-column">
          <div className="cell-title">
            <span className={`row-type-icon ${transaction.type}`}>
              {transaction.type === 'income' ? '↓' : '↑'}
            </span>
            <div className="cell-title-text">
              <span className="cell-name">{transaction.name}</span>
              <span className="cell-sub">
                {transaction.type === 'income' ? 'Income' : 'Expense'}
                {transaction.notes ? ' · has notes' : ''}
              </span>
            </div>
            {transaction.attachments.length > 0 && (
              <span className="attachment-count" title={`${transaction.attachments.length} attachment(s)`}>
                <Paperclip size={11} />
                {transaction.attachments.length}
              </span>
            )}
          </div>
        </td>
        <td>
          {client ? (
            <span className="relation-pill">
              <span className="relation-dot" />
              {client.name}
            </span>
          ) : (
            <span className="cell-empty">—</span>
          )}
        </td>
        <td>
          {category ? (
            <span className="category-pill">
              <span className="category-dot" style={{ background: category.color }} />
              {category.name}
            </span>
          ) : (
            <span className="cell-empty">Uncategorized</span>
          )}
        </td>
        <td>
          <TypeBadgeComponent type={transaction.type} compact />
        </td>
        <td className={`align-right amount-cell ${transaction.type === 'income' ? 'tone-green' : 'tone-red'}`}>
          {transaction.type === 'income' ? '+' : '−'}
          {formatMoney(transaction.amountCents, settings)}
        </td>
        <td>
          <span className="formula-pill">
            <span className="formula-symbol">ƒ</span>
            {monthLabel(monthKeyFromISO(transaction.date), true)}
          </span>
        </td>
        <td className="cell-nowrap">{formatDate(transaction.date, settings.locale)}</td>
        <td>
          <StatusBadge status={transaction.status} />
        </td>
        <td className="cell-nowrap cell-muted">
          {transaction.paymentDate ? formatDate(transaction.paymentDate, settings.locale) : '—'}
        </td>
        <td className="cell-muted">{transaction.paymentMethod || '—'}</td>
        <td className="notes-column">
          <span className="truncate" title={transaction.notes}>
            {transaction.notes || '—'}
          </span>
        </td>
        <td className="cell-center">
          {transaction.attachments.length > 0 ? (
            <span className="file-cell">
              <Paperclip size={12} />
              {transaction.attachments.length}
            </span>
          ) : (
            <span className="cell-empty">—</span>
          )}
        </td>
      </tr>
    )
  }

  const tableColumns = 12

  return (
    <div className="transactions-page">
      <PageHeader
        eyebrow={
          <>
            <Table2 size={12} /> Database · {transactions.length} records
          </>
        }
        title="Transactions"
        subtitle="Every financial record in one place. Search, filter, group, and save the views you use most."
        actions={
          <div className="hero-actions">
            <Button variant="secondary" icon={<Download size={14} />} onClick={exportFiltered}>
              Export CSV
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => openDrawer(null, { date: todayISO() })}
            >
              New transaction
            </Button>
          </div>
        }
      />

      <div className="db-shell">
        <div className="db-toolbar-top">
          <Segmented
            value={view}
            onChange={(next) => {
              setView(next)
              setActiveViewId(null)
            }}
            ariaLabel="Database view"
            options={[
              {
                value: 'table',
                label: (
                  <>
                    <Table2 size={13} /> Table
                  </>
                ),
              },
              {
                value: 'calendar',
                label: (
                  <>
                    <CalendarDays size={13} /> Calendar
                  </>
                ),
              },
            ]}
          />
          <div className="db-toolbar-actions">
            <Popover
              align="end"
              trigger={
                <Button variant="ghost" size="sm" icon={<ListFilter size={14} />}>
                  Saved views
                  <ChevronDown size={12} />
                </Button>
              }
              panelClassName="saved-views-panel"
            >
              {(close) => (
                <>
                  <div className="saved-views-head">
                    <span>Database views</span>
                    <span className="saved-count">{savedViews.length}</span>
                  </div>
                  {savedViews.length === 0 ? (
                    <div className="saved-empty">
                      Save your current filters as a reusable view.
                    </div>
                  ) : (
                    savedViews.map((saved) => (
                      <div
                        className={`saved-view-row ${activeViewId === saved.id ? 'active' : ''}`}
                        key={saved.id}
                      >
                        <button
                          className="saved-view-apply"
                          onClick={() => {
                            applyView(saved.id)
                            close()
                          }}
                        >
                          <span className="saved-view-name">
                            {activeViewId === saved.id && <Check size={12} />}
                            {saved.name}
                          </span>
                          <span className="saved-view-summary">{viewSummary(saved.config)}</span>
                        </button>
                        <IconButton
                          label={`Delete ${saved.name}`}
                          size="sm"
                          className="saved-view-delete"
                          onClick={() => {
                            close()
                            void handleDeleteView(saved.id, saved.name)
                          }}
                        >
                          <Trash2 size={12} />
                        </IconButton>
                      </div>
                    ))
                  )}
                  <MenuDivider />
                  <MenuItem
                    icon={<Save size={14} />}
                    onClick={() => {
                      close()
                      openSaveView()
                    }}
                  >
                    Save current view
                  </MenuItem>
                </>
              )}
            </Popover>
            <Button variant="ghost" size="sm" icon={<Save size={14} />} onClick={openSaveView}>
              {activeViewId ? 'Update view' : 'Save view'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => openDrawer(null, { date: todayISO() })}
            >
              New
            </Button>
          </div>
        </div>

        <div className="db-filterbar">
          <label className="db-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setActiveViewId(null)
              }}
              placeholder="Search transactions, clients, notes…"
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => {
                  setSearch('')
                  setActiveViewId(null)
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </label>

          <select
            className="db-filter-select"
            value={filters.month}
            onChange={(event) => patchFilters({ month: event.target.value })}
            aria-label="Filter by month"
          >
            <option value="all">All months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabelLong(month)}
              </option>
            ))}
          </select>

          <select
            className={`db-filter-select ${filters.type !== 'all' ? 'selected' : ''}`}
            value={filters.type}
            onChange={(event) => patchFilters({ type: event.target.value as ViewFilters['type'] })}
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            className={`db-filter-select ${filters.category !== 'all' ? 'selected' : ''}`}
            value={filters.category}
            onChange={(event) => patchFilters({ category: event.target.value })}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            <optgroup label="Income">
              {categories
                .filter((category) => category.type === 'income')
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Expense">
              {categories
                .filter((category) => category.type === 'expense')
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </optgroup>
          </select>

          <select
            className={`db-filter-select ${filters.client !== 'all' ? 'selected' : ''}`}
            value={filters.client}
            onChange={(event) => patchFilters({ client: event.target.value })}
            aria-label="Filter by client"
          >
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            className={`db-filter-select ${filters.status !== 'all' ? 'selected' : ''}`}
            value={filters.status}
            onChange={(event) =>
              patchFilters({ status: event.target.value as ViewFilters['status'] })
            }
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="unpaid">Unpaid (pending + overdue)</option>
          </select>

          <div className="db-filter-spacer" />

          <select
            className={`db-filter-select ${group !== 'none' ? 'selected' : ''}`}
            value={group}
            onChange={(event) => {
              setGroup(event.target.value as 'none' | 'month' | 'category')
              setActiveViewId(null)
            }}
            aria-label="Group records"
          >
            <option value="none">No grouping</option>
            <option value="month">Group by month</option>
            <option value="category">Group by category</option>
          </select>

          <select
            className="db-filter-select"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey)
              setActiveViewId(null)
            }}
            aria-label="Sort records"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" icon={<FilterX size={13} />} onClick={resetFilters}>
              Clear
            </Button>
          )}
        </div>

        <div className="db-meta-row">
          <span>
            <strong>{filtered.length}</strong> of {transactions.length} records
            {activeFilterCount > 0 && <span className="db-filtered-badge">Filtered</span>}
            {activeViewId && (
              <span className="db-view-badge">
                <Check size={11} />
                {savedViews.find((view) => view.id === activeViewId)?.name}
              </span>
            )}
          </span>
          <span className="db-meta-right">
            {summarize(filtered).count > 0 && (
              <>
                <span className="tone-green">
                  +{formatMoney(totals.incomeAll, settings, { decimals: 0 })}
                </span>
                <span className="tone-red">
                  −{formatMoney(totals.expenseAll, settings, { decimals: 0 })}
                </span>
              </>
            )}
            <span className="db-meta-net">
              Net {formatMoney(totals.incomeAll - totals.expenseAll, settings, { decimals: 0 })}
            </span>
          </span>
        </div>

        {view === 'table' ? (
          filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title={transactions.length === 0 ? 'Your database is empty' : 'No transactions match'}
              description={
                transactions.length === 0
                  ? 'Add your first income or expense record to start tracking your business.'
                  : 'Try clearing a filter or searching for something else.'
              }
              action={
                transactions.length === 0 ? (
                  <Button variant="primary" size="sm" onClick={() => openDrawer(null)}>
                    Add transaction
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Clear all filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="db-table-scroll">
              <table className="db-table">
                <thead>
                  <tr>
                    <th className="name-column">
                      <button className="th-sort" onClick={() => setSort('name-asc')}>
                        Transaction <ArrowUpDown size={10} />
                      </button>
                    </th>
                    <th>Client</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th className="align-right">
                      <button className="th-sort right" onClick={() => cycleSort('amount')}>
                        Amount {sortIcon('amount')}
                      </button>
                    </th>
                    <th>
                      <span className="formula-symbol">ƒ</span> Month
                    </th>
                    <th>
                      <button className="th-sort" onClick={() => cycleSort('date')}>
                        Date {sortIcon('date')}
                      </button>
                    </th>
                    <th>Status</th>
                    <th>Payment date</th>
                    <th>Method</th>
                    <th>Notes</th>
                    <th className="align-center">Files</th>
                  </tr>
                </thead>
                <tbody>
                  {group === 'none'
                    ? sorted.map(renderRow)
                    : grouped.map((groupItem) => {
                        const isCollapsed = collapsedGroups.has(groupItem.key)
                        return (
                          <Fragment key={groupItem.key}>
                            <tr className="group-row">
                              <td colSpan={tableColumns}>
                                <button
                                  className="group-toggle"
                                  onClick={() => toggleGroup(groupItem.key)}
                                >
                                  <span className={`group-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                                    <ChevronDown size={13} />
                                  </span>
                                  {groupItem.color && (
                                    <span
                                      className="category-dot"
                                      style={{ background: groupItem.color }}
                                    />
                                  )}
                                  <span className="group-name">{groupItem.label}</span>
                                  <span className="group-count">
                                    {groupItem.transactions.length} record
                                    {groupItem.transactions.length === 1 ? '' : 's'}
                                  </span>
                                  <span className="group-totals">
                                    <span className="tone-green">
                                      {formatMoney(groupItem.summary.incomeAll, settings, {
                                        decimals: 0,
                                      })}
                                    </span>
                                    <span className="tone-red">
                                      {formatMoney(groupItem.summary.expenseAll, settings, {
                                        decimals: 0,
                                      })}
                                    </span>
                                    <span className="group-net">
                                      Net{' '}
                                      {formatMoney(
                                        groupItem.summary.incomeAll -
                                          groupItem.summary.expenseAll,
                                        settings,
                                        { decimals: 0 },
                                      )}
                                    </span>
                                  </span>
                                </button>
                              </td>
                            </tr>
                            {!isCollapsed && groupItem.transactions.map(renderRow)}
                          </Fragment>
                        )
                      })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="calendar-shell">
            <div className="calendar-toolbar">
              <div className="calendar-title">
                <IconButton label="Previous month" size="sm" onClick={() => moveCalendar(-1)}>
                  <ChevronLeft size={16} />
                </IconButton>
                <span>{monthLabelLong(calendarMonth)}</span>
                <IconButton label="Next month" size="sm" onClick={() => moveCalendar(1)}>
                  <ChevronRight size={16} />
                </IconButton>
              </div>
              <div className="calendar-actions">
                <span className="calendar-count">
                  {calendarTxs.length} record{calendarTxs.length === 1 ? '' : 's'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const key = currentMonthKey()
                    setCalendarMonth(key)
                    setFilters((current) => ({ ...current, month: key }))
                    setActiveViewId(null)
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
            <div className="calendar-grid">
              {(settings.weekStart === 'sunday'
                ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              ).map((day) => (
                <div className="calendar-weekday" key={day}>
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => (
                <div
                  className={`calendar-day ${day.inMonth ? '' : 'outside'} ${
                    day.isToday ? 'today' : ''
                  }`}
                  key={day.iso}
                >
                  <div className="calendar-day-head">
                    <span className="calendar-day-number">{day.day}</span>
                    {day.inMonth && (
                      <button
                        className="calendar-add"
                        aria-label={`Add transaction on ${day.iso}`}
                        onClick={() =>
                          openDrawer(null, {
                            date: day.iso,
                            type: filters.type === 'expense' ? 'expense' : 'income',
                          })
                        }
                      >
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                  <div className="calendar-events">
                    {day.transactions.slice(0, 3).map((transaction) => (
                      <button
                        key={transaction.id}
                        className={`calendar-event ${transaction.type} status-${transaction.status.toLowerCase()}`}
                        onClick={() => openDrawer(transaction)}
                        title={`${transaction.name} · ${formatMoney(
                          transaction.amountCents,
                          settings,
                        )}`}
                      >
                        <span className="event-name">{transaction.name}</span>
                        <span className="event-amount">
                          {transaction.type === 'income' ? '+' : '−'}
                          {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                        </span>
                      </button>
                    ))}
                    {day.transactions.length > 3 && (
                      <button
                        className="calendar-more"
                        onClick={() => {
                          setFilters((current) => ({ ...current, month: calendarMonth }))
                          setSearch('')
                          setView('table')
                        }}
                      >
                        +{day.transactions.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="db-footer">
          <div className="db-footer-count">
            <FileText size={13} />
            {filtered.length} record{filtered.length === 1 ? '' : 's'}
            <span className="db-footer-dot">·</span>
            {formatMoney(totals.incomePaid, settings, { decimals: 0 })} received
          </div>
          <div className="db-footer-totals">
            <span>
              Income <strong className="tone-green">{formatMoney(totals.incomeAll, settings)}</strong>
            </span>
            <span>
              Expenses <strong className="tone-red">{formatMoney(totals.expenseAll, settings)}</strong>
            </span>
            <span className="db-footer-net">
              Net{' '}
              <strong
                className={totals.incomeAll - totals.expenseAll >= 0 ? 'tone-green' : 'tone-red'}
              >
                {formatMoney(totals.incomeAll - totals.expenseAll, settings)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={activeViewId ? 'Update saved view' : 'Save database view'}
        subtitle="The current filters, sort, grouping, and view mode will be saved."
        width={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={savingView}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSaveView()}
              loading={savingView}
              disabled={!saveName.trim()}
            >
              Save view
            </Button>
          </>
        }
      >
        <Field label="View name" required>
          <input
            className="text-input"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="e.g. Outstanding invoices"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSaveView()
            }}
          />
        </Field>
        <div className="save-view-summary">
          <span className="save-summary-label">Current configuration</span>
          <span>{viewSummary(currentConfig)}</span>
          <span>
            {SORT_OPTIONS.find((option) => option.value === sort)?.label}
            {group !== 'none' ? ` · Grouped by ${group}` : ''}
            {search ? ` · Search “${search}”` : ''}
          </span>
        </div>
      </Modal>
    </div>
  )
}
