import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobs, deleteJob } from '../api/jobs.js'
import { StatusBadge, PhaseBadge, VideoTypeBadge } from '../components/StatusBadge.jsx'

const VIDEO_TYPE_ICON = {
  listing_reel: '🏠',
  market_update: '📈',
  neighbourhood_guide: '🗺',
  open_house: '🚪',
}

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this video job? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteJob(id)
      setJobs(prev => prev.filter(j => j.id !== id))
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }

  // Stats
  const thisMonth = jobs.filter(j => {
    const d = new Date(j.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const complete = jobs.filter(j => j.status === 'complete').length
  const byType = type => jobs.filter(j => j.video_type === type).length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Video Jobs</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Your real estate reel production pipeline</p>
        </div>
        <button
          onClick={() => navigate('/job/new')}
          style={{
            padding: '11px 22px', background: '#00B4A6', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + New Video Job
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'This Month', value: thisMonth.length, color: '#3B82F6' },
          { label: 'Completed', value: complete, color: '#10B981' },
          { label: 'Listing Reels', value: byType('listing_reel'), color: '#8B5CF6' },
          { label: 'Market Updates', value: byType('market_update'), color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Job list */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>Loading jobs...</div>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '14px 18px', color: '#991B1B', fontSize: 14 }}>
          ⚠ {error} — check your Supabase configuration in Settings.
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div style={{
          border: '2px dashed #E2E8F0', borderRadius: 16, padding: '80px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No video jobs yet</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
            Create your first video job to start producing real estate reels.
          </p>
          <button
            onClick={() => navigate('/job/new')}
            style={{
              padding: '12px 24px', background: '#00B4A6', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Create First Video Job
          </button>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 120px',
            padding: '12px 20px', borderBottom: '1px solid #F1F5F9',
            fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            <span>Job</span>
            <span>Type</span>
            <span>Phase</span>
            <span>Status</span>
            <span></span>
          </div>

          {jobs.map((job, i) => (
            <div
              key={job.id}
              onClick={() => navigate(`/job/${job.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 120px',
                padding: '16px 20px', cursor: 'pointer',
                borderBottom: i < jobs.length - 1 ? '1px solid #F1F5F9' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 2 }}>{job.job_name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{fmtDate(job.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <VideoTypeBadge type={job.video_type} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PhaseBadge phase={job.phase} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusBadge status={job.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/job/${job.id}`) }}
                  style={smallBtn('#EFF6FF', '#3B82F6')}
                >Open</button>
                <button
                  onClick={e => handleDelete(job.id, e)}
                  disabled={deletingId === job.id}
                  style={smallBtn('#FEF2F2', '#EF4444')}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function smallBtn(bg, color) {
  return {
    padding: '5px 12px', borderRadius: 6, border: 'none',
    background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }
}
