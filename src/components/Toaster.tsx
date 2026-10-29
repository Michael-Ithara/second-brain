import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext, type ToastInput } from '../lib/toast'
import { UNDO_MS } from '../lib/deferred'
import { isEditable } from '../lib/platform'

interface Toast extends ToastInput {
  id: number
}

const MAX_VISIBLE = 3

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  // An undo toast lives exactly as long as the undo window, so Undo is never
  // offered after the delete has gone through.
  const duration = toast.duration ?? (toast.action ? UNDO_MS : 4000)

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), duration)
    return () => clearTimeout(t)
  }, [toast.id, duration, onDismiss])

  return (
    // Always dark, like system banners, so it stands apart in either theme.
    <div className="scheme-dark pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-2xl pl-4 pr-2 py-2.5 bg-[#1b1e26] border border-white/10 shadow-dialog text-ink animate-[toast-in_200ms_ease-out]">
      {toast.tone === 'error' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-danger" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <p className="flex-1 text-sm leading-snug py-1">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id) }}
          className="shrink-0 font-display text-sm font-bold px-3 py-1.5 rounded-lg text-accent-ink transition-colors hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink hover:bg-white/10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++
    setToasts(prev => [...prev, { ...input, id }].slice(-MAX_VISIBLE))
  }, [])

  // Cmd/Ctrl+Z runs the newest toast's action (Undo) — unless the user is
  // typing, where it must keep meaning "undo my typing".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== 'z' || isEditable(e.target)) return
      const latest = [...toasts].reverse().find(t => t.action)
      if (!latest) return
      e.preventDefault()
      latest.action!.onClick()
      dismiss(latest.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toasts, dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <style>{`@keyframes toast-in { from { opacity: 0; translate: 0 8px } to { opacity: 1; translate: 0 0 } }`}</style>
      <div
        role="region"
        aria-label="Notifications"
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
      >
        {/* Polite: announced after the current speech, not over it. */}
        <div aria-live="polite" className="w-full flex flex-col items-center gap-2">
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
