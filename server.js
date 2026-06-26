import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '1mb' }))

// ── Anthropic streaming proxy ──────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const { system, user } = req.body
  if (!system || !user) return res.status(400).json({ error: 'Missing system or user' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

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

// ── Serve built frontend ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Shaya Digital Hub on port ${PORT}`))
