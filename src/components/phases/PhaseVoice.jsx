import { useState } from 'react'
import { generateVoice } from '../../api/generate.js'
import { updateJob } from '../../api/jobs.js'
import ManualCard, { ManualStep } from '../ManualCard.jsx'

function extractAvatarLines(script) {
  return (script || '').split('\n')
    .filter(l => l.trim().startsWith('[AVATAR - ON CAMERA]'))
    .map(l => {
      const m = l.match(/\[AVATAR - ON CAMERA\]:\s*"(.+)"/)
      return m ? m[1].trim() : ''
    })
    .filter(Boolean)
    .join(' ')
}

function extractBrollCount(script) {
  return (script.match(/\[B-ROLL CUE\]/g) || []).length
}

export default function PhaseVoice({ job, onJobUpdate }) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [blobRef, setBlobRef] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')

  const narration = extractAvatarLines(job.script || '')
  const safeName = (job.job_name || 'voice').replace(/[^a-z0-9_-]/gi, '_')
  const brollCount = extractBrollCount(job.script || '')

  const handleGenerate = async () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setBlobRef(null)
    setGenerating(true)
    setError('')
    try {
      const url = await generateVoice(job.script, job.job_name)
      setAudioUrl(url)
      // keep blob reference for download filename
      setBlobRef(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setError('')
    try {
      const voiceText = narration
      const updated = await updateJob(job.id, { phase: 'broll', status: 'in_progress', voice_text: voiceText })
      onJobUpdate(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Phase 2 — Voice</h2>
      <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>
        Generate your AI voice-over from the script's avatar lines, then upload to HeyGen.
      </p>

      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Narration Text ({narration.split(' ').length} words)
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{narration || 'No avatar lines found in script.'}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} disabled={generating || !narration} style={btnOutline(generating || !narration)}>
          {generating ? '⟳ Generating voice...' : audioUrl ? '↺ Regenerate Voice' : '🎙 Generate Voice (ElevenLabs)'}
        </button>
        <button onClick={handleAdvance} disabled={advancing} style={btnPrimary(advancing)}>
          {advancing ? 'Saving...' : 'Avatar Ready ✓ — Continue →'}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {audioUrl && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46', marginBottom: 12 }}>✅ Voice generated successfully</div>
          <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 12 }} />
          <a
            href={blobRef}
            download={`${safeName}.mp3`}
            style={{
              display: 'inline-block', padding: '8px 16px',
              background: '#10B981', color: '#fff', borderRadius: 7,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            ↓ Download MP3 ({safeName}.mp3)
          </a>
        </div>
      )}

      <ManualCard title="MANUAL STEP: Upload to HeyGen">
        <ManualStep n={1}>Go to <strong>HeyGen.com</strong> → "Create" → "AI Avatar Video"</ManualStep>
        <ManualStep n={2}>Select your <strong>Instant Avatar</strong> (your cloned avatar)</ManualStep>
        <ManualStep n={3}>Click <strong>"Upload Audio"</strong> and upload the MP3 you downloaded above</ManualStep>
        <ManualStep n={4}>Set background: Transparent or a clean neutral studio background</ManualStep>
        <ManualStep n={5}>Set dimensions: <strong>1080 × 1920</strong> (vertical / 9:16)</ManualStep>
        <ManualStep n={6}>Click <strong>Generate</strong> — takes ~5–10 minutes to render</ManualStep>
        <ManualStep n={7}>Download the avatar video as MP4</ManualStep>
        <ManualStep n={8}>Name the file: <strong>{safeName}_avatar.mp4</strong></ManualStep>
        <ManualStep n={9}>Come back here and click <strong>"Avatar Ready ✓"</strong> to continue to B-Roll</ManualStep>
      </ManualCard>
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

function btnPrimary(disabled) {
  return {
    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', background: '#00B4A6', color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }
}
