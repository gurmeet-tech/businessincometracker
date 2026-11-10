export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'Paid' | 'Pending' | 'Overdue'
export type ClientStatus = 'Active' | 'Lead' | 'Inactive' | 'Archived'

export interface Attachment {
  id?: string
  name: string
  url: string
  size: number
  mime: string
  createdAt?: string
}

export interface Transaction {
  id: string
  name: string
  clientId: string | null
  categoryId: string | null
  type: TransactionType
  amountCents: number
  date: string
  status: TransactionStatus
  paymentDate: string | null
  paymentMethod: string | null
  notes: string
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  status: ClientStatus
  notes: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  createdAt: string
}

export interface Settings {
  profileName: string
  businessName: string
  currency: string
  locale: string
  weekStart: 'monday' | 'sunday'
}

export interface ViewFilters {
  month: string
  type: 'all' | TransactionType
  category: string
  client: string
  status: 'all' | TransactionStatus | 'unpaid'
}

export type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name-asc'
export type GroupKey = 'none' | 'month' | 'category'
export type ViewMode = 'table' | 'calendar'

export interface ViewConfig {
  filters: ViewFilters
  sort: SortKey
  group: GroupKey
  view: ViewMode
  search: string
}

export interface SavedView {
  id: string
  name: string
  config: ViewConfig
  createdAt: string
}

export interface BootstrapData {
  clients: Client[]
  categories: Category[]
  transactions: Transaction[]
  savedViews: SavedView[]
  settings: Settings
}

export interface TransactionInput {
  name: string
  clientId: string | null
  categoryId: string | null
  type: TransactionType
  amountCents: number
  date: string
  status: TransactionStatus
  paymentDate: string | null
  paymentMethod: string | null
  notes: string
  attachments: Attachment[]
}

export interface ClientInput {
  name: string
  email: string
  company: string
  phone: string
  status: ClientStatus
  notes: string
}

export interface CategoryInput {
  name: string
  type: TransactionType
  color: string
}

export type DateRangeKey =
  | '7d'
  | '30d'
  | 'this-month'
  | 'last-month'
  | '3m'
  | '6m'
  | 'this-year'
  | 'all'
