import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
import { storeAttachmentFile } from '../lib/attachments'
import {
  WORKSPACE_STORAGE_KEY,
  clearFinancialData as clearLocalFinancialData,
  createCategory as createLocalCategory,
  createClient as createLocalClient,
  createTransaction as createLocalTransaction,
  deleteCategory as deleteLocalCategory,
  deleteClient as deleteLocalClient,
  deleteTransaction as deleteLocalTransaction,
  deleteView as deleteLocalView,
  emptyWorkspace,
  errorMessage,
  loadWorkspace,
  saveView as saveLocalView,
  updateCategory as updateLocalCategory,
  updateClient as updateLocalClient,
  updateSettings as updateLocalSettings,
  updateTransaction as updateLocalTransaction,
} from '../lib/localStore'

interface DataContextValue {
  clients: Client[]
  categories: Category[]
  transactions: Transaction[]
  savedViews: SavedView[]
  settings: Settings
  loading: boolean
  error: string | null
  refresh: (withLoader?: boolean) => Promise<void>
  createTransaction: (input: TransactionInput) => Promise<Transaction>
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  createClient: (input: ClientInput) => Promise<Client>
  updateClient: (id: string, input: ClientInput) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
  createCategory: (input: CategoryInput) => Promise<Category>
  updateCategory: (id: string, input: { name: string; color: string }) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  saveView: (name: string, config: ViewConfig) => Promise<SavedView>
  deleteView: (id: string) => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>
  uploadFile: (file: File) => Promise<Attachment>
  clearFinancialData: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData>(() => emptyWorkspace())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncFromStorage = useCallback(() => {
    try {
      setData(loadWorkspace())
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const refresh = useCallback(
    async (withLoader = false) => {
      if (withLoader) setLoading(true)
      syncFromStorage()
      setLoading(false)
    },
    [syncFromStorage],
  )

  useEffect(() => {
    syncFromStorage()
    setLoading(false)
  }, [syncFromStorage])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKSPACE_STORAGE_KEY || event.key === null) syncFromStorage()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [syncFromStorage])

  const persistAndRefresh = useCallback(<T,>(action: () => T): T => {
    const result = action()
    setData(loadWorkspace())
    setError(null)
    return result
  }, [])

  const createTransaction = useCallback(
    async (input: TransactionInput) =>
      persistAndRefresh(() => createLocalTransaction(input)),
    [persistAndRefresh],
  )

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) =>
      persistAndRefresh(() => updateLocalTransaction(id, input)),
    [persistAndRefresh],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      persistAndRefresh(() => deleteLocalTransaction(id))
    },
    [persistAndRefresh],
  )

  const createClient = useCallback(
    async (input: ClientInput) => persistAndRefresh(() => createLocalClient(input)),
    [persistAndRefresh],
  )

  const updateClient = useCallback(
    async (id: string, input: ClientInput) =>
      persistAndRefresh(() => updateLocalClient(id, input)),
    [persistAndRefresh],
  )

  const deleteClient = useCallback(
    async (id: string) => {
      persistAndRefresh(() => deleteLocalClient(id))
    },
    [persistAndRefresh],
  )

  const createCategory = useCallback(
    async (input: CategoryInput) => persistAndRefresh(() => createLocalCategory(input)),
    [persistAndRefresh],
  )

  const updateCategory = useCallback(
    async (id: string, input: { name: string; color: string }) =>
      persistAndRefresh(() => updateLocalCategory(id, input)),
    [persistAndRefresh],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      persistAndRefresh(() => deleteLocalCategory(id))
    },
    [persistAndRefresh],
  )

  const saveView = useCallback(
    async (name: string, config: ViewConfig) =>
      persistAndRefresh(() => saveLocalView(name, config)),
    [persistAndRefresh],
  )

  const deleteView = useCallback(
    async (id: string) => {
      persistAndRefresh(() => deleteLocalView(id))
    },
    [persistAndRefresh],
  )

  const updateSettings = useCallback(
    async (settings: Partial<Settings>) =>
      persistAndRefresh(() => updateLocalSettings(settings)),
    [persistAndRefresh],
  )

  const uploadFile = useCallback(async (file: File) => storeAttachmentFile(file), [])

  const clearFinancialData = useCallback(async () => {
    await clearLocalFinancialData()
    setData(loadWorkspace())
    setError(null)
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      loading,
      error,
      refresh,
      createTransaction,
      updateTransaction,
      deleteTransaction,
      createClient,
      updateClient,
      deleteClient,
      createCategory,
      updateCategory,
      deleteCategory,
      saveView,
      deleteView,
      updateSettings,
      uploadFile,
      clearFinancialData,
    }),
    [
      data,
      loading,
      error,
      refresh,
      createTransaction,
      updateTransaction,
      deleteTransaction,
      createClient,
      updateClient,
      deleteClient,
      createCategory,
      updateCategory,
      deleteCategory,
      saveView,
      deleteView,
      updateSettings,
      uploadFile,
      clearFinancialData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
