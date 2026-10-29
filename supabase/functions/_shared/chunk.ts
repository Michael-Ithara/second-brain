// Splits note text into overlapping chunks for embedding.
//
// Prefers to cut at paragraph breaks, then sentence ends, then spaces, so a
// chunk is usually a run of whole paragraphs. Each chunk after the first starts
// with the tail of the previous one, so a fact that sits on a boundary is still
// whole in at least one chunk.

const MAX_CHARS = 1500 // ~350 tokens: small enough to stay on one topic
const OVERLAP_CHARS = 200

export function chunkText(text: string, max = MAX_CHARS, overlap = OVERLAP_CHARS): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (clean.length <= max) return clean ? [clean] : []

  // Paragraphs, with any paragraph that is too long split into smaller pieces.
  const pieces = clean
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .flatMap(p => (p.length <= max - overlap - 2 ? [p] : splitLong(p, max - overlap - 2)))

  const chunks: string[] = []
  let current = ''
  for (const piece of pieces) {
    if (current && current.length + 2 + piece.length > max) {
      chunks.push(current)
      current = tail(current, overlap)
    }
    current = current ? `${current}\n\n${piece}` : piece
  }
  if (current) chunks.push(current)
  return chunks
}

// Cut a long paragraph at sentence ends, falling back to spaces, then to a hard cut.
function splitLong(text: string, size: number): string[] {
  const out: string[] = []
  let rest = text
  while (rest.length > size) {
    const window = rest.slice(0, size)
    let cut = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
      window.lastIndexOf('\n'),
    ) + 1
    if (cut < size / 2) cut = window.lastIndexOf(' ')
    if (cut < size / 2) cut = size
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}

// Last ~n characters, starting at a word boundary.
function tail(text: string, n: number): string {
  if (text.length <= n) return text
  const slice = text.slice(-n)
  const space = slice.indexOf(' ')
  return space === -1 ? slice : slice.slice(space + 1)
}
