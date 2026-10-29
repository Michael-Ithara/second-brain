import { adminClient, requireUser } from '../_shared/auth.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

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
    console.log('Calling Voyage AI...')
    const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VOYAGE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-3-lite',
        input: question,
        input_type: 'query',
      }),
    })

    console.log('Voyage status:', voyageResponse.status)
    const voyageData = await voyageResponse.json()

    if (!voyageResponse.ok) {
      throw new Error(`Voyage API error: ${JSON.stringify(voyageData)}`)
    }

    const questionEmbedding = voyageData.data[0].embedding
    console.log('Question embedded, length:', questionEmbedding.length)

    // Step 2 — Find similar notes
    console.log('Searching similar notes...')
    const { data: similarNotes, error: searchError } = await supabase.rpc('match_notes', {
      query_embedding: questionEmbedding,
      match_space_id: spaceId,
      match_threshold: 0.5,
      match_count: 5,
    })

    if (searchError) {
      console.log('Search error:', JSON.stringify(searchError))
      throw searchError
    }

    console.log('Similar notes found:', similarNotes?.length ?? 0)

    // Step 3 — Build context
    const context = similarNotes?.length > 0
      ? similarNotes
          .map((note: { title: string; content: string }, i: number) =>
            `Source ${i + 1}${note.title ? ` — ${note.title}` : ''}:\n${note.content}`
          )
          .join('\n\n')
      : 'No relevant notes found.'

    // Step 4 — Ask Claude
    console.log('Calling Anthropic...')
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

    console.log('Anthropic responded')
    const answer = message.content[0].type === 'text' ? message.content[0].text : ''

    return new Response(
      JSON.stringify({ answer, sources: similarNotes }),
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