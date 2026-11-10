import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  TrendingUp,
  Wallet,
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
} from '../components/ui'
import { ChartLegend, MonthlyEarningsChart } from '../components/charts'
import {
  formatMoney,
  formatNumber,
  formatPercent,
  monthCellsForYear,
  summarize,
} from '../lib/finance'
import {
  currentMonthKey,
  formatDate,
  monthKeyFromISO,
  monthLabel,
  monthLabelLong,
  todayISO,
} from '../lib/date'

export function EarningsPage() {
  const { transactions, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentKey = currentMonthKey(now)

  const [year, setYear] = useState(currentYear)
  const [selectedKey, setSelectedKey] = useState(currentKey)

  const cells = useMemo(() => monthCellsForYear(transactions, year), [transactions, year])

  const yearIncome = useMemo(
    () =>
      summarize(
        transactions.filter(
          (transaction) =>
            transaction.type === 'income' &&
            monthKeyFromISO(transaction.date).slice(0, 4) === String(year),
        ),
      ),
    [transactions, year],
  )

  const monthsWithIncome = cells.filter((cell) => cell.summary.incomeCount > 0)
  const bestMonth = [...monthsWithIncome].sort(
    (a, b) => b.summary.incomeAll - a.summary.incomeAll,
  )[0]
  const selectedCell = cells.find((cell) => cell.key === selectedKey)
  const selectedSummary = selectedCell?.summary ?? summarize([])
  const selectedIncome = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === 'income' &&
            monthKeyFromISO(transaction.date) === selectedKey,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, selectedKey],
  )

  const series = useMemo(
    () =>
      cells.map((cell) => ({
        label: monthLabel(cell.key, false),
        received: cell.summary.incomePaid / 100,
        pending: cell.summary.incomePending / 100,
      })),
    [cells],
  )

  const changeYear = (amount: number) => {
    const nextYear = year + amount
    setYear(nextYear)
    const withIncome = monthCellsForYear(transactions, nextYear).filter(
      (cell) => cell.summary.incomeCount > 0,
    )
    if (nextYear === currentYear) {
      setSelectedKey(currentKey)
    } else if (withIncome.length > 0) {
      setSelectedKey(withIncome[withIncome.length - 1].key)
    } else {
      setSelectedKey(`${nextYear}-01`)
    }
  }

  const addIncome = () => {
    openDrawer(null, {
      date: selectedKey === currentKey ? todayISO() : `${selectedKey}-01`,
      type: 'income',
      status: 'Paid',
    })
  }

  const selectedMonthIndex = cells.findIndex((cell) => cell.key === selectedKey)
  const moveMonth = (amount: number) => {
    const target = cells[selectedMonthIndex + amount]
    if (target) setSelectedKey(target.key)
  }

  return (
    <div className="monthly-page">
      <PageHeader
        eyebrow={
          <>
            <Wallet size={12} /> Earnings calendar
          </>
        }
        title="Monthly Earnings"
        subtitle="See exactly how much you earned in every month, with received and pending income shown separately."
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
              This year
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={addIncome}>
              Add income
            </Button>
          </div>
        }
      />

      <div className="metric-grid">
        <MetricCard
          label={`${year} earnings`}
          value={formatMoney(yearIncome.incomeAll, settings)}
          sub={`${formatNumber(yearIncome.incomeCount, settings.locale)} income records`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Received"
          value={formatMoney(yearIncome.incomePaid, settings)}
          sub={`${formatPercent(yearIncome.completion, 0)} of earnings collected`}
          tone="blue"
          icon={<Wallet size={15} />}
        />
        <MetricCard
          label="Still pending"
          value={formatMoney(yearIncome.incomePending, settings)}
          sub={`${yearIncome.pendingCount + yearIncome.overdueCount} open income records`}
          tone="yellow"
          icon={<Clock3 size={15} />}
        />
        <MetricCard
          label="Best month"
          value={bestMonth ? monthLabel(bestMonth.key, true) : '—'}
          sub={
            bestMonth
              ? `${formatMoney(bestMonth.summary.incomeAll, settings)} earned`
              : 'No income recorded yet'
          }
          tone="purple"
          icon={<TrendingUp size={15} />}
        />
      </div>

      <Panel
        className="chart-panel"
        title="Income by month"
        subtitle="Each bar is the income earned that month. Pending amounts sit on top of what was received."
        actions={
          <ChartLegend
            items={[
              { label: 'Received', color: 'var(--green)', shape: 'bar' },
              { label: 'Pending', color: 'var(--yellow)', shape: 'bar' },
            ]}
          />
        }
      >
        <MonthlyEarningsChart data={series} settings={settings} />
      </Panel>

      <div className="month-grid">
        {cells.map((cell) => {
          const summary = cell.summary
          const empty = summary.incomeCount === 0
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
                  <span className="mini-pill green">
                    <ArrowDownLeft size={10} />
                    Earned
                  </span>
                ) : (
                  <span className="mini-pill gray">No income</span>
                )}
              </div>
              <div className="month-card-net tone-green">
                {formatMoney(summary.incomeAll, settings, { decimals: 0 })}
              </div>
              <div className="month-card-rows">
                <span>
                  <Wallet size={11} className="tone-blue" />
                  {formatMoney(summary.incomePaid, settings, { decimals: 0 })}
                </span>
                <span>
                  <Clock3 size={11} className="tone-yellow" />
                  {formatMoney(summary.incomePending, settings, { decimals: 0 })}
                </span>
              </div>
              <div className="month-card-progress">
                <ProgressBar
                  value={summary.completion}
                  tone={summary.completion >= 75 ? 'green' : 'yellow'}
                  height={4}
                />
                <div className="month-card-meta">
                  <span>{formatPercent(summary.completion, 0)} received</span>
                  <span>
                    {summary.incomeCount} income record{summary.incomeCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="month-card-foot">
                <Clock3 size={11} />
                {summary.incomePending > 0
                  ? `${formatMoney(summary.incomePending, settings, { decimals: 0 })} still pending`
                  : 'All income received'}
              </div>
            </button>
          )
        })}
      </div>

      <section className="month-detail">
        <div className="month-detail-head">
          <div>
            <div className="eyebrow">
              <CalendarDays size={12} /> Income in
            </div>
            <div className="month-detail-title-row">
              <IconButton
                label="Previous month"
                onClick={() => moveMonth(-1)}
                disabled={selectedMonthIndex <= 0}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <h2>{monthLabelLong(selectedKey)}</h2>
              <IconButton
                label="Next month"
                onClick={() => moveMonth(1)}
                disabled={selectedMonthIndex < 0 || selectedMonthIndex >= cells.length - 1}
              >
                <ChevronRight size={18} />
              </IconButton>
            </div>
          </div>
          <div className="month-detail-actions">
            <Link className="text-link" to={`/transactions?month=${selectedKey}&type=income`}>
              Open in database <ArrowRight size={13} />
            </Link>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={addIncome}>
              Add income
            </Button>
          </div>
        </div>

        <div className="metric-grid metric-grid-3">
          <MetricCard
            label="Earned this month"
            value={formatMoney(selectedSummary.incomeAll, settings)}
            sub={`${selectedSummary.incomeCount} income records`}
            tone="green"
            icon={<ArrowDownLeft size={15} />}
          />
          <MetricCard
            label="Received"
            value={formatMoney(selectedSummary.incomePaid, settings)}
            sub={`${formatPercent(selectedSummary.completion, 0)} collected`}
            tone="blue"
            icon={<Wallet size={15} />}
          />
          <MetricCard
            label="Still pending"
            value={formatMoney(selectedSummary.incomePending, settings)}
            sub={`${selectedSummary.pendingCount + selectedSummary.overdueCount} open records`}
            tone="yellow"
            icon={<Clock3 size={15} />}
          />
        </div>

        <Panel
          title={`${monthLabelLong(selectedKey)} income`}
          subtitle="Every income record from this month. Select one to edit it."
          flush
        >
          {selectedIncome.length === 0 ? (
            <EmptyState
              compact
              icon={<Wallet size={18} />}
              title="No income this month"
              description="Add an income record to start tracking this month's earnings."
              action={
                <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={addIncome}>
                  Add income
                </Button>
              }
            />
          ) : (
            <div className="attention-list earnings-list">
              {selectedIncome.map((transaction) => (
                <button
                  key={transaction.id}
                  className="attention-row"
                  onClick={() => openDrawer(transaction)}
                >
                  <span className={`attention-icon status-${transaction.status.toLowerCase()}`}>
                    <ArrowDownLeft size={14} />
                  </span>
                  <span className="attention-main">
                    <span className="attention-name">{transaction.name}</span>
                    <span className="attention-meta">
                      {formatDate(transaction.date, settings.locale, {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {transaction.paymentMethod ? ` · ${transaction.paymentMethod}` : ''}
                    </span>
                  </span>
                  <span className="attention-side">
                    <span className="attention-amount">
                      {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                    </span>
                    <StatusBadge status={transaction.status} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  )
}
