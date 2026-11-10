import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Plus,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useTransactionDrawer } from '../components/TransactionDrawer'
import {
  Button,
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  ProgressBar,
  Segmented,
  StatusBadge,
  TrendIndicator,
  TypeBadge,
  Avatar,
} from '../components/ui'
import { CashFlowChart, ChartLegend, MiniSparkline } from '../components/charts'
import {
  computeClientStats,
  computeGrowth,
  formatMoney,
  formatPercent,
  monthlySeries,
  summarize,
} from '../lib/finance'
import {
  currentMonthKey,
  daysBetween,
  formatDate,
  formatLongDate,
  monthKeyOffset,
  monthLabel,
  monthKeyFromISO,
  todayISO,
} from '../lib/date'

export function DashboardPage() {
  const { transactions, clients, categories, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const navigate = useNavigate()
  const [chartMonths, setChartMonths] = useState<'6' | '12'>('6')
  const now = new Date()

  const summary = useMemo(() => summarize(transactions), [transactions])
  const currentKey = currentMonthKey(now)
  const previousKey = monthKeyOffset(-1, now)

  const currentMonthTx = useMemo(
    () => transactions.filter((transaction) => monthKeyFromISO(transaction.date) === currentKey),
    [transactions, currentKey],
  )
  const previousMonthTx = useMemo(
    () => transactions.filter((transaction) => monthKeyFromISO(transaction.date) === previousKey),
    [transactions, previousKey],
  )
  const monthSummary = useMemo(() => summarize(currentMonthTx), [currentMonthTx])
  const previousSummary = useMemo(() => summarize(previousMonthTx), [previousMonthTx])
  const series = useMemo(
    () => monthlySeries(transactions, chartMonths === '6' ? 6 : 12, now),
    [transactions, chartMonths],
  )

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [transactions],
  )

  const pending = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === 'income' && transaction.status !== 'Paid')
        .sort((a, b) => {
          const order: Record<string, number> = { Overdue: 0, Pending: 1, Paid: 2 }
          return order[a.status] - order[b.status] || a.date.localeCompare(b.date)
        }),
    [transactions],
  )

  const clientStats = useMemo(() => computeClientStats(transactions), [transactions])
  const topClients = useMemo(
    () =>
      [...clients]
        .map((client) => ({ client, stats: clientStats.get(client.id) }))
        .filter((item) => (item.stats?.totalPaid ?? 0) > 0)
        .sort((a, b) => (b.stats?.totalPaid ?? 0) - (a.stats?.totalPaid ?? 0))
        .slice(0, 4),
    [clients, clientStats],
  )
  const topClientMax = Math.max(1, ...topClients.map((item) => item.stats?.totalPaid ?? 0))

  const incomeGrowth = computeGrowth(monthSummary.incomePaid, previousSummary.incomePaid)
  const expenseGrowth = computeGrowth(monthSummary.expensePaid, previousSummary.expensePaid)
  const pendingCount = pending.length
  const paidShare = summary.incomeAll > 0 ? (summary.incomePaid / summary.incomeAll) * 100 : 0
  const netTone = summary.netProfit >= 0 ? 'green' : 'red'

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={
          <>
            <Sparkles size={12} /> Private Business Income Workspace
          </>
        }
        title="Business Income Tracker"
        subtitle={`A single source of truth for ${settings.businessName} — income, expenses, clients, and monthly earnings.`}
        actions={
          <div className="hero-actions">
            <span className="hero-date">
              <CalendarDays size={14} />
              {formatLongDate(now, settings.locale)}
            </span>
            <Button variant="secondary" onClick={() => navigate('/transactions')}>
              Open database
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => openDrawer(null, { date: todayISO(), status: 'Pending' })}
            >
              Quick add
            </Button>
          </div>
        }
      />

      <div className="metric-grid">
        <MetricCard
          label="Total gross income"
          value={formatMoney(summary.incomeAll, settings)}
          sub={`${formatMoney(summary.incomePaid, settings)} received`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Total expenses"
          value={formatMoney(summary.expenseAll, settings)}
          sub={`${formatMoney(summary.expensePaid, settings)} paid`}
          tone="red"
          icon={<ArrowUpRight size={15} />}
        />
        <MetricCard
          label="Net profit"
          value={formatMoney(summary.netProfit, settings)}
          sub={
            <>
              {formatPercent(summary.margin, 1)} margin <span className="metric-sep">·</span> cash
              basis
            </>
          }
          tone={netTone}
          icon={<TrendingUp size={15} />}
        />
        <MetricCard
          label="Pending income"
          value={formatMoney(summary.incomePending, settings)}
          sub={`${pendingCount} invoice${pendingCount === 1 ? '' : 's'} awaiting payment`}
          tone="yellow"
          icon={<Clock3 size={15} />}
        />
        <MetricCard
          label="Monthly income"
          value={formatMoney(monthSummary.incomePaid, settings)}
          sub={<TrendIndicator value={incomeGrowth} />}
          tone="blue"
          icon={<Wallet size={15} />}
        />
        <MetricCard
          label="Monthly expenses"
          value={formatMoney(monthSummary.expensePaid, settings)}
          sub={<TrendIndicator value={expenseGrowth} invert />}
          tone="purple"
          icon={<ReceiptText size={15} />}
        />
      </div>

      <div className="dashboard-grid dashboard-grid-top">
        <Panel
          className="chart-panel"
          title="Cash flow"
          subtitle="Received income against paid expenses — pending invoices excluded."
          actions={
            <div className="panel-controls">
              <ChartLegend
                items={[
                  { label: 'Received', color: 'var(--green)', shape: 'bar' },
                  { label: 'Expenses', color: 'var(--red)', shape: 'bar' },
                  { label: 'Net', color: 'var(--blue)', shape: 'line' },
                ]}
              />
              <Segmented
                size="sm"
                value={chartMonths}
                onChange={setChartMonths}
                ariaLabel="Chart period"
                options={[
                  { value: '6', label: '6M' },
                  { value: '12', label: '12M' },
                ]}
              />
            </div>
          }
        >
          <div className="chart-kpis">
            <div>
              <span className="chart-kpi-label">Received · {chartMonths}M</span>
              <span className="chart-kpi-value">
                {formatMoney(
                  series.reduce((sum, point) => sum + point.income * 100, 0),
                  settings,
                )}
              </span>
            </div>
            <div>
              <span className="chart-kpi-label">Net · {chartMonths}M</span>
              <span
                className={`chart-kpi-value ${
                  series.reduce((sum, point) => sum + point.net, 0) >= 0 ? 'tone-green' : 'tone-red'
                }`}
              >
                {formatMoney(series.reduce((sum, point) => sum + point.net * 100, 0), settings)}
              </span>
            </div>
            <div className="chart-kpi-spark">
              <span className="chart-kpi-label">Net trend</span>
              <MiniSparkline
                values={series.map((point) => point.net)}
                color={summary.netProfit >= 0 ? 'var(--green)' : 'var(--red)'}
              />
            </div>
          </div>
          <CashFlowChart data={series} settings={settings} />
        </Panel>

        <Panel
          className="attention-panel"
          title="Needs attention"
          subtitle={`${pendingCount} unpaid invoice${pendingCount === 1 ? '' : 's'} · ${formatMoney(
            summary.incomePending,
            settings,
          )} outstanding`}
          actions={
            <Link className="text-link" to="/transactions?status=unpaid&type=income">
              View all <ArrowRight size={13} />
            </Link>
          }
        >
          {pending.length === 0 ? (
            <EmptyState
              compact
              icon={<Sparkles size={18} />}
              title="Everything is settled"
              description="No outstanding invoices right now."
            />
          ) : (
            <div className="attention-list">
              {pending.slice(0, 5).map((transaction) => {
                const client = transaction.clientId ? clientById.get(transaction.clientId) : null
                const daysLate =
                  transaction.status === 'Overdue'
                    ? daysBetween(transaction.date, todayISO())
                    : null
                return (
                  <button
                    key={transaction.id}
                    className="attention-row"
                    onClick={() => openDrawer(transaction)}
                  >
                    <span className={`attention-icon status-${transaction.status.toLowerCase()}`}>
                      <Clock3 size={14} />
                    </span>
                    <span className="attention-main">
                      <span className="attention-name">{transaction.name}</span>
                      <span className="attention-meta">
                        {client?.name ?? 'No client'}
                        {daysLate !== null && daysLate > 0
                          ? ` · ${daysLate}d overdue`
                          : ` · ${formatDate(transaction.date, settings.locale, {
                              month: 'short',
                              day: 'numeric',
                            })}`}
                      </span>
                    </span>
                    <span className="attention-side">
                      <span className="attention-amount">
                        {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                      </span>
                      <StatusBadge status={transaction.status} />
                    </span>
                  </button>
                )
              })}
              {pending.length > 5 && (
                <Link className="attention-more" to="/transactions?status=unpaid&type=income">
                  +{pending.length - 5} more unpaid invoice{pending.length - 5 === 1 ? '' : 's'}
                </Link>
              )}
            </div>
          )}
          <div className="collection-block">
            <div className="collection-head">
              <span>Collection rate</span>
              <strong>{formatPercent(paidShare, 0)}</strong>
            </div>
            <ProgressBar value={paidShare} tone="green" height={5} />
            <p className="collection-note">
              {formatMoney(summary.incomePaid, settings)} of{' '}
              {formatMoney(summary.incomeAll, settings)} billed has been received.
            </p>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <Panel
          title="Recent transactions"
          subtitle="Latest records across your workspace."
          flush
          actions={
            <Link className="text-link" to="/transactions">
              Open database <ArrowRight size={13} />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <EmptyState
              icon={<ReceiptText size={18} />}
              title="No transactions yet"
              description="Add your first income or expense record to see it here."
              action={
                <Button variant="primary" size="sm" onClick={() => openDrawer(null)}>
                  Add transaction
                </Button>
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="align-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((transaction) => {
                    const client = transaction.clientId ? clientById.get(transaction.clientId) : null
                    const category = transaction.categoryId
                      ? categoryById.get(transaction.categoryId)
                      : null
                    return (
                      <tr key={transaction.id} onClick={() => openDrawer(transaction)}>
                        <td>
                          <div className="cell-title">
                            <span className={`row-type-icon ${transaction.type}`}>
                              {transaction.type === 'income' ? (
                                <ArrowDownLeft size={12} />
                              ) : (
                                <ArrowUpRight size={12} />
                              )}
                            </span>
                            <div className="cell-title-text">
                              <span className="cell-name">{transaction.name}</span>
                              <span className="cell-sub">{category?.name ?? 'Uncategorized'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-muted">{client?.name ?? '—'}</td>
                        <td>
                          <TypeBadge type={transaction.type} />
                        </td>
                        <td className="cell-muted">
                          {formatDate(transaction.date, settings.locale, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td>
                          <StatusBadge status={transaction.status} />
                        </td>
                        <td
                          className={`align-right amount-cell ${
                            transaction.type === 'income' ? 'tone-green' : 'tone-red'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '−'}
                          {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Top clients"
          subtitle="Ranked by received revenue."
          actions={
            <Link className="text-link" to="/clients">
              All clients <ArrowRight size={13} />
            </Link>
          }
        >
          {topClients.length === 0 ? (
            <EmptyState
              compact
              icon={<Users size={18} />}
              title="No client revenue yet"
              description="Link income records to clients to see performance."
            />
          ) : (
            <div className="top-clients">
              {topClients.map(({ client, stats }) => (
                <Link to={`/clients/${client.id}`} key={client.id} className="top-client-row">
                  <Avatar name={client.name} size={28} />
                  <div className="top-client-main">
                    <div className="top-client-name">{client.name}</div>
                    <div className="top-client-company">{client.company ?? 'Independent'}</div>
                    <div className="top-client-bar">
                      <span
                        style={{
                          width: `${Math.max(
                            4,
                            ((stats?.totalPaid ?? 0) / topClientMax) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="top-client-amount">
                    <span>{formatMoney(stats?.totalPaid ?? 0, settings, { decimals: 0 })}</span>
                    {(stats?.outstanding ?? 0) > 0 && (
                      <span className="top-client-outstanding">
                        {formatMoney(stats?.outstanding ?? 0, settings, { decimals: 0 })} open
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="month-pulse">
            <div className="month-pulse-head">
              <div>
                <span className="month-pulse-label">{monthLabel(currentKey)} pulse</span>
                <span className="month-pulse-value">
                  {formatMoney(monthSummary.netProfit, settings)}
                </span>
              </div>
              <span className={`mini-pill ${monthSummary.netProfit >= 0 ? 'green' : 'red'}`}>
                {monthSummary.netProfit >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
            <div className="month-pulse-stats">
              <span>
                <ArrowDownLeft size={11} className="tone-green" />
                {formatMoney(monthSummary.incomePaid, settings, { decimals: 0 })}
              </span>
              <span>
                <ArrowUpRight size={11} className="tone-red" />
                {formatMoney(monthSummary.expensePaid, settings, { decimals: 0 })}
              </span>
              <span className="month-pulse-count">{monthSummary.count} records</span>
            </div>
            <ProgressBar value={monthSummary.completion} tone="green" height={4} />
            <p className="collection-note">
              {formatPercent(monthSummary.completion, 0)} of this month’s invoices collected.
            </p>
          </div>
        </Panel>
      </div>

      <div className="dashboard-footnote">
        <span className="live-dot" />
        All figures are calculated live from {summary.count} transaction
        {summary.count === 1 ? '' : 's'} · Pending income is excluded from cash-flow and net profit
        · Last synced moments ago
      </div>
    </div>
  )
}
