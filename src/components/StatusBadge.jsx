const STATUS = {
  draft:       { label: 'Draft',       bg: '#F1F5F9', color: '#64748B' },
  in_progress: { label: 'In Progress', bg: '#EFF6FF', color: '#3B82F6' },
  complete:    { label: 'Complete',    bg: '#ECFDF5', color: '#10B981' },
}

const PHASE = {
  script:   { label: 'Phase 1 · Script',     color: '#8B5CF6' },
  voice:    { label: 'Phase 2 · Voice',      color: '#F59E0B' },
  broll:    { label: 'Phase 3 · B-Roll',     color: '#EF4444' },
  edit:     { label: 'Phase 4 · Edit Guide', color: '#10B981' },
  complete: { label: 'Complete',             color: '#10B981' },
}

const VIDEO_TYPE = {
  listing_reel:       '🏠 Listing Reel',
  market_update:      '📈 Market Update',
  neighbourhood_guide:'🗺 Neighbourhood Guide',
  open_house:         '🚪 Open House Invite',
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>{s.label}</span>
  )
}

export function PhaseBadge({ phase }) {
  const p = PHASE[phase] || PHASE.script
  return (
    <span style={{
      color: p.color, fontSize: 12, fontWeight: 600,
    }}>{p.label}</span>
  )
}

export function VideoTypeBadge({ type }) {
  return (
    <span style={{ fontSize: 13, color: '#475569' }}>
      {VIDEO_TYPE[type] || type}
    </span>
  )
}
