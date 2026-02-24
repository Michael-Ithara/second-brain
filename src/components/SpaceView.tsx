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
      <div className="flex-1 overflow-y-auto" style={{ background: '#0f0f12' }}>
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: '2rem',
                  color: '#f0ede8',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}>
                  {space.name}
                </h2>
                {space.description && (
                  <p className="text-sm mt-1.5" style={{ color: '#4a4a5a' }}>{space.description}</p>
                )}
                <p className="text-xs mt-1" style={{ color: '#2a2a3a' }}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>

              {/* Import URL button */}
              <button
                onClick={() => setShowUrlModal(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#5a5a6a'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = '#a0a0b0'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = '#5a5a6a'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Import URL
              </button>
            </div>
          </div>

          <NoteForm onSubmit={createNote} />

          {loading ? (
            <p className="text-sm" style={{ color: '#3a3a4a' }}>Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm" style={{ color: '#3a3a4a' }}>No notes yet. Add one above.</p>
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
      <div className="w-96 flex flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <ChatPanel spaceId={space.id} />
      </div>
    </div>
  )
}