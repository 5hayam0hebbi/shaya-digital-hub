import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewJob from './pages/NewJob.jsx'
import JobDetail from './pages/JobDetail.jsx'
import Settings from './pages/Settings.jsx'
import ContentHub from './ContentHub.jsx'

const SIDEBAR_W = 220

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <Sidebar />
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: '100vh', padding: '32px 0' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/content-hub" replace />} />
          <Route path="/content-hub" element={<ContentHub />} />
          <Route path="/video-jobs" element={<Dashboard />} />
          <Route path="/job/new" element={<NewJob />} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
