import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useTransactionDrawer } from '../components/TransactionDrawer'
import {
  Button,
  EmptyState,
  IconButton,
  MetricCard,
  PageHeader,
  Panel,
  ProgressBar,
  StatusBadge,
  TrendIndicator,
} from '../components/ui'
import { ChartLegend, MonthlyNetChart } from '../components/charts'
import {
  computeGrowth,
  computeMonthlyStats,
  formatMoney,
  formatNumber,
  formatPercent,
  monthCellsForYear,
  summarize,
} from '../lib/finance'
import {
  addMonthsToKey,
  currentMonthKey,
  formatDate,
  monthKeyFromISO,
  monthLabel,
  monthLabelLong,
  todayISO,
} from '../lib/date'

export function MonthlyPage() {
  const { transactions, clients, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentKey = currentMonthKey(now)

  const [year, setYear] = useState(currentYear)
  const [selectedKey, setSelectedKey] = useState(currentKey)

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const cells = useMemo(() => monthCellsForYear(transactions, year), [transactions, year])
  const monthlyStats = useMemo(() => computeMonthlyStats(transactions), [transactions])

  const selectedSummary = monthlyStats.get(selectedKey) ?? summarize([])
  const selectedTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => monthKeyFromISO(transaction.date) === selectedKey)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, selectedKey],
  )

  const previousKey = addMonthsToKey(selectedKey, -1)
  const previousSummary = monthlyStats.get(previousKey) ?? summarize([])
  const growth = computeGrowth(selectedSummary.netProfit, previousSummary.netProfit)

  const yearTotals = useMemo(() => {
    const rows = transactions.filter(
      (transaction) => monthKeyFromISO(transaction.date).slice(0, 4) === String(year),
    )
    return summarize(rows)
  }, [transactions, year])

  const yearSeries = useMemo(
    () =>
      cells.map((cell) => ({
        label: monthLabel(cell.key, false),
        net: cell.summary.netProfit / 100,
        count: cell.summary.count,
      })),
    [cells],
  )

  const monthsWithData = cells.filter((cell) => cell.summary.count > 0)
  const bestMonth = [...monthsWithData].sort(
    (a, b) => b.summary.netProfit - a.summary.netProfit,
  )[0]

  const changeYear = (amount: number) => {
    const nextYear = year + amount
    setYear(nextYear)
    const withData = monthCellsForYear(transactions, nextYear).filter(
      (cell) => cell.summary.count > 0,
    )
    if (nextYear === currentYear) {
      setSelectedKey(currentKey)
    } else if (withData.length > 0) {
      setSelectedKey(withData[withData.length - 1].key)
    } else {
      setSelectedKey(`${nextYear}-01`)
    }
  }

  const moveMonth = (amount: number) => {
    const next = addMonthsToKey(selectedKey, amount)
    setSelectedKey(next)
    setYear(Number(next.slice(0, 4)))
  }

  const addForMonth = () => {
    const defaultDate =
      selectedKey === currentKey ? todayISO() : `${selectedKey}-01`
    openDrawer(null, { date: defaultDate })
  }

  const selectedMonthTx = selectedSummary

  return (
    <div className="monthly-page">
      <PageHeader
        eyebrow={
          <>
            <CalendarDays size={12} /> Historical performance
          </>
        }
        title="Monthly Overview"
        subtitle="Month-by-month profit, collection rates, and payment activity — all derived from the same transaction records."
        actions={
          <div className="hero-actions">
            <div className="year-switcher">
              <IconButton label="Previous year" size="sm" onClick={() => changeYear(-1)}>
                <ChevronLeft size={16} />
              </IconButton>
              <span>{year}</span>
              <IconButton label="Next year" size="sm" onClick={() => changeYear(1)}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setYear(currentYear)
                setSelectedKey(currentKey)
              }}
            >
              This month
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={addForMonth}>
              Add record
            </Button>
          </div>
        }
      />

      <div className="year-summary-strip">
        <div>
          <span className="year-summary-label">{year} gross income</span>
          <span className="year-summary-value tone-green">
            {formatMoney(yearTotals.incomeAll, settings)}
          </span>
        </div>
        <div>
          <span className="year-summary-label">{year} expenses</span>
          <span className="year-summary-value tone-red">
            {formatMoney(yearTotals.expenseAll, settings)}
          </span>
        </div>
        <div>
          <span className="year-summary-label">{year} net profit</span>
          <span
            className={`year-summary-value ${
              yearTotals.netProfit >= 0 ? 'tone-green' : 'tone-red'
            }`}
          >
            {formatMoney(yearTotals.netProfit, settings)}
          </span>
        </div>
        <div>
          <span className="year-summary-label">Best month</span>
          <span className="year-summary-value">
            {bestMonth ? monthLabel(bestMonth.key, true) : '—'}
            {bestMonth && (
              <span className="year-summary-sub">
                {formatMoney(bestMonth.summary.netProfit, settings, { decimals: 0 })}
              </span>
            )}
          </span>
        </div>
        <div>
          <span className="year-summary-label">Records</span>
          <span className="year-summary-value">{formatNumber(yearTotals.count, settings.locale)}</span>
        </div>
      </div>

      <div className="month-grid">
        {cells.map((cell) => {
          const summary = cell.summary
          const empty = summary.count === 0
          const selected = cell.key === selectedKey
          return (
            <button
              key={cell.key}
              className={`month-card ${selected ? 'selected' : ''} ${empty ? 'empty' : ''}`}
              onClick={() => setSelectedKey(cell.key)}
            >
              <div className="month-card-head">
                <span className="month-card-label">{monthLabel(cell.key, true)}</span>
                {!empty ? (
                  <span
                    className={`mini-pill ${summary.netProfit >= 0 ? 'green' : 'red'}`}
                  >
                    {summary.netProfit >= 0 ? (
                      <TrendingUp size={10} />
                    ) : (
                      <TrendingDown size={10} />
                    )}
                    {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
                  </span>
                ) : (
                  <span className="mini-pill gray">No activity</span>
                )}
              </div>
              <div className={`month-card-net ${summary.netProfit >= 0 ? 'tone-green' : 'tone-red'}`}>
                {formatMoney(summary.netProfit, settings, { decimals: 0 })}
              </div>
              <div className="month-card-rows">
                <span>
                  <ArrowDownLeft size={11} className="tone-green" />
                  {formatMoney(summary.incomeAll, settings, { decimals: 0 })}
                </span>
                <span>
                  <ArrowUpRight size={11} className="tone-red" />
                  {formatMoney(summary.expenseAll, settings, { decimals: 0 })}
                </span>
              </div>
              <div className="month-card-progress">
                <ProgressBar
                  value={summary.completion}
                  tone={summary.completion >= 75 ? 'green' : 'yellow'}
                  height={4}
                />
                <div className="month-card-meta">
                  <span>{formatPercent(summary.completion, 0)} collected</span>
                  <span>{summary.count} records</span>
                </div>
              </div>
              <div className="month-card-foot">
                <Clock3 size={11} />
                {summary.incomePending > 0
                  ? `${formatMoney(summary.incomePending, settings, { decimals: 0 })} pending`
                  : 'All invoices settled'}
              </div>
            </button>
          )
        })}
      </div>

      <section className="month-detail">
        <div className="month-detail-head">
          <div>
            <div className="eyebrow">
              <CalendarDays size={12} /> Selected month
            </div>
            <div className="month-detail-title-row">
              <IconButton label="Previous month" onClick={() => moveMonth(-1)}>
                <ChevronLeft size={18} />
              </IconButton>
              <h2>{monthLabelLong(selectedKey)}</h2>
              <IconButton label="Next month" onClick={() => moveMonth(1)}>
                <ChevronRight size={18} />
              </IconButton>
              <span
                className={`mini-pill ${selectedMonthTx.netProfit >= 0 ? 'green' : 'red'}`}
              >
                {selectedMonthTx.netProfit >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
          </div>
          <div className="month-detail-actions">
            <TrendIndicator value={growth} label="vs previous month" />
            <Link className="text-link" to={`/transactions?month=${selectedKey}`}>
              <Table2 size={13} /> Open in database
            </Link>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={addForMonth}>
              Add record
            </Button>
          </div>
        </div>

        <div className="metric-grid metric-grid-5">
          <MetricCard
            label="Gross income"
            value={formatMoney(selectedMonthTx.incomeAll, settings)}
            sub={`${selectedMonthTx.incomeCount} income records`}
            tone="green"
            icon={<ArrowDownLeft size={15} />}
          />
          <MetricCard
            label="Expenses"
            value={formatMoney(selectedMonthTx.expenseAll, settings)}
            sub={`${formatMoney(selectedMonthTx.expensePaid, settings)} paid`}
            tone="red"
            icon={<ArrowUpRight size={15} />}
          />
          <MetricCard
            label="Net profit"
            value={formatMoney(selectedMonthTx.netProfit, settings)}
            sub={`${formatPercent(selectedMonthTx.margin, 1)} margin`}
            tone={selectedMonthTx.netProfit >= 0 ? 'green' : 'red'}
            icon={<TrendingUp size={15} />}
          />
          <MetricCard
            label="Pending payments"
            value={formatMoney(selectedMonthTx.incomePending, settings)}
            sub={`${selectedMonthTx.pendingCount + selectedMonthTx.overdueCount} open records`}
            tone="yellow"
            icon={<Clock3 size={15} />}
          />
          <MetricCard
            label="Transactions"
            value={formatNumber(selectedMonthTx.count, settings.locale)}
            sub={`${formatPercent(selectedMonthTx.completion, 0)} payment completion`}
            tone="blue"
            icon={<CalendarDays size={15} />}
          />
        </div>

        <div className="month-detail-grid">
          <div className="month-composition panel">
            <div className="panel-head">
              <div className="panel-head-text">
                <h2 className="panel-title">Cash position</h2>
                <p className="panel-subtitle">What was received, paid, and still outstanding.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="composition-block">
                <div className="composition-head">
                  <span className="panel-title-with-dot">
                    <span className="status-dot green" /> Income
                  </span>
                  <span>{formatMoney(selectedMonthTx.incomeAll, settings)} expected</span>
                </div>
                <div className="composition-bar">
                  <div
                    className="composition-fill income"
                    style={{
                      width: `${
                        selectedMonthTx.incomeAll > 0
                          ? (selectedMonthTx.incomePaid / selectedMonthTx.incomeAll) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="composition-legend">
                  <span>
                    <span className="legend-dot green" />
                    Received{' '}
                    <strong>{formatMoney(selectedMonthTx.incomePaid, settings, { decimals: 0 })}</strong>
                  </span>
                  <span>
                    <span className="legend-dot yellow" />
                    Pending{' '}
                    <strong>{formatMoney(selectedMonthTx.incomePending, settings, { decimals: 0 })}</strong>
                  </span>
                </div>
              </div>

              <div className="composition-block">
                <div className="composition-head">
                  <span className="panel-title-with-dot">
                    <span className="status-dot red" /> Expenses
                  </span>
                  <span>{formatMoney(selectedMonthTx.expenseAll, settings)} expected</span>
                </div>
                <div className="composition-bar">
                  <div
                    className="composition-fill expense"
                    style={{
                      width: `${
                        selectedMonthTx.expenseAll > 0
                          ? (selectedMonthTx.expensePaid / selectedMonthTx.expenseAll) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="composition-legend">
                  <span>
                    <span className="legend-dot green" />
                    Paid{' '}
                    <strong>{formatMoney(selectedMonthTx.expensePaid, settings, { decimals: 0 })}</strong>
                  </span>
                  <span>
                    <span className="legend-dot yellow" />
                    Outstanding{' '}
                    <strong>
                      {formatMoney(selectedMonthTx.expenseOutstanding, settings, { decimals: 0 })}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="composition-status">
                <div>
                  <span className="status-ring paid" />
                  <span>
                    <strong>{selectedMonthTx.paidCount}</strong> paid
                  </span>
                </div>
                <div>
                  <span className="status-ring pending" />
                  <span>
                    <strong>{selectedMonthTx.pendingCount}</strong> pending
                  </span>
                </div>
                <div>
                  <span className="status-ring overdue" />
                  <span>
                    <strong>{selectedMonthTx.overdueCount}</strong> overdue
                  </span>
                </div>
              </div>

              <div className="completion-block">
                <div className="ledger-progress-head">
                  <span>Payment completion</span>
                  <span>{formatPercent(selectedMonthTx.completion, 0)}</span>
                </div>
                <ProgressBar value={selectedMonthTx.completion} tone="green" height={6} />
              </div>
            </div>
          </div>

          <div className="month-transactions panel">
            <div className="panel-head">
              <div className="panel-head-text">
                <h2 className="panel-title">{monthLabel(selectedKey, true)} record</h2>
                <p className="panel-subtitle">
                  {selectedTransactions.length} transaction
                  {selectedTransactions.length === 1 ? '' : 's'} this month.
                </p>
              </div>
              <Link className="text-link" to={`/transactions?month=${selectedKey}`}>
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <div className={`panel-body ${selectedTransactions.length === 0 ? 'empty-body' : ''}`}>
              {selectedTransactions.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarDays size={18} />}
                  title="Nothing recorded this month"
                  description="Add an income or expense record to populate this month."
                  action={
                    <Button variant="primary" size="sm" onClick={addForMonth}>
                      Add record
                    </Button>
                  }
                />
              ) : (
                <div className="month-tx-list">
                  {selectedTransactions.map((transaction) => {
                    const client = transaction.clientId
                      ? clientById.get(transaction.clientId)
                      : null
                    return (
                      <button
                        key={transaction.id}
                        className="month-tx-row"
                        onClick={() => openDrawer(transaction)}
                      >
                        <span className={`ledger-row-icon ${transaction.type}`}>
                          {transaction.type === 'income' ? (
                            <ArrowDownLeft size={13} />
                          ) : (
                            <ArrowUpRight size={13} />
                          )}
                        </span>
                        <span className="month-tx-main">
                          <span className="month-tx-name">{transaction.name}</span>
                          <span className="month-tx-meta">
                            {formatDate(transaction.date, settings.locale, {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {client ? ` · ${client.name}` : ''}
                          </span>
                        </span>
                        <StatusBadge status={transaction.status} />
                        <span
                          className={`month-tx-amount ${
                            transaction.type === 'income' ? 'tone-green' : 'tone-red'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '−'}
                          {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Panel
        title={`${year} performance`}
        subtitle="Net cash profit by month, calculated from received income minus paid expenses."
        actions={
          <ChartLegend
            items={[
              { label: 'Profit', color: 'var(--green)', shape: 'bar' },
              { label: 'Loss', color: 'var(--red)', shape: 'bar' },
            ]}
          />
        }
      >
        <div className="chart-kpis">
          <div>
            <span className="chart-kpi-label">Year net profit</span>
            <span
              className={`chart-kpi-value ${
                yearTotals.netProfit >= 0 ? 'tone-green' : 'tone-red'
              }`}
            >
              {formatMoney(yearTotals.netProfit, settings)}
            </span>
          </div>
          <div>
            <span className="chart-kpi-label">Months with activity</span>
            <span className="chart-kpi-value">{monthsWithData.length} / 12</span>
          </div>
          <div>
            <span className="chart-kpi-label">Avg. monthly net</span>
            <span className="chart-kpi-value">
              {formatMoney(
                monthsWithData.length > 0
                  ? yearTotals.netProfit / monthsWithData.length
                  : 0,
                settings,
              )}
            </span>
          </div>
        </div>
        <MonthlyNetChart data={yearSeries} settings={settings} height={240} />
      </Panel>
    </div>
  )
}
