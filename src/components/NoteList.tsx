import { useEffect, useRef, useState } from 'react'
import type { Note, EmbedStatus } from '../types'
import { byTitle, matchesQuery } from '../lib/notes'
import { isEditable } from '../lib/platform'

interface Props {
  notes: Note[]
  loading: boolean
  embedStatus: Record<string, EmbedStatus>
  selectedNoteId: string | null
  onSelect: (id: string) => void
  onNewNote: () => void
  onImportUrl: () => void
  onIndexMissing: () => void
}

// The open space's notes, A to Z — the sidebar's file explorer.
export function NoteList({ notes, loading, embedStatus, selectedNoteId, onSelect, onNewNote, onImportUrl, onIndexMissing }: Props) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const shown = (query.trim() ? notes.filter(n => matchesQuery(`${n.title}\n${n.content}`, query)) : [...notes]).sort(byTitle)
  // Counted from the list, so statuses left over from deleted notes don't count.
  const behind = notes.filter(n => embedStatus[n.id] === 'missing' || embedStatus[n.id] === 'stale').length
  const indexing = notes.some(n => embedStatus[n.id] === 'embedding')

  // "/" jumps to the filter box, as on GitHub and YouTube. Skipped when this
  // copy of the list is hidden (desktop sidebar on a phone, or the reverse).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
      const input = searchRef.current
      if (!input || input.offsetParent === null || document.querySelector('dialog[open]')) return
      e.preventDefault()
      input.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const iconButton = 'w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 flex items-center justify-center rounded-md text-ink-3 transition-colors hover:text-accent-ink hover:bg-tint-2'

  return (
    <nav aria-labelledby="notes-heading" className="px-3 py-4">
      <div className="flex items-center justify-between mb-2 pl-2">
        <h2 id="notes-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-ink-3">
          Notes
        </h2>
        <div className="flex pointer-coarse:-mr-1.5">
          <button onClick={onImportUrl} aria-label="Import from URL" title="Import from URL" className={iconButton}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button onClick={onNewNote} aria-label="New note" title="New note" className={iconButton}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="relative mb-2">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Escape') return
              // First Escape clears, the next leaves the box.
              if (query) { e.preventDefault(); setQuery('') }
              else e.currentTarget.blur()
            }}
            placeholder="Filter notes"
            aria-label="Filter notes"
            className="w-full text-sm rounded-lg pl-3 pr-8 py-1.5 pointer-coarse:py-2.5 bg-surface border border-field text-ink placeholder:text-ink-3 transition-colors focus:border-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {!query && (
            <kbd className="pointer-coarse:hidden absolute right-2 top-1/2 -translate-y-1/2 text-[0.7rem] leading-none px-1.5 py-1 rounded border border-line-2 text-ink-3 font-sans">/</kbd>
          )}
        </div>
      )}

      {/* One note's badge in the editor is enough for one; past that, offer a bulk fix. */}
      {behind > 1 && (
        <div className="flex flex-col gap-1.5 rounded-lg px-3 py-2 mb-2 text-xs bg-danger-tint border border-danger-line">
          <p className="text-ink-2">{behind} notes are missing from search or out of date there.</p>
          <button
            onClick={onIndexMissing}
            disabled={indexing}
            className="self-start font-display font-semibold rounded text-accent-ink hover:underline disabled:text-ink-3 disabled:no-underline disabled:cursor-not-allowed"
          >
            {indexing ? 'Updating…' : 'Update search'}
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="flex flex-col gap-1 px-1">
          <span className="sr-only">Loading notes</span>
          {['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2'].map(w => (
            <div key={w} className="h-8 flex items-center px-2" aria-hidden="true">
              <div className={`h-2.5 ${w} rounded bg-tint-2 animate-pulse`} />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs px-2 mt-1 text-ink-3">No notes yet. Select + to write one.</p>
      ) : shown.length === 0 ? (
        <p className="text-xs px-2 mt-1 text-ink-3">No notes match “{query.trim()}”.</p>
      ) : (
        <ul>
          {shown.map(note => {
            const selected = note.id === selectedNoteId
            const status = embedStatus[note.id]
            return (
              <li key={note.id}>
                <button
                  onClick={() => onSelect(note.id)}
                  aria-current={selected ? 'page' : undefined}
                  className={`w-full flex items-center gap-2 text-left px-3 py-1.5 pointer-coarse:py-3 rounded-lg text-sm transition-colors ${
                    selected ? 'bg-tint-2 text-ink font-medium' : 'text-ink-2 hover:bg-tint hover:text-ink'
                  }`}
                >
                  <span className={`flex-1 truncate ${note.title ? '' : 'text-ink-3'}`}>{note.title || 'Untitled'}</span>
                  {status === 'missing' && (
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-danger" title="Not searchable">
                      <span className="sr-only">(not searchable)</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
