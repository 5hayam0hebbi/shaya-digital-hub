import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob } from '../api/jobs.js'
import { StatusBadge, VideoTypeBadge } from '../components/StatusBadge.jsx'
import PhaseScript from '../components/phases/PhaseScript.jsx'
import PhaseVoice from '../components/phases/PhaseVoice.jsx'
import PhaseBroll from '../components/phases/PhaseBroll.jsx'
import PhaseEditGuide from '../components/phases/PhaseEditGuide.jsx'

const PHASES = [
  { key: 'script', label: '1 · Script', order: 0 },
  { key: 'voice', label: '2 · Voice', order: 1 },
  { key: 'broll', label: '3 · B-Roll', order: 2 },
  { key: 'edit', label: '4 · Edit Guide', order: 3 },
  { key: 'complete', label: '✓ Done', order: 4 },
]

function phaseOrder(phase) {
  return (PHASES.find(p => p.key === phase) || PHASES[0]).order
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhase, setActivePhase] = useState(null)

  useEffect(() => {
    getJob(id)
      .then(j => { setJob(j); setActivePhase(j.phase) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleJobUpdate = updated => {
    setJob(updated)
    setActivePhase(updated.phase)
  }

  if (loading) return <PageWrap><div style={{ color: '#94A3B8', padding: '60px 0', textAlign: 'center' }}>Loading job...</div></PageWrap>
  if (error) return <PageWrap><div style={{ color: '#991B1B', padding: '20px' }}>⚠ {error}</div></PageWrap>
  if (!job) return null

  const currentOrder = phaseOrder(job.phase)
  const display = activePhase || job.phase

  return (
    <PageWrap>
      {/* Back + title */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14 }}
        >
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{job.job_name}</h1>
          <VideoTypeBadge type={job.video_type} />
          <StatusBadge status={job.status} />
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
          Created {new Date(job.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Phase progress bar */}
      <div style={{
        display: 'flex', background: '#FFFFFF', border: '1px solid #E2E8F0',
        borderRadius: 12, overflow: 'hidden', marginBottom: 32,
      }}>
        {PHASES.map((p, i) => {
          const done = p.order < currentOrder
          const current = p.key === (job.phase === 'complete' ? 'complete' : job.phase)
          const reachable = p.order <= currentOrder
          const isActive = p.key === display

          return (
            <button
              key={p.key}
              onClick={() => reachable && setActivePhase(p.key)}
              disabled={!reachable}
              style={{
                flex: 1, padding: '14px 8px', border: 'none',
                background: isActive ? '#00B4A6' : done ? '#F0FDFC' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : done ? '#0F766E' : current ? '#0F172A' : '#CBD5E1',
                fontSize: 13, fontWeight: isActive ? 700 : done ? 600 : 400,
                cursor: reachable ? 'pointer' : 'default',
                borderRight: i < PHASES.length - 1 ? '1px solid #E2E8F0' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {done && !isActive ? '✓ ' : ''}{p.label}
            </button>
          )
        })}
      </div>

      {/* Phase content */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '28px 32px' }}>
        {job.status === 'complete' && display === 'complete' ? (
          <CompleteSummary job={job} />
        ) : display === 'script' || (!display && job.phase === 'script') ? (
          <PhaseScript job={job} onJobUpdate={handleJobUpdate} />
        ) : display === 'voice' ? (
          <PhaseVoice job={job} onJobUpdate={handleJobUpdate} />
        ) : display === 'broll' ? (
          <PhaseBroll job={job} onJobUpdate={handleJobUpdate} />
        ) : display === 'edit' ? (
          <PhaseEditGuide job={job} onJobUpdate={handleJobUpdate} />
        ) : display === 'complete' ? (
          <CompleteSummary job={job} />
        ) : (
          <PhaseScript job={job} onJobUpdate={handleJobUpdate} />
        )}
      </div>
    </PageWrap>
  )
}

function CompleteSummary({ job }) {
  const safeName = (job.job_name || 'video').replace(/[^a-z0-9_-]/gi, '_')
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Video Job Complete!</h2>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        <strong>{job.job_name}</strong> is ready to publish.
      </p>
      <div style={{ background: '#F0FDFC', border: '1px solid #99F6E4', borderRadius: 10, padding: '20px 24px', display: 'inline-block', textAlign: 'left' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F766E', marginBottom: 12 }}>Final file checklist</div>
        {[
          `${safeName}_avatar.mp4 — HeyGen avatar video`,
          ...(job.broll_prompts || []).map((_, i) => `${safeName}_broll_${i + 1}.mp4 — B-roll clip`),
          `${safeName}_FINAL.mp4 — exported CapCut video`,
        ].map((f, i) => (
          <div key={i} style={{ fontSize: 13, color: '#065F46', marginBottom: 4 }}>☑ {f}</div>
        ))}
      </div>
    </div>
  )
}

function PageWrap({ children }) {
  return <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 64px' }}>{children}</div>
}
