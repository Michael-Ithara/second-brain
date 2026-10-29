import type { Note, EmbedStatus } from '../types'
import { formatDate, isEdited } from '../lib/notes'

interface Props {
  note: Note
  status?: EmbedStatus
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

export function EmbedBadge({ status, onRetry }: { status?: EmbedStatus; onRetry: () => void }) {
  if (status === 'embedding') {
    return <span role="status" className="text-ink-3">Making searchable…</span>
  }
  if (status === 'missing') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-danger">Not searchable</span>
        <button
          onClick={onRetry}
          className="relative z-10 rounded px-1 -mx-1 text-accent-ink hover:text-accent-ink-hover hover:underline"
        >
          Retry
        </button>
      </span>
    )
  }
  return null
}

export function NoteCard({ note, status, onOpen, onDelete, onRetry }: Props) {
  const title = note.title || 'Untitled note'

  return (
    // The title button stretches over the whole card (after:inset-0), so the card is
    // one click target; the delete and retry buttons sit above it with z-10.
    <article className="relative rounded-xl p-4 group transition-colors duration-150 bg-surface border border-line hover:border-line-2 focus-within:border-line-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold mb-1.5 text-[0.95rem] tracking-[-0.01em]">
            <button
              onClick={() => onOpen(note.id)}
              className={`text-left rounded after:absolute after:inset-0 after:rounded-xl after:content-[''] ${note.title ? 'text-ink' : 'text-ink-3'}`}
            >
              {title}
            </button>
          </h3>
          <p className="text-sm leading-relaxed text-ink-2 line-clamp-3 whitespace-pre-line">
            {note.content}
          </p>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          aria-label={`Delete note ${title}`}
          title="Delete note"
          className="relative z-10 w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 -mr-1.5 -mt-1.5 flex items-center justify-center rounded-md shrink-0 text-ink-3 transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-danger hover:bg-danger-tint"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-3 text-ink-3">
        <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
        {isEdited(note) && <span>Edited</span>}
        <EmbedBadge status={status} onRetry={() => onRetry(note.id)} />
      </div>
    </article>
  )
}
