import { createContext, useContext } from 'react'

export interface ToastInput {
  message: string
  tone?: 'info' | 'error'
  // e.g. Undo. Also triggered by Cmd/Ctrl+Z while it's the newest toast.
  action?: { label: string; onClick: () => void }
  duration?: number
}

export const ToastContext = createContext<(toast: ToastInput) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
