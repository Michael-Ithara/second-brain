import type { Note } from '../types'

interface Props {
  note: Note
  onDelete: (id: string) => void
}

export function NoteCard({ note, onDelete }: Props) {
  const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="rounded-xl p-4 group transition-all duration-150"
      style={{
        background: '#111318',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className="text-sm font-medium mb-1.5" style={{
              color: '#f0ede8',
              fontFamily: 'Instrument Serif, serif',
              fontSize: '0.95rem',
            }}>
              {note.title}
            </h3>
          )}
          <p className="text-sm leading-relaxed" style={{
            color: '#6a6a7a',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {note.content}
          </p>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-all"
          style={{ color: '#3a3a4a' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
        >
          ✕
        </button>
      </div>
      <p className="text-xs mt-3" style={{ color: '#3a3a4a' }}>{formattedDate}</p>
    </div>
  )
}