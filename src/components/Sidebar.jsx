import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', exact: true },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const S = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: '#0F1B2D',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  logo: {
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  logoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '-0.2px',
  },
  logoSub: {
    color: '#00B4A6',
    fontSize: 11,
    fontWeight: 500,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  nav: { flex: 1, padding: '8px 12px' },
  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    color: active ? '#FFFFFF' : '#94A3B8',
    background: active ? 'rgba(0,180,166,0.15)' : 'transparent',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    marginBottom: 2,
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
  }),
  icon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  newBtn: {
    margin: '0 12px 20px',
    padding: '11px 16px',
    background: '#00B4A6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    color: '#475569',
    fontSize: 11,
  },
}

export default function Sidebar() {
  const navigate = useNavigate()
  return (
    <aside style={S.sidebar}>
      <div style={S.logo}>
        <div style={S.logoTitle}>Shaya Digital</div>
        <div style={S.logoSub}>Video Production Hub</div>
      </div>

      <nav style={S.nav}>
        {NAV.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            style={({ isActive }) => S.navItem(isActive)}
          >
            <span style={S.icon}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <button style={S.newBtn} onClick={() => navigate('/job/new')}
        onMouseOver={e => e.currentTarget.style.background = '#00a396'}
        onMouseOut={e => e.currentTarget.style.background = '#00B4A6'}
      >
        + New Video Job
      </button>

      <div style={S.footer}>
        Kaizen Real Estate Team<br />
        eXp Realty · York Region
      </div>
    </aside>
  )
}
