import { useEffect, useRef, useState } from 'react'
import type { Note, EmbedStatus } from '../types'
import { formatDate, hostOf, isEdited } from '../lib/notes'
import { modKey } from '../lib/platform'
import { EmbedBadge } from './NoteCard'

interface Props {
  note: Note
  status?: EmbedStatus
  onSave: (title: string, content: string) => Promise<void>
  onRetry: () => void
  onClose: () => void
}

export function NoteDialog({ note, status, onSave, onRetry, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Same pattern as UrlImportModal: showModal() traps focus and makes the page
  // inert; focus goes back to the opener when the dialog unmounts.
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) dialog.showModal()
    return () => opener?.focus()
  }, [])

  useEffect(() => {
    if (editing) contentRef.current?.focus()
  }, [editing])

  const dirty = title !== note.title || content !== note.content

  const startEditing = () => {
    setTitle(note.title)
    setContent(note.content)
    setError(null)
    setEditing(true)
  }

  // Returns false if the user wants to keep their unsaved changes.
  const discardEdits = () => {
    if (editing && dirty && !window.confirm('Discard your changes to this note?')) return false
    setEditing(false)
    setError(null)
    return true
  }

  const requestClose = () => {
    if (discardEdits()) onClose()
  }

  const handleSave = async () => {
    if (!content.trim() || saving) return
    if (!dirty) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(title.trim(), content.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
  }

  const handleCancel = (e: React.SyntheticEvent) => {
    // Escape while editing leaves edit mode instead of closing the note.
    if (editing) {
      e.preventDefault()
      discardEdits()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="note-dialog-title"
      onCancel={handleCancel}
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) requestClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] p-0 bg-transparent backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col max-h-[85dvh] rounded-2xl bg-surface border border-line-2 shadow-dialog text-ink">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-5 pb-4 border-b border-line">
          {editing ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Title"
              aria-label="Note title"
              className="flex-1 min-w-0 bg-transparent font-display text-lg font-semibold text-ink placeholder:text-ink-3 rounded-md -mx-1.5 px-1.5 py-0.5 border border-field focus:border-ring focus-visible:outline-none"
            />
          ) : (
            <h2 id="note-dialog-title" className={`flex-1 min-w-0 font-display text-lg font-semibold py-0.5 ${note.title ? 'text-ink' : 'text-ink-3'}`}>
              {note.title || 'Untitled note'}
            </h2>
          )}
          {/* Keep the label target in the DOM while editing */}
          {editing && <h2 id="note-dialog-title" className="sr-only">Edit note</h2>}
          <button
            onClick={requestClose}
            aria-label="Close"
            className="w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 -mr-1.5 mt-0.5 flex items-center justify-center rounded-md shrink-0 text-ink-2 transition-colors hover:text-ink hover:bg-tint-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {editing ? (
            <textarea
              ref={contentRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Note content"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'note-dialog-error' : undefined}
              rows={14}
              className="w-full bg-transparent text-sm leading-relaxed resize-y text-ink rounded-lg p-3 border border-field focus:border-ring focus-visible:outline-none"
            />
          ) : (
            <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap wrap-break-word">
              {note.content}
            </p>
          )}
          {error && (
            <p id="note-dialog-error" role="alert" className="text-xs mt-3 text-danger">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-line">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3 min-w-0">
            {editing ? (
              <span>{modKey} + Enter to save · Esc to cancel</span>
            ) : (
              <>
                <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
                {isEdited(note) && (
                  <span>Edited <time dateTime={note.updated_at}>{formatDate(note.updated_at)}</time></span>
                )}
                {note.source_url && (
                  <a
                    href={note.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate max-w-[16rem] rounded text-accent-ink hover:text-accent-ink-hover hover:underline"
                  >
                    {hostOf(note.source_url)}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                <EmbedBadge status={status} onRetry={onRetry} />
              </>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={discardEdits}
                  className="text-xs px-4 py-2 rounded-xl transition-colors text-ink-2 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="font-display text-xs font-semibold px-4 py-2 rounded-xl transition-colors bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={startEditing}
                className="font-display text-xs font-semibold px-4 py-2 rounded-xl transition-colors text-accent-ink bg-tint border border-line-2 hover:bg-tint-2"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
