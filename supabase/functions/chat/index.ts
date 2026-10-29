import { adminClient, requireUser } from '../_shared/auth.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { embed } from '../_shared/voyage.ts'

interface Chunk {
  chunk_id: number
  note_id: string
  title: string
  content: string
  similarity: number
  score: number
}

interface NoteHit {
  id: string
  title: string
  excerpts: string[] // best-ranked chunk first
  similarity: number // best chunk's cosine similarity
}

function groupByNote(chunks: Chunk[]): NoteHit[] {
  const byNote = new Map<string, NoteHit>()
  for (const c of chunks) {
    const hit = byNote.get(c.note_id)
    if (hit) {
      hit.excerpts.push(c.content)
      hit.similarity = Math.max(hit.similarity, c.similarity)
    } else {
      byNote.set(c.note_id, { id: c.note_id, title: c.title, excerpts: [c.content], similarity: c.similarity })
    }
  }
  return [...byNote.values()] // Map keeps insertion order = RPC's score order
}

// Earlier turns sent by the client, so follow-ups ("and the second one?") work.
// Kept short and validated: it's the caller's own chat, but it still costs tokens.
const MAX_HISTORY = 6
const MAX_TURN_CHARS = 4000

function cleanHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) return []
  const turns = raw
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim() !== '')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) }))
  // The API wants the conversation to start with a user turn.
  while (turns.length && turns[0].role !== 'user') turns.shift()
  return turns
}

const SYSTEM_PROMPT = `You are the assistant inside Second Brain, a personal knowledge base.
Answer the user's question using only the numbered sources from their notes.
Cite the sources you rely on inline with their number in square brackets, like [1] or [2][3], placed right after the sentence they support. Only use numbers that appear in the sources.
If the sources don't contain the answer, say so plainly in one or two sentences and don't cite anything — never fill gaps from general knowledge.
Keep answers concise and use Markdown for lists or emphasis when it helps.`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonError = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, spaceId, history } = await req.json()

    if (!question || !spaceId) return jsonError('question and spaceId are required', 400)

    // Step 0 — Make sure the caller owns this space. The service-role client
    // skips RLS, so without this any signed-in user could query any space.
    const supabase = adminClient()
    const userId = await requireUser(req, supabase)
    if (!userId) return jsonError('Unauthorized', 401)

    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!space) return jsonError('Space not found', 404)

    const previous = cleanHistory(history)

    // Step 1 — Embed the question. For a follow-up, search with the previous
    // question too: "what about the second one?" alone matches nothing.
    const lastQuestion = [...previous].reverse().find(m => m.role === 'user')?.content as string | undefined
    const searchText = lastQuestion ? `${lastQuestion}\n${question}` : question
    const [questionEmbedding] = await embed([searchText], 'query')

    // Step 2 — Hybrid search: vector similarity + keywords, merged by rank
    const { data: chunks, error: searchError } = await supabase.rpc('match_note_chunks', {
      query_embedding: questionEmbedding,
      query_text: searchText,
      match_space_id: spaceId,
      match_count: 8,
    })

    if (searchError) throw searchError

    // Step 3 — Group chunks by note, keeping the best-ranked note first, so
    // Claude sees one source per note and the source numbers match the UI.
    const notes = groupByNote((chunks ?? []) as Chunk[])
    const context = notes.length > 0
      ? notes
          .map((note, i) =>
            `Source ${i + 1}${note.title ? ` — ${note.title}` : ''}:\n${note.excerpts.join('\n\n[…]\n\n')}`
          )
          .join('\n\n')
      : 'No relevant notes found.'

    const sources = notes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.excerpts[0],
      similarity: n.similarity,
    }))

    // Step 4 — Stream Claude's answer back as NDJSON, one event per line:
    //   {"type":"sources","sources":[...]}   first, so the UI can link citations early
    //   {"type":"delta","text":"..."}        as the answer is written
    //   {"type":"done","stopReason":"..."}   at the end
    //   {"type":"error","message":"..."}     if it fails part-way
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const encoder = new TextEncoder()

    const body = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        send({ type: 'sources', sources })

        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            ...previous,
            { role: 'user', content: `Sources from my notes:\n\n${context}\n\nQuestion: ${question}` },
          ],
        })

        // The browser pressed Stop or went away: stop paying for tokens nobody reads.
        const onAbort = () => stream.abort()
        req.signal.addEventListener('abort', onAbort)

        try {
          stream.on('text', text => send({ type: 'delta', text }))
          const final = await stream.finalMessage()
          send({ type: 'done', stopReason: final.stop_reason })
        } catch (err) {
          if (!req.signal.aborted) {
            console.log('Stream error:', (err as Error).message)
            send({ type: 'error', message: 'The answer stopped part-way. Try again.' })
          }
        } finally {
          req.signal.removeEventListener('abort', onAbort)
          try { controller.close() } catch { /* already closed by a disconnect */ }
        }
      },
    })

    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.log('ERROR:', (err as Error).message)
    return jsonError((err as Error).message, 500)
  }
})
