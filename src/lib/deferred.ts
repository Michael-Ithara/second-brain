// Deletes wait a few seconds before they reach the database, so they can be
// undone. The item leaves the UI at once; the real delete runs when the timer
// fires, or straight away if the page is being hidden or closed (so a pending
// delete isn't silently dropped).

export const UNDO_MS = 6000

const pending = new Map<string, { timer: number; commit: () => Promise<void> }>()

export function defer(key: string, commit: () => Promise<void>, ms = UNDO_MS) {
  cancelDeferred(key)
  const timer = window.setTimeout(() => {
    pending.delete(key)
    void commit()
  }, ms)
  pending.set(key, { timer, commit })
}

// True if the action was still waiting (and is now cancelled); false if it
// already ran, so the caller knows undo came too late.
export function cancelDeferred(key: string): boolean {
  const entry = pending.get(key)
  if (!entry) return false
  clearTimeout(entry.timer)
  pending.delete(key)
  return true
}

export function isDeferred(key: string) {
  return pending.has(key)
}

export function flushDeferred() {
  for (const [key, entry] of pending) {
    clearTimeout(entry.timer)
    pending.delete(key)
    void entry.commit()
  }
}

// visibilitychange fires earlier and more reliably than pagehide (tab switch,
// app switch on mobile); pagehide covers closing and navigating away.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushDeferred()
})
window.addEventListener('pagehide', flushDeferred)
