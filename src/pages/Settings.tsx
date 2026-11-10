import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  FileJson,
  Keyboard,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { Settings } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Avatar,
  Button,
  Field,
  KeyHint,
  PageHeader,
  Panel,
  Segmented,
  useConfirm,
} from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import {
  downloadText,
  formatMoney,
  transactionsToCsv,
} from '../lib/finance'
import { todayISO } from '../lib/date'

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'AED', label: 'UAE Dirham' },
]

const LOCALES = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'de-DE', label: 'Deutsch (Deutschland)' },
  { code: 'fr-FR', label: 'Français (France)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'ja-JP', label: '日本語 (日本)' },
  { code: 'nl-NL', label: 'Nederlands (Nederland)' },
  { code: 'sv-SE', label: 'Svenska (Sverige)' },
]

export function SettingsPage() {
  const {
    settings,
    clients,
    categories,
    transactions,
    savedViews,
    updateSettings,
    clearFinancialData,
  } = useData()
  const { toast } = useToast()
  const confirm = useConfirm()
  const { run, busy } = useAsyncAction()
  const [form, setForm] = useState<Settings>(settings)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const dirty = useMemo(
    () =>
      form.profileName !== settings.profileName ||
      form.businessName !== settings.businessName ||
      form.currency !== settings.currency ||
      form.locale !== settings.locale ||
      form.weekStart !== settings.weekStart,
    [form, settings],
  )

  const patch = (partial: Partial<Settings>) => {
    setForm((current) => ({ ...current, ...partial }))
    setError(null)
  }

  const saveSettings = async () => {
    if (!form.profileName.trim()) {
      setError('Your profile name cannot be empty.')
      return
    }
    if (!form.businessName.trim()) {
      setError('Business name cannot be empty.')
      return
    }
    const succeeded = await run(
      () =>
        updateSettings({
          profileName: form.profileName.trim(),
          businessName: form.businessName.trim(),
          currency: form.currency,
          locale: form.locale,
          weekStart: form.weekStart,
        }),
      {
        success: 'Workspace settings saved.',
        onError: setError,
      },
    )
    if (!succeeded) return
  }

  const exportCsv = () => {
    const csv = transactionsToCsv(transactions, clients, categories, settings)
    downloadText(`business-income-tracker-${todayISO()}.csv`, csv, 'text/csv')
    toast('Full transaction export complete.', 'success')
  }

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      workspace: settings,
      clients,
      categories,
      transactions,
      savedViews,
    }
    downloadText(
      `business-income-tracker-backup-${todayISO()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    )
    toast('Workspace backup downloaded.', 'success')
  }

  const handleClear = async () => {
    const confirmed = await confirm({
      title: 'Clear all financial data?',
      message:
        'This permanently deletes every transaction, client, category, and saved view from this browser. Your profile and currency settings are kept. This cannot be undone.',
      confirmLabel: 'Delete all data',
      destructive: true,
    })
    if (!confirmed) return
    await run(() => clearFinancialData(), {
      success: 'Financial data cleared. You can start fresh.',
    })
  }

  const preview = formatMoney(284_550, { currency: form.currency, locale: form.locale })

  return (
    <div className="settings-page">
      <PageHeader
        eyebrow={
          <>
            <SettingsIcon size={12} /> Workspace configuration
          </>
        }
        title="Settings"
        subtitle="Manage your workspace identity, currency formatting, and local data."
        actions={
          <Button
            variant="primary"
            icon={<Save size={15} />}
            loading={busy}
            disabled={!dirty}
            onClick={() => void saveSettings()}
          >
            Save changes
          </Button>
        }
      />

      <div className="settings-grid">
        <div className="settings-main">
          <Panel title="Workspace profile" subtitle="How your finance workspace is identified.">
            <div className="settings-profile">
              <Avatar name={form.profileName || 'Business Income Tracker'} size={52} />
              <div>
                <div className="settings-profile-name">{form.profileName || 'Your name'}</div>
                <div className="settings-profile-sub">
                  {form.businessName || 'Your business'} · Personal workspace
                </div>
              </div>
              <span className="settings-local-badge">
                <ShieldCheck size={12} /> Local only
              </span>
            </div>
            {error && <div className="form-alert">{error}</div>}
            <div className="form-grid">
              <div className="form-grid-2">
                <Field label="Your name" required>
                  <input
                    className="text-input"
                    value={form.profileName}
                    onChange={(event) => patch({ profileName: event.target.value })}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Business name" required>
                  <input
                    className="text-input"
                    value={form.businessName}
                    onChange={(event) => patch({ businessName: event.target.value })}
                    placeholder="My Business"
                  />
                </Field>
              </div>
              <div className="form-grid-2">
                <Field
                  label="Currency"
                  hint="Used for every amount, total, chart, and export."
                >
                  <select
                    className="text-select"
                    value={form.currency}
                    onChange={(event) => patch({ currency: event.target.value })}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} — {currency.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Locale" hint="Controls date and number formatting.">
                  <select
                    className="text-select"
                    value={form.locale}
                    onChange={(event) => patch({ locale: event.target.value })}
                  >
                    {LOCALES.map((locale) => (
                      <option key={locale.code} value={locale.code}>
                        {locale.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="form-grid-2">
                <Field label="Week starts on">
                  <Segmented
                    value={form.weekStart}
                    onChange={(value) => patch({ weekStart: value })}
                    size="sm"
                    options={[
                      { value: 'monday', label: 'Monday' },
                      { value: 'sunday', label: 'Sunday' },
                    ]}
                  />
                </Field>
                <Field label="Formatting preview">
                  <div className="currency-preview">
                    <Wallet size={15} />
                    <span>{preview}</span>
                  </div>
                </Field>
              </div>
            </div>
            <div className="settings-save-row">
              <span className={dirty ? 'dirty-indicator' : 'saved-indicator'}>
                {dirty ? (
                  'Unsaved changes'
                ) : (
                  <>
                    <Check size={12} /> All changes saved
                  </>
                )}
              </span>
              <Button
                variant="primary"
                icon={<Save size={14} />}
                loading={busy}
                disabled={!dirty}
                onClick={() => void saveSettings()}
              >
                Save settings
              </Button>
            </div>
          </Panel>

          <Panel
            title="Data management"
            subtitle="Your workspace is saved only in this browser. Nothing is uploaded or synced."
          >
            <div className="data-row">
              <div className="data-icon">
                <Download size={16} />
              </div>
              <div className="data-text">
                <strong>Export transactions to CSV</strong>
                <span>
                  {transactions.length} records with client, category, status, and payment fields.
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
            <div className="data-row">
              <div className="data-icon">
                <FileJson size={16} />
              </div>
              <div className="data-text">
                <strong>Download JSON backup</strong>
                <span>Full workspace snapshot including clients, categories, and saved views.</span>
              </div>
              <Button variant="secondary" size="sm" onClick={exportJson}>
                Download JSON
              </Button>
            </div>
            <div className="data-row">
              <div className="data-icon">
                <Database size={16} />
              </div>
              <div className="data-text">
                <strong>Browser storage</strong>
                <span>
                  Saved on this device · {clients.length} clients · {categories.length} categories ·{' '}
                  {savedViews.length} saved views
                </span>
              </div>
              <span className="data-connected">
                <span className="status-dot" /> On device
              </span>
            </div>
          </Panel>

          <Panel
            className="danger-panel"
            title={
              <span className="panel-title-with-dot">
                <AlertTriangle size={14} className="tone-red" /> Danger zone
              </span>
            }
            subtitle="Destructive actions cannot be undone. Export a backup first."
          >
            <div className="data-row">
              <div className="data-icon danger">
                <Trash2 size={16} />
              </div>
              <div className="data-text">
                <strong>Clear all financial data</strong>
                <span>Delete all transactions, clients, categories, and saved views.</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={() => void handleClear()}
                disabled={busy}
              >
                Clear data
              </Button>
            </div>
          </Panel>
        </div>

        <div className="settings-side">
          <Panel title="Keyboard shortcuts" subtitle="Move around without leaving the keyboard.">
            <div className="shortcut-list">
              <div className="shortcut-row">
                <span>New transaction</span>
                <KeyHint>N</KeyHint>
              </div>
              <div className="shortcut-row">
                <span>Search &amp; commands</span>
                <span className="shortcut-keys">
                  <KeyHint>Ctrl</KeyHint>
                  <KeyHint>K</KeyHint>
                </span>
              </div>
              <div className="shortcut-row">
                <span>Focus search</span>
                <KeyHint>/</KeyHint>
              </div>
              <div className="shortcut-row">
                <span>Save transaction</span>
                <span className="shortcut-keys">
                  <KeyHint>Ctrl</KeyHint>
                  <KeyHint>↵</KeyHint>
                </span>
              </div>
              <div className="shortcut-row">
                <span>Close panel or dialog</span>
                <KeyHint>Esc</KeyHint>
              </div>
            </div>
            <div className="shortcut-note">
              <Keyboard size={13} /> Shortcuts are paused while typing in an input.
            </div>
          </Panel>

          <Panel title="Workspace at a glance">
            <div className="glance-list">
              <div>
                <span>
                  <UserRound size={13} /> Clients
                </span>
                <strong>{clients.length}</strong>
              </div>
              <div>
                <span>Transactions</span>
                <strong>{transactions.length}</strong>
              </div>
              <div>
                <span>Categories</span>
                <strong>{categories.length}</strong>
              </div>
              <div>
                <span>Saved views</span>
                <strong>{savedViews.length}</strong>
              </div>
              <div>
                <span>Currency</span>
                <strong>{settings.currency}</strong>
              </div>
              <div>
                <span>Data store</span>
                <strong>This device</strong>
              </div>
            </div>
          </Panel>

          <Panel title="About">
            <div className="about-block">
              <div className="about-mark">B</div>
              <div>
                <strong>Business Income Tracker</strong>
                <span>Private Business Income Workspace</span>
              </div>
            </div>
            <p className="about-copy">
              A private, device-local income tracker inspired by Notion databases. Monthly earnings
              and financial totals are derived from one transaction ledger — no duplicated or
              independently maintained numbers.
            </p>
            <div className="about-badges">
              <span>Version 1.0</span>
              <span>Local-first</span>
              <span>Exact amount math</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
