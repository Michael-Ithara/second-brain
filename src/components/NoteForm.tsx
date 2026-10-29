import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { modKey } from '../lib/platform'
import { useToast } from '../lib/toast'

export interface NoteFormHandle {
  focus: () => void
}

interface Props {
  onSubmit: (title: string, content: string) => Promise<void>
  ref?: React.Ref<NoteFormHandle>
}

export function NoteForm({ onSubmit, ref }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const toast = useToast()
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  // What's in the fields right now, for the failure path below (kept in a ref
  // because it runs after an await, when the state it closed over is stale).
  const draft = useRef({ title: '', content: '' })

  useImperativeHandle(ref, () => ({
    focus: () => {
      titleRef.current?.focus()
      titleRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    },
  }), [])

  const setDraft = (next: { title: string; content: string }) => {
    draft.current = next
    setTitle(next.title)
    setContent(next.content)
  }

  // Grow with the text, up to about 16 lines; then it scrolls.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 384)}px`
  }, [content])

  // The note shows up in the list straight away (useNotes adds it optimistically),
  // so the form clears at once instead of waiting on the server.
  const handleSubmit = () => {
    const saved = { title: title.trim(), content: content.trim() }
    if (!saved.content) return
    setDraft({ title: '', content: '' })
    onSubmit(saved.title, saved.content).catch(() => {
      // Losing a note to a network blip is the worst outcome: put the text back,
      // unless they've already started the next note.
      if (!draft.current.title && !draft.current.content) setDraft(saved)
      toast({ tone: 'error', message: 'Couldn’t save the note. Your text is back in the form — try again.' })
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  return (
    // The fields drop their own outline; the card's focus-within border is the
    // focus indicator (ring colour, ≥5:1), so focus stays visible.
    <div className="rounded-xl p-4 mb-6 transition-colors duration-200 bg-surface border border-field focus-within:border-ring">
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={e => setDraft({ title: e.target.value, content })}
        onKeyDown={handleKeyDown}
        placeholder="Title"
        aria-label="Note title"
        className="w-full bg-transparent mb-3 font-display text-base font-semibold text-ink placeholder:text-ink-3 focus-visible:outline-none"
      />
      <textarea
        ref={contentRef}
        value={content}
        onChange={e => setDraft({ title, content: e.target.value })}
        onKeyDown={handleKeyDown}
        placeholder="Write a note, paste an article, dump your thoughts..."
        aria-label="Note content"
        rows={3}
        className="w-full bg-transparent text-sm resize-none leading-relaxed text-ink placeholder:text-ink-3 focus-visible:outline-none"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <span className="text-xs text-ink-3">{modKey} + Enter to save</span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="font-display text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors duration-200 bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  )
}
