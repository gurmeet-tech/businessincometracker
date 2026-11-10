import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Check, FileText, Plus, Trash2, X } from 'lucide-react'
import type {
  Transaction,
  TransactionInput,
  TransactionStatus,
  TransactionType,
} from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useAsyncAction } from '../hooks/useAsyncAction'
import {
  centsToInput,
  formatMoney,
  parseAmountToCents,
} from '../lib/finance'
import { monthLabelLong, monthKeyFromISO, todayISO } from '../lib/date'
import {
  Button,
  IconButton,
  Segmented,
  StatusBadge,
  useConfirm,
} from './ui'

interface OpenOptions {
  transaction?: Transaction | null
  defaults?: Partial<TransactionInput>
}

interface DrawerContextValue {
  openDrawer: (transaction?: Transaction | null, defaults?: Partial<TransactionInput>) => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function useTransactionDrawer() {
  const context = useContext(DrawerContext)
  if (!context) throw new Error('useTransactionDrawer must be used inside TransactionDrawerProvider')
  return context
}

interface DrawerState extends OpenOptions {
  open: boolean
  nonce: number
}

export function TransactionDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>({ open: false, nonce: 0 })

  const openDrawer = useCallback(
    (transaction?: Transaction | null, defaults?: Partial<TransactionInput>) => {
      setState((current) => ({
        open: true,
        transaction: transaction ?? null,
        defaults,
        nonce: current.nonce + 1,
      }))
    },
    [],
  )

  const closeDrawer = useCallback(() => {
    setState((current) => ({ ...current, open: false }))
  }, [])

  const value = useMemo(() => ({ openDrawer, closeDrawer }), [openDrawer, closeDrawer])

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {state.open && (
        <TransactionDrawer
          key={state.nonce}
          transaction={state.transaction ?? null}
          defaults={state.defaults}
          onClose={closeDrawer}
        />
      )}
    </DrawerContext.Provider>
  )
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Stripe',
  'PayPal',
  'Wise',
  'Credit Card',
  'Cash',
  'Other',
]

function TransactionDrawer({
  transaction,
  defaults,
  onClose,
}: {
  transaction: Transaction | null
  defaults?: Partial<TransactionInput>
  onClose: () => void
}) {
  const { settings, createTransaction, updateTransaction, deleteTransaction } = useData()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { run, busy } = useAsyncAction()
  const isEditing = Boolean(transaction)

  const [name, setName] = useState(transaction?.name ?? defaults?.name ?? '')
  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaults?.type ?? 'income')
  const [amount, setAmount] = useState(
    transaction ? centsToInput(transaction.amountCents) : '',
  )
  const [date, setDate] = useState(transaction?.date ?? defaults?.date ?? todayISO())
  const [status, setStatus] = useState<TransactionStatus>(
    transaction?.status ?? defaults?.status ?? 'Pending',
  )
  const [paymentDate, setPaymentDate] = useState(transaction?.paymentDate ?? '')
  const [paymentMethod, setPaymentMethod] = useState(
    transaction?.paymentMethod ?? defaults?.paymentMethod ?? '',
  )
  const [dirty, setDirty] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(() => titleRef.current?.focus(), 60)
    return () => {
      document.body.style.overflow = previous
      window.clearTimeout(timeout)
    }
  }, [])

  const requestClose = useCallback(async () => {
    if (busy) return
    if (!dirty) {
      onClose()
      return
    }
    const shouldDiscard = await confirm({
      title: 'Discard changes?',
      message: 'You have unsaved changes to this transaction. They will be lost if you close now.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      destructive: true,
    })
    if (shouldDiscard) onClose()
  }, [busy, dirty, confirm, onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void requestClose()
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void save()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const markDirty = () => {
    if (!dirty) setDirty(true)
    if (formError) setFormError(null)
  }

  const switchType = (nextType: TransactionType) => {
    setType(nextType)
    markDirty()
  }

  const switchStatus = (nextStatus: TransactionStatus) => {
    setStatus(nextStatus)
    markDirty()
    if (nextStatus === 'Paid' && !paymentDate) setPaymentDate(todayISO())
    if (nextStatus !== 'Paid') setPaymentDate('')
  }

  const save = async () => {
    if (!name.trim()) {
      setFormError('Give this transaction a name.')
      titleRef.current?.focus()
      return
    }
    const amountCents = parseAmountToCents(amount)
    if (!amountCents) {
      setFormError('Enter a positive amount with no more than two decimal places.')
      return
    }
    if (!date) {
      setFormError('Choose a transaction date.')
      return
    }

    const input: TransactionInput = {
      name: name.trim(),
      clientId: null,
      categoryId: null,
      type,
      amountCents,
      date,
      status,
      paymentDate: status === 'Paid' ? paymentDate || date : null,
      paymentMethod: paymentMethod.trim() || null,
      notes: '',
      attachments: [],
    }

    const succeeded = await run(
      () =>
        isEditing && transaction
          ? updateTransaction(transaction.id, input)
          : createTransaction(input),
      {
        onError: (message) => setFormError(message),
      },
    )
    if (succeeded) {
      setDirty(false)
      toast(isEditing ? 'Transaction updated.' : 'Transaction added.', 'success')
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!transaction) return
    const shouldDelete = await confirm({
      title: 'Delete transaction?',
      message: `“${transaction.name}” will be permanently removed and every summary, client total, and report will recalculate.`,
      confirmLabel: 'Delete transaction',
      destructive: true,
    })
    if (!shouldDelete) return
    const succeeded = await run(() => deleteTransaction(transaction.id), {
      success: 'Transaction deleted.',
    })
    if (succeeded) onClose()
  }

  return createPortal(
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void requestClose()
      }}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Transaction editor">
        <header className="drawer-head">
          <div className="drawer-breadcrumb">
            <FileText size={14} />
            <span>Transactions</span>
            <span className="crumb-separator">/</span>
            <span>{isEditing ? 'Edit record' : 'New record'}</span>
          </div>
          <div className="drawer-head-actions">
            {isEditing && <StatusBadge status={transaction!.status} />}
            <IconButton label="Close editor" onClick={() => void requestClose()}>
              <X size={17} />
            </IconButton>
          </div>
        </header>

        <div className="drawer-body">
          {formError && (
            <div className="form-alert">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="drawer-title-row">
            <span className={`page-icon page-icon-${type}`}>
              {type === 'income' ? '↓' : '↑'}
            </span>
            <input
              ref={titleRef}
              className="drawer-title-input"
              value={name}
              placeholder="Untitled transaction"
              onChange={(event) => {
                setName(event.target.value)
                markDirty()
              }}
            />
          </div>

          <div className="property-list">
            <div className="property-row">
              <div className="property-key">Type</div>
              <div className="property-value">
                <Segmented
                  value={type}
                  onChange={switchType}
                  size="sm"
                  ariaLabel="Transaction type"
                  options={[
                    { value: 'income', label: 'Income' },
                    { value: 'expense', label: 'Expense' },
                  ]}
                />
              </div>
            </div>

            <div className="property-row">
              <div className="property-key">Amount</div>
              <div className="property-value amount-editor">
                <span className="amount-currency">{settings.currency}</span>
                <input
                  className="inline-input amount-input"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/[^\d.,]/g, ''))
                    markDirty()
                  }}
                />
              </div>
            </div>

            <div className="property-row">
              <div className="property-key">
                <CalendarDays size={13} /> Date
              </div>
              <div className="property-value">
                <input
                  type="date"
                  className="inline-input"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value)
                    markDirty()
                  }}
                />
              </div>
            </div>

            <div className="property-row">
              <div className="property-key">Status</div>
              <div className="property-value">
                <Segmented
                  value={status}
                  onChange={switchStatus}
                  size="sm"
                  ariaLabel="Payment status"
                  options={[
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Overdue', label: 'Overdue' },
                  ]}
                />
              </div>
            </div>

            <div className="property-row">
              <div className="property-key">Payment date</div>
              <div className="property-value">
                <input
                  type="date"
                  className="inline-input"
                  value={paymentDate}
                  max={todayISO()}
                  disabled={status !== 'Paid'}
                  onChange={(event) => {
                    setPaymentDate(event.target.value)
                    markDirty()
                  }}
                />
                {status !== 'Paid' && <span className="property-hint">Set status to Paid first</span>}
              </div>
            </div>

            <div className="property-row">
              <div className="property-key">Method</div>
              <div className="property-value">
                <input
                  className="inline-input"
                  list="payment-methods"
                  placeholder="Bank transfer, Stripe…"
                  value={paymentMethod}
                  onChange={(event) => {
                    setPaymentMethod(event.target.value)
                    markDirty()
                  }}
                />
                <datalist id="payment-methods">
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="property-row">
              <div className="property-key formula-key">
                <span className="formula-symbol">ƒ</span> Month
              </div>
              <div className="property-value">
                <span className="formula-value">
                  {date ? monthLabelLong(monthKeyFromISO(date)) : '—'}
                </span>
                <span className="property-hint">Calculated from Date</span>
              </div>
            </div>

          </div>

          {isEditing && transaction && (
            <div className="record-meta">
              <Check size={12} />
              Last updated {new Date(transaction.updatedAt).toLocaleString(settings.locale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <footer className="drawer-footer">
          <div className="drawer-footer-left">
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                className="danger-text"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="drawer-footer-right">
            <span className="drawer-total">
              {amount && parseAmountToCents(amount) !== null
                ? formatMoney(parseAmountToCents(amount)!, settings)
                : '—'}
            </span>
            <Button variant="ghost" onClick={() => void requestClose()} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void save()} loading={busy}>
              {isEditing ? 'Save changes' : 'Add transaction'}
            </Button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  )
}
