import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react'
import type { Category, TransactionType } from '../types'
import { useData } from '../context/DataContext'
import { CategoryModal } from '../components/CategoryModal'
import {
  Button,
  EmptyState,
  IconButton,
  MetricCard,
  PageHeader,
  Panel,
  useConfirm,
} from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import {
  computeCategoryStats,
  formatMoney,
  formatNumber,
} from '../lib/finance'

export function CategoriesPage() {
  const { categories, transactions, settings, deleteCategory } = useData()
  const confirm = useConfirm()
  const { run, busy } = useAsyncAction()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [defaultType, setDefaultType] = useState<TransactionType>('income')

  const statsMap = useMemo(() => computeCategoryStats(transactions), [transactions])

  const incomeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === 'income')
        .map((category) => ({ category, stats: statsMap.get(category.id) }))
        .sort(
          (a, b) =>
            (b.stats?.totalAll ?? 0) - (a.stats?.totalAll ?? 0) ||
            a.category.name.localeCompare(b.category.name),
        ),
    [categories, statsMap],
  )
  const expenseCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === 'expense')
        .map((category) => ({ category, stats: statsMap.get(category.id) }))
        .sort(
          (a, b) =>
            (b.stats?.totalAll ?? 0) - (a.stats?.totalAll ?? 0) ||
            a.category.name.localeCompare(b.category.name),
        ),
    [categories, statsMap],
  )

  const incomeTotal = incomeCategories.reduce(
    (sum, item) => sum + (item.stats?.totalAll ?? 0),
    0,
  )
  const expenseTotal = expenseCategories.reduce(
    (sum, item) => sum + (item.stats?.totalAll ?? 0),
    0,
  )
  const uncategorized = useMemo(
    () => transactions.filter((transaction) => !transaction.categoryId),
    [transactions],
  )
  const uncategorizedAmount = uncategorized.reduce(
    (sum, transaction) => sum + transaction.amountCents,
    0,
  )
  const mostUsed = useMemo(() => {
    const rows = [...incomeCategories, ...expenseCategories].filter((item) => item.stats)
    return rows.sort((a, b) => (b.stats?.count ?? 0) - (a.stats?.count ?? 0))[0]
  }, [incomeCategories, expenseCategories])

  const openNew = (type: TransactionType) => {
    setEditing(null)
    setDefaultType(type)
    setModalOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setDefaultType(category.type)
    setModalOpen(true)
  }

  const handleDelete = async (category: Category) => {
    const usage = statsMap.get(category.id)?.count ?? 0
    if (usage > 0) return
    const confirmed = await confirm({
      title: 'Delete category?',
      message: `${category.name} is not used by any transaction. Deleting it will remove it from future category menus.`,
      confirmLabel: 'Delete category',
      destructive: true,
    })
    if (!confirmed) return
    await run(() => deleteCategory(category.id), { success: 'Category deleted.' })
  }

  const renderCategory = (
    category: Category,
    stats: { count: number; totalAll: number; totalPaid: number; outstanding: number } | undefined,
    type: TransactionType,
  ) => {
    const count = stats?.count ?? 0
    const used = count > 0
    return (
      <div className="category-row" key={category.id}>
        <span className="category-color" style={{ background: category.color }} />
        <div className="category-row-main">
          <div className="category-row-name">{category.name}</div>
          <div className="category-row-meta">
            {used ? (
              <>
                {count} transaction{count === 1 ? '' : 's'} ·{' '}
                {formatMoney(stats?.totalPaid ?? 0, settings, { decimals: 0 })}{' '}
                {type === 'income' ? 'received' : 'paid'}
                {(stats?.outstanding ?? 0) > 0 && (
                  <>
                    {' '}
                    ·{' '}
                    <span className="tone-yellow">
                      {formatMoney(stats?.outstanding ?? 0, settings, { decimals: 0 })} open
                    </span>
                  </>
                )}
              </>
            ) : (
              'Not used yet'
            )}
          </div>
        </div>
        <div className="category-row-amount">
          <strong>{formatMoney(stats?.totalAll ?? 0, settings, { decimals: 0 })}</strong>
          <span>{type === 'income' ? 'expected' : 'total'}</span>
        </div>
        <div className="category-row-actions">
          <IconButton label={`Edit ${category.name}`} size="sm" onClick={() => openEdit(category)}>
            <Pencil size={13} />
          </IconButton>
          <IconButton
            label={
              used
                ? `Cannot delete — used by ${count} transactions`
                : `Delete ${category.name}`
            }
            size="sm"
            disabled={used || busy}
            onClick={() => void handleDelete(category)}
            className={used ? 'disabled-icon' : 'danger-hover'}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>
    )
  }

  return (
    <div className="categories-page">
      <PageHeader
        eyebrow={
          <>
            <Tags size={12} /> Taxonomy
          </>
        }
        title="Categories"
        subtitle="Organize income and expenses with custom categories. Every linked transaction updates the totals instantly."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => openNew('income')}>
            New category
          </Button>
        }
      />

      <div className="metric-grid metric-grid-4">
        <MetricCard
          label="Income categories"
          value={String(incomeCategories.length)}
          sub={`${formatMoney(incomeTotal, settings)} tracked income`}
          tone="green"
          icon={<ArrowDownLeft size={15} />}
        />
        <MetricCard
          label="Expense categories"
          value={String(expenseCategories.length)}
          sub={`${formatMoney(expenseTotal, settings)} tracked expenses`}
          tone="red"
          icon={<ArrowUpRight size={15} />}
        />
        <MetricCard
          label="Most active category"
          value={mostUsed?.category.name ?? '—'}
          sub={
            mostUsed?.stats
              ? `${mostUsed.stats.count} records · ${formatMoney(
                  mostUsed.stats.totalAll,
                  settings,
                  { decimals: 0 },
                )}`
              : 'No categorized records yet'
          }
          tone="blue"
          icon={<Tags size={15} />}
        />
        <MetricCard
          label="Uncategorized"
          value={formatNumber(uncategorized.length, settings.locale)}
          sub={
            uncategorized.length > 0
              ? `${formatMoney(uncategorizedAmount, settings)} needs a category`
              : 'Everything is categorized'
          }
          tone={uncategorized.length > 0 ? 'yellow' : 'green'}
          icon={<Tags size={15} />}
        />
      </div>

      <div className="category-columns">
        <Panel
          className="category-panel"
          title={
            <span className="panel-title-with-dot">
              <span className="status-dot green" /> Income categories
            </span>
          }
          subtitle={`${incomeCategories.length} categories · ${formatMoney(
            incomeTotal,
            settings,
            { decimals: 0 },
          )} expected`}
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => openNew('income')}
            >
              Add
            </Button>
          }
        >
          {incomeCategories.length === 0 ? (
            <EmptyState
              compact
              icon={<Tags size={18} />}
              title="No income categories"
              description="Create categories like retainers or project fees."
              action={
                <Button variant="primary" size="sm" onClick={() => openNew('income')}>
                  Add category
                </Button>
              }
            />
          ) : (
            <div className="category-list">
              {incomeCategories.map(({ category, stats }) =>
                renderCategory(category, stats, 'income'),
              )}
            </div>
          )}
        </Panel>

        <Panel
          className="category-panel"
          title={
            <span className="panel-title-with-dot">
              <span className="status-dot red" /> Expense categories
            </span>
          }
          subtitle={`${expenseCategories.length} categories · ${formatMoney(
            expenseTotal,
            settings,
            { decimals: 0 },
          )} expected`}
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => openNew('expense')}
            >
              Add
            </Button>
          }
        >
          {expenseCategories.length === 0 ? (
            <EmptyState
              compact
              icon={<Tags size={18} />}
              title="No expense categories"
              description="Create categories for software, marketing, or hosting."
              action={
                <Button variant="primary" size="sm" onClick={() => openNew('expense')}>
                  Add category
                </Button>
              }
            />
          ) : (
            <div className="category-list">
              {expenseCategories.map(({ category, stats }) =>
                renderCategory(category, stats, 'expense'),
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="category-note">
        <div>
          <strong>Categories with linked transactions are protected.</strong> Reassign those records
          in the transaction panel before deleting a category — this keeps historical reporting
          intact.
        </div>
        {uncategorized.length > 0 && (
          <button
            className="text-link"
            onClick={() => navigate('/transactions?category=uncategorized')}
          >
            Review {uncategorized.length} uncategorized record
            {uncategorized.length === 1 ? '' : 's'} <ArrowRight size={13} />
          </button>
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        category={editing}
        defaultType={defaultType}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
