import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Download,
  Percent,
  ReceiptText,
  TrendingUp,
} from 'lucide-react'
import type { DateRangeKey } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button,
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  TrendIndicator,
} from '../components/ui'
import {
  CategoryDonut,
  ChartLegend,
  ClientRevenueChart,
  GrowthChart,
  IncomeExpenseChart,
  NetProfitChart,
  StatusDonut,
} from '../components/charts'
import {
  breakdownByCategory,
  computeGrowth,
  downloadText,
  formatMoney,
  formatPercent,
  rangeSeries,
  revenueByClient,
  statusStats,
  summarize,
  transactionsToCsv,
} from '../lib/finance'
import {
  RANGE_OPTIONS,
  formatDate,
  getDateRange,
  inDateRange,
  rangeBucketMode,
} from '../lib/date'

const STATUS_COLORS: Record<string, string> = {
  Paid: '#4fb286',
  Pending: '#e0b04a',
  Overdue: '#e06c6c',
}

function limitSlices(
  data: { name: string; value: number; color: string }[],
  max = 7,
): { name: string; value: number; color: string }[] {
  if (data.length <= max) return data
  const top = data.slice(0, max - 1)
  const rest = data.slice(max - 1).reduce((sum, item) => sum + item.value, 0)
  if (rest <= 0) return top
  return [...top, { name: 'Other', value: rest, color: '#6f6f6b' }]
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="chart-empty">
      <BarChart3 size={18} />
      <span>{message}</span>
    </div>
  )
}

export function AnalyticsPage() {
  const { transactions, clients, categories, settings } = useData()
  const { toast } = useToast()
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('6m')

  const range = useMemo(() => getDateRange(rangeKey), [rangeKey])
  const filtered = useMemo(
    () => transactions.filter((transaction) => inDateRange(transaction.date, range)),
    [transactions, range],
  )
  const summary = useMemo(() => summarize(filtered), [filtered])
  const buckets = useMemo(
    () => rangeSeries(transactions, rangeKey),
    [transactions, rangeKey],
  )
  const bucketMode = rangeBucketMode(rangeKey)

  const growthData = useMemo(
    () =>
      buckets
        .map((bucket, index) => {
          if (index === 0) return null
          const previous = buckets[index - 1]
          const growth = computeGrowth(bucket.net, previous.net)
          if (growth === null) return null
          return { label: bucket.label, growth: Number(growth.toFixed(1)) }
        })
        .filter((item): item is { label: string; growth: number } => item !== null),
    [buckets],
  )
  const latestGrowth = growthData.length > 0 ? growthData[growthData.length - 1].growth : null

  const clientRevenue = useMemo(
    () =>
      revenueByClient(filtered, clients)
        .slice(0, 7)
        .map((item) => ({
          name: item.client.company || item.client.name,
          revenue: item.revenue / 100,
          outstanding: item.outstanding / 100,
        })),
    [filtered, clients],
  )

  const expenseCategories = useMemo(
    () =>
      limitSlices(
        breakdownByCategory(filtered, categories, 'expense', true).map((item) => ({
          name: item.category.name,
          value: item.amount / 100,
          color: item.category.color,
        })),
      ),
    [filtered, categories],
  )
  const incomeCategories = useMemo(
    () =>
      limitSlices(
        breakdownByCategory(filtered, categories, 'income', true).map((item) => ({
          name: item.category.name,
          value: item.amount / 100,
          color: item.category.color,
        })),
      ),
    [filtered, categories],
  )

  const paymentStatus = useMemo(
    () =>
      statusStats(filtered.filter((transaction) => transaction.type === 'income')).map((item) => ({
        name: item.status,
        value: item.amount / 100,
        color: STATUS_COLORS[item.status],
        count: item.count,
      })),
    [filtered],
  )

  const rangeLabel = RANGE_OPTIONS.find((option) => option.key === rangeKey)?.label ?? 'All time'
  const rangeStartLabel = range.startISO
    ? formatDate(range.startISO, settings.locale)
    : transactions.length > 0
      ? formatDate(
          [...transactions].sort((a, b) => a.date.localeCompare(b.date))[0].date,
          settings.locale,
        )
      : '—'
  const rangeEndLabel = formatDate(range.endISO, settings.locale)

  const exportReport = () => {
    const csv = transactionsToCsv(filtered, clients, categories, settings)
    downloadText(`finance-report-${rangeKey}.csv`, csv, 'text/csv')
    toast(`${filtered.length} records exported for ${rangeLabel.toLowerCase()}.`, 'success')
  }

  const growthTitle = bucketMode === 'month' ? 'Monthly net growth' : 'Net profit growth'
  const growthSubtitle =
    bucketMode === 'month'
      ? 'Month-over-month change in net profit across the selected range.'
      : 'Period-over-period change in net profit across the selected range.'

  return (
    <div className="analytics-page">
      <PageHeader
        eyebrow={
          <>
            <BarChart3 size={12} /> Insight workspace
          </>
        }
        title="Analytics"
        subtitle="Live profitability, revenue concentration, and expense mix. Every chart recalculates from the same transaction ledger."
        actions={
          <Button variant="secondary" icon={<Download size={14} />} onClick={exportReport}>
            Export report
          </Button>
        }
      />

      <div className="range-bar">
        <div className="range-options" role="tablist" aria-label="Analytics date range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              role="tab"
              aria-selected={rangeKey === option.key}
              className={`range-chip ${rangeKey === option.key ? 'active' : ''}`}
              onClick={() => setRangeKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="range-dates">
          <CalendarRange size={13} />
          {rangeStartLabel} – {rangeEndLabel}
        </span>
      </div>

      <div className="metric-grid metric-grid-5">
        <MetricCard
          label="Received income"
          value={formatMoney(summary.incomePaid, settings)}
          sub={`${formatMoney(summary.incomeAll, settings)} expected`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Paid expenses"
          value={formatMoney(summary.expensePaid, settings)}
          sub={`${formatMoney(summary.expenseOutstanding, settings)} outstanding`}
          tone="red"
          icon={<ArrowUpRight size={15} />}
        />
        <MetricCard
          label="Net profit"
          value={formatMoney(summary.netProfit, settings)}
          sub="Cash basis, pending excluded"
          tone={summary.netProfit >= 0 ? 'green' : 'red'}
          icon={<TrendingUp size={15} />}
        />
        <MetricCard
          label="Profit margin"
          value={formatPercent(summary.margin, 1)}
          sub={`${formatMoney(summary.incomePaid, settings)} received`}
          tone="blue"
          icon={<Percent size={15} />}
        />
        <MetricCard
          label="Transactions"
          value={String(summary.count)}
          sub={`${summary.paidCount} paid · ${summary.pendingCount + summary.overdueCount} open`}
          tone="purple"
          icon={<ReceiptText size={15} />}
        />
      </div>

      <div className="analytics-grid">
        <Panel
          className="span-2 chart-panel"
          title="Income vs expenses"
          subtitle="Cash received against cash paid, bucketed across the selected range."
          actions={
            <ChartLegend
              items={[
                { label: 'Received income', color: 'var(--green)', shape: 'bar' },
                { label: 'Paid expenses', color: 'var(--red)', shape: 'bar' },
              ]}
            />
          }
        >
          {buckets.length === 0 || summary.count === 0 ? (
            <ChartEmpty message="No transactions in this range." />
          ) : (
            <IncomeExpenseChart data={buckets} settings={settings} height={300} />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title={bucketMode === 'month' ? 'Monthly net profit' : 'Net profit by period'}
          subtitle="Profit after cash expenses. Negative periods are shown in red."
          actions={
            <ChartLegend
              items={[
                { label: 'Profit', color: 'var(--green)', shape: 'bar' },
                { label: 'Loss', color: 'var(--red)', shape: 'bar' },
              ]}
            />
          }
        >
          {buckets.length === 0 || summary.count === 0 ? (
            <ChartEmpty message="No net profit data in this range." />
          ) : (
            <NetProfitChart data={buckets} settings={settings} height={270} />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title={growthTitle}
          subtitle={growthSubtitle}
          actions={
            <TrendIndicator
              value={latestGrowth}
              label={bucketMode === 'month' ? 'latest month' : 'latest period'}
            />
          }
        >
          {growthData.length === 0 ? (
            <ChartEmpty message="Growth needs at least two periods with data." />
          ) : (
            <GrowthChart data={growthData} settings={settings} height={270} />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title="Revenue by client"
          subtitle="Received revenue with outstanding balances stacked on top."
          actions={
            <ChartLegend
              items={[
                { label: 'Received', color: 'var(--green)', shape: 'bar' },
                { label: 'Outstanding', color: 'var(--yellow)', shape: 'bar' },
              ]}
            />
          }
        >
          {clientRevenue.length === 0 ? (
            <ChartEmpty message="No client revenue in this range." />
          ) : (
            <ClientRevenueChart data={clientRevenue} settings={settings} height={310} />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title="Payment status"
          subtitle="Income invoices by payment status and value."
        >
          {paymentStatus.every((item) => item.value === 0) ? (
            <ChartEmpty message="No income invoices in this range." />
          ) : (
            <StatusDonut data={paymentStatus} settings={settings} centerLabel="Invoiced" />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title="Expenses by category"
          subtitle="Paid business expenses in the selected range."
        >
          {expenseCategories.length === 0 ? (
            <ChartEmpty message="No paid expenses in this range." />
          ) : (
            <CategoryDonut data={expenseCategories} settings={settings} />
          )}
        </Panel>

        <Panel
          className="chart-panel"
          title="Income by category"
          subtitle="Received income by its income category."
        >
          {incomeCategories.length === 0 ? (
            <ChartEmpty message="No received income in this range." />
          ) : (
            <CategoryDonut data={incomeCategories} settings={settings} />
          )}
        </Panel>
      </div>

      <div className="analytics-footnote">
        <span className="status-dot green" />
        <span>
          <strong>{rangeLabel}.</strong> {summary.count} records ·{' '}
          {formatMoney(summary.incomePaid, settings)} received ·{' '}
          {formatMoney(summary.expensePaid, settings)} paid ·{' '}
          {summary.incomePending > 0
            ? `${formatMoney(summary.incomePending, settings)} pending income excluded from net profit`
            : 'no pending income in this range'}
          .
        </span>
        {summary.margin < 0 && (
          <span className="analytics-warning">
            <ArrowDownRight size={12} /> Negative margin
          </span>
        )}
      </div>
    </div>
  )
}
