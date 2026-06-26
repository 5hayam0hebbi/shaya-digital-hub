import { useState } from 'react'
import { generateScript } from '../../api/generate.js'
import { updateJob } from '../../api/jobs.js'

const VIDEO_TYPE_LABEL = {
  listing_reel: 'Listing Reel',
  market_update: 'Market Update',
  neighbourhood_guide: 'Neighbourhood Guide',
  open_house: 'Open House Invite',
}

function InputSummary({ job }) {
  const d = job.input_data || {}
  const items = Object.entries(d).filter(([, v]) => v && (typeof v === 'string' ? v.trim() : true))
  if (!items.length) return null
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Job Inputs</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
        {items.map(([k, v]) => {
          if (k === 'highlights' && Array.isArray(v)) {
            return v.filter(Boolean).map((h, i) => (
              <div key={`h${i}`} style={{ fontSize: 13 }}>
                <span style={{ color: '#94A3B8' }}>Highlight {i + 1}: </span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{h}</span>
              </div>
            ))
          }
          return (
            <div key={k} style={{ fontSize: 13 }}>
              <span style={{ color: '#94A3B8', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>
              <span style={{ color: '#0F172A', fontWeight: 500 }}>{String(v)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PhaseScript({ job, onJobUpdate }) {
  const [script, setScript] = useState(job.script || '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setScript('')
    setError('')
    try {
      await generateScript(
        { videoType: job.video_type, inputData: job.input_data },
        chunk => setScript(prev => prev + chunk)
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async () => {
    if (!script.trim()) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateJob(job.id, { script, phase: 'voice', status: 'in_progress' })
      onJobUpdate(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const hasScript = script.trim().length > 0

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Phase 1 — Script</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>
        Generate a complete {VIDEO_TYPE_LABEL[job.video_type] || 'video'} script with speaker labels and scene notes.
      </p>

      <InputSummary job={job} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button onClick={handleGenerate} disabled={generating} style={btnStyle(generating, !hasScript)}>
          {generating ? '⟳ Generating...' : hasScript ? '↺ Regenerate Script' : '✦ Generate Script'}
        </button>
        {hasScript && !generating && (
          <button onClick={handleApprove} disabled={saving} style={btnPrimary(saving)}>
            {saving ? 'Saving...' : 'Approve & Continue →'}
          </button>
        )}
      </div>

      {error && <ErrorBox msg={error} />}

      {(hasScript || generating) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {generating ? 'Writing script...' : 'Script — edit as needed'}
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            disabled={generating}
            style={{
              width: '100%', minHeight: 420, padding: '16px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 13, lineHeight: 1.7,
              border: '1px solid #E2E8F0', borderRadius: 10,
              background: generating ? '#F8FAFC' : '#FFFFFF',
              color: '#0F172A', resize: 'vertical', outline: 'none',
            }}
          />
          <ScriptLegend />
          {hasScript && !generating && (
            <div style={{ marginTop: 16 }}>
              <button onClick={handleApprove} disabled={saving} style={btnPrimary(saving)}>
                {saving ? 'Saving...' : 'Approve & Continue to Voice →'}
              </button>
            </div>
          )}
        </div>
      )}

      {!hasScript && !generating && (
        <div style={{
          border: '2px dashed #E2E8F0', borderRadius: 12, padding: '60px 24px',
          textAlign: 'center', color: '#94A3B8',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No script yet</div>
          <div style={{ fontSize: 13 }}>Click "Generate Script" to create your AI-written script</div>
        </div>
      )}
    </div>
  )
}

function ScriptLegend() {
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#64748B' }}>
      <span><strong style={{ color: '#6D28D9' }}>[AVATAR - ON CAMERA]</strong> — spoken dialogue</span>
      <span><strong style={{ color: '#0F766E' }}>[B-ROLL CUE]</strong> — visual scene</span>
      <span><strong style={{ color: '#B45309' }}>[TEXT OVERLAY]</strong> — on-screen text</span>
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

function btnStyle(loading, primary) {
  return {
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#374151',
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  }
}

function btnPrimary(loading) {
  return {
    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', background: '#00B4A6', color: '#FFFFFF',
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  }
}
