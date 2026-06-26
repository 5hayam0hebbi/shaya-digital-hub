import { useState } from 'react'
import { testConnection } from '../api/generate.js'

const SERVICES = [
  {
    key: 'anthropic',
    label: 'Anthropic (Claude)',
    envVars: ['ANTHROPIC_API_KEY'],
    desc: 'Used for script generation, B-roll prompts, and edit guides.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    envVars: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'],
    desc: 'Used for voice-over generation. ELEVENLABS_VOICE_ID is the ID of your cloned voice.',
    docsUrl: 'https://elevenlabs.io/app/speech-synthesis/voice-lab',
  },
  {
    key: 'supabase',
    label: 'Supabase',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    desc: 'Used to store video jobs and generated content.',
    docsUrl: 'https://supabase.com/dashboard/project/_/settings/api',
  },
]

function StatusDot({ status }) {
  const color = status === 'ok' ? '#10B981' : status === 'error' ? '#EF4444' : '#CBD5E1'
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 8 }} />
}

export default function Settings() {
  const [statuses, setStatuses] = useState({})
  const [testing, setTesting] = useState({})

  const handleTest = async (key) => {
    setTesting(prev => ({ ...prev, [key]: true }))
    try {
      const result = await testConnection(key)
      setStatuses(prev => ({ ...prev, [key]: result }))
    } catch (e) {
      setStatuses(prev => ({ ...prev, [key]: { ok: false, message: e.message } }))
    } finally {
      setTesting(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>API configuration for the Video Production Hub.</p>
      </div>

      {/* Environment variables */}
      <div style={{ marginBottom: 32 }}>
        {SERVICES.map(svc => {
          const status = statuses[svc.key]
          const isTesting = testing[svc.key]
          return (
            <div key={svc.key} style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
              padding: '20px 24px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>
                    {status && <StatusDot status={status.ok ? 'ok' : 'error'} />}
                    {svc.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>{svc.desc}</div>
                </div>
                <button
                  onClick={() => handleTest(svc.key)}
                  disabled={isTesting}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0',
                    background: '#F8FAFC', color: '#374151', fontSize: 13, fontWeight: 600,
                    cursor: isTesting ? 'wait' : 'pointer', whiteSpace: 'nowrap', marginLeft: 16,
                  }}
                >
                  {isTesting ? '⟳ Testing...' : 'Test Connection'}
                </button>
              </div>

              {status && (
                <div style={{
                  background: status.ok ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${status.ok ? '#A7F3D0' : '#FECACA'}`,
                  borderRadius: 7, padding: '8px 12px',
                  color: status.ok ? '#065F46' : '#991B1B',
                  fontSize: 13, marginBottom: 12,
                }}>
                  {status.ok ? '✅' : '❌'} {status.message}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {svc.envVars.map(v => (
                  <code key={v} style={{
                    background: '#F1F5F9', color: '#475569', padding: '3px 10px',
                    borderRadius: 5, fontSize: 12, fontFamily: 'monospace',
                  }}>{v}</code>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* How to configure */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 12 }}>How to configure API keys</div>
        <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}><strong>On Render (production):</strong> Go to your service → Environment → Add environment variables.</p>
          <p style={{ marginBottom: 8 }}><strong>Locally (development):</strong> Create a <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>.env</code> file in the project root using <code style={{ background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>.env.example</code> as a template.</p>
          <p>Keys are <strong>never exposed to the browser</strong> — all API calls go through the Express server.</p>
        </div>
      </div>

      {/* Supabase setup */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Supabase — First-time Setup</div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>Run the migration to create the <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>video_jobs</code> table:</p>
          <ol style={{ paddingLeft: 20 }}>
            <li>Open your <strong>Supabase project</strong> → SQL Editor</li>
            <li>Open the file <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>migrations/001_video_jobs.sql</code> from this repo</li>
            <li>Paste and run the SQL</li>
          </ol>
        </div>
      </div>

      {/* Brand info */}
      <div style={{ background: '#F0FDFC', border: '1px solid #99F6E4', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0F766E', marginBottom: 10 }}>Brand Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
          {[
            ['Agent', 'Shaya Mohebbi, REALTOR®'],
            ['Brand', 'Shaya Digital · eXp Realty, Brokerage'],
            ['Phone', '647-370-9588'],
            ['Website', 'shayamohebbi.com'],
            ['Market', 'York Region / Greater Toronto Area'],
            ['Voice tone', 'Warm, trustworthy, educational'],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#94A3B8' }}>{k}: </span>
              <span style={{ fontWeight: 500, color: '#0F172A' }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#0F766E', marginTop: 12 }}>
          Brand details are baked into all AI-generated scripts. To change them, edit <code style={{ background: '#CCFBF1', padding: '1px 6px', borderRadius: 4 }}>server.js → buildScriptPrompt()</code>.
        </p>
      </div>
    </div>
  )
}
