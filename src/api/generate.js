async function parseStream(response, onChunk) {
  const reader = response.body.getReader()
  const dec = new TextDecoder()
  let buf = '', full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]') return full
      try {
        const p = JSON.parse(d)
        if (p.delta?.text) { full += p.delta.text; onChunk(p.delta.text) }
      } catch { /* skip non-JSON data lines */ }
    }
  }
  return full
}

export async function generateScript({ videoType, inputData }, onChunk) {
  const r = await fetch('/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoType, inputData }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Script generation failed' }))
    throw new Error(e.error || 'Script generation failed')
  }
  return parseStream(r, onChunk)
}

export async function generateVoice(script, jobName) {
  const r = await fetch('/api/generate-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, jobName }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Voice generation failed' }))
    throw new Error(e.error || 'Voice generation failed')
  }
  const blob = await r.blob()
  return URL.createObjectURL(blob)
}

export async function generateBrollPrompts(script) {
  const r = await fetch('/api/generate-broll-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'B-roll generation failed')
  return data.prompts || []
}

export async function generateEditGuide({ script, jobName, videoType }, onChunk) {
  const r = await fetch('/api/generate-edit-guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, jobName, videoType }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Edit guide generation failed' }))
    throw new Error(e.error || 'Edit guide generation failed')
  }
  return parseStream(r, onChunk)
}

export async function testConnection(service) {
  const r = await fetch(`/api/test-connection?service=${service}`)
  return r.json()
}
