async function req(url, opts = {}) {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(e.error || `HTTP ${r.status}`)
  }
  return r.json()
}

export const getJobs = () => req('/api/jobs')
export const getJob = id => req(`/api/jobs/${id}`)
export const createJob = data => req('/api/jobs', { method: 'POST', body: data })
export const updateJob = (id, data) => req(`/api/jobs/${id}`, { method: 'PATCH', body: data })
export const deleteJob = id => req(`/api/jobs/${id}`, { method: 'DELETE' })
