import { useState } from 'react'
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

// Add SSML-style cue hints for ElevenLabs manual paste
function formatForElevenLabs(text) {
  if (!text) return ''
  return text
    .replace(/\.\s+/g, '.  ')           // extra space = natural pause after full stop
    .replace(/,\s+/g, ',  ')            // brief pause after comma
    .replace(/\?\s+/g, '?  ')
    .replace(/!\s+/g, '!  ')
    .replace(/—/g, ' — ')
    .replace(/\.\.\./g, '...  ')        // ellipsis pause
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function PhaseVoice({ job, onJobUpdate }) {
  const [copied, setCopied] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')

  const narration = extractAvatarLines(job.script || '')
  const formatted = formatForElevenLabs(narration)
  const words = wordCount(narration)
  const safeName = (job.job_name || 'voice').replace(/[^a-z0-9_-]/gi, '_')

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setError('')
    try {
      const updated = await updateJob(job.id, { phase: 'broll', status: 'in_progress', voice_text: narration })
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
        Copy the narration text below into ElevenLabs Text to Speech, then upload the exported MP3 to HeyGen.
      </p>

      {/* Narration text box */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Narration Text ({words} words · ~{Math.round(words / 2.5)} sec)
          </div>
          <button onClick={handleCopy} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            border: '1px solid #E2E8F0', background: copied ? '#ECFDF5' : '#fff',
            color: copied ? '#065F46' : '#374151', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {copied ? '✅ Copied!' : '📋 Copy Text'}
          </button>
        </div>
        {narration ? (
          <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>
            {formatted}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
            No avatar lines found in script. Go back to Script phase to generate the script first.
          </p>
        )}
      </div>

      {/* Tips */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13 }}>
        <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 6 }}>💡 ElevenLabs Tips</div>
        <ul style={{ paddingLeft: 18, color: '#1E3A8A', lineHeight: 1.8 }}>
          <li>Use model <strong>Eleven Multilingual v2</strong> for best quality</li>
          <li>Stability: <strong>50%</strong> · Similarity: <strong>75%</strong> · Style: <strong>30%</strong></li>
          <li>The extra spaces after punctuation create natural pauses</li>
          <li>Export as <strong>MP3</strong> at highest quality, name it <strong>{safeName}.mp3</strong></li>
        </ul>
      </div>

      {/* Continue button */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={handleAdvance} disabled={advancing || !narration} style={btnPrimary(advancing || !narration)}>
          {advancing ? 'Saving...' : 'Voice Ready ✓ — Continue →'}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {/* Manual steps */}
      <ManualCard title="MANUAL STEP: Generate in ElevenLabs + Upload to HeyGen">
        <ManualStep n={1}>Go to <strong>ElevenLabs.io</strong> → "Text to Speech"</ManualStep>
        <ManualStep n={2}>Select your cloned voice or preferred voice</ManualStep>
        <ManualStep n={3}>Paste the narration text copied above</ManualStep>
        <ManualStep n={4}>Set: Model = <strong>Eleven Multilingual v2</strong>, Stability 50%, Similarity 75%</ManualStep>
        <ManualStep n={5}>Click <strong>Generate</strong>, preview, then <strong>Download as MP3</strong></ManualStep>
        <ManualStep n={6}>Go to <strong>HeyGen.com</strong> → "Create" → "AI Avatar Video"</ManualStep>
        <ManualStep n={7}>Select your <strong>Instant Avatar</strong>, click <strong>"Upload Audio"</strong> and upload the MP3</ManualStep>
        <ManualStep n={8}>Set dimensions: <strong>1080 × 1920</strong> (9:16 vertical), click <strong>Generate</strong></ManualStep>
        <ManualStep n={9}>Download avatar video as MP4, name it <strong>{safeName}_avatar.mp4</strong></ManualStep>
        <ManualStep n={10}>Come back here and click <strong>"Voice Ready ✓"</strong> to continue to B-Roll</ManualStep>
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

function btnPrimary(disabled) {
  return {
    padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: 'none', background: '#00B4A6', color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }
}
