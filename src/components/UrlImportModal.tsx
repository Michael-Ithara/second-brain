import { useState } from 'react'
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
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    if (e.key === 'Escape') onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          background: '#111318',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: '1.1rem',
            color: '#f0ede8'
          }}>
            Import from URL
          </h2>
          <button
            onClick={onClose}
            className="text-xs transition-colors"
            style={{ color: '#3a3a4a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6a6a7a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
          >
            ✕
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
            className="flex-1 text-sm outline-none rounded-xl px-3.5 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0ede8',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <button
            onClick={handleFetch}
            disabled={!url.trim() || loading}
            className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all shrink-0"
            style={{
              background: url.trim() ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.05)',
              color: url.trim() ? '#0f0f0f' : '#3a3a4a',
              cursor: url.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            {loading && !preview ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs mb-4 px-1" style={{ color: '#f87171' }}>{error}</p>
        )}

        {/* Preview */}
        {preview && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <p className="text-sm font-medium mb-1" style={{
              color: '#f0ede8',
              fontFamily: 'Instrument Serif, serif'
            }}>
              {preview.title || 'Untitled'}
            </p>
            <p className="text-xs leading-relaxed" style={{
              color: '#5a5a6a',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {preview.content}
            </p>
            <p className="text-xs mt-2 truncate" style={{ color: '#3a3a4a' }}>
              {preview.url}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl transition-all"
            style={{ color: '#4a4a5a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8a8a9a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a4a5a')}
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="text-xs font-medium px-4 py-2 rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: '#0f0f0f',
              }}
            >
              {loading ? 'Importing...' : 'Import as note'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}