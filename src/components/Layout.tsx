import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  CalendarRange,
  ChevronRight,
  CircleHelp,
  Command,
  Download,
  LayoutDashboard,
  Menu,
  PanelLeft,
  Plus,
  Search,
  Settings as SettingsIcon,
  Table2,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useTransactionDrawer } from '../components/TransactionDrawer'
import {
  Avatar,
  ErrorState,
  IconButton,
  KeyHint,
  LoadingScreen,
  MenuDivider,
  MenuItem,
  Popover,
} from '../components/ui'
import {
  downloadText,
  formatMoney,
  transactionsToCsv,
} from '../lib/finance'
import { formatDate, todayISO } from '../lib/date'
import type { Transaction } from '../types'

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/income-expenses', label: 'Income & Expenses', icon: ArrowLeftRight },
      { to: '/transactions', label: 'Transactions', icon: Table2, count: 'transactions' as const },
      { to: '/monthly', label: 'Monthly Overview', icon: CalendarRange },
      { to: '/earnings', label: 'Monthly Earnings', icon: TrendingUp },
    ],
  },
  {
    label: 'Relationships',
    items: [
      { to: '/clients', label: 'Clients Portal', icon: Users, count: 'clients' as const },
      { to: '/categories', label: 'Categories', icon: Tags },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/analytics', label: 'Analytics', icon: BarChart3 }],
  },
]

const PAGE_LABELS: { pattern: string; label: string }[] = [
  { pattern: '/income-expenses', label: 'Income & Expenses' },
  { pattern: '/transactions', label: 'Transactions' },
  { pattern: '/monthly', label: 'Monthly Overview' },
  { pattern: '/earnings', label: 'Monthly Earnings' },
  { pattern: '/clients/', label: 'Client profile' },
  { pattern: '/clients', label: 'Clients Portal' },
  { pattern: '/analytics', label: 'Analytics' },
  { pattern: '/categories', label: 'Categories' },
  { pattern: '/settings', label: 'Settings' },
  { pattern: '/', label: 'Dashboard' },
]

export function Layout() {
  const { transactions, clients, categories, settings, loading, error, refresh } = useData()
  const { openDrawer } = useTransactionDrawer()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ft-sidebar') === 'closed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pageLabel =
    PAGE_LABELS.find((item) =>
      item.pattern.endsWith('/') ? location.pathname.startsWith(item.pattern) : location.pathname === item.pattern,
    )?.label ?? 'Dashboard'

  useEffect(() => {
    setMobileOpen(false)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
        return
      }
      if (isTyping) return
      if (event.key === '/') {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (document.querySelector('.drawer, .modal')) return
        event.preventDefault()
        openDrawer(null, { date: todayISO() })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openDrawer])

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 960px)').matches) {
      setMobileOpen((value) => !value)
      return
    }
    setCollapsed((value) => {
      localStorage.setItem('ft-sidebar', value ? 'open' : 'closed')
      return !value
    })
  }

  const exportCsv = () => {
    const csv = transactionsToCsv(transactions, clients, categories, settings)
    downloadText(`business-income-tracker-${todayISO()}.csv`, csv, 'text/csv')
    toast('All transactions exported to CSV.', 'success')
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Wallet size={16} />
          </div>
          <div className="brand-text">
            <span className="brand-name">{settings.businessName}</span>
            <span className="brand-sub">Personal workspace</span>
          </div>
          <IconButton
            label="Collapse sidebar"
            size="sm"
            className="sidebar-collapse"
            onClick={toggleSidebar}
          >
            <PanelLeft size={15} />
          </IconButton>
          <IconButton
            label="Close navigation"
            size="sm"
            className="sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </IconButton>
        </div>

        <button className="sidebar-new" onClick={() => openDrawer(null, { date: todayISO() })}>
          <Plus size={15} />
          <span>New transaction</span>
        </button>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const count =
                  'count' in item
                    ? item.count === 'transactions'
                      ? transactions.length
                      : clients.length
                    : null
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={'end' in item ? Boolean(item.end) : false}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={15} />
                    <span className="nav-item-label">{item.label}</span>
                    {count !== null && <span className="nav-count">{count}</span>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-card">
            <div className="storage-top">
              <span className="status-dot" />
              <span>On this device</span>
            </div>
            <p>Saved in this browser. No cloud sync.</p>
          </div>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={15} />
            <span className="nav-item-label">Settings</span>
          </NavLink>
          <Popover
            className="sidebar-profile-popover"
            align="start"
            trigger={
              <button className="sidebar-profile" type="button">
                <Avatar name={settings.profileName} size={26} />
                <span className="sidebar-profile-text">
                  <span className="sidebar-profile-name">{settings.profileName}</span>
                  <span className="sidebar-profile-sub">Personal account</span>
                </span>
                <ChevronRight size={14} className="sidebar-profile-chevron" />
              </button>
            }
          >
            {(close) => (
              <>
                <div className="profile-menu-head">
                  <Avatar name={settings.profileName} size={34} />
                  <div>
                    <div className="profile-menu-name">{settings.profileName}</div>
                    <div className="profile-menu-sub">{settings.businessName}</div>
                  </div>
                </div>
                <MenuDivider />
                <MenuItem
                  icon={<SettingsIcon size={14} />}
                  onClick={() => {
                    navigate('/settings')
                    close()
                  }}
                >
                  Settings
                </MenuItem>
                <MenuItem
                  icon={<Download size={14} />}
                  onClick={() => {
                    exportCsv()
                    close()
                  }}
                >
                  Export all to CSV
                </MenuItem>
              </>
            )}
          </Popover>
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              label="Toggle navigation"
              className="mobile-menu-button"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </IconButton>
            {collapsed && (
              <IconButton
                label="Expand sidebar"
                className="desktop-expand-button"
                onClick={toggleSidebar}
              >
                <Menu size={18} />
              </IconButton>
            )}
            <div className="breadcrumb">
              <span className="breadcrumb-root">Business Income Tracker</span>
              <ChevronRight size={13} className="breadcrumb-sep" />
              <span className="breadcrumb-current">{pageLabel}</span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{formatDate(todayISO(), settings.locale, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}</span>
            <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
              <Search size={14} />
              <span>Search</span>
              <span className="search-shortcut">
                <Command size={10} /> K
              </span>
            </button>
            <button
              className="topbar-add"
              onClick={() => openDrawer(null, { date: todayISO() })}
              title="New transaction (N)"
            >
              <Plus size={16} />
            </button>
            <Popover
              trigger={
                <button className="topbar-avatar" type="button" aria-label="Open profile menu">
                  <Avatar name={settings.profileName} size={28} />
                </button>
              }
            >
              {(close) => (
                <>
                  <div className="profile-menu-head">
                    <Avatar name={settings.profileName} size={34} />
                    <div>
                      <div className="profile-menu-name">{settings.profileName}</div>
                      <div className="profile-menu-sub">{settings.businessName}</div>
                    </div>
                  </div>
                  <MenuDivider />
                  <MenuItem
                    icon={<SettingsIcon size={14} />}
                    onClick={() => {
                      navigate('/settings')
                      close()
                    }}
                  >
                    Workspace settings
                  </MenuItem>
                  <MenuItem
                    icon={<Download size={14} />}
                    onClick={() => {
                      exportCsv()
                      close()
                    }}
                  >
                    Export all to CSV
                  </MenuItem>
                  <MenuItem
                    icon={<CircleHelp size={14} />}
                    onClick={() => {
                      toast(
                        'Shortcuts: N new transaction · Ctrl/Cmd + K search · Esc close. Every field is editable in the transaction panel.',
                        'info',
                      )
                      close()
                    }}
                  >
                    Keyboard shortcuts
                  </MenuItem>
                  <MenuDivider />
                  <div className="profile-menu-note">
                    <span className="status-dot" /> Stored locally · {transactions.length} records
                  </div>
                </>
              )}
            </Popover>
          </div>
        </header>

        <div className="page-scroll" ref={scrollRef}>
          <div className="page">
            {loading ? (
              <LoadingScreen />
            ) : error ? (
              <ErrorState message={error} onRetry={() => void refresh(true)} />
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { transactions, clients, categories, settings } = useData()
  const { openDrawer } = useTransactionDrawer()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 40)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timeout)
    }
  }, [onClose])

  const commands = useMemo<CommandItem[]>(() => {
    const pages: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard size={15} />, run: () => navigate('/') },
      { id: 'nav-income', label: 'Go to Income & Expenses', icon: <ArrowLeftRight size={15} />, run: () => navigate('/income-expenses') },
      { id: 'nav-tx', label: 'Go to Transactions', icon: <Table2 size={15} />, run: () => navigate('/transactions') },
      { id: 'nav-monthly', label: 'Go to Monthly Overview', icon: <CalendarRange size={15} />, run: () => navigate('/monthly') },
      { id: 'nav-earnings', label: 'Go to Monthly Earnings', icon: <TrendingUp size={15} />, run: () => navigate('/earnings') },
      { id: 'nav-clients', label: 'Go to Clients Portal', icon: <Users size={15} />, run: () => navigate('/clients') },
      { id: 'nav-analytics', label: 'Go to Analytics', icon: <BarChart3 size={15} />, run: () => navigate('/analytics') },
      { id: 'nav-categories', label: 'Go to Categories', icon: <Tags size={15} />, run: () => navigate('/categories') },
      { id: 'nav-settings', label: 'Go to Settings', icon: <SettingsIcon size={15} />, run: () => navigate('/settings') },
    ]
    const actions: CommandItem[] = [
      {
        id: 'new-tx',
        label: 'New transaction',
        hint: 'N',
        icon: <Plus size={15} />,
        run: () => openDrawer(null, { date: todayISO() }),
      },
      {
        id: 'new-income',
        label: 'Add income',
        icon: <ArrowRight size={15} className="income-arrow" />,
        run: () => openDrawer(null, { type: 'income', status: 'Pending', date: todayISO() }),
      },
      {
        id: 'new-expense',
        label: 'Add expense',
        icon: <ArrowLeftRight size={15} />,
        run: () => openDrawer(null, { type: 'expense', status: 'Pending', date: todayISO() }),
      },
    ]
    return [...pages, ...actions]
  }, [navigate, openDrawer])

  const term = query.trim().toLowerCase()
  const filteredCommands = commands.filter((command) => command.label.toLowerCase().includes(term))
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const txResults = term
    ? transactions
        .filter((transaction) => {
          const client = transaction.clientId ? clientById.get(transaction.clientId)?.name ?? '' : ''
          const category = transaction.categoryId
            ? categoryById.get(transaction.categoryId)?.name ?? ''
            : ''
          return `${transaction.name} ${client} ${category} ${transaction.date} ${transaction.status}`
            .toLowerCase()
            .includes(term)
        })
        .slice(0, 5)
    : []

  const total = filteredCommands.length + txResults.length

  useEffect(() => {
    setActive(0)
  }, [query])

  const execute = (index: number) => {
    if (index < filteredCommands.length) {
      filteredCommands[index]?.run()
      onClose()
      return
    }
    const transaction = txResults[index - filteredCommands.length]
    if (transaction) {
      openDrawer(transaction)
      onClose()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => (total === 0 ? 0 : (value + 1) % total))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => (total === 0 ? 0 : (value - 1 + total) % total))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      execute(active)
    }
  }

  return createPortal(
    <div className="palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Search and commands">
        <div className="palette-search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, transactions, or run a command…"
          />
          <button className="palette-esc" onClick={onClose}>
            Esc
          </button>
        </div>
        <div className="palette-results">
          {filteredCommands.length > 0 && (
            <div className="palette-section">
              <div className="palette-label">Commands</div>
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  className={`palette-item ${active === index ? 'active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => execute(index)}
                >
                  <span className="palette-icon">{command.icon}</span>
                  <span>{command.label}</span>
                  {command.hint && <KeyHint>{command.hint}</KeyHint>}
                </button>
              ))}
            </div>
          )}
          {txResults.length > 0 && (
            <div className="palette-section">
              <div className="palette-label">Transactions</div>
              {txResults.map((transaction, offset) => {
                const index = filteredCommands.length + offset
                return (
                  <button
                    key={transaction.id}
                    className={`palette-item ${active === index ? 'active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => execute(index)}
                  >
                    <span className={`palette-icon ${transaction.type === 'income' ? 'is-income' : 'is-expense'}`}>
                      {transaction.type === 'income' ? '↓' : '↑'}
                    </span>
                    <span className="palette-tx-name">{transaction.name}</span>
                    <span className="palette-tx-meta">
                      {formatDate(transaction.date, settings.locale, { month: 'short', day: 'numeric' })}
                      {' · '}
                      {formatMoney(transaction.amountCents, settings, { decimals: 0 })}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {total === 0 && (
            <div className="palette-empty">
              <Search size={18} />
              <span>No results for “{query}”</span>
            </div>
          )}
        </div>
        <div className="palette-footer">
          <span><KeyHint>↑</KeyHint><KeyHint>↓</KeyHint> navigate</span>
          <span><KeyHint>↵</KeyHint> select</span>
          <span><KeyHint>esc</KeyHint> close</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
