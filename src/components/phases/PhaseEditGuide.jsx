import { useState } from 'react'
import { generateEditGuide } from '../../api/generate.js'
import { updateJob } from '../../api/jobs.js'

export default function PhaseEditGuide({ job, onJobUpdate }) {
  const [guide, setGuide] = useState(job.edit_guide || '')
  const [generating, setGenerating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setGuide('')
    setError('')
    try {
      await generateEditGuide(
        { script: job.script, jobName: job.job_name, videoType: job.video_type },
        chunk => setGuide(prev => prev + chunk)
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    setError('')
    try {
      const updated = await updateJob(job.id, {
        edit_guide: guide,
        phase: 'complete',
        status: 'complete',
      })
      onJobUpdate(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setCompleting(false)
    }
  }

  const safeName = (job.job_name || 'video').replace(/[^a-z0-9_-]/gi, '_')

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Phase 4 — Edit Guide</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>
        Get a step-by-step CapCut editing guide tailored to your script's structure.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} disabled={generating} style={btnOutline(generating)}>
          {generating ? '⟳ Generating guide...' : guide ? '↺ Regenerate Guide' : '✦ Generate CapCut Guide'}
        </button>
        {guide && !generating && (
          <button onClick={handleComplete} disabled={completing} style={btnSuccess(completing)}>
            {completing ? 'Saving...' : '🎉 Mark Complete'}
          </button>
        )}
      </div>

      {error && <ErrorBox msg={error} />}

      {(guide || generating) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {generating ? 'Writing guide...' : 'CapCut Editing Guide'}
          </div>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
            padding: '20px 24px', fontSize: 13, lineHeight: 1.9,
            whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            color: '#1E293B',
          }}>
            {guide}
            {generating && <span style={{ opacity: 0.4 }}>▌</span>}
          </div>

          {guide && !generating && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigator.clipboard.writeText(guide)}
                style={btnOutline(false)}
              >
                Copy Guide
              </button>
              <button onClick={handleComplete} disabled={completing} style={btnSuccess(completing)}>
                {completing ? 'Saving...' : '🎉 Mark Complete'}
              </button>
            </div>
          )}
        </div>
      )}

      {!guide && !generating && (
        <div>
          <div style={{
            border: '2px dashed #E2E8F0', borderRadius: 12, padding: '48px 24px',
            textAlign: 'center', color: '#94A3B8', marginBottom: 24,
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✂️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No edit guide yet</div>
            <div style={{ fontSize: 13 }}>Generate a step-by-step CapCut guide based on your script</div>
          </div>

          <FileChecklist safeName={safeName} brollCount={(job.broll_prompts || []).length} />
        </div>
      )}
    </div>
  )
}

function FileChecklist({ safeName, brollCount }) {
  const files = [
    `${safeName}_avatar.mp4 — from HeyGen`,
    ...Array.from({ length: brollCount || 3 }, (_, i) => `${safeName}_broll_${i + 1}.mp4 — from Higgsfield`),
  ]
  return (
    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#92400E', marginBottom: 10 }}>📁 Files you need before editing</div>
      {files.map((f, i) => (
        <div key={i} style={{ fontSize: 13, color: '#78350F', marginBottom: 4 }}>□ {f}</div>
      ))}
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

function btnSuccess(disabled) {
  return {
    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', background: '#10B981', color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }
}
