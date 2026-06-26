export default function ManualCard({ title, children }) {
  return (
    <div style={{
      background: '#EFF6FF',
      border: '1px solid #93C5FD',
      borderLeft: '4px solid #3B82F6',
      borderRadius: 10,
      padding: '20px 24px',
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1D4ED8' }}>{title}</span>
      </div>
      <div style={{ color: '#1E3A5F', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

export function ManualStep({ n, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
      <span style={{
        flexShrink: 0, width: 24, height: 24, background: '#3B82F6',
        color: '#fff', borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>{n}</span>
      <span style={{ paddingTop: 2 }}>{children}</span>
    </div>
  )
}
