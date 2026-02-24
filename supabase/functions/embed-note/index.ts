import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  console.log('=== embed-note called ===')
  console.log('Method:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    const text = await req.text()
    console.log('Raw body:', text)
    body = JSON.parse(text)
  } catch (e) {
    console.log('Body parse error:', e.message)
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { noteId, content } = body
    console.log('noteId:', noteId)
    console.log('content:', content)

    if (!noteId || !content) {
      console.log('Missing noteId or content')
      return new Response(
        JSON.stringify({ error: 'noteId and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling Voyage AI...')
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

    console.log('Voyage response status:', voyageResponse.status)
    const voyageData = await voyageResponse.json()
    console.log('Voyage response body:', JSON.stringify(voyageData))

    if (!voyageResponse.ok) {
      throw new Error(`Voyage API error: ${JSON.stringify(voyageData)}`)
    }

    const embedding = voyageData.data[0].embedding
    console.log('Embedding length:', embedding.length)

    console.log('Saving embedding to Supabase...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase
      .from('notes')
      .update({ embedding })
      .eq('id', noteId)

    if (error) {
      console.log('Supabase update error:', JSON.stringify(error))
      throw error
    }

    console.log('Success!')
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.log('ERROR:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})