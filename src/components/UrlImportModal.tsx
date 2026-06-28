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
  const [urlFocused, setUrlFocused] = useState(false)

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

  const hasUrl = url.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: 'rgba(8,12,20,0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          background: 'linear-gradient(160deg, #0d1a2e 0%, #080c14 100%)',
          border: '1px solid rgba(91,156,246,0.18)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(91,156,246,0.06)',
          animation: 'fadeUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between mb-5"
          style={{ borderBottom: '1px solid rgba(91,156,246,0.08)', paddingBottom: '1rem' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(91,156,246,0.15)',
                border: '1px solid rgba(91,156,246,0.3)',
                boxShadow: '0 0 10px rgba(91,156,246,0.15)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b9cf6" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              Import from URL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs transition-colors duration-200"
            style={{ color: '#1e3a5f', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
          >
            ✕
          </button>
        </div>

        {/* URL input */}
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setUrlFocused(true)}
            onBlur={() => setUrlFocused(false)}
            placeholder="https://..."
            className="flex-1 text-sm outline-none rounded-xl px-3.5 py-2.5 transition-all duration-300"
            style={{
              background: urlFocused ? 'rgba(91,156,246,0.06)' : 'rgba(91,156,246,0.03)',
              border: urlFocused
                ? '1px solid rgba(91,156,246,0.45)'
                : '1px solid rgba(91,156,246,0.12)',
              color: '#ffffff',
              fontFamily: 'inherit',
              boxShadow: urlFocused
                ? '0 0 0 3px rgba(91,156,246,0.08), 0 0 20px rgba(91,156,246,0.1)'
                : 'none',
            }}
          />
          <button
            onClick={handleFetch}
            disabled={!hasUrl || loading}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shrink-0"
            style={{
              background: hasUrl ? '#5b9cf6' : 'rgba(91,156,246,0.06)',
              color: hasUrl ? '#080c14' : '#1e3a5f',
              cursor: hasUrl ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: hasUrl ? '0 0 20px rgba(91,156,246,0.4)' : 'none',
            }}
            onMouseEnter={e => {
              if (hasUrl) {
                e.currentTarget.style.background = '#7ab3f8'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(91,156,246,0.6)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              if (hasUrl) {
                e.currentTarget.style.background = '#5b9cf6'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(91,156,246,0.4)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {loading && !preview ? 'Fetching...' : 'Fetch'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-xs"
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171',
              fontFamily: 'inherit',
            }}
          >
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: 'rgba(91,156,246,0.04)',
              border: '1px solid rgba(91,156,246,0.12)',
            }}
          >
            <p
              className="text-sm font-semibold mb-1.5"
              style={{ color: '#ffffff', fontFamily: 'inherit', letterSpacing: '-0.01em' }}
            >
              {preview.title || 'Untitled'}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{
                color: '#475569',
                fontFamily: 'inherit',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {preview.content}
            </p>
            <p
              className="text-xs mt-2 truncate"
              style={{ color: '#1e3a5f', fontFamily: 'inherit' }}
            >
              {preview.url}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl transition-colors duration-200"
            style={{ color: '#475569', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200"
              style={{
                background: '#5b9cf6',
                color: '#080c14',
                fontFamily: 'inherit',
                boxShadow: '0 0 20px rgba(91,156,246,0.4)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#7ab3f8'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(91,156,246,0.6)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#5b9cf6'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(91,156,246,0.4)'
                e.currentTarget.style.transform = 'translateY(0)'
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