import { adminClient, requireUser } from '../_shared/auth.ts'

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

    const content = `${note.title ? note.title + '\n' : ''}${note.content}`

    const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VOYAGE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-3-lite',
        input: content,
        input_type: 'document',
      }),
    })

    const voyageData = await voyageResponse.json()

    if (!voyageResponse.ok) {
      throw new Error(`Voyage API error: ${voyageResponse.status}`)
    }

    const embedding = voyageData.data[0].embedding

    const { error } = await supabase
      .from('notes')
      .update({ embedding })
      .eq('id', noteId)
      .eq('user_id', userId)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
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
