import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock3,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import type { Client, ClientStatus } from '../types'
import { useData } from '../context/DataContext'
import { useTransactionDrawer } from '../components/TransactionDrawer'
import { ClientModal } from '../components/ClientModal'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  MetricCard,
  PageHeader,
  Panel,
  ProgressBar,
  Segmented,
  StatusBadge,
  TypeBadge,
  useConfirm,
} from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import {
  clientStatusTone,
  computeClientStats,
  emptyClientStats,
  formatMoney,
  formatPercent,
  summarize,
} from '../lib/finance'
import { daysBetween, formatDate, monthKeyFromISO, todayISO } from '../lib/date'

const STATUS_OPTIONS: ClientStatus[] = ['Active', 'Lead', 'Inactive', 'Archived']

export function ClientsPage() {
  const { clients, transactions, categories, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | ClientStatus>('all')
  const [mode, setMode] = useState<'table' | 'cards'>('table')
  const [sort, setSort] = useState<'name' | 'revenue' | 'outstanding'>('name')
  const [modalOpen, setModalOpen] = useState(false)

  const statsMap = useMemo(() => computeClientStats(transactions), [transactions])
  const enriched = useMemo(
    () =>
      clients.map((client) => ({
        client,
        stats: statsMap.get(client.id) ?? emptyClientStats(client.id),
      })),
    [clients, statsMap],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = enriched.filter(({ client }) => {
      if (status !== 'all' && client.status !== status) return false
      if (!term) return true
      return `${client.name} ${client.company ?? ''} ${client.email ?? ''} ${client.phone ?? ''} ${client.notes}`
        .toLowerCase()
        .includes(term)
    })
    return rows.sort((a, b) => {
      if (sort === 'revenue') return b.stats.totalPaid - a.stats.totalPaid
      if (sort === 'outstanding') return b.stats.outstanding - a.stats.outstanding
      return a.client.name.localeCompare(b.client.name)
    })
  }, [enriched, search, status, sort])

  const totals = useMemo(() => {
    let revenue = 0
    let paid = 0
    let outstanding = 0
    let active = 0
    for (const { client, stats } of enriched) {
      revenue += stats.totalRevenue
      paid += stats.totalPaid
      outstanding += stats.outstanding
      if (client.status === 'Active') active += 1
    }
    return { revenue, paid, outstanding, active }
  }, [enriched])

  return (
    <div className="clients-page">
      <PageHeader
        eyebrow={
          <>
            <Users size={12} /> Client database
          </>
        }
        title="Clients Portal"
        subtitle="Every relationship, retainer, and outstanding balance — automatically rolled up from linked transactions."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setModalOpen(true)}
          >
            New client
          </Button>
        }
      />

      <div className="metric-grid metric-grid-4">
        <MetricCard
          label="Active clients"
          value={String(totals.active)}
          sub={`${clients.length} total relationships`}
          tone="blue"
          icon={<Users size={15} />}
        />
        <MetricCard
          label="Client revenue"
          value={formatMoney(totals.paid, settings)}
          sub="Received across all clients"
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Outstanding balance"
          value={formatMoney(totals.outstanding, settings)}
          sub="Unpaid client invoices"
          tone="yellow"
          icon={<Clock3 size={15} />}
        />
        <MetricCard
          label="Client collection"
          value={formatPercent(totals.revenue > 0 ? (totals.paid / totals.revenue) * 100 : 0, 0)}
          sub={`${formatMoney(totals.revenue, settings)} billed in total`}
          tone="purple"
          icon={<Wallet size={15} />}
        />
      </div>

      <div className="db-shell clients-shell">
        <div className="db-toolbar-top">
          <Segmented
            value={mode}
            onChange={setMode}
            ariaLabel="Client view"
            options={[
              { value: 'table', label: 'Table' },
              { value: 'cards', label: 'Cards' },
            ]}
          />
          <div className="client-filter-row">
            <label className="db-search client-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients…"
              />
            </label>
            <select
              className={`db-filter-select ${status !== 'all' ? 'selected' : ''}`}
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | ClientStatus)}
              aria-label="Filter by client status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="db-filter-select"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as 'name' | 'revenue' | 'outstanding')
              }
              aria-label="Sort clients"
            >
              <option value="name">Name · A to Z</option>
              <option value="revenue">Revenue · high to low</option>
              <option value="outstanding">Outstanding · high to low</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title={clients.length === 0 ? 'No clients yet' : 'No clients match'}
            description={
              clients.length === 0
                ? 'Add your first client, then link income records to track revenue and balances.'
                : 'Try a different search term or status filter.'
            }
            action={
              clients.length === 0 ? (
                <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
                  Add client
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : mode === 'table' ? (
          <div className="db-table-scroll">
            <table className="db-table clients-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th className="align-right">Total revenue</th>
                  <th className="align-right">Total paid</th>
                  <th className="align-right">Outstanding</th>
                  <th className="align-center">Transactions</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ client, stats }) => (
                  <tr
                    key={client.id}
                    className="db-row"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/clients/${client.id}`)
                      }
                    }}
                  >
                    <td>
                      <div className="client-cell">
                        <Avatar name={client.name} size={28} />
                        <div className="cell-title-text">
                          <span className="cell-name">{client.name}</span>
                          <span className="cell-sub">{client.email ?? 'No email on file'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-muted">{client.company ?? '—'}</td>
                    <td className="cell-muted">{client.phone ?? '—'}</td>
                    <td className="align-right amount-cell">
                      {formatMoney(stats.totalRevenue, settings)}
                    </td>
                    <td className="align-right amount-cell tone-green">
                      {formatMoney(stats.totalPaid, settings)}
                    </td>
                    <td
                      className={`align-right amount-cell ${
                        stats.outstanding > 0 ? 'tone-yellow' : 'cell-muted'
                      }`}
                    >
                      {formatMoney(stats.outstanding, settings)}
                    </td>
                    <td className="align-center cell-muted">{stats.transactionCount}</td>
                    <td>
                      <Badge tone={clientStatusTone(client.status)} dot>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="notes-column">
                      <span className="truncate" title={client.notes}>
                        {client.notes || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="client-card-grid">
            {filtered.map(({ client, stats }) => {
              const collection =
                stats.totalRevenue > 0 ? (stats.totalPaid / stats.totalRevenue) * 100 : 0
              return (
                <button
                  className="client-card"
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <div className="client-card-head">
                    <Avatar name={client.name} size={38} />
                    <div className="client-card-identity">
                      <span className="client-card-name">{client.name}</span>
                      <span className="client-card-company">
                        {client.company ?? 'Independent'}
                      </span>
                    </div>
                    <Badge tone={clientStatusTone(client.status)} dot>
                      {client.status}
                    </Badge>
                  </div>
                  <div className="client-card-metrics">
                    <div>
                      <span>Revenue</span>
                      <strong>{formatMoney(stats.totalPaid, settings, { decimals: 0 })}</strong>
                    </div>
                    <div>
                      <span>Outstanding</span>
                      <strong className={stats.outstanding > 0 ? 'tone-yellow' : ''}>
                        {formatMoney(stats.outstanding, settings, { decimals: 0 })}
                      </strong>
                    </div>
                    <div>
                      <span>Records</span>
                      <strong>{stats.transactionCount}</strong>
                    </div>
                  </div>
                  <div className="client-card-progress">
                    <ProgressBar value={collection} tone="green" height={4} />
                    <span>{formatPercent(collection, 0)} collected</span>
                  </div>
                  <div className="client-card-contact">
                    <span>
                      <Mail size={11} /> {client.email ?? '—'}
                    </span>
                    <span>
                      <Phone size={11} /> {client.phone ?? '—'}
                    </span>
                  </div>
                  <div className="client-card-foot">
                    <span className="cell-muted truncate">{client.notes || 'No notes yet'}</span>
                    <span className="text-link">
                      View profile <ArrowRight size={12} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="db-footer">
          <div className="db-footer-count">
            <Users size={13} />
            {filtered.length} of {clients.length} clients
          </div>
          <div className="db-footer-totals">
            <span>
              Received <strong className="tone-green">{formatMoney(totals.paid, settings)}</strong>
            </span>
            <span>
              Outstanding{' '}
              <strong className="tone-yellow">{formatMoney(totals.outstanding, settings)}</strong>
            </span>
          </div>
        </div>
      </div>

      <ClientModal open={modalOpen} client={null} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const {
    clients,
    transactions,
    categories,
    settings,
    deleteClient,
  } = useData()
  const { openDrawer } = useTransactionDrawer()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { run, busy } = useAsyncAction()
  const [editOpen, setEditOpen] = useState(false)

  const client = clients.find((item) => item.id === id)

  const statsMap = useMemo(() => computeClientStats(transactions), [transactions])
  const stats = client ? statsMap.get(client.id) ?? emptyClientStats(client.id) : null

  const clientTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.clientId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id],
  )
  const outstanding = useMemo(
    () =>
      clientTransactions
        .filter(
          (transaction) => transaction.type === 'income' && transaction.status !== 'Paid',
        )
        .sort((a, b) => {
          const order: Record<string, number> = { Overdue: 0, Pending: 1, Paid: 2 }
          return order[a.status] - order[b.status] || a.date.localeCompare(b.date)
        }),
    [clientTransactions],
  )
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const collection =
    stats && stats.totalRevenue > 0 ? (stats.totalPaid / stats.totalRevenue) * 100 : 0

  if (!client || !stats) {
    return (
      <div className="client-not-found">
        <EmptyState
          icon={<Users size={20} />}
          title="Client not found"
          description="This client may have been deleted or the link is incorrect."
          action={
            <Button variant="primary" onClick={() => navigate('/clients')}>
              Back to clients
            </Button>
          }
        />
      </div>
    )
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete client?',
      message: `${client.name} will be removed and ${stats.transactionCount} linked transaction${
        stats.transactionCount === 1 ? '' : 's'
      } will become unassigned. Financial totals will recalculate.`,
      confirmLabel: 'Delete client',
      destructive: true,
    })
    if (!confirmed) return
    const succeeded = await run(() => deleteClient(client.id), {
      success: 'Client deleted. Linked transactions were kept and unassigned.',
    })
    if (succeeded) navigate('/clients')
  }

  return (
    <div className="client-detail-page">
      <Link className="back-link" to="/clients">
        <ArrowLeft size={14} /> All clients
      </Link>

      <div className="client-hero">
        <div className="client-hero-main">
          <Avatar name={client.name} size={52} />
          <div>
            <div className="eyebrow">Client profile</div>
            <h1 className="page-title client-hero-name">{client.name}</h1>
            <div className="client-hero-meta">
              <Badge tone={clientStatusTone(client.status)} dot>
                {client.status}
              </Badge>
              {client.company && (
                <span>
                  <Building2 size={12} /> {client.company}
                </span>
              )}
              <span>
                <Clock3 size={12} /> Since{' '}
                {formatDate(client.createdAt.slice(0, 10), settings.locale, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="client-hero-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={13} />}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={13} />}
            className="danger-text"
            onClick={() => void handleDelete()}
            disabled={busy}
          >
            Delete
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() =>
              openDrawer(null, {
                clientId: client.id,
                type: 'income',
                status: 'Pending',
                date: todayISO(),
              })
            }
          >
            New invoice
          </Button>
        </div>
      </div>

      <div className="metric-grid metric-grid-4">
        <MetricCard
          label="Total revenue"
          value={formatMoney(stats.totalRevenue, settings)}
          sub={`${stats.incomeCount} income record${stats.incomeCount === 1 ? '' : 's'}`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Total paid"
          value={formatMoney(stats.totalPaid, settings)}
          sub={`${formatPercent(collection, 0)} collected`}
          tone="blue"
          icon={<Wallet size={15} />}
        />
        <MetricCard
          label="Outstanding balance"
          value={formatMoney(stats.outstanding, settings)}
          sub={
            stats.overdue > 0
              ? `${formatMoney(stats.overdue, settings, { decimals: 0 })} overdue`
              : 'No overdue invoices'
          }
          tone={stats.overdue > 0 ? 'red' : 'yellow'}
          icon={<Clock3 size={15} />}
        />
        <MetricCard
          label="Transactions"
          value={String(stats.transactionCount)}
          sub={
            stats.lastPaymentDate
              ? `Last payment ${formatDate(stats.lastPaymentDate, settings.locale)}`
              : 'No payments received yet'
          }
          tone="purple"
          icon={<Users size={15} />}
        />
      </div>

      <div className="client-detail-grid">
        <div className="client-detail-main">
          <Panel
            title="Transaction history"
            subtitle={`${clientTransactions.length} linked record${
              clientTransactions.length === 1 ? '' : 's'
            }`}
            flush
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() =>
                  openDrawer(null, {
                    clientId: client.id,
                    type: 'income',
                    status: 'Pending',
                    date: todayISO(),
                  })
                }
              >
                Add
              </Button>
            }
          >
            {clientTransactions.length === 0 ? (
              <EmptyState
                icon={<ArrowDownLeft size={18} />}
                title="No transactions linked"
                description="Add an invoice for this client to start tracking revenue."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      openDrawer(null, {
                        clientId: client.id,
                        type: 'income',
                        status: 'Pending',
                        date: todayISO(),
                      })
                    }
                  >
                    Add first invoice
                  </Button>
                }
              />
            ) : (
              <div className="table-scroll">
                <table className="mini-table client-tx-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientTransactions.map((transaction) => {
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
                                <span className="cell-sub">
                                  {category?.name ?? 'Uncategorized'} ·{' '}
                                  {monthKeyFromISO(transaction.date)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <TypeBadge type={transaction.type} compact />
                          </td>
                          <td className="cell-muted">
                            {formatDate(transaction.date, settings.locale)}
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
                            {formatMoney(transaction.amountCents, settings)}
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
            title="Outstanding invoices"
            subtitle={
              outstanding.length > 0
                ? `${formatMoney(stats.outstanding, settings)} awaiting payment`
                : 'All invoices are settled'
            }
          >
            {outstanding.length === 0 ? (
              <EmptyState
                compact
                icon={<Clock3 size={18} />}
                title="Nothing outstanding"
                description="Every invoice for this client has been paid."
              />
            ) : (
              <div className="outstanding-list">
                {outstanding.map((transaction) => {
                  const late =
                    transaction.status === 'Overdue'
                      ? daysBetween(transaction.date, todayISO())
                      : null
                  return (
                    <button
                      key={transaction.id}
                      className="outstanding-row"
                      onClick={() => openDrawer(transaction)}
                    >
                      <span className={`attention-icon status-${transaction.status.toLowerCase()}`}>
                        <Clock3 size={14} />
                      </span>
                      <span className="outstanding-main">
                        <span className="outstanding-name">{transaction.name}</span>
                        <span className="outstanding-meta">
                          {formatDate(transaction.date, settings.locale)}
                          {late !== null && late > 0 ? ` · ${late} days overdue` : ''}
                        </span>
                      </span>
                      <StatusBadge status={transaction.status} />
                      <span className="outstanding-amount">
                        {formatMoney(transaction.amountCents, settings)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="client-detail-side">
          <Panel title="Client details">
            <div className="client-info-list">
              <div className="client-info-row">
                <span className="client-info-icon">
                  <Mail size={14} />
                </span>
                <div>
                  <span className="client-info-label">Email</span>
                  {client.email ? (
                    <a className="client-info-value link" href={`mailto:${client.email}`}>
                      {client.email}
                    </a>
                  ) : (
                    <span className="client-info-value">—</span>
                  )}
                </div>
              </div>
              <div className="client-info-row">
                <span className="client-info-icon">
                  <Phone size={14} />
                </span>
                <div>
                  <span className="client-info-label">Phone</span>
                  <span className="client-info-value">{client.phone ?? '—'}</span>
                </div>
              </div>
              <div className="client-info-row">
                <span className="client-info-icon">
                  <Building2 size={14} />
                </span>
                <div>
                  <span className="client-info-label">Company</span>
                  <span className="client-info-value">{client.company ?? '—'}</span>
                </div>
              </div>
              <div className="client-info-row">
                <span className="client-info-icon">
                  <UserRound size={14} />
                </span>
                <div>
                  <span className="client-info-label">Status</span>
                  <span className="client-info-value">
                    <Badge tone={clientStatusTone(client.status)} dot>
                      {client.status}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
            <div className="client-notes">
              <span className="client-info-label">Notes</span>
              <p>{client.notes || 'No notes yet. Use edit to add context about this relationship.'}</p>
            </div>
          </Panel>

          <Panel title="Collection health">
            <div className="collection-score">
              <span className="collection-score-value">{formatPercent(collection, 0)}</span>
              <span className="collection-score-label">of revenue collected</span>
            </div>
            <ProgressBar
              value={collection}
              tone={collection >= 80 ? 'green' : collection >= 50 ? 'yellow' : 'red'}
              height={7}
            />
            <div className="collection-breakdown">
              <div>
                <span>Received</span>
                <strong className="tone-green">
                  {formatMoney(stats.totalPaid, settings, { decimals: 0 })}
                </strong>
              </div>
              <div>
                <span>Outstanding</span>
                <strong className="tone-yellow">
                  {formatMoney(stats.outstanding, settings, { decimals: 0 })}
                </strong>
              </div>
              <div>
                <span>Overdue</span>
                <strong className="tone-red">
                  {formatMoney(stats.overdue, settings, { decimals: 0 })}
                </strong>
              </div>
            </div>
          </Panel>

          <Panel title="Quick actions">
            <div className="quick-action-list">
              <button
                className="quick-action"
                onClick={() =>
                  openDrawer(null, {
                    clientId: client.id,
                    type: 'income',
                    status: 'Pending',
                    date: todayISO(),
                  })
                }
              >
                <span className="quick-action-icon income">
                  <ArrowDownLeft size={14} />
                </span>
                <span>
                  <strong>New invoice</strong>
                  <small>Create unpaid client income</small>
                </span>
                <ArrowRight size={13} />
              </button>
              <button className="quick-action" onClick={() => setEditOpen(true)}>
                <span className="quick-action-icon">
                  <Pencil size={14} />
                </span>
                <span>
                  <strong>Edit client</strong>
                  <small>Update contact and status</small>
                </span>
                <ArrowRight size={13} />
              </button>
            </div>
          </Panel>
        </div>
      </div>

      <ClientModal open={editOpen} client={client} onClose={() => setEditOpen(false)} />
    </div>
  )
}
