import { useState } from 'react'
import { modKey } from '../lib/platform'
import { useToast } from '../lib/toast'

interface Props {
  onSubmit: (title: string, content: string) => Promise<void>
}

export function NoteForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await onSubmit(title.trim(), content.trim())
      setTitle('')
      setContent('')
    } catch {
      // Keep what they wrote; losing a note to a network blip is the worst outcome.
      toast({ tone: 'error', message: 'Couldn’t save the note. Your text is still here — try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  const canSave = content.trim() && !saving

  return (
    // The fields drop their own outline; the card's focus-within border is the
    // focus indicator (ring colour, ≥5:1), so focus stays visible.
    <div className="rounded-xl p-4 mb-6 transition-colors duration-200 bg-surface border border-field focus-within:border-ring">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Note title"
        className="w-full bg-transparent mb-3 font-display text-base font-semibold text-ink placeholder:text-ink-3 focus-visible:outline-none"
      />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a note, paste an article, dump your thoughts..."
        aria-label="Note content"
        rows={4}
        className="w-full bg-transparent text-sm resize-none leading-relaxed text-ink placeholder:text-ink-3 focus-visible:outline-none"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <span className="text-xs text-ink-3">{modKey} + Enter to save</span>
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="font-display text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors duration-200 bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
