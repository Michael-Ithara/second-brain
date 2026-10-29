const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3-lite' // 512 dims — must match vector(512) in note_chunks
const BATCH = 64

// Embeds texts in order. 'document' for stored text, 'query' for questions:
// Voyage prepends a different prompt for each, which improves retrieval.
export async function embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VOYAGE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, input: texts.slice(i, i + BATCH), input_type: inputType }),
    })
    if (!res.ok) throw new Error(`Voyage API error: ${res.status}`)
    const json = await res.json() as { data: { index: number; embedding: number[] }[] }
    const sorted = [...json.data].sort((a, b) => a.index - b.index)
    out.push(...sorted.map(d => d.embedding))
  }
  return out
}
