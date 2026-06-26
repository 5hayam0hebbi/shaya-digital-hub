import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createJob } from '../api/jobs.js'

const VIDEO_TYPES = [
  { value: 'listing_reel', label: '🏠 Listing Reel', desc: '30–45 sec · Property highlights + CTA' },
  { value: 'market_update', label: '📈 Market Update', desc: '30–45 sec · Stats + insight + CTA' },
  { value: 'neighbourhood_guide', label: '🗺 Neighbourhood Guide', desc: '45–60 sec · Area highlights + CTA' },
  { value: 'open_house', label: '🚪 Open House Invite', desc: '20–30 sec · Date/time + teasers + CTA' },
]

const AUDIENCES = [
  'First-time buyers',
  'Move-up & family buyers',
  'Sellers & homeowners',
  'Relocators from Toronto',
  'Active buyers',
  'Buyers and sellers (general)',
]

function makeJobName(videoType, inputData) {
  const date = new Date().toLocaleDateString('en-CA', { month: '2-digit', day: '2-digit' }).replace('-', '')
  const base = (inputData.address || inputData.area || 'video').replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  const prefix = {
    listing_reel: 'Listing',
    market_update: 'MarketUpdate',
    neighbourhood_guide: 'NeighbourhoodGuide',
    open_house: 'OpenHouse',
  }[videoType] || 'Video'
  return `${prefix}_${base}_${date}`
}

function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {hint && <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1px solid #E2E8F0', borderRadius: 8,
  fontSize: 14, color: '#0F172A', outline: 'none',
  background: '#FFFFFF',
}

export default function NewJob() {
  const [searchParams] = useSearchParams()
  const [videoType, setVideoType] = useState(searchParams.get('type') || '')
  const [inputData, setInputData] = useState({
    // listing reel
    address: searchParams.get('address') || '',
    price: searchParams.get('price') || '',
    beds: searchParams.get('beds') || '',
    baths: searchParams.get('baths') || '',
    highlights: [
      searchParams.get('h1') || '',
      searchParams.get('h2') || '',
      searchParams.get('h3') || '',
    ],
    // market update
    area: searchParams.get('area') || '', stat: '', insight: '',
    // neighbourhood guide
    highlight1: '', highlight2: '', highlight3: '',
    // open house
    datetime: '',
    // shared
    audience: searchParams.get('audience') || AUDIENCES[0],
  })

  // Show a pre-fill notice if we came from TC Ops
  const fromTCOps = searchParams.get('source') === 'tcops'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k, v) => setInputData(prev => ({ ...prev, [k]: v }))
  const setHighlight = (i, v) => setInputData(prev => {
    const h = [...prev.highlights]; h[i] = v; return { ...prev, highlights: h }
  })

  const canSubmit = videoType && (() => {
    if (videoType === 'listing_reel') return inputData.address.trim()
    if (videoType === 'market_update') return inputData.area.trim() && inputData.stat.trim()
    if (videoType === 'neighbourhood_guide') return inputData.area.trim()
    if (videoType === 'open_house') return inputData.address.trim() && inputData.datetime.trim()
    return false
  })()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const jobName = makeJobName(videoType, inputData)
      const job = await createJob({
        video_type: videoType,
        job_name: jobName,
        input_data: inputData,
        phase: 'script',
        status: 'draft',
      })
      navigate(`/job/${job.id}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 32px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>New Video Job</h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>Fill in the details and AI will write your script in the next step.</p>
        {fromTCOps && (
          <div style={{ background: '#F0FDFC', border: '1px solid #99F6E4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0F766E', fontWeight: 500 }}>
            ✅ Pre-filled from TC Ops request — review and adjust as needed.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Video type selector */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            Video Type <span style={{ color: '#EF4444' }}>*</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {VIDEO_TYPES.map(t => (
              <div
                key={t.value}
                onClick={() => setVideoType(t.value)}
                style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: videoType === t.value ? '2px solid #00B4A6' : '1px solid #E2E8F0',
                  background: videoType === t.value ? '#F0FDFC' : '#FFFFFF',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Type-specific fields */}
        {videoType === 'listing_reel' && (
          <div style={section}>
            <Field label="Property Address" required>
              <input value={inputData.address} onChange={e => set('address', e.target.value)}
                style={inputStyle} placeholder="142 Birchwood Ave, Richmond Hill, ON" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="List Price (optional)">
                <input value={inputData.price} onChange={e => set('price', e.target.value)}
                  style={inputStyle} placeholder="1,299,000" />
              </Field>
              <Field label="Beds">
                <input value={inputData.beds} onChange={e => set('beds', e.target.value)}
                  style={inputStyle} placeholder="4" />
              </Field>
              <Field label="Baths">
                <input value={inputData.baths} onChange={e => set('baths', e.target.value)}
                  style={inputStyle} placeholder="3" />
              </Field>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
              Key Highlights <span style={{ color: '#94A3B8', fontWeight: 400 }}>(up to 3)</span>
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ marginBottom: 10 }}>
                <input
                  value={inputData.highlights[i]}
                  onChange={e => setHighlight(i, e.target.value)}
                  style={inputStyle}
                  placeholder={[
                    'e.g., Renovated kitchen with quartz countertops',
                    'e.g., Finished basement with separate entrance',
                    'e.g., Backing onto ravine, premium pie lot',
                  ][i]}
                />
              </div>
            ))}
          </div>
        )}

        {videoType === 'market_update' && (
          <div style={section}>
            <Field label="Area / Neighbourhood" required>
              <input value={inputData.area} onChange={e => set('area', e.target.value)}
                style={inputStyle} placeholder="Richmond Hill, York Region" />
            </Field>
            <Field label="Key Stat" required hint="A specific, real statistic you want to lead with">
              <input value={inputData.stat} onChange={e => set('stat', e.target.value)}
                style={inputStyle} placeholder="e.g., Detached prices up 4.2% month-over-month" />
            </Field>
            <Field label="Key Insight" hint="Your take — what does this stat mean for buyers/sellers?">
              <textarea value={inputData.insight} onChange={e => set('insight', e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="e.g., Low inventory is pushing competition back in the Bayview Hill pocket" />
            </Field>
          </div>
        )}

        {videoType === 'neighbourhood_guide' && (
          <div style={section}>
            <Field label="Neighbourhood / Area" required>
              <input value={inputData.area} onChange={e => set('area', e.target.value)}
                style={inputStyle} placeholder="Jefferson, Richmond Hill" />
            </Field>
            <Field label="Highlight 1 — Schools / Education" hint="Top school names, programs, or proximity">
              <input value={inputData.highlight1} onChange={e => set('highlight1', e.target.value)}
                style={inputStyle} placeholder="e.g., Bayview Secondary IB program, top-rated elementary schools" />
            </Field>
            <Field label="Highlight 2 — Parks / Green Space">
              <input value={inputData.highlight2} onChange={e => set('highlight2', e.target.value)}
                style={inputStyle} placeholder="e.g., Jefferson Forest trail system, Lake Wilcox park" />
            </Field>
            <Field label="Highlight 3 — Transit / Lifestyle">
              <input value={inputData.highlight3} onChange={e => set('highlight3', e.target.value)}
                style={inputStyle} placeholder="e.g., GO Train at Bloomington, shops on Yonge, Costco nearby" />
            </Field>
          </div>
        )}

        {videoType === 'open_house' && (
          <div style={section}>
            <Field label="Property Address" required>
              <input value={inputData.address} onChange={e => set('address', e.target.value)}
                style={inputStyle} placeholder="142 Birchwood Ave, Richmond Hill, ON" />
            </Field>
            <Field label="Date & Time" required>
              <input value={inputData.datetime} onChange={e => set('datetime', e.target.value)}
                style={inputStyle} placeholder="Saturday, July 12 · 2:00 PM – 4:00 PM" />
            </Field>
            <Field label="Teaser Highlight 1" hint="Something enticing about the property">
              <input value={inputData.highlight1} onChange={e => set('highlight1', e.target.value)}
                style={inputStyle} placeholder="e.g., Stunning chef's kitchen with waterfall island" />
            </Field>
            <Field label="Teaser Highlight 2">
              <input value={inputData.highlight2} onChange={e => set('highlight2', e.target.value)}
                style={inputStyle} placeholder="e.g., Backs onto conservation land — no rear neighbours" />
            </Field>
          </div>
        )}

        {/* Audience — always shown once type is selected */}
        {videoType && (
          <Field label="Target Audience">
            <select value={inputData.audience} onChange={e => set('audience', e.target.value)} style={inputStyle}>
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {videoType && (
          <button
            type="submit"
            disabled={!canSubmit || saving}
            style={{
              width: '100%', padding: '14px', background: canSubmit ? '#00B4A6' : '#E2E8F0',
              color: canSubmit ? '#FFFFFF' : '#94A3B8', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Creating job...' : 'Create Job & Write Script →'}
          </button>
        )}
      </form>
    </div>
  )
}

const section = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '20px', marginBottom: 20 }
