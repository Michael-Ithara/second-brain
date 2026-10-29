import { useImperativeHandle, useRef, useState } from 'react'
import type { Note, EmbedStatus } from '../types'
import { modKey } from '../lib/platform'
import { ChatPanel, type ChatPanelHandle } from './ChatPanel'
import { NoteEditor } from './NoteEditor'

// What the command palette can do inside the open space.
export interface SpaceViewHandle {
  ask: (question: string) => void
}

interface Props {
  spaceId: string
  notes: Note[]
  // The note in the URL, if any.
  note?: Note
  status?: EmbedStatus
  isNew?: boolean
  onSave: (id: string, title: string, content: string) => Promise<void>
  onRetryEmbed: (id: string) => void
  onDelete: (id: string) => void
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onImportUrl: () => void
  ref?: React.Ref<SpaceViewHandle>
}

// The open note (or an empty page) beside the chat. Keyed per space by the
// dashboard, so chat history doesn't carry over between spaces.
export function SpaceView({ spaceId, notes, note, status, isNew, onSave, onRetryEmbed, onDelete, onOpenNote, onNewNote, onImportUrl, ref }: Props) {
  // Below lg there's room for one column; this picks which. Both stay mounted
  // so switching doesn't lose the chat or an unsaved edit.
  const [pane, setPane] = useState<'note' | 'chat'>('note')
  const chatRef = useRef<ChatPanelHandle>(null)

  useImperativeHandle(ref, () => ({
    ask: question => { setPane('chat'); chatRef.current?.ask(question) },
  }), [])

  // Starter questions for the empty chat, from the newest titled notes.
  const suggestions = notes.length === 0 ? [] : [
    ...notes.filter(n => n.title).slice(0, 2).map((n, i) =>
      i === 0 ? `What are the key points in “${n.title}”?` : `Summarize what I wrote about ${n.title}`),
    'What have I written about most recently?',
  ]

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Note / Chat switch — a segmented control, narrow screens only */}
      <div className="lg:hidden shrink-0 px-4 py-2 border-b border-line">
        <div role="group" aria-label="Show" className="grid grid-cols-2 p-0.5 rounded-lg bg-tint border border-line">
          {(['note', 'chat'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPane(p)}
              aria-pressed={pane === p}
              className={`py-1.5 rounded-md text-sm font-medium transition-colors ${
                pane === p ? 'bg-raised text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {p === 'note' ? 'Note' : 'Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* Note column */}
      <div className={`${pane === 'note' ? 'block' : 'hidden'} lg:block flex-1 min-h-0 min-w-0 bg-canvas`}>
        {note ? (
          // Keyed per note: the editor owns its draft and flushes it on unmount.
          <NoteEditor
            key={note.id}
            note={note}
            status={status}
            isNew={isNew}
            onSave={(title, content) => onSave(note.id, title, content)}
            onRetryEmbed={() => onRetryEmbed(note.id)}
            onDelete={() => onDelete(note.id)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-ink-2">
              {notes.length === 0
                ? 'This space is empty. Write a note or import a page.'
                : <>Pick a note from the list, or press <kbd className="font-sans text-xs px-1.5 py-0.5 rounded border border-line-2">{modKey} K</kbd> to find one.</>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onNewNote}
                className="font-display text-sm font-semibold px-4 py-2 rounded-xl bg-accent text-on-accent shadow-edge transition-colors hover:bg-accent-hover"
              >
                New note
              </button>
              <button
                onClick={onImportUrl}
                className="text-sm px-4 py-2 rounded-xl text-accent-ink bg-tint border border-line-2 transition-colors hover:bg-tint-2"
              >
                Import URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div className={`${pane === 'chat' ? 'flex' : 'hidden'} lg:flex flex-1 lg:flex-none min-h-0 lg:w-96 flex-col lg:border-l border-line`}>
        <ChatPanel
          ref={chatRef}
          spaceId={spaceId}
          onOpenNote={id => { setPane('note'); onOpenNote(id) }}
          suggestions={suggestions}
        />
      </div>
    </div>
  )
}
