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
        background: 'rgba(79,156,249,0.03)',
        border: focused ? '1px solid rgba(79,156,249,0.25)' : '1px solid rgba(79,156,249,0.08)',
        boxShadow: focused ? '0 0 0 3px rgba(79,156,249,0.04)' : 'none',
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
          color: '#e2e8f0',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: '1rem',
          fontWeight: 600,
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
        style={{ color: '#64748b', lineHeight: '1.6', fontFamily: "'Inter', system-ui, sans-serif" }}
      />
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(79,156,249,0.08)' }}>
        <span className="text-xs" style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}>⌘ + Enter to save</span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          className="text-xs font-medium px-4 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: content.trim() ? '#4f9cf9' : 'rgba(79,156,249,0.06)',
            color: content.trim() ? '#080c14' : '#1e3a5f',
            cursor: content.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            boxShadow: content.trim() ? '0 0 16px rgba(79,156,249,0.3)' : 'none',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}