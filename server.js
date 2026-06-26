import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '2mb' }))

// ── Supabase client (server-side, service role) ────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Anthropic streaming proxy ──────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { system, user } = req.body
  if (!system || !user) return res.status(400).json({ error: 'Missing system or user' })
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: user }],
        stream: true,
      }),
    })

    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: err })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
    res.end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Topics ─────────────────────────────────────────────────────────────────────
app.get('/api/topics', async (_req, res) => {
  const sb = getSupabase()
  if (!sb) return res.json([])
  const { data, error } = await sb.from('sd_topics').select('*').order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/topics', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { error } = await sb
    .from('sd_topics')
    .upsert({ ...req.body, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

app.delete('/api/topics/:id', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { error } = await sb.from('sd_topics').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── Generated content ──────────────────────────────────────────────────────────
app.get('/api/topics/:id/content', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.json([])
  const { data, error } = await sb
    .from('sd_generated_content')
    .select('*')
    .eq('topic_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/topics/:id/content', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { format, section_key, content, el_version, version } = req.body

  // Get current version to increment
  const { data: existing } = await sb
    .from('sd_generated_content')
    .select('version')
    .eq('topic_id', req.params.id)
    .eq('format', format)
    .eq('section_key', section_key)
    .maybeSingle()

  const nextVersion = version ?? (existing?.version ?? 0) + 1

  const { data, error } = await sb
    .from('sd_generated_content')
    .upsert({
      topic_id: req.params.id,
      format,
      section_key,
      content,
      el_version: el_version ?? null,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'topic_id,format,section_key' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Serve built frontend ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Shaya Digital Hub on port ${PORT}`))
