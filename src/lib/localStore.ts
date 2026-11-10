import type {
  Attachment,
  BootstrapData,
  Category,
  CategoryInput,
  Client,
  ClientInput,
  SavedView,
  Settings,
  Transaction,
  TransactionInput,
  ViewConfig,
} from '../types'
import { clearAttachmentFiles, deleteAttachmentFiles } from './attachments'

export const WORKSPACE_STORAGE_KEY = 'finance-tracker:workspace:v1'

const TYPES = new Set(['income', 'expense'])
const STATUSES = new Set(['Paid', 'Pending', 'Overdue'])
const CLIENT_STATUSES = new Set(['Active', 'Lead', 'Inactive', 'Archived'])
const SETTINGS_KEYS = new Set(['profileName', 'businessName', 'currency', 'locale', 'weekStart'])

export const DEFAULT_SETTINGS: Settings = {
  profileName: 'You',
  businessName: 'My Business',
  currency: 'INR',
  locale: 'en-IN',
  weekStart: 'monday',
}

const DEFAULT_FILTERS: ViewConfig['filters'] = {
  month: 'all',
  type: 'all',
  category: 'all',
  client: 'all',
  status: 'all',
}

export function emptyWorkspace(settings: Settings = DEFAULT_SETTINGS): BootstrapData {
  return {
    clients: [],
    categories: [],
    transactions: [],
    savedViews: [],
    settings: { ...settings },
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function text(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function nullableText(value: unknown, maxLength = 500): string | null {
  const cleaned = text(value, maxLength)
  return cleaned || null
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter(
      (item) =>
        typeof item.url === 'string' &&
        (item.url.startsWith('local-file:') || item.url.startsWith('data:')),
    )
    .slice(0, 20)
    .map((item) => ({
      id: text(item.id, 100) || undefined,
      name: text(item.name, 255) || 'Attachment',
      url: String(item.url),
      size: typeof item.size === 'number' && Number.isFinite(item.size) ? Math.max(0, Math.round(item.size)) : 0,
      mime: text(item.mime, 150) || 'application/octet-stream',
      createdAt: text(item.createdAt, 100) || undefined,
    }))
}

function normalizeViewConfig(value: unknown): ViewConfig {
  const config = isRecord(value) ? value : {}
  const filters = isRecord(config.filters) ? config.filters : {}
  const type = filters.type
  const status = filters.status
  const sort = config.sort
  const group = config.group
  const view = config.view

  return {
    filters: {
      month: typeof filters.month === 'string' ? filters.month : DEFAULT_FILTERS.month,
      type: type === 'income' || type === 'expense' ? type : DEFAULT_FILTERS.type,
      category: typeof filters.category === 'string' ? filters.category : DEFAULT_FILTERS.category,
      client: typeof filters.client === 'string' ? filters.client : DEFAULT_FILTERS.client,
      status:
        status === 'Paid' || status === 'Pending' || status === 'Overdue' || status === 'unpaid'
          ? status
          : DEFAULT_FILTERS.status,
    },
    sort:
      sort === 'date-asc' ||
      sort === 'amount-desc' ||
      sort === 'amount-asc' ||
      sort === 'name-asc'
        ? sort
        : 'date-desc',
    group: group === 'month' || group === 'category' ? group : 'none',
    view: view === 'calendar' ? 'calendar' : 'table',
    search: typeof config.search === 'string' ? config.search : '',
  }
}

function normalizeSettings(value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const settings = isRecord(value) ? value : {}
  const weekStart = settings.weekStart === 'sunday' ? 'sunday' : 'monday'
  const currency = text(settings.currency, 10).toUpperCase()
  const locale = text(settings.locale, 40)

  return {
    profileName: text(settings.profileName, 200) || fallback.profileName,
    businessName: text(settings.businessName, 200) || fallback.businessName,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : fallback.currency,
    locale: locale || fallback.locale,
    weekStart,
  }
}

function sortClients(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name))
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type.localeCompare(b.type),
  )
}

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.createdAt.localeCompare(a.createdAt)
  })
}

function sortViews(views: SavedView[]): SavedView[] {
  return [...views].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function sanitizeWorkspace(value: unknown): BootstrapData {
  if (!isRecord(value)) return emptyWorkspace()

  const settings = normalizeSettings(value.settings)
  const rawClients = Array.isArray(value.clients) ? value.clients : []
  const clients: Client[] = rawClients
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => text(item.id, 100) && text(item.name, 150))
    .map((item) => ({
      id: String(item.id),
      name: text(item.name, 150),
      email: nullableText(item.email, 200),
      company: nullableText(item.company, 150),
      phone: nullableText(item.phone, 80),
      status: CLIENT_STATUSES.has(String(item.status))
        ? (String(item.status) as Client['status'])
        : 'Active',
      notes: text(item.notes, 3000),
      createdAt: text(item.createdAt, 100) || new Date().toISOString(),
    }))

  const rawCategories = Array.isArray(value.categories) ? value.categories : []
  const categories: Category[] = rawCategories
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => text(item.id, 100) && text(item.name, 100) && TYPES.has(String(item.type)))
    .map((item) => ({
      id: String(item.id),
      name: text(item.name, 100),
      type: String(item.type) as Category['type'],
      color: /^#[0-9a-f]{6}$/i.test(String(item.color)) ? String(item.color) : '#8f8f8b',
      createdAt: text(item.createdAt, 100) || new Date().toISOString(),
    }))

  const clientIds = new Set(clients.map((client) => client.id))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const rawTransactions = Array.isArray(value.transactions) ? value.transactions : []
  const transactions: Transaction[] = rawTransactions
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const type = String(item.type)
      const status = String(item.status)
      const amountCents = Number(item.amountCents)
      const date = String(item.date)
      if (
        !text(item.id, 100) ||
        !text(item.name, 250) ||
        !TYPES.has(type) ||
        !Number.isInteger(amountCents) ||
        amountCents <= 0 ||
        !isValidDate(date)
      ) {
        return null
      }

      const rawClientId = nullableText(item.clientId, 100)
      const rawCategoryId = nullableText(item.categoryId, 100)
      const category = rawCategoryId ? categoryById.get(rawCategoryId) : undefined
      const clientId = rawClientId && clientIds.has(rawClientId) ? rawClientId : null
      const categoryId = category && category.type === type ? category.id : null
      const transactionStatus = STATUSES.has(status) ? (status as Transaction['status']) : 'Pending'
      const paymentDate =
        transactionStatus === 'Paid'
          ? isValidDate(item.paymentDate)
            ? item.paymentDate
            : date
          : null

      return {
        id: String(item.id),
        name: text(item.name, 250),
        clientId,
        categoryId,
        type: type as Transaction['type'],
        amountCents,
        date,
        status: transactionStatus,
        paymentDate,
        paymentMethod: nullableText(item.paymentMethod, 100),
        notes: text(item.notes, 4000),
        attachments: normalizeAttachments(item.attachments),
        createdAt: text(item.createdAt, 100) || new Date().toISOString(),
        updatedAt: text(item.updatedAt, 100) || text(item.createdAt, 100) || new Date().toISOString(),
      }
    })
    .filter((item): item is Transaction => item !== null)

  const rawViews = Array.isArray(value.savedViews) ? value.savedViews : []
  const savedViews: SavedView[] = rawViews
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => text(item.id, 100) && text(item.name, 100))
    .map((item) => ({
      id: String(item.id),
      name: text(item.name, 100),
      config: normalizeViewConfig(item.config),
      createdAt: text(item.createdAt, 100) || new Date().toISOString(),
    }))

  return {
    clients: sortClients(clients),
    categories: sortCategories(categories),
    transactions: sortTransactions(transactions),
    savedViews: sortViews(savedViews),
    settings,
  }
}

export function loadWorkspace(): BootstrapData {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
  } catch {
    throw new Error(
      'This browser blocked local storage. Allow site data for this page so your workspace can be saved.',
    )
  }

  if (!raw) {
    const workspace = emptyWorkspace()
    persistWorkspace(workspace)
    return workspace
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      'The saved workspace could not be read. Your browser data may be damaged; export a backup before resetting it.',
    )
  }

  return sanitizeWorkspace(parsed)
}

function persistWorkspace(workspace: BootstrapData): void {
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
  } catch {
    throw new Error(
      'Local storage is full or unavailable. Remove some attachments or export a backup, then try again.',
    )
  }
}

function requireTransaction(workspace: BootstrapData, id: string): Transaction {
  const transaction = workspace.transactions.find((item) => item.id === id)
  if (!transaction) throw new Error('Transaction not found.')
  return transaction
}

function validateTransaction(
  workspace: BootstrapData,
  input: TransactionInput,
  existingId: string | null = null,
): TransactionInput {
  const name = text(input.name, 250)
  if (!name) throw new Error('Transaction name is required.')

  if (!TYPES.has(input.type)) throw new Error('Type must be income or expense.')

  const amountCents = Number(input.amountCents)
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Amount must be a positive value with at most two decimal places.')
  }
  if (amountCents > 1_000_000_000_000) throw new Error('Amount is too large.')

  if (!isValidDate(input.date)) throw new Error('A valid transaction date is required.')

  const status = STATUSES.has(input.status) ? input.status : 'Pending'
  let paymentDate: string | null = null
  if (status === 'Paid') {
    if (input.paymentDate && !isValidDate(input.paymentDate)) {
      throw new Error('Payment date is invalid.')
    }
    paymentDate = input.paymentDate || input.date
  }

  const clientId = nullableText(input.clientId, 100)
  if (clientId && !workspace.clients.some((client) => client.id === clientId)) {
    throw new Error('The selected client no longer exists.')
  }

  const categoryId = nullableText(input.categoryId, 100)
  if (categoryId) {
    const category = workspace.categories.find((item) => item.id === categoryId)
    if (!category) throw new Error('The selected category no longer exists.')
    if (category.type !== input.type) {
      throw new Error('The selected category does not match the transaction type.')
    }
  }

  const duplicate = workspace.transactions.find(
    (item) =>
      item.id !== existingId &&
      item.name.trim().toLowerCase() === name.toLowerCase() &&
      item.amountCents === amountCents &&
      item.date === input.date &&
      item.type === input.type &&
      (item.clientId || '') === (clientId || ''),
  )
  if (duplicate) {
    throw new Error('A matching transaction already exists. Duplicate records are blocked.')
  }

  return {
    name,
    type: input.type,
    amountCents,
    date: input.date,
    status,
    paymentDate,
    paymentMethod: nullableText(input.paymentMethod, 100),
    notes: text(input.notes, 4000),
    clientId,
    categoryId,
    attachments: normalizeAttachments(input.attachments),
  }
}

function cleanupFiles(attachments: Attachment[]): void {
  if (attachments.length === 0) return
  void deleteAttachmentFiles(attachments).catch((error) => {
    console.warn('Could not remove local attachment files:', error)
  })
}

export function createTransaction(input: TransactionInput): Transaction {
  const workspace = loadWorkspace()
  const data = validateTransaction(workspace, input)
  const now = new Date().toISOString()
  const transaction: Transaction = {
    id: newId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  }
  workspace.transactions = sortTransactions([transaction, ...workspace.transactions])
  persistWorkspace(workspace)
  return transaction
}

export function updateTransaction(id: string, input: TransactionInput): Transaction {
  const workspace = loadWorkspace()
  const existing = requireTransaction(workspace, id)
  const data = validateTransaction(workspace, input, existing.id)
  const updated: Transaction = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }

  const nextUrls = new Set(data.attachments.map((attachment) => attachment.url))
  const removedFiles = existing.attachments.filter((attachment) => !nextUrls.has(attachment.url))

  workspace.transactions = sortTransactions(
    workspace.transactions.map((item) => (item.id === id ? updated : item)),
  )
  persistWorkspace(workspace)
  cleanupFiles(removedFiles)
  return updated
}

export function deleteTransaction(id: string): void {
  const workspace = loadWorkspace()
  const existing = requireTransaction(workspace, id)
  workspace.transactions = workspace.transactions.filter((item) => item.id !== id)
  persistWorkspace(workspace)
  cleanupFiles(existing.attachments)
}

export function createClient(input: ClientInput): Client {
  const workspace = loadWorkspace()
  const name = text(input.name, 150)
  if (!name) throw new Error('Client name is required.')

  const email = text(input.email, 200)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }

  if (workspace.clients.some((client) => client.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A client with that name already exists.')
  }

  const client: Client = {
    id: newId(),
    name,
    email: email || null,
    company: nullableText(input.company, 150),
    phone: nullableText(input.phone, 80),
    status: CLIENT_STATUSES.has(input.status) ? input.status : 'Active',
    notes: text(input.notes, 3000),
    createdAt: new Date().toISOString(),
  }
  workspace.clients = sortClients([...workspace.clients, client])
  persistWorkspace(workspace)
  return client
}

export function updateClient(id: string, input: ClientInput): Client {
  const workspace = loadWorkspace()
  const existing = workspace.clients.find((client) => client.id === id)
  if (!existing) throw new Error('Client not found.')

  const name = text(input.name, 150)
  if (!name) throw new Error('Client name is required.')

  const email = text(input.email, 200)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }

  if (
    workspace.clients.some(
      (client) => client.id !== id && client.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new Error('A client with that name already exists.')
  }

  const updated: Client = {
    ...existing,
    name,
    email: email || null,
    company: nullableText(input.company, 150),
    phone: nullableText(input.phone, 80),
    status: CLIENT_STATUSES.has(input.status) ? input.status : 'Active',
    notes: text(input.notes, 3000),
  }
  workspace.clients = sortClients(
    workspace.clients.map((client) => (client.id === id ? updated : client)),
  )
  persistWorkspace(workspace)
  return updated
}

export function deleteClient(id: string): void {
  const workspace = loadWorkspace()
  if (!workspace.clients.some((client) => client.id === id)) {
    throw new Error('Client not found.')
  }
  const now = new Date().toISOString()
  workspace.clients = workspace.clients.filter((client) => client.id !== id)
  workspace.transactions = workspace.transactions.map((transaction) =>
    transaction.clientId === id ? { ...transaction, clientId: null, updatedAt: now } : transaction,
  )
  persistWorkspace(workspace)
}

export function createCategory(input: CategoryInput): Category {
  const workspace = loadWorkspace()
  const name = text(input.name, 100)
  if (!name) throw new Error('Category name is required.')
  if (!TYPES.has(input.type)) throw new Error('Category type must be income or expense.')
  if (
    workspace.categories.some(
      (category) => category.type === input.type && category.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new Error('That category already exists for this type.')
  }

  const category: Category = {
    id: newId(),
    name,
    type: input.type,
    color: /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : '#8f8f8b',
    createdAt: new Date().toISOString(),
  }
  workspace.categories = sortCategories([...workspace.categories, category])
  persistWorkspace(workspace)
  return category
}

export function updateCategory(id: string, input: { name: string; color: string }): Category {
  const workspace = loadWorkspace()
  const existing = workspace.categories.find((category) => category.id === id)
  if (!existing) throw new Error('Category not found.')

  const name = text(input.name, 100)
  if (!name) throw new Error('Category name is required.')
  if (
    workspace.categories.some(
      (category) =>
        category.id !== id &&
        category.type === existing.type &&
        category.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new Error('That category already exists for this type.')
  }

  const updated: Category = {
    ...existing,
    name,
    color: /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : existing.color,
  }
  workspace.categories = sortCategories(
    workspace.categories.map((category) => (category.id === id ? updated : category)),
  )
  persistWorkspace(workspace)
  return updated
}

export function deleteCategory(id: string): void {
  const workspace = loadWorkspace()
  const usage = workspace.transactions.filter((transaction) => transaction.categoryId === id).length
  if (usage > 0) {
    throw new Error(
      `This category is used by ${usage} transaction${
        usage === 1 ? '' : 's'
      }. Reassign them before deleting.`,
    )
  }
  if (!workspace.categories.some((category) => category.id === id)) {
    throw new Error('Category not found.')
  }
  workspace.categories = workspace.categories.filter((category) => category.id !== id)
  persistWorkspace(workspace)
}

export function saveView(name: string, config: ViewConfig): SavedView {
  const workspace = loadWorkspace()
  const viewName = text(name, 100)
  if (!viewName) throw new Error('Give the view a name.')

  const normalizedConfig = normalizeViewConfig(config)
  const existing = workspace.savedViews.find(
    (view) => view.name.toLowerCase() === viewName.toLowerCase(),
  )
  if (existing) {
    const updated: SavedView = { ...existing, name: viewName, config: normalizedConfig }
    workspace.savedViews = sortViews(
      workspace.savedViews.map((view) => (view.id === existing.id ? updated : view)),
    )
    persistWorkspace(workspace)
    return updated
  }

  const view: SavedView = {
    id: newId(),
    name: viewName,
    config: normalizedConfig,
    createdAt: new Date().toISOString(),
  }
  workspace.savedViews = sortViews([...workspace.savedViews, view])
  persistWorkspace(workspace)
  return view
}

export function deleteView(id: string): void {
  const workspace = loadWorkspace()
  if (!workspace.savedViews.some((view) => view.id === id)) {
    throw new Error('Saved view not found.')
  }
  workspace.savedViews = workspace.savedViews.filter((view) => view.id !== id)
  persistWorkspace(workspace)
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const workspace = loadWorkspace()
  const next = { ...workspace.settings }

  for (const [key, value] of Object.entries(updates)) {
    if (!SETTINGS_KEYS.has(key)) continue
    if (typeof value !== 'string' || value.length > 200) {
      throw new Error(`Invalid value for ${key}.`)
    }
  }

  if (updates.profileName !== undefined) {
    const profileName = text(updates.profileName, 200)
    if (!profileName) throw new Error('Your profile name cannot be empty.')
    next.profileName = profileName
  }
  if (updates.businessName !== undefined) {
    const businessName = text(updates.businessName, 200)
    if (!businessName) throw new Error('Business name cannot be empty.')
    next.businessName = businessName
  }
  if (updates.currency !== undefined) {
    const currency = text(updates.currency, 10).toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Choose a valid 3-letter currency code.')
    next.currency = currency
  }
  if (updates.locale !== undefined) {
    const locale = text(updates.locale, 40)
    if (!locale) throw new Error('Choose a valid locale.')
    next.locale = locale
  }
  if (updates.weekStart !== undefined) {
    if (updates.weekStart !== 'monday' && updates.weekStart !== 'sunday') {
      throw new Error('Week start must be Monday or Sunday.')
    }
    next.weekStart = updates.weekStart
  }

  workspace.settings = next
  persistWorkspace(workspace)
  return next
}

export async function clearFinancialData(): Promise<void> {
  const workspace = loadWorkspace()
  const cleared = emptyWorkspace(workspace.settings)
  persistWorkspace(cleared)
  try {
    await clearAttachmentFiles()
  } catch (error) {
    console.warn('Could not clear local attachment files:', error)
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
