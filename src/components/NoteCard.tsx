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
      className="rounded-xl p-4 group transition-all duration-200"
      style={{
        background: 'rgba(91,156,246,0.02)',
        border: '1px solid rgba(91,156,246,0.08)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(91,156,246,0.25)'
        e.currentTarget.style.background = 'rgba(91,156,246,0.05)'
        e.currentTarget.style.boxShadow = '0 0 24px rgba(91,156,246,0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(91,156,246,0.08)'
        e.currentTarget.style.background = 'rgba(91,156,246,0.02)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3
              className="font-semibold mb-1.5"
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              {note.title}
            </h3>
          )}
          <p
            className="text-sm leading-relaxed"
            style={{
              color: '#64748b',
              fontFamily: 'inherit',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {note.content}
          </p>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-all duration-200"
          style={{ color: '#1e3a5f' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
        >
          ✕
        </button>
      </div>
      <p className="text-xs mt-3" style={{ color: '#1e3a5f', fontFamily: 'inherit' }}>
        {formattedDate}
      </p>
    </div>
  )
}