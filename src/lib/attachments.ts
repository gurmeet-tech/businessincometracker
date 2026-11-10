import type { Attachment } from '../types'

const DB_NAME = 'finance-tracker-files'
const DB_VERSION = 1
const STORE_NAME = 'attachments'
const URL_PREFIX = 'local-file:'

interface StoredAttachment {
  id: string
  name: string
  mime: string
  size: number
  blob: Blob
  createdAt: string
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function attachmentId(url: string): string | null {
  if (!url.startsWith(URL_PREFIX)) return null
  const id = url.slice(URL_PREFIX.length).trim()
  return id || null
}

export function isLocalFileUrl(url: string): boolean {
  return attachmentId(url) !== null
}

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('File attachments are unavailable because this browser blocked local storage.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      databasePromise = null
      reject(new Error('This browser could not open local file storage.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('Local file storage is busy. Close other tabs and try again.'))
    }
  })

  return databasePromise
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Local file storage failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Local file storage was cancelled.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local file storage failed.'))
  })
}

export async function storeAttachmentFile(file: File): Promise<Attachment> {
  const id = newId()
  const mime = file.type || 'application/octet-stream'
  const createdAt = new Date().toISOString()
  const record: StoredAttachment = {
    id,
    name: file.name || 'Attachment',
    mime,
    size: file.size,
    blob: file.slice(0, file.size, mime),
    createdAt,
  }

  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(record)
  await transactionDone(transaction)

  return {
    id,
    name: record.name,
    url: `${URL_PREFIX}${id}`,
    size: record.size,
    mime: record.mime,
    createdAt,
  }
}

export async function openAttachment(url: string): Promise<void> {
  const id = attachmentId(url)
  if (!id) return

  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const record = await requestResult<StoredAttachment | undefined>(
    transaction.objectStore(STORE_NAME).get(id),
  )
  if (!record) {
    throw new Error('This attached file is no longer available on this device.')
  }

  const objectUrl = URL.createObjectURL(record.blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.download = record.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function deleteAttachmentFiles(attachments: Attachment[]): Promise<void> {
  const ids = attachments
    .map((attachment) => attachmentId(attachment.url))
    .filter((id): id is string => Boolean(id))
  if (ids.length === 0) return

  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  for (const id of ids) store.delete(id)
  await transactionDone(transaction)
}

export async function clearAttachmentFiles(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).clear()
  await transactionDone(transaction)
}
