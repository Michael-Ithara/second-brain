import type { Note } from '../types'

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// updated_at is set on insert too, so allow a small gap before calling a note edited.
export function isEdited(note: Note) {
  return new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 60_000
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
