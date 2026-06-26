import { useState, useEffect } from 'react'
import { generateEditGuide } from '../api/generate.js'
import { saveContent } from '../api.js'
import ManualCard, { ManualStep } from './ManualCard.jsx'

function formatForElevenLabs(text) {
  if (!text) return ''
  return text
    .replace(/\.\s+/g, '.  ')
    .replace(/,\s+/g, ',  ')
    .replace(/\?\s+/g, '?  ')
    .replace(/!\s+/g, '!  ')
    .replace(/—/g, ' — ')
    .replace(/\.\.\./g, '...  ')
}

// ── helpers ──────────────────────────────────────────────────────────────────
function saved(savedContent, format, key) {
  return savedContent[`${format}_${key}`]?.content || ''
}
function mark(topicId, format, key, onContentSaved) {
  onContentSaved(format, key, 'done', null)
}

// ── step indicator ────────────────────────────────────────────────────────────
function Step({ n, label, done, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? '#00B4A6' : done ? '#ECFDF5' : '#F8FAFC',
      color: active ? '#fff' : done ? '#065F46' : '#94A3B8',
      fontWeight: active ? 700 : done ? 600 : 400, fontSize: 13,
      flex: 1, justifyContent: 'center', transition: 'all 0.15s',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
        background: active ? 'rgba(255,255,255,0.25)' : done ? '#10B981' : '#E2E8F0',
        color: active ? '#fff' : done ? '#fff' : '#94A3B8', flexShrink: 0,
      }}>{done ? '✓' : n}</span>
      {label}
    </button>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function ProductionPanel({ topic, format, masterScript, savedContent, onContentSaved }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('voice')
  const [copied, setCopied] = useState(false)
  const [genGuide, setGenGuide] = useState(false)
  const [guide, setGuide] = useState('')
  const [error, setError] = useState('')

  // load saved edit guide on open
  useEffect(() => {
    const g = saved(savedContent, format, 'prod_editguide')
    if (g) setGuide(g)
  }, [savedContent, format])

  const voiceDone = saved(savedContent, format, 'prod_voice_done') === 'done'
  const heygenDone = saved(savedContent, format, 'prod_heygen_done') === 'done'
  const higgsfieldDone = saved(savedContent, format, 'prod_higgsfield_done') === 'done'
  const editDone = saved(savedContent, format, 'prod_editguide') !== ''

  const elScript = saved(savedContent, format, 'elevenlabs') || masterScript || ''

  const handleCopyVoice = () => {
    const text = formatForElevenLabs(elScript)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleMarkVoiceDone = () => {
    onContentSaved(format, 'prod_voice_done', 'done', null)
    setPhase('heygen')
  }

  const handleMarkHeygenDone = () => {
    onContentSaved(format, 'prod_heygen_done', 'done', null)
    setPhase('higgsfield')
  }

  const handleMarkHiggsfieldDone = () => {
    onContentSaved(format, 'prod_higgsfield_done', 'done', null)
    setPhase('edit')
  }

  const handleGenerateGuide = async () => {
    setGenGuide(true); setGuide(''); setError('')
    try {
      await generateEditGuide(
        { script: masterScript, jobName: topic.title, videoType: format === 'short' ? 'short_form_reel' : 'long_form_youtube' },
        chunk => setGuide(prev => prev + chunk)
      )
    } catch (e) { setError(e.message) }
    finally { setGenGuide(false) }
  }

  const handleSaveGuide = () => {
    onContentSaved(format, 'prod_editguide', guide, null)
  }

  if (!masterScript) return null

  return (
    <div style={{ marginTop: 16, border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header toggle */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '14px 18px', background: open ? '#0F1B2D' : '#F8FAFC',
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: open ? '#fff' : '#0F172A' }}>
            Production Workflow
          </span>
          <span style={{ fontSize: 12, color: open ? '#94A3B8' : '#64748B' }}>
            Voice → HeyGen → Higgsfield → Edit
          </span>
        </div>
        <span style={{ color: open ? '#00B4A6' : '#94A3B8', fontSize: 13 }}>{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {open && (
        <div style={{ padding: '16px 18px', background: '#fff' }}>
          {/* Phase tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[
              { key: 'voice', label: '1 · Voice', done: voiceDone },
              { key: 'heygen', label: '2 · HeyGen', done: heygenDone },
              { key: 'higgsfield', label: '3 · Higgsfield', done: higgsfieldDone },
              { key: 'edit', label: '4 · Edit Guide', done: editDone },
            ].map((s, i) => (
              <Step key={s.key} n={i + 1} label={s.label} done={s.done}
                active={phase === s.key} onClick={() => setPhase(s.key)} />
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Phase 1: Voice ── */}
          {phase === 'voice' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Voice — ElevenLabs</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Copy the <strong>ElevenLabs Voice Script</strong> generated above and paste it into ElevenLabs Text to Speech.
              </p>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>💡 ElevenLabs Settings</div>
                <ul style={{ paddingLeft: 16, color: '#1E3A8A', lineHeight: 1.9, margin: 0 }}>
                  <li>Model: <strong>Eleven Multilingual v2</strong></li>
                  <li>Stability: <strong>50%</strong> · Similarity: <strong>75%</strong> · Style: <strong>30%</strong></li>
                  <li>Select your personal cloned voice</li>
                  <li>Download as <strong>MP3</strong> at highest quality</li>
                </ul>
              </div>

              <button onClick={handleMarkVoiceDone} style={{ ...btnTeal(false), marginBottom: 0 }}>
                {voiceDone ? '✓ Done — Next →' : 'Voice Done ✓ — Continue →'}
              </button>
            </div>
          )}

          {/* ── Phase 2: HeyGen ── */}
          {phase === 'heygen' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>HeyGen — Talking Head Avatar</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Upload the ElevenLabs MP3 to HeyGen. Your avatar will lip-sync to the voice automatically — no script prompt needed.
              </p>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>💡 HeyGen Settings</div>
                <ul style={{ paddingLeft: 16, color: '#1E3A8A', lineHeight: 1.9, margin: 0 }}>
                  <li>Go to <strong>HeyGen.com</strong> → Create → AI Avatar Video</li>
                  <li>Select your <strong>Instant Avatar</strong> (your cloned avatar)</li>
                  <li>Click <strong>"Upload Audio"</strong> and upload the MP3 from ElevenLabs</li>
                  <li>Dimensions: <strong>1080 × 1920</strong> (9:16) for Reels/Shorts · <strong>1920 × 1080</strong> for YouTube</li>
                  <li>Background: transparent or clean studio neutral</li>
                  <li>Generate → download MP4 (takes ~5–10 min)</li>
                </ul>
              </div>

              <button onClick={handleMarkHeygenDone} style={{ ...btnTeal(false), marginBottom: 0 }}>
                {heygenDone ? '✓ Done — Next →' : 'HeyGen Done ✓ — Continue →'}
              </button>
            </div>
          )}

          {/* ── Phase 3: Higgsfield ── */}
          {phase === 'higgsfield' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Higgsfield — Walking B-Roll</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Use the <strong>Higgsfield — Walking Location</strong> prompt generated above to create outdoor b-roll footage.
              </p>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>💡 Higgsfield Settings</div>
                <ul style={{ paddingLeft: 16, color: '#1E3A8A', lineHeight: 1.9, margin: 0 }}>
                  <li>Go to <strong>app.higgsfield.ai</strong> → Create → Soul ID</li>
                  <li>Select your <strong>Soul ID</strong> (your walking avatar)</li>
                  <li>Paste the Higgsfield prompt from above into the scene/location field</li>
                  <li>Aspect ratio: <strong>9:16</strong> for Reels · <strong>16:9</strong> for YouTube</li>
                  <li>Generate → download MP4 (takes ~2–5 min)</li>
                </ul>
              </div>

              <button onClick={handleMarkHiggsfieldDone} style={{ ...btnTeal(false), marginBottom: 0 }}>
                {higgsfieldDone ? '✓ Done — Next →' : 'B-Roll Done ✓ — Continue →'}
              </button>
            </div>
          )}

          {/* ── Phase 4: Edit Guide ── */}
          {phase === 'edit' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>CapCut Edit Guide</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Generate a step-by-step CapCut editing guide for this video.
              </p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={handleGenerateGuide} disabled={genGuide} style={btnOutline(genGuide)}>
                  {genGuide ? '⟳ Generating...' : guide ? '↺ Regenerate' : '✦ Generate Edit Guide'}
                </button>
                {guide && !genGuide && (
                  <button onClick={handleSaveGuide} style={btnTeal(false)}>💾 Save Guide</button>
                )}
              </div>

              {(guide || genGuide) && (
                <div style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
                  padding: '16px', fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, monospace', color: '#1E293B', marginBottom: 16,
                }}>
                  {guide}
                  {genGuide && <span style={{ opacity: 0.4 }}>▌</span>}
                </div>
              )}

              {!guide && !genGuide && (
                <div style={{ border: '2px dashed #E2E8F0', borderRadius: 10, padding: '36px', textAlign: 'center', color: '#94A3B8', marginBottom: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✂️</div>
                  <div style={{ fontSize: 13 }}>Generate a CapCut guide tailored to this script</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function btnOutline(disabled) {
  return {
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid #E2E8F0', background: '#fff', color: '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}

function btnTeal(disabled) {
  return {
    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', background: '#00B4A6', color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }
}
