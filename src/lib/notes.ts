import type { Note } from '../types'

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// "Untitled", or "Untitled 2", "Untitled 3"… if that's taken, as Obsidian names new
// notes. Titles will identify notes once [[links]] exist, so keep them unique.
export function untitledName(notes: Note[]) {
  const taken = new Set(notes.map(n => (n.title ?? '').toLowerCase()))
  if (!taken.has('untitled')) return 'Untitled'
  let i = 2
  while (taken.has(`untitled ${i}`)) i++
  return `Untitled ${i}`
}

// A to Z by title, like a file explorer. Untitled notes sort as "Untitled".
export function byTitle(a: Note, b: Note) {
  return (a.title || 'Untitled').localeCompare(b.title || 'Untitled', undefined, { numeric: true, sensitivity: 'base' })
}

// Every word must appear in the text, in any order, ignoring case.
export function matchesQuery(text: string, query: string) {
  const hay = text.toLowerCase()
  return query.toLowerCase().split(/\s+/).filter(Boolean).every(word => hay.includes(word))
}
