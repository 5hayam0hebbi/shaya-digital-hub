import { useState } from 'react'
import { generateBrollPrompts } from '../../api/generate.js'
import { updateJob } from '../../api/jobs.js'
import ManualCard, { ManualStep } from '../ManualCard.jsx'

export default function PhaseBroll({ job, onJobUpdate }) {
  const existing = Array.isArray(job.broll_prompts) ? job.broll_prompts : []
  const [prompts, setPrompts] = useState(existing)
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState({})

  const safeName = (job.job_name || 'video').replace(/[^a-z0-9_-]/gi, '_')

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const result = await generateBrollPrompts(job.script)
      setPrompts(result)
      await updateJob(job.id, { broll_prompts: result })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [idx]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [idx]: false })), 2000)
    } catch { /* ignore */ }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setError('')
    try {
      const updated = await updateJob(job.id, {
        phase: 'edit', status: 'in_progress',
        broll_prompts: prompts,
      })
      onJobUpdate(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Phase 3 — B-Roll</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>
        Generate optimized Higgsfield prompts for each B-roll cue in your script.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} disabled={generating} style={btnOutline(generating)}>
          {generating ? '⟳ Generating prompts...' : prompts.length ? '↺ Regenerate Prompts' : '✦ Generate Higgsfield Prompts'}
        </button>
        <button onClick={handleAdvance} disabled={advancing} style={btnPrimary(advancing)}>
          {advancing ? 'Saving...' : 'B-Roll Ready ✓ — Continue →'}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {prompts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {prompts.length} Higgsfield Prompts
          </div>
          {prompts.map((p, i) => (
            <div key={i} style={{
              border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 18px',
              marginBottom: 12, background: '#FFFFFF',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, fontWeight: 600 }}>
                    B-Roll {i + 1} · <span style={{ color: '#64748B', fontWeight: 400 }}>{p.cue}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6, fontStyle: 'italic' }}>"{p.prompt}"</div>
                </div>
                <button onClick={() => handleCopy(p.prompt, i)} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #E2E8F0',
                  background: copied[i] ? '#ECFDF5' : '#F8FAFC',
                  color: copied[i] ? '#065F46' : '#374151',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {copied[i] ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!prompts.length && !generating && (
        <div style={{
          border: '2px dashed #E2E8F0', borderRadius: 12, padding: '48px 24px',
          textAlign: 'center', color: '#94A3B8', marginBottom: 24,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🎞</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No prompts yet</div>
          <div style={{ fontSize: 13 }}>Generate prompts to get optimized Higgsfield inputs for each scene</div>
        </div>
      )}

      <ManualCard title="MANUAL STEP: Generate B-Roll in Higgsfield">
        <ManualStep n={1}>Go to <strong>app.higgsfield.ai</strong> → "Create" → "Text to Video"</ManualStep>
        <ManualStep n={2}>For each prompt above, paste it exactly as shown (use the Copy button)</ManualStep>
        <ManualStep n={3}>Settings: <strong>Duration 4–6 seconds</strong> | Aspect ratio <strong>9:16</strong> | Style: Cinematic</ManualStep>
        <ManualStep n={4}>Click Generate — takes 1–3 minutes per clip</ManualStep>
        <ManualStep n={5}>Download each clip and rename them:</ManualStep>
        <div style={{ background: '#DBEAFE', borderRadius: 6, padding: '10px 14px', margin: '8px 0 10px 36px', fontFamily: 'monospace', fontSize: 12 }}>
          {prompts.length > 0
            ? prompts.map((_, i) => <div key={i}>{safeName}_broll_{i + 1}.mp4</div>)
            : <div>{safeName}_broll_1.mp4, {safeName}_broll_2.mp4, ...</div>
          }
        </div>
        <ManualStep n={6}>Once all clips are downloaded, click <strong>"B-Roll Ready ✓"</strong> above to continue</ManualStep>
      </ManualCard>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
      padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 16,
    }}>⚠ {msg}</div>
  )
}

function btnOutline(disabled) {
  return {
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}

function btnPrimary(disabled) {
  return {
    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', background: '#00B4A6', color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }
}
