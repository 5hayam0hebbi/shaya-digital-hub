// Thin wrapper around the Express API routes that talk to Supabase

export async function fetchTopics() {
  try {
    const r = await fetch('/api/topics')
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

export function upsertTopic(topic, format, category) {
  fetch('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...topic, format, category }),
  }).catch(() => {})
}

export function deleteTopic(id) {
  fetch(`/api/topics/${id}`, { method: 'DELETE' }).catch(() => {})
}

export async function fetchTopicContent(topicId) {
  try {
    const r = await fetch(`/api/topics/${topicId}/content`)
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

export async function saveContent(topicId, { format, sectionKey, content, elVersion, version }) {
  try {
    const r = await fetch(`/api/topics/${topicId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format,
        section_key: sectionKey,
        content,
        el_version: elVersion ?? null,
        version: version ?? 1,
      }),
    })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}
