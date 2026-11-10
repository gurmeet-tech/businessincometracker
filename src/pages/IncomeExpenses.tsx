import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Info,
  Plus,
  ReceiptText,
  Scale,
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
  StatusBadge,
  TypeBadge,
} from '../components/ui'
import {
  computeCategoryStats,
  computeGrowth,
  formatMoney,
  formatPercent,
  summarize,
} from '../lib/finance'
import { formatDate, monthKeyFromISO, monthKeyOffset, todayISO } from '../lib/date'

export function IncomeExpensesPage() {
  const { transactions, categories, clients, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const navigate = useNavigate()

  const summary = useMemo(() => summarize(transactions), [transactions])
  const categoryStats = useMemo(() => computeCategoryStats(transactions), [transactions])
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])

  const incomeTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.type === 'income')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  )
  const expenseTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.type === 'expense')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  )

  const incomeBreakdown = useMemo(
    () =>
      categories
        .filter((category) => category.type === 'income')
        .map((category) => ({ category, stats: categoryStats.get(category.id) }))
        .filter((item) => item.stats && item.stats.count > 0)
        .sort((a, b) => (b.stats?.totalAll ?? 0) - (a.stats?.totalAll ?? 0)),
    [categories, categoryStats],
  )
  const expenseBreakdown = useMemo(
    () =>
      categories
        .filter((category) => category.type === 'expense')
        .map((category) => ({ category, stats: categoryStats.get(category.id) }))
        .filter((item) => item.stats && item.stats.count > 0)
        .sort((a, b) => (b.stats?.totalAll ?? 0) - (a.stats?.totalAll ?? 0)),
    [categories, categoryStats],
  )

  const currentMonth = monthKeyFromISO(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  )
  const previousMonth = monthKeyOffset(-1)
  const monthStats = useMemo(() => {
    const current = summarize(
      transactions.filter((transaction) => monthKeyFromISO(transaction.date) === currentMonth),
    )
    const previous = summarize(
      transactions.filter((transaction) => monthKeyFromISO(transaction.date) === previousMonth),
    )
    return { current, previous }
  }, [transactions, currentMonth, previousMonth])

  const profitTone = summary.netProfit >= 0 ? 'profit' : 'loss'
  const outstandingExpenseCount = expenseTransactions.filter(
    (transaction) => transaction.status !== 'Paid',
  ).length
  const pendingIncomeCount = incomeTransactions.filter(
    (transaction) => transaction.status !== 'Paid',
  ).length

  return (
    <div className="income-expenses-page">
      <PageHeader
        eyebrow={
          <>
            <Scale size={12} /> Cash-flow management
          </>
        }
        title="Income & Expenses"
        subtitle="Separate what you have earned from what you have actually received. Pending income never counts as cash."
        actions={
          <div className="hero-actions">
            <Button
              variant="secondary"
              icon={<ArrowDownLeft size={15} className="tone-green" />}
              onClick={() =>
                openDrawer(null, { type: 'income', status: 'Pending', date: todayISO() })
              }
            >
              Add income
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => openDrawer(null, { type: 'expense', status: 'Paid' })}
            >
              Add expense
            </Button>
          </div>
        }
      />

      <div className="metric-grid metric-grid-5">
        <MetricCard
          label="Expected income"
          value={formatMoney(summary.incomeAll, settings)}
          sub={`${summary.incomeCount} income record${summary.incomeCount === 1 ? '' : 's'}`}
          tone="blue"
          icon={<Wallet size={15} />}
        />
        <MetricCard
          label="Received income"
          value={formatMoney(summary.incomePaid, settings)}
          sub={`${formatPercent(summary.completion, 0)} collected`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Paid expenses"
          value={formatMoney(summary.expensePaid, settings)}
          sub={`${summary.expenseCount} expense record${summary.expenseCount === 1 ? '' : 's'}`}
          tone="red"
          icon={<ArrowUpRight size={15} />}
        />
        <MetricCard
          label="Outstanding expenses"
          value={formatMoney(summary.expenseOutstanding, settings)}
          sub={`${outstandingExpenseCount} unpaid bill${outstandingExpenseCount === 1 ? '' : 's'}`}
          tone="yellow"
          icon={<ReceiptText size={15} />}
        />
        <MetricCard
          label="Net profit"
          value={formatMoney(summary.netProfit, settings)}
          sub={
            <>
              Received − paid <span className="metric-sep">·</span> {formatPercent(summary.margin, 1)}{' '}
              margin
            </>
          }
          tone={summary.netProfit >= 0 ? 'green' : 'red'}
          icon={<CheckCircle2 size={15} />}
        />
      </div>

      <div className="finance-note">
        <Info size={14} />
        <span>
          <strong>Net profit uses cash received only.</strong> Expected income includes pending and
          overdue invoices ({formatMoney(summary.incomePending, settings)}) and is shown separately
          so your cash flow stays accurate.
        </span>
        <Link to="/settings" className="text-link">
          Currency settings <ArrowRight size={12} />
        </Link>
      </div>

      <div className="ledger-grid">
        <Panel
          className="ledger-panel income-panel"
          title={
            <span className="panel-title-with-dot">
              <span className="status-dot green" /> Income
            </span>
          }
          subtitle="Client payments, projects, consulting, and product revenue."
          actions={
            <div className="panel-actions-inline">
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() =>
                  openDrawer(null, { type: 'income', status: 'Pending' })
                }
              >
                Add
              </Button>
              <Link className="text-link" to="/transactions?type=income">
                Ledger <ArrowRight size={13} />
              </Link>
            </div>
          }
        >
          <div className="ledger-summary">
            <div className="ledger-summary-main">
              <span className="ledger-label">Received</span>
              <span className="ledger-value tone-green">
                {formatMoney(summary.incomePaid, settings)}
              </span>
            </div>
            <div className="ledger-summary-side">
              <span>
                Pending <strong>{formatMoney(summary.incomePending, settings, { decimals: 0 })}</strong>
              </span>
              <span>
                Expected{' '}
                <strong>{formatMoney(summary.incomeAll, settings, { decimals: 0 })}</strong>
              </span>
            </div>
          </div>
          <div className="ledger-progress">
            <div className="ledger-progress-head">
              <span>Collection rate</span>
              <span>{formatPercent(summary.completion, 0)}</span>
            </div>
            <ProgressBar value={summary.completion} tone="green" height={5} />
          </div>

          <div className="breakdown-head">
            <span>Category</span>
            <span>Received / expected</span>
          </div>
          {incomeBreakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<Wallet size={18} />}
              title="No income yet"
              description="Add a client payment or project fee to start."
            />
          ) : (
            <div className="breakdown-list">
              {incomeBreakdown.map(({ category, stats }) => {
                const percentage = stats!.totalAll > 0 ? (stats!.totalPaid / stats!.totalAll) * 100 : 0
                return (
                  <button
                    key={category.id}
                    className="breakdown-row"
                    onClick={() =>
                      navigate(`/transactions?type=income&category=${category.id}`)
                    }
                  >
                    <span className="category-dot" style={{ background: category.color }} />
                    <span className="breakdown-main">
                      <span className="breakdown-name">
                        {category.name}
                        <span className="breakdown-count">{stats!.count}</span>
                      </span>
                      <span className="breakdown-bar">
                        <ProgressBar value={percentage} tone="green" height={4} />
                      </span>
                    </span>
                    <span className="breakdown-amounts">
                      <strong>{formatMoney(stats!.totalPaid, settings, { decimals: 0 })}</strong>
                      <span>{formatMoney(stats!.totalAll, settings, { decimals: 0 })}</span>
                    </span>
                    <ChevronRight size={13} className="breakdown-chevron" />
                  </button>
                )
              })}
            </div>
          )}

          <div className="ledger-recent-head">
            <span>Recent income</span>
            <span>{pendingIncomeCount} awaiting payment</span>
          </div>
          <div className="ledger-list">
            {incomeTransactions.slice(0, 5).map((transaction) => {
              const client = transaction.clientId ? clientById.get(transaction.clientId) : null
              return (
                <button
                  key={transaction.id}
                  className="ledger-row"
                  onClick={() => openDrawer(transaction)}
                >
                  <span className="ledger-row-icon income">
                    <ArrowDownLeft size={13} />
                  </span>
                  <span className="ledger-row-main">
                    <span className="ledger-row-name">{transaction.name}</span>
                    <span className="ledger-row-meta">
                      {client?.name ?? 'No client'} ·{' '}
                      {formatDate(transaction.date, settings.locale, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </span>
                  <StatusBadge status={transaction.status} />
                  <span className="ledger-row-amount tone-green">
                    +{formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="ledger-footnote">
            Record refunds under <strong>Refunds &amp; Corrections</strong> so they reduce net
            income consistently.
          </div>
        </Panel>

        <Panel
          className="ledger-panel expense-panel"
          title={
            <span className="panel-title-with-dot">
              <span className="status-dot red" /> Expenses
            </span>
          }
          subtitle="Software, marketing, hosting, contractors, and operations."
          actions={
            <div className="panel-actions-inline">
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => openDrawer(null, { type: 'expense', status: 'Paid' })}
              >
                Add
              </Button>
              <Link className="text-link" to="/transactions?type=expense">
                Ledger <ArrowRight size={13} />
              </Link>
            </div>
          }
        >
          <div className="ledger-summary">
            <div className="ledger-summary-main">
              <span className="ledger-label">Paid out</span>
              <span className="ledger-value tone-red">
                {formatMoney(summary.expensePaid, settings)}
              </span>
            </div>
            <div className="ledger-summary-side">
              <span>
                Outstanding{' '}
                <strong>{formatMoney(summary.expenseOutstanding, settings, { decimals: 0 })}</strong>
              </span>
              <span>
                Expected <strong>{formatMoney(summary.expenseAll, settings, { decimals: 0 })}</strong>
              </span>
            </div>
          </div>
          <div className="ledger-progress">
            <div className="ledger-progress-head">
              <span>Bills settled</span>
              <span>
                {formatPercent(
                  summary.expenseAll > 0 ? (summary.expensePaid / summary.expenseAll) * 100 : 0,
                  0,
                )}
              </span>
            </div>
            <ProgressBar
              value={summary.expenseAll > 0 ? (summary.expensePaid / summary.expenseAll) * 100 : 0}
              tone="red"
              height={5}
            />
          </div>

          <div className="breakdown-head">
            <span>Category</span>
            <span>Paid / expected</span>
          </div>
          {expenseBreakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<ReceiptText size={18} />}
              title="No expenses yet"
              description="Add software, marketing, or operational costs."
            />
          ) : (
            <div className="breakdown-list">
              {expenseBreakdown.map(({ category, stats }) => {
                const percentage = stats!.totalAll > 0 ? (stats!.totalPaid / stats!.totalAll) * 100 : 0
                return (
                  <button
                    key={category.id}
                    className="breakdown-row"
                    onClick={() =>
                      navigate(`/transactions?type=expense&category=${category.id}`)
                    }
                  >
                    <span className="category-dot" style={{ background: category.color }} />
                    <span className="breakdown-main">
                      <span className="breakdown-name">
                        {category.name}
                        <span className="breakdown-count">{stats!.count}</span>
                      </span>
                      <span className="breakdown-bar">
                        <ProgressBar value={percentage} tone="red" height={4} />
                      </span>
                    </span>
                    <span className="breakdown-amounts">
                      <strong>{formatMoney(stats!.totalPaid, settings, { decimals: 0 })}</strong>
                      <span>{formatMoney(stats!.totalAll, settings, { decimals: 0 })}</span>
                    </span>
                    <ChevronRight size={13} className="breakdown-chevron" />
                  </button>
                )
              })}
            </div>
          )}

          <div className="ledger-recent-head">
            <span>Recent expenses</span>
            <span>{outstandingExpenseCount} outstanding</span>
          </div>
          <div className="ledger-list">
            {expenseTransactions.slice(0, 5).map((transaction) => {
              const client = transaction.clientId ? clientById.get(transaction.clientId) : null
              return (
                <button
                  key={transaction.id}
                  className="ledger-row"
                  onClick={() => openDrawer(transaction)}
                >
                  <span className="ledger-row-icon expense">
                    <ArrowUpRight size={13} />
                  </span>
                  <span className="ledger-row-main">
                    <span className="ledger-row-name">{transaction.name}</span>
                    <span className="ledger-row-meta">
                      {client?.name ?? transaction.paymentMethod ?? 'Business expense'} ·{' '}
                      {formatDate(transaction.date, settings.locale, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </span>
                  <StatusBadge status={transaction.status} />
                  <span className="ledger-row-amount tone-red">
                    −{formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="ledger-footnote">
            Outstanding expenses stay out of net profit until they are marked <strong>Paid</strong>.
          </div>
        </Panel>
      </div>

      <div className="cashflow-equation">
        <div className="equation-side">
          <span className="equation-label">This month</span>
          <span className="equation-value">
            {formatMoney(monthStats.current.netProfit, settings)}
          </span>
          <span className={`equation-caption ${profitTone}`}>
            {monthStats.current.netProfit >= 0 ? 'Profit' : 'Loss'} ·{' '}
            {formatMoney(monthStats.current.incomePaid, settings, { decimals: 0 })} in ·{' '}
            {formatMoney(monthStats.current.expensePaid, settings, { decimals: 0 })} out
          </span>
        </div>
        <div className="equation-operator">=</div>
        <div className="equation-breakdown">
          <div>
            <span>Received income</span>
            <strong className="tone-green">
              {formatMoney(summary.incomePaid, settings, { decimals: 0 })}
            </strong>
          </div>
          <div className="equation-minus">
            <span>− Paid expenses</span>
            <strong className="tone-red">
              {formatMoney(summary.expensePaid, settings, { decimals: 0 })}
            </strong>
          </div>
          <div className="equation-result">
            <span>Net cash profit</span>
            <strong className={summary.netProfit >= 0 ? 'tone-green' : 'tone-red'}>
              {formatMoney(summary.netProfit, settings, { decimals: 0 })}
            </strong>
          </div>
        </div>
        <Link to="/analytics" className="text-link equation-link">
          Explore analytics <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
