import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { Category, TransactionType } from '../types'
import { useData } from '../context/DataContext'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { Button, Field, Modal, Segmented } from './ui'

export const CATEGORY_COLORS = [
  '#5b9df9',
  '#56c08a',
  '#b48ef2',
  '#f2b34c',
  '#64c9d6',
  '#e58a8a',
  '#e0a35e',
  '#7fb2d9',
  '#c2a0e0',
  '#9cc487',
  '#d98aae',
  '#6fc4b8',
  '#a4a29c',
  '#d97373',
]

export function CategoryModal({
  open,
  category,
  defaultType = 'income',
  onClose,
}: {
  open: boolean
  category: Category | null
  defaultType?: TransactionType
  onClose: () => void
}) {
  const { createCategory, updateCategory } = useData()
  const { run, busy } = useAsyncAction()
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>(defaultType)
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setType(category?.type ?? defaultType)
    setColor(category?.color ?? CATEGORY_COLORS[0])
    setError(null)
  }, [open, category, defaultType])

  const save = async () => {
    if (!name.trim()) {
      setError('Category name is required.')
      return
    }
    const succeeded = await run(
      () =>
        category
          ? updateCategory(category.id, { name: name.trim(), color })
          : createCategory({ name: name.trim(), type, color }),
      {
        success: category ? 'Category updated.' : 'Category added.',
        onError: setError,
      },
    )
    if (succeeded) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Edit category' : 'New category'}
      subtitle={
        category
          ? 'Rename the category or change its color. Existing transactions stay linked.'
          : 'Categories organize income and expense records across every view.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} loading={busy}>
            {category ? 'Save category' : 'Add category'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {error && <div className="form-alert">{error}</div>}
        <Field label="Category name" required>
          <input
            className="text-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Client Retainer"
            autoFocus
          />
        </Field>
        {!category && (
          <Field label="Type">
            <Segmented
              value={type}
              onChange={setType}
              size="sm"
              options={[
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
            />
          </Field>
        )}
        <Field label="Color">
          <div className="color-grid">
            {CATEGORY_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                className={`color-swatch ${color === option ? 'active' : ''}`}
                style={{ background: option }}
                onClick={() => setColor(option)}
                aria-label={`Use color ${option}`}
              >
                {color === option && <Check size={13} />}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
