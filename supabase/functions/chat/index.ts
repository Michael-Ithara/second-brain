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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, spaceId } = await req.json()

    if (!question || !spaceId) {
      return new Response(
        JSON.stringify({ error: 'question and spaceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 0 — Make sure the caller owns this space. The service-role client
    // skips RLS, so without this any signed-in user could query any space.
    const supabase = adminClient()
    const userId = await requireUser(req, supabase)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!space) {
      return new Response(
        JSON.stringify({ error: 'Space not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1 — Embed the question
    const [questionEmbedding] = await embed([question], 'query')

    // Step 2 — Hybrid search: vector similarity + keywords, merged by rank
    const { data: chunks, error: searchError } = await supabase.rpc('match_note_chunks', {
      query_embedding: questionEmbedding,
      query_text: question,
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

    // Step 4 — Ask Claude
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a helpful assistant for a personal knowledge base called Second Brain.
Answer the user's question based only on the notes provided as context.
If the context doesn't contain enough information to answer, say so honestly.
Always cite which source(s) you used in your answer.`,
      messages: [
        {
          role: 'user',
          content: `Context from my notes:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : ''

    return new Response(
      JSON.stringify({ answer, sources }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.log('ERROR:', (err as Error).message)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})