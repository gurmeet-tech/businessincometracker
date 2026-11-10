import { useCallback, useState } from 'react'
import { errorMessage } from '../lib/localStore'
import { useToast } from '../context/ToastContext'

interface RunOptions {
  success?: string
  onError?: (message: string) => void
}

export function useAsyncAction() {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (action: () => Promise<unknown>, options: RunOptions = {}): Promise<boolean> => {
      setBusy(true)
      try {
        await action()
        if (options.success) toast(options.success, 'success')
        return true
      } catch (error) {
        const message = errorMessage(error)
        if (options.onError) options.onError(message)
        else toast(message, 'error')
        return false
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )

  return { run, busy }
}
