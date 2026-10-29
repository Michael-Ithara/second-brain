import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Note, Space } from '../types'
import { useNotes } from '../hooks/useNotes'
import { isEditable } from '../lib/platform'
import { matchesQuery } from '../lib/notes'
import { NoteForm, type NoteFormHandle } from './NoteForm'
import { NoteCard } from './NoteCard'
import { ChatPanel, type ChatPanelHandle } from './ChatPanel'
import { UrlImportModal } from './UrlImportModal'
import { NoteDialog } from './NoteDialog'

// What the command palette can do inside the open space.
export interface SpaceViewHandle {
  notes: Note[]
  newNote: () => void
  importUrl: () => void
  ask: (question: string) => void
  openNote: (id: string) => void
}

interface Props {
  space: Space
  ref?: React.Ref<SpaceViewHandle>
}

function NoteSkeleton() {
  return (
    <div className="rounded-xl p-4 bg-surface border border-line animate-pulse" aria-hidden="true">
      <div className="h-3.5 w-2/5 rounded bg-tint-2" />
      <div className="mt-3 h-2.5 w-full rounded bg-tint" />
      <div className="mt-2 h-2.5 w-4/5 rounded bg-tint" />
      <div className="mt-4 h-2 w-16 rounded bg-tint" />
    </div>
  )
}

export function SpaceView({ space, ref }: Props) {
  const { notes, loading, embedStatus, fresh, createNote, updateNote, deleteNote, retryEmbedding, indexMissing } = useNotes(space.id)
  const statuses = Object.values(embedStatus)
  const missingCount = statuses.filter(s => s === 'missing').length
  const indexing = statuses.includes('embedding')
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  // Below lg there's room for one column; this picks which. Both stay mounted
  // so switching doesn't lose the chat or a half-written note.
  const [pane, setPane] = useState<'notes' | 'chat'>('notes')
  const openNote = notes.find(n => n.id === openNoteId)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<NoteFormHandle>(null)
  const chatRef = useRef<ChatPanelHandle>(null)
  const shown = query.trim() ? notes.filter(n => matchesQuery(`${n.title}\n${n.content}`, query)) : notes

  useImperativeHandle(ref, () => ({
    notes,
    newNote: () => { setPane('notes'); formRef.current?.focus() },
    importUrl: () => setShowUrlModal(true),
    ask: question => { setPane('chat'); chatRef.current?.ask(question) },
    openNote: setOpenNoteId,
  }), [notes])

  // "/" jumps to the filter box, as on GitHub and YouTube.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
      if (!searchRef.current || document.querySelector('dialog[open]')) return
      e.preventDefault()
      setPane('notes')
      searchRef.current.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // Starter questions for the empty chat, from the newest titled notes.
  const suggestions = notes.length === 0 ? [] : [
    ...notes.filter(n => n.title).slice(0, 2).map((n, i) =>
      i === 0 ? `What are the key points in “${n.title}”?` : `Summarize what I wrote about ${n.title}`),
    'What have I written about most recently?',
  ]

  const handleUrlImport = async (title: string, content: string, sourceUrl: string) => {
    await createNote(title, content, sourceUrl)
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* URL Import Modal */}
      {showUrlModal && (
        <UrlImportModal
          onImport={handleUrlImport}
          onClose={() => setShowUrlModal(false)}
        />
      )}

      {openNote && (
        <NoteDialog
          key={openNote.id}
          note={openNote}
          status={embedStatus[openNote.id]}
          onSave={(title, content) => updateNote(openNote.id, title, content)}
          onRetry={() => retryEmbedding(openNote.id)}
          onClose={() => setOpenNoteId(null)}
        />
      )}

      {/* Notes / Chat switch — a segmented control, narrow screens only */}
      <div className="lg:hidden shrink-0 px-4 py-2 border-b border-line">
        <div role="group" aria-label="Show" className="grid grid-cols-2 p-0.5 rounded-lg bg-tint border border-line">
          {(['notes', 'chat'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPane(p)}
              aria-pressed={pane === p}
              className={`py-1.5 rounded-md text-sm font-medium transition-colors ${
                pane === p ? 'bg-raised text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {p === 'notes' ? 'Notes' : 'Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* Notes column */}
      <div className={`${pane === 'notes' ? 'block' : 'hidden'} lg:block flex-1 min-h-0 overflow-y-auto bg-canvas`}>
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-3xl sm:text-[2.5rem] font-extrabold text-ink tracking-[-0.035em] leading-tight wrap-break-word">
                  {space.name}
                </h2>
                {space.description && (
                  <p className="text-sm mt-1.5 text-ink-2">
                    {space.description}
                  </p>
                )}
                {!loading && (
                  <p className="text-xs mt-1 text-ink-3">
                    {query.trim() && `${shown.length} of `}{notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </p>
                )}
              </div>

              {/* Import URL button */}
              <button
                onClick={() => setShowUrlModal(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 pointer-coarse:py-2.5 rounded-lg transition-colors duration-200 text-accent-ink bg-tint border border-line-2 hover:bg-tint-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Import URL
              </button>
            </div>
          </div>

          <NoteForm ref={formRef} onSubmit={createNote} />

          {/* One card's Retry is enough for one note; past that, offer a bulk fix. */}
          {missingCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 text-xs bg-danger-tint border border-danger-line">
              <p className="text-ink-2">
                {missingCount} notes aren't searchable, so chat can't use them.
              </p>
              <button
                onClick={indexMissing}
                disabled={indexing}
                className="font-display font-semibold px-3 py-1.5 rounded-lg transition-colors text-accent-ink bg-tint border border-line-2 hover:bg-tint-2 disabled:text-ink-3 disabled:cursor-not-allowed"
              >
                {indexing ? 'Indexing…' : 'Make all searchable'}
              </button>
            </div>
          )}

          {notes.length > 0 && (
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>
              </svg>
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
                className="w-full text-sm rounded-lg pl-9 pr-9 py-2 pointer-coarse:py-2.5 bg-surface border border-field text-ink placeholder:text-ink-3 transition-colors focus:border-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  onClick={() => { setQuery(''); searchRef.current?.focus() }}
                  aria-label="Clear filter"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 pointer-coarse:w-9 pointer-coarse:h-9 flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-tint"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              ) : (
                <kbd className="pointer-coarse:hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.7rem] leading-none px-1.5 py-1 rounded border border-line-2 text-ink-3 font-sans">/</kbd>
              )}
            </div>
          )}

          {loading ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="sr-only">Loading notes</span>
              <NoteSkeleton />
              <NoteSkeleton />
              <NoteSkeleton />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tint border border-line-2 text-accent-ink">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="text-sm text-ink-2">
                No notes yet. Add one above.
              </p>
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <p className="text-sm text-ink-2">
                No notes match “{query.trim()}”.
              </p>
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus() }}
                className="text-xs rounded text-accent-ink hover:text-accent-ink-hover hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shown.map(note => (
                <NoteCard
                  key={fresh[note.id] ?? note.id}
                  entering={note.id in fresh}
                  note={note}
                  status={embedStatus[note.id]}
                  onOpen={setOpenNoteId}
                  onDelete={deleteNote}
                  onRetry={retryEmbedding}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`${pane === 'chat' ? 'flex' : 'hidden'} lg:flex flex-1 lg:flex-none min-h-0 lg:w-96 flex-col lg:border-l border-line`}>
        <ChatPanel ref={chatRef} spaceId={space.id} onOpenNote={setOpenNoteId} suggestions={suggestions} />
      </div>
    </div>
  )
}
