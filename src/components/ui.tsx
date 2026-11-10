import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react'
import type { TransactionStatus, TransactionType } from '../types'
import { STATUS_TONE } from '../lib/finance'

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="spin" /> : icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md'
  label: string
}

export function IconButton({
  size = 'md',
  label,
  children,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`icon-button icon-button-${size} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------
export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`select-wrap ${className}`}>
      <select className="select" {...props}>
        {children}
      </select>
      <ChevronDown size={14} className="select-chevron" aria-hidden />
    </span>
  )
}

interface FieldProps {
  label?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, hint, error, required, className = '', children, htmlFor }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="field-error">{error}</div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badges, avatar, progress
// ---------------------------------------------------------------------------
type Tone = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'

export function Badge({
  tone = 'gray',
  children,
  dot = false,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const tone = STATUS_TONE[status]
  return (
    <Badge tone={tone} dot>
      {status}
    </Badge>
  )
}

export function TypeBadge({ type, compact = false }: { type: TransactionType; compact?: boolean }) {
  const isIncome = type === 'income'
  return (
    <span className={`type-badge ${isIncome ? 'type-income' : 'type-expense'}`}>
      {isIncome ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
      {!compact && (isIncome ? 'Income' : 'Expense')}
    </span>
  )
}

const AVATAR_HUES = [210, 154, 268, 32, 188, 340, 112, 246]

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length]
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(9, Math.round(size * 0.36)),
    background: `hsl(${hue} 30% 26%)`,
    color: `hsl(${hue} 70% 82%)`,
  }
  return (
    <span className="avatar" style={style} aria-hidden>
      {initials}
    </span>
  )
}

export function ProgressBar({
  value,
  tone = 'green',
  height = 5,
}: {
  value: number
  tone?: 'green' | 'blue' | 'red' | 'yellow'
  height?: number
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className="progress-track" style={{ height }}>
      <div className={`progress-fill progress-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------
export function Popover({
  trigger,
  children,
  align = 'end',
  className = '',
  panelClassName = '',
}: {
  trigger: ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`popover ${className}`} ref={ref}>
      <div className="popover-anchor" onClick={() => setOpen((value) => !value)}>
        {trigger}
      </div>
      {open && (
        <div className={`popover-panel popover-${align} ${panelClassName}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  icon,
  danger = false,
  shortcut,
}: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  danger?: boolean
  shortcut?: string
}) {
  return (
    <button
      type="button"
      className={`menu-item ${danger ? 'menu-item-danger' : ''}`}
      onClick={onClick}
      role="menuitem"
    >
      {icon && <span className="menu-item-icon">{icon}</span>}
      <span className="menu-item-label">{children}</span>
      {shortcut && <kbd className="menu-shortcut">{shortcut}</kbd>}
    </button>
  )
}

export function MenuDivider() {
  return <div className="menu-divider" role="separator" />
}

// ---------------------------------------------------------------------------
// Modal & confirmation
// ---------------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 460,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const timeout = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not(.modal-close)',
      )
      focusable?.focus()
    }, 30)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timeout)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
        ref={panelRef}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="modal-close">
            <X size={16} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>
} | null>(null)

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null)

  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })

  const finish = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => finish(false)}
        title={state?.title ?? 'Are you sure?'}
        width={430}
        footer={
          <>
            <Button variant="ghost" onClick={() => finish(false)}>
              {state?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={state?.destructive ? 'danger' : 'primary'}
              onClick={() => finish(true)}
              autoFocus
            >
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="confirm-body">
          <div className={`confirm-icon ${state?.destructive ? 'danger' : ''}`}>
            <AlertTriangle size={19} />
          </div>
          <div className="confirm-message">{state?.message}</div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider')
  return context.confirm
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  flush = false,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="panel-head">
          <div className="panel-head-text">
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'panel-body'}>{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  sub,
  tone = 'gray',
  icon,
  badge,
}: {
  label: string
  value: string
  sub?: ReactNode
  tone?: Tone
  icon?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {icon && <span className={`metric-icon metric-icon-${tone}`}>{icon}</span>}
      </div>
      <div className={`metric-value tone-text-${tone}`}>{value}</div>
      <div className="metric-sub">
        {sub}
        {badge}
      </div>
    </div>
  )
}

export function TrendIndicator({
  value,
  invert = false,
  label = 'vs last month',
}: {
  value: number | null
  invert?: boolean
  label?: string
}) {
  if (value === null) return <span className="trend trend-neutral">No prior period</span>
  const positive = invert ? value <= 0 : value >= 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`trend ${positive ? 'trend-positive' : 'trend-negative'}`}>
      <Icon size={11} />
      {Math.abs(value).toFixed(value === 0 ? 0 : 1)}%
      <span className="trend-label">{label}</span>
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  return (
    <div className={`segmented segmented-${size}`} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          title={option.title}
          className={`segmented-item ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />
}

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-mark">
        <span>F</span>
      </div>
      <div className="loading-text">
        <Spinner size={16} />
        <span>Opening your workspace…</span>
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <div className="error-icon">
        <AlertTriangle size={20} />
      </div>
      <h2>Couldn’t load your workspace</h2>
      <p>{message}</p>
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <kbd className="key-hint">{children}</kbd>
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
