import { useEffect, useRef, useState } from 'react'
import { invokeFunction } from '../lib/supabase'

interface ScrapeResult {
  title: string
  content: string
  url: string
}

interface Props {
  onImport: (title: string, content: string, sourceUrl: string) => Promise<void>
  onClose: () => void
}

export function UrlImportModal({ onImport, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // showModal() gives us a real modal: focus moves in and is trapped, the page
  // behind goes inert, and Escape fires `close`. The dialog is removed from the
  // DOM rather than closed, so focus is handed back to the opener by hand.
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) dialog.showModal()
    return () => opener?.focus()
  }, [])

  const handleFetch = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const result = await invokeFunction<ScrapeResult>('scrape-url', { url: url.trim() })
      setPreview(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch URL')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview) return
    setLoading(true)
    await onImport(preview.title, preview.content, preview.url)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="url-import-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself; clicks on content land on children.
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg p-0 bg-transparent backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="rounded-2xl p-4 sm:p-6 bg-surface border border-line-2 shadow-dialog text-ink">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="url-import-title" className="font-display text-lg font-semibold text-ink">
            Import from URL
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 -mr-1.5 flex items-center justify-center rounded-md text-ink-2 transition-colors hover:text-ink hover:bg-tint-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* URL Input */}
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            aria-label="Article URL"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'url-import-error' : undefined}
            className="flex-1 text-sm rounded-xl px-3.5 py-2.5 bg-tint border border-field text-ink placeholder:text-ink-3 focus:border-ring focus-visible:outline-none"
          />
          <button
            onClick={handleFetch}
            disabled={!url.trim() || loading}
            className="font-display text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0 bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:cursor-not-allowed"
          >
            {loading && !preview ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p id="url-import-error" role="alert" className="text-xs mb-4 px-1 text-danger">{error}</p>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-xl p-4 mb-4 bg-tint border border-line">
            <p className="font-display text-sm font-semibold mb-1 text-ink">
              {preview.title || 'Untitled'}
            </p>
            <p className="text-xs leading-relaxed line-clamp-4 text-ink-2">
              {preview.content}
            </p>
            <p className="text-xs mt-2 truncate text-ink-3">
              {preview.url}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl transition-colors text-ink-2 hover:text-ink"
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="font-display text-xs font-semibold px-4 py-2 rounded-xl transition-colors bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? 'Importing...' : 'Import as note'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
