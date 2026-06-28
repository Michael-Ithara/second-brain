import { useState } from 'react'

interface Props {
  onSubmit: (title: string, content: string) => Promise<void>
}

export function NoteForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSaving(true)
    await onSubmit(title.trim(), content.trim())
    setTitle('')
    setContent('')
    setSaving(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  const hasContent = content.trim().length > 0

  return (
    <div
      className="rounded-xl p-4 mb-6 transition-all duration-300"
      style={{
        background: focused
          ? 'rgba(91,156,246,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: focused
          ? '1px solid rgba(91,156,246,0.3)'
          : '1px solid rgba(91,156,246,0.08)',
        boxShadow: focused
          ? '0 0 0 3px rgba(91,156,246,0.06), 0 0 24px rgba(91,156,246,0.08)'
          : 'none',
      }}
    >
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Title"
        className="w-full bg-transparent outline-none mb-3"
        style={{
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: 600,
          fontFamily: 'inherit',
        }}
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Write a note, paste an article, dump your thoughts..."
        rows={4}
        className="w-full bg-transparent text-sm outline-none resize-none"
        style={{
          color: '#94a3b8',
          lineHeight: '1.65',
          fontFamily: 'inherit',
        }}
      />
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: '1px solid rgba(91,156,246,0.08)' }}
      >
        <span className="text-xs" style={{ color: '#1e3a5f' }}>⌘ + Enter to save</span>
        <button
          onClick={handleSubmit}
          disabled={!hasContent || saving}
          className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: hasContent ? '#5b9cf6' : 'rgba(91,156,246,0.06)',
            color: hasContent ? '#080c14' : '#1e3a5f',
            cursor: hasContent ? 'pointer' : 'not-allowed',
            boxShadow: hasContent ? '0 0 20px rgba(91,156,246,0.4)' : 'none',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            if (hasContent) {
              e.currentTarget.style.background = '#7ab3f8'
              e.currentTarget.style.boxShadow = '0 0 28px rgba(91,156,246,0.6)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={e => {
            if (hasContent) {
              e.currentTarget.style.background = '#5b9cf6'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(91,156,246,0.4)'
              e.currentTarget.style.transform = 'translateY(0)'
            }
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}