import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthSeriesPoint, ChartBucket } from '../lib/finance'
import { formatCompact, formatMoney } from '../lib/finance'
import type { Settings } from '../types'

const GRID = '#2b2b29'
const TICK = '#8b8a85'
const INCOME = '#4fb286'
const EXPENSE = '#e06c6c'
const BLUE = '#5b9df9'
const YELLOW = '#e0b04a'
const RED = '#e06c6c'

export function ChartLegend({
  items,
  className = '',
}: {
  items: { label: string; color: string; shape?: 'bar' | 'line' | 'dot' }[]
  className?: string
}) {
  return (
    <div className={`chart-legend ${className}`}>
      {items.map((item) => (
        <span className="chart-legend-item" key={item.label}>
          <span
            className={`legend-mark legend-${item.shape ?? 'dot'}`}
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function MoneyTooltip({ active, payload, label, settings }: any) {
  if (!active || !payload || payload.length === 0) return null
  const title = payload[0]?.payload?.fullLabel || payload[0]?.name || label
  const rows = payload.filter((entry: any) => typeof entry.value === 'number')
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title}</div>
      {rows.map((entry: any, index: number) => (
        <div className="chart-tooltip-row" key={`${entry.dataKey}-${index}`}>
          <span className="tooltip-dot" style={{ background: entry.color || entry.fill }} />
          <span className="tooltip-label">{entry.name}</span>
          <span className="tooltip-value">
            {formatMoney(Number(entry.value) * 100, settings)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PercentTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const value = Number(payload[0]?.value ?? 0)
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-row">
        <span
          className="tooltip-dot"
          style={{ background: value >= 0 ? INCOME : EXPENSE }}
        />
        <span className="tooltip-label">Net profit growth</span>
        <span
          className="tooltip-value"
          style={{ color: value >= 0 ? INCOME : EXPENSE }}
        >
          {value >= 0 ? '+' : ''}
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

export function CashFlowChart({
  data,
  settings,
  height = 262,
}: {
  data: MonthSeriesPoint[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
            width={58}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.035)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <Bar dataKey="income" name="Received" fill={INCOME} radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="expenses" name="Expenses" fill={EXPENSE} radius={[3, 3, 0, 0]} barSize={14} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net profit"
            stroke={BLUE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: BLUE, stroke: '#191918', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function IncomeExpenseChart({
  data,
  settings,
  height = 280,
}: {
  data: ChartBucket[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
            width={58}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.035)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <Bar dataKey="income" name="Received income" fill={INCOME} radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="expenses" name="Paid expenses" fill={EXPENSE} radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function NetProfitChart({
  data,
  settings,
  height = 280,
}: {
  data: ChartBucket[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
            width={58}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.035)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <ReferenceLine y={0} stroke="#3a3a38" />
          <Bar dataKey="net" name="Net profit" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((bucket) => (
              <Cell key={bucket.key} fill={bucket.net >= 0 ? INCOME : EXPENSE} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClientRevenueChart({
  data,
  settings,
  height = 300,
}: {
  data: { name: string; revenue: number; outstanding: number }[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke={GRID} horizontal={false} strokeDasharray="2 6" />
          <XAxis
            type="number"
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#b9b7b2', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={118}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <Bar
            dataKey="revenue"
            name="Received"
            stackId="revenue"
            fill={INCOME}
            radius={[0, 0, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="outstanding"
            name="Outstanding"
            stackId="revenue"
            fill={YELLOW}
            radius={[0, 3, 3, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryDonut({
  data,
  settings,
  height = 210,
}: {
  data: { name: string; value: number; color: string }[]
  settings: Settings
  height?: number
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#1e1e1d"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip settings={settings} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className="donut-center-label">Total</span>
          <span className="donut-center-value">{formatCompact(total * 100, settings)}</span>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((item) => (
          <div className="donut-legend-row" key={item.name}>
            <span className="donut-dot" style={{ background: item.color }} />
            <span className="donut-legend-name">{item.name}</span>
            <span className="donut-legend-value">
              {formatMoney(item.value * 100, settings, { decimals: 0 })}
            </span>
            <span className="donut-legend-percent">
              {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatusDonut({
  data,
  settings,
  height = 210,
  centerLabel = 'Invoiced',
}: {
  data: { name: string; value: number; color: string; count: number }[]
  settings: Settings
  height?: number
  centerLabel?: string
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#1e1e1d"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip settings={settings} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className="donut-center-label">{centerLabel}</span>
          <span className="donut-center-value">{formatCompact(total * 100, settings)}</span>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((item) => (
          <div className="donut-legend-row" key={item.name}>
            <span className="donut-dot" style={{ background: item.color }} />
            <span className="donut-legend-name">{item.name}</span>
            <span className="donut-legend-value">{item.count} records</span>
            <span className="donut-legend-percent">
              {formatMoney(item.value * 100, settings, { decimals: 0 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GrowthChart({
  data,
  settings,
  height = 260,
}: {
  data: { label: string; growth: number }[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
            width={54}
          />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.035)' }} content={<PercentTooltip />} />
          <ReferenceLine y={0} stroke="#3a3a38" />
          <Bar dataKey="growth" name="Growth" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {data.map((bucket, index) => (
              <Cell key={`${bucket.label}-${index}`} fill={bucket.growth >= 0 ? INCOME : EXPENSE} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyNetChart({
  data,
  settings,
  height = 220,
}: {
  data: { label: string; net: number; count: number }[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval={0}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
            width={54}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.035)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <ReferenceLine y={0} stroke="#3a3a38" />
          <Bar dataKey="net" name="Net profit" radius={[3, 3, 0, 0]} maxBarSize={26}>
            {data.map((point) => (
              <Cell key={point.label} fill={point.net >= 0 ? INCOME : EXPENSE} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthlyEarningsChart({
  data,
  settings,
  height = 250,
}: {
  data: { label: string; received: number; pending: number }[]
  settings: Settings
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval={0}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompact(Number(value) * 100, settings)}
            width={54}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.035)' }}
            content={<MoneyTooltip settings={settings} />}
          />
          <Bar
            dataKey="received"
            name="Received"
            stackId="earnings"
            fill={INCOME}
            radius={[0, 0, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="pending"
            name="Still pending"
            stackId="earnings"
            fill={YELLOW}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MiniSparkline({ values, color = BLUE }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 26 - ((value - min) / range) * 22
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" opacity="0.85" />
    </svg>
  )
}
