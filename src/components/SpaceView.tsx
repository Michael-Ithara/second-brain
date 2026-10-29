import { useState } from 'react'
import type { Space } from '../types'
import { useNotes } from '../hooks/useNotes'
import { NoteForm } from './NoteForm'
import { NoteCard } from './NoteCard'
import { ChatPanel } from './ChatPanel'
import { UrlImportModal } from './UrlImportModal'
import { NoteDialog } from './NoteDialog'

interface Props {
  space: Space
}

export function SpaceView({ space }: Props) {
  const { notes, loading, embedStatus, createNote, updateNote, deleteNote, retryEmbedding, indexMissing } = useNotes(space.id)
  const statuses = Object.values(embedStatus)
  const missingCount = statuses.filter(s => s === 'missing').length
  const indexing = statuses.includes('embedding')
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  // Below lg there's room for one column; this picks which. Both stay mounted
  // so switching doesn't lose the chat or a half-written note.
  const [pane, setPane] = useState<'notes' | 'chat'>('notes')
  const openNote = notes.find(n => n.id === openNoteId)

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
                pane === p ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
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
                <h2 className="font-display text-2xl sm:text-[2rem] font-bold text-ink tracking-[-0.02em] leading-tight wrap-break-word">
                  {space.name}
                </h2>
                {space.description && (
                  <p className="text-sm mt-1.5 text-ink-2">
                    {space.description}
                  </p>
                )}
                <p className="text-xs mt-1 text-ink-3">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>

              {/* Import URL button */}
              <button
                onClick={() => setShowUrlModal(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 pointer-coarse:py-2.5 rounded-lg transition-colors duration-200 text-accent bg-tint border border-line-2 hover:bg-tint-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Import URL
              </button>
            </div>
          </div>

          <NoteForm onSubmit={createNote} />

          {/* One card's Retry is enough for one note; past that, offer a bulk fix. */}
          {missingCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4 text-xs bg-danger-tint border border-danger-line">
              <p className="text-ink-2">
                {missingCount} notes aren't searchable, so chat can't use them.
              </p>
              <button
                onClick={indexMissing}
                disabled={indexing}
                className="font-display font-semibold px-3 py-1.5 rounded-lg transition-colors text-accent bg-tint border border-line-2 hover:bg-tint-2 disabled:text-ink-3 disabled:cursor-not-allowed"
              >
                {indexing ? 'Indexing…' : 'Make all searchable'}
              </button>
            </div>
          )}

          {loading ? (
            <div role="status" className="flex items-center gap-2 mt-4">
              <span className="sr-only">Loading notes</span>
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tint border border-line-2 text-accent">
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
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map(note => (
                <NoteCard
                  key={note.id}
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
        <ChatPanel spaceId={space.id} onOpenNote={setOpenNoteId} />
      </div>
    </div>
  )
}
