import { adminClient, requireUser } from '../_shared/auth.ts'
import { chunkText } from '../_shared/chunk.ts'
import { embed } from '../_shared/voyage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    body = await req.json()
  } catch (e) {
    console.log('Body parse error:', (e as Error).message)
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { noteId } = body

    if (!noteId) {
      return new Response(
        JSON.stringify({ error: 'noteId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = adminClient()
    const userId = await requireUser(req, supabase)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read the note ourselves, scoped to the caller, instead of trusting
    // content from the request — otherwise anyone could overwrite any
    // note's embedding with text of their choosing.
    const { data: note } = await supabase
      .from('notes')
      .select('title, content')
      .eq('id', noteId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!note) {
      return new Response(
        JSON.stringify({ error: 'Note not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Split the note, then embed each chunk with the title in front so a chunk
    // from the middle of a note still carries what the note is about.
    const title = note.title ?? ''
    // An empty note has no chunks; replacing with none clears its old ones.
    const chunks = chunkText(note.content)
    const embeddings = chunks.length
      ? await embed(chunks.map(c => (title ? `${title}\n\n${c}` : c)), 'document')
      : []

    // Swap the note's chunks in one transaction. Passing the text we chunked
    // lets the DB skip the write if the note was edited while we were working.
    const { data: written, error } = await supabase.rpc('replace_note_chunks', {
      p_note_id: noteId,
      p_title: title,
      p_content: note.content,
      p_chunks: chunks.map((content, i) => ({ content, embedding: embeddings[i] })),
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, chunks: chunks.length, stale: written === false }),
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
