import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '4mb' }))

// ── Supabase client (server-side, service role) ─────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Shared Anthropic streaming helper ───────────────────────────────────────
async function streamClaude(res, system, user, maxTokens = 2000) {
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in Settings.' })

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      stream: true,
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    return res.status(upstream.status).json({ error: `Anthropic: ${err}` })
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
}

// ── Shared Anthropic non-streaming helper ────────────────────────────────────
async function callClaude(system, user, maxTokens = 2000) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Anthropic: ${err}`)
  }
  const data = await r.json()
  return data.content[0].text
}

// ── Legacy content-hub generate (kept for backwards compat) ─────────────────
app.post('/api/generate', async (req, res) => {
  const { system, user } = req.body
  if (!system || !user) return res.status(400).json({ error: 'Missing system or user' })
  try { await streamClaude(res, system, user) } catch (e) { res.status(500).json({ error: e.message }) }
})

// ────────────────────────────────────────────────────────────────────────────
// VIDEO JOBS
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/jobs', async (_req, res) => {
  const sb = getSupabase()
  if (!sb) return res.json([])
  const { data, error } = await sb.from('video_jobs').select('*').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.get('/api/jobs/:id', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { data, error } = await sb.from('video_jobs').select('*').eq('id', req.params.id).single()
  if (error) return res.status(404).json({ error: 'Job not found' })
  res.json(data)
})

app.post('/api/jobs', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { data, error } = await sb
    .from('video_jobs')
    .insert({ ...req.body, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.patch('/api/jobs/:id', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { data, error } = await sb
    .from('video_jobs')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.delete('/api/jobs/:id', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { error } = await sb.from('video_jobs').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ────────────────────────────────────────────────────────────────────────────
// PHASE 1 — SCRIPT GENERATION (streaming)
// ────────────────────────────────────────────────────────────────────────────

function buildScriptPrompt(videoType, inputData) {
  const SYSTEM = `You are a real estate video script writer for Shaya Mohebbi, REALTOR® at eXp Realty, serving York Region and the Greater Toronto Area.

Brand voice: Warm, trustworthy, educational, conversational. Never salesy or pushy.
Phone: 647-370-9588 | Website: shayamohebbi.com

STRICT FORMAT — every single line MUST be exactly one of these three formats with no deviations:
[AVATAR - ON CAMERA]: "spoken words in double quotes"
[B-ROLL CUE]: visual description without quotes
[TEXT OVERLAY]: on-screen text (use sparingly, 3-5 words max)

Rules:
- Start with a scroll-stopping hook in the first avatar line
- Use "you" language — speak directly to the viewer like a trusted friend
- B-ROLL CUEs must be specific: include location context (York Region / GTA suburb), lighting, action
- Never invent statistics — only use stats the user has provided
- End with a soft CTA: "DM me", "visit shayamohebbi.com", or "call or text 647-370-9588"
- No filler phrases like "In conclusion" or "As you can see"`

  const prompts = {
    listing_reel: `Write a Listing Reel script (target 30–45 seconds, 6–8 sections alternating AVATAR and B-ROLL).

Property: ${inputData.address || 'Address not provided'}${inputData.price ? `\nAsking price: $${inputData.price}` : ''}${inputData.beds ? `\nBeds/baths: ${inputData.beds} bed / ${inputData.baths} bath` : ''}
Key highlights to feature:
${(inputData.highlights || []).filter(Boolean).map((h, i) => `${i + 1}. ${h}`).join('\n')}
Target audience: ${inputData.audience || 'Buyers'}`,

    market_update: `Write a Market Update Reel script (target 30–45 seconds, 5–7 sections).

Area: ${inputData.area || 'York Region / GTA'}
Key stat: ${inputData.stat || ''}
Insight: ${inputData.insight || ''}
Target audience: ${inputData.audience || 'Buyers and sellers'}`,

    neighbourhood_guide: `Write a Neighbourhood Guide Reel script (target 45–60 seconds, 7–9 sections).

Neighbourhood: ${inputData.area || ''}
Highlight 1 (schools/education): ${inputData.highlight1 || ''}
Highlight 2 (parks/green space): ${inputData.highlight2 || ''}
Highlight 3 (transit/lifestyle): ${inputData.highlight3 || ''}
Target audience: ${inputData.audience || 'Families relocating from Toronto'}`,

    open_house: `Write an Open House Invite Reel script (target 20–30 seconds, 4–6 short sections).

Property address: ${inputData.address || ''}
Open house date & time: ${inputData.datetime || ''}
Teaser highlight 1: ${inputData.highlight1 || ''}
Teaser highlight 2: ${inputData.highlight2 || ''}
Target audience: ${inputData.audience || 'Active buyers'}`,
  }

  return { system: SYSTEM, user: prompts[videoType] || prompts.listing_reel }
}

app.post('/api/generate-script', async (req, res) => {
  const { videoType, inputData } = req.body
  if (!videoType) return res.status(400).json({ error: 'videoType is required' })
  try {
    const { system, user } = buildScriptPrompt(videoType, inputData || {})
    await streamClaude(res, system, user, 2000)
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// PHASE 2 — VOICE GENERATION (ElevenLabs)
// ────────────────────────────────────────────────────────────────────────────

function extractAvatarLines(script) {
  const lines = (script || '').split('\n')
  return lines
    .filter(l => l.trim().startsWith('[AVATAR - ON CAMERA]'))
    .map(l => {
      const match = l.match(/\[AVATAR - ON CAMERA\]:\s*"(.+)"/)
      return match ? match[1].trim() : ''
    })
    .filter(Boolean)
    .join(' ')
}

app.post('/api/generate-voice', async (req, res) => {
  const { script, jobName, voiceType } = req.body
  // voiceType='personal' uses your own content-library voice clone
  // voiceType='default' (or omitted) uses the client/video-jobs voice
  const voiceId = voiceType === 'personal'
    ? (process.env.ELEVENLABS_VOICE_ID_PERSONAL || process.env.ELEVENLABS_VOICE_ID)
    : process.env.ELEVENLABS_VOICE_ID
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey || !voiceId)
    return res.status(500).json({ error: 'ElevenLabs not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in Settings.' })

  const text = extractAvatarLines(script)
  if (!text) return res.status(400).json({ error: 'No [AVATAR - ON CAMERA] lines found in script.' })

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: `ElevenLabs: ${err}` })
    }

    const safe = (jobName || 'voice').replace(/[^a-z0-9_-]/gi, '_')
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.mp3"`)

    const reader = upstream.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// PHASE 3 — B-ROLL PROMPT GENERATION
// ────────────────────────────────────────────────────────────────────────────

app.post('/api/generate-broll-prompts', async (req, res) => {
  const { script } = req.body
  if (!script) return res.status(400).json({ error: 'Script is required' })
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  // Extract b-roll cues
  const cues = (script || '').split('\n')
    .filter(l => l.trim().startsWith('[B-ROLL CUE]'))
    .map(l => l.replace(/^\[B-ROLL CUE\]:\s*/, '').trim())
    .filter(Boolean)

  if (!cues.length) return res.status(400).json({ error: 'No [B-ROLL CUE] lines found in script.' })

  const SYSTEM = `You are a cinematographer creating AI video generation prompts for Higgsfield text-to-video.

Convert B-roll scene descriptions into detailed, cinematic Higgsfield prompts.

Higgsfield prompt requirements:
- Location context: suburban Greater Toronto Area / York Region, Ontario
- Specific camera movement (e.g., "slow drone push-in", "handheld follow", "static wide shot", "low angle dolly")
- Lighting conditions (golden hour, soft overcast, bright midday sun, blue hour dusk)
- Season: autumn or spring work best for real estate — suggest based on cue context
- Mood: warm, aspirational, photorealistic — never cinematic fantasy
- Always end with: "cinematic, photorealistic, 4K, 9:16 vertical aspect ratio, 4–6 second clip"
- Under 80 words per prompt

Return ONLY valid JSON — no markdown, no explanation:
{"prompts": [{"cue": "original cue text", "prompt": "full higgsfield prompt here"}]}`

  const USER = `Convert these B-roll cues to Higgsfield prompts:\n\n${cues.map((c, i) => `${i + 1}. ${c}`).join('\n')}`

  try {
    const raw = await callClaude(SYSTEM, USER, 2000)
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: `B-roll generation failed: ${e.message}` })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// PHASE 4 — EDIT GUIDE GENERATION (streaming)
// ────────────────────────────────────────────────────────────────────────────

app.post('/api/generate-edit-guide', async (req, res) => {
  const { script, jobName, videoType } = req.body
  if (!script) return res.status(400).json({ error: 'Script is required' })

  const brollCount = (script.match(/\[B-ROLL CUE\]/g) || []).length
  const videoTypeLabel = {
    listing_reel: 'Listing Reel',
    market_update: 'Market Update',
    neighbourhood_guide: 'Neighbourhood Guide',
    open_house: 'Open House Invite',
  }[videoType] || videoType

  const SYSTEM = `You are a video editing specialist creating CapCut editing guides for real estate Instagram Reels.

Write clear, numbered step-by-step instructions that a non-editor (a busy REALTOR®) can follow.
Be very specific about timing, clip order, and positioning — no vague phrases like "adjust as needed".
Use plain text with section headers and numbered lists. No markdown bold or asterisks.`

  const USER = `Create a complete CapCut editing guide for this video job.

Job name: ${jobName || 'video'}
Video type: ${videoTypeLabel}
Avatar file: ${(jobName || 'video').replace(/[^a-z0-9_-]/gi, '_')}_avatar.mp4
B-roll files: ${Array.from({ length: brollCount }, (_, i) => `${(jobName || 'video').replace(/[^a-z0-9_-]/gi, '_')}_broll_${i + 1}.mp4`).join(', ')}

Script:
${script}

Generate the guide with these exact sections:
SETUP
TIMELINE ASSEMBLY (list every clip in order with timecodes based on the script structure — avatar lines become avatar segments, b-roll cues become b-roll clips)
CAPTIONS
MUSIC
EXPORT

For TIMELINE ASSEMBLY: the avatar video is one continuous file — note that each avatar segment is played from where the previous one left off (approximate). B-roll clips are 4–6 seconds each. Avatar should appear as picture-in-picture (bottom-left, 30% size) when b-roll is fullscreen. When avatar is speaking with no b-roll, show avatar fullscreen.`

  try {
    await streamClaude(res, SYSTEM, USER, 2500)
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS — TEST CONNECTIONS
// ────────────────────────────────────────────────────────────────────────────

app.get('/api/test-connection', async (req, res) => {
  const { service } = req.query
  try {
    if (service === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) return res.json({ ok: false, message: 'ANTHROPIC_API_KEY not set' })
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      })
      return res.json(r.ok ? { ok: true, message: 'Connected' } : { ok: false, message: `HTTP ${r.status}` })
    }

    if (service === 'elevenlabs') {
      if (!process.env.ELEVENLABS_API_KEY) return res.json({ ok: false, message: 'ELEVENLABS_API_KEY not set' })
      const r = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      })
      if (!r.ok) return res.json({ ok: false, message: `HTTP ${r.status}` })
      const data = await r.json()
      const voiceOk = !!process.env.ELEVENLABS_VOICE_ID
      return res.json({ ok: true, message: `Connected as ${data.xi_api_key ? 'API user' : 'user'}${voiceOk ? '' : ' — ELEVENLABS_VOICE_ID not set'}` })
    }

    if (service === 'supabase') {
      const sb = getSupabase()
      if (!sb) return res.json({ ok: false, message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' })
      const { error } = await sb.from('video_jobs').select('id').limit(1)
      if (error) return res.json({ ok: false, message: error.message })
      return res.json({ ok: true, message: 'Connected — video_jobs table found' })
    }

    res.status(400).json({ error: 'Unknown service' })
  } catch (e) {
    res.json({ ok: false, message: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// LEGACY — Topics / Generated Content (content hub, kept intact)
// ────────────────────────────────────────────────────────────────────────────

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

app.get('/api/topics/:id/content', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.json([])
  const { data, error } = await sb.from('sd_generated_content').select('*').eq('topic_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/topics/:id/content', async (req, res) => {
  const sb = getSupabase()
  if (!sb) return res.status(500).json({ error: 'Supabase not configured' })
  const { format, section_key, content, el_version, version } = req.body
  const { data: existing } = await sb
    .from('sd_generated_content').select('version')
    .eq('topic_id', req.params.id).eq('format', format).eq('section_key', section_key).maybeSingle()
  const nextVersion = version ?? (existing?.version ?? 0) + 1
  const { data, error } = await sb
    .from('sd_generated_content')
    .upsert({
      topic_id: req.params.id, format, section_key, content,
      el_version: el_version ?? null, version: nextVersion,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'topic_id,format,section_key' })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Serve built frontend ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Shaya Digital Hub on port ${PORT}`))
