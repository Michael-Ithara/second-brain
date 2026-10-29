const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Extracts readable text from HTML — strips tags, scripts, styles
function extractText(html: string): string {
  // Remove script and style blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')

  // Convert block elements to newlines for readability
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Collapse excessive whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  return text
}

// Extract page title from HTML
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1].trim() : ''
}

// --- SSRF guard -------------------------------------------------------------
// This function fetches whatever URL the user gives it, from inside Supabase's
// network. Without these checks it could be pointed at localhost, private
// ranges or the cloud metadata endpoint.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return false
  const [a, b] = parts
  return (
    a === 0 ||                              // "this" network
    a === 10 ||                             // private
    a === 127 ||                            // loopback
    (a === 100 && b >= 64 && b <= 127) ||   // carrier-grade NAT
    (a === 169 && b === 254) ||             // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||    // private
    (a === 192 && b === 168) ||             // private
    a >= 224                                // multicast + reserved
  )
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (addr === '::' || addr === '::1') return true
  // IPv4-mapped (::ffff:a.b.c.d). The URL parser rewrites it to hex form
  // (::ffff:7f00:1), so handle both.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  const mappedHex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16)
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }
  return /^(fc|fd|fe8|fe9|fea|feb)/.test(addr)  // unique-local + link-local
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isPrivateIPv4(host) ||
    (host.includes(':') && isPrivateIPv6(host))
  )
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported')
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('That address is not allowed')
  }

  // Also check what the name resolves to, so e.g. a public DNS name pointing
  // at 127.0.0.1 is rejected. Skipped if the runtime doesn't allow DNS lookups.
  for (const type of ['A', 'AAAA'] as const) {
    let records: string[] = []
    try {
      records = await Deno.resolveDns(url.hostname, type)
    } catch {
      continue
    }
    if (records.some(ip => (type === 'A' ? isPrivateIPv4(ip) : isPrivateIPv6(ip)))) {
      throw new Error('That address is not allowed')
    }
  }
}

// fetch() with redirects followed by hand, so every hop goes through the guard.
async function safeFetch(url: URL, init: RequestInit, maxRedirects = 5): Promise<Response> {
  let current = url
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current)
    const response = await fetch(current.href, { ...init, redirect: 'manual' })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current)
      continue
    }
    return response
  }
  throw new Error('Too many redirects')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching URL:', parsedUrl.href)

    const response = await safeFetch(parsedUrl, {
      headers: {
        // Mimic a browser to avoid bot detection
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    console.log('Fetch status:', response.status)

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      throw new Error('URL does not point to an HTML page')
    }

    const html = await response.text()
    const title = extractTitle(html)
    const content = extractText(html)

    // Limit content length to avoid huge embeddings
    const truncatedContent = content.length > 8000 ? content.slice(0, 8000) + '...' : content

    console.log('Extracted title:', title)
    console.log('Content length:', truncatedContent.length)

    return new Response(
      JSON.stringify({ title, content: truncatedContent, url: response.url || parsedUrl.href }),
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