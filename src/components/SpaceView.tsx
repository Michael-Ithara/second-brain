import { useState } from 'react'
import type { Space } from '../types'
import { useNotes } from '../hooks/useNotes'
import { NoteForm } from './NoteForm'
import { NoteCard } from './NoteCard'
import { ChatPanel } from './ChatPanel'
import { UrlImportModal } from './UrlImportModal'

interface Props {
  space: Space
}

export function SpaceView({ space }: Props) {
  const { notes, loading, createNote, deleteNote } = useNotes(space.id)
  const [showUrlModal, setShowUrlModal] = useState(false)

  const handleUrlImport = async (title: string, content: string, sourceUrl: string) => {
    await createNote(title, content, sourceUrl)
  }

  return (
    <div className="flex h-full">
      {/* URL Import Modal */}
      {showUrlModal && (
        <UrlImportModal
          onImport={handleUrlImport}
          onClose={() => setShowUrlModal(false)}
        />
      )}

      {/* Notes column */}
      <div className="flex-1 overflow-y-auto bg-canvas">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-[2rem] font-bold text-[#f1f5f9] tracking-[-0.02em] leading-tight">
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
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 text-accent bg-[rgba(79,156,249,0.06)] border border-[rgba(79,156,249,0.25)] hover:bg-[rgba(79,156,249,0.12)]"
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

          {loading ? (
            <div role="status" className="flex items-center gap-2 mt-4">
              <span className="sr-only">Loading notes</span>
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" aria-hidden="true"
                  style={{ background: '#4f9cf9', opacity: 0.4, animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(79,156,249,0.06)', border: '1px solid rgba(79,156,249,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" strokeWidth="1.5" aria-hidden="true">
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
                <NoteCard key={note.id} note={note} onDelete={deleteNote} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="w-96 flex flex-col border-l border-[rgba(79,156,249,0.08)]">
        <ChatPanel spaceId={space.id} />
      </div>
    </div>
  )
}
