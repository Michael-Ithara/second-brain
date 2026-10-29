import type { Note } from '../types'

interface Props {
  note: Note
  onDelete: (id: string) => void
}

export function NoteCard({ note, onDelete }: Props) {
  const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <article className="rounded-xl p-4 group transition-colors duration-150 bg-[rgba(79,156,249,0.02)] border border-[rgba(79,156,249,0.08)] hover:bg-[rgba(79,156,249,0.04)] hover:border-[rgba(79,156,249,0.2)] focus-within:border-[rgba(79,156,249,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className="font-display font-semibold mb-1.5 text-ink text-[0.95rem] tracking-[-0.01em]">
              {note.title}
            </h3>
          )}
          <p className="text-sm leading-relaxed text-ink-2 line-clamp-3">
            {note.content}
          </p>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          aria-label={`Delete note ${note.title || 'Untitled'}`}
          title="Delete note"
          className="w-7 h-7 -mr-1.5 -mt-1.5 flex items-center justify-center rounded-md shrink-0 text-ink-3 transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-danger hover:bg-[rgba(248,113,113,0.08)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <p className="text-xs mt-3 text-ink-3">
        <time dateTime={note.created_at}>{formattedDate}</time>
      </p>
    </article>
  )
}
