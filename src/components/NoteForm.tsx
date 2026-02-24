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

  return (
    <div
      className="rounded-xl p-4 mb-6 transition-all duration-200"
      style={{
        background: '#111318',
        border: focused ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.03)' : 'none'
      }}
    >
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Title"
        className="w-full bg-transparent text-sm font-medium outline-none mb-3"
        style={{
          color: '#f0ede8',
          fontFamily: 'Instrument Serif, serif',
          fontSize: '1rem',
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
        style={{ color: '#8a8a9a', lineHeight: '1.6' }}
      />
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs" style={{ color: '#3a3a4a' }}>⌘ + Enter to save</span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          className="text-xs font-medium px-4 py-1.5 rounded-lg transition-all"
          style={{
            background: content.trim() ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.05)',
            color: content.trim() ? '#0f0f0f' : '#3a3a4a',
            cursor: content.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}