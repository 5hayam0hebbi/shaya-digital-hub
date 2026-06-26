import { useState, useEffect } from 'react'
import { generateVoice, generateEditGuide } from '../api/generate.js'
import { saveContent } from '../api.js'
import ManualCard, { ManualStep } from './ManualCard.jsx'

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
  const [audioUrl, setAudioUrl] = useState(null)
  const [genVoice, setGenVoice] = useState(false)
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

  // The ElevenLabs script to use for voice (prefer generated EL script, fallback to master)
  const elScript = saved(savedContent, format, 'elevenlabs') || masterScript || ''
  const heygenPrompt = saved(savedContent, format, 'heygen')
  const higgsfieldPrompt = saved(savedContent, format, 'higgsfield_walk')

  const handleGenerateVoice = async () => {
    if (!elScript) { setError('Generate the ElevenLabs script first.'); return }
    setGenVoice(true); setError('')
    try {
      // Pass voiceType=personal so server uses ELEVENLABS_VOICE_ID_PERSONAL
      const url = await generateVoice(elScript, topic.title, 'personal')
      setAudioUrl(url)
    } catch (e) { setError(e.message) }
    finally { setGenVoice(false) }
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
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Voice — ElevenLabs</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Generate your voice-over using your personal ElevenLabs voice clone.
              </p>

              {elScript && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Script for TTS ({elScript.split(' ').length} words)
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', margin: 0, maxHeight: 140, overflow: 'auto' }}>{elScript}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={handleGenerateVoice} disabled={genVoice} style={btnOutline(genVoice)}>
                  {genVoice ? '⟳ Generating...' : audioUrl ? '↺ Regenerate Voice' : '🎙 Generate Voice'}
                </button>
                <button onClick={handleMarkVoiceDone} style={btnTeal(false)}>
                  {voiceDone ? '✓ Done — Next →' : 'Mark Done & Continue →'}
                </button>
              </div>

              {audioUrl && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46', marginBottom: 10 }}>✅ Voice generated</div>
                  <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 10 }} />
                  <a href={audioUrl} download={`${topic.title.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.mp3`}
                    style={{ display: 'inline-block', padding: '7px 14px', background: '#10B981', color: '#fff', borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
                    ↓ Download MP3
                  </a>
                </div>
              )}

              <ManualCard title="MANUAL STEP: Upload to ElevenLabs Platform (alternative)">
                <ManualStep n={1}>Go to <strong>elevenlabs.io</strong> → Text to Speech</ManualStep>
                <ManualStep n={2}>Select your cloned voice from the voice list</ManualStep>
                <ManualStep n={3}>Paste the script text above into the input field</ManualStep>
                <ManualStep n={4}>Choose <strong>Multilingual v2</strong> or v3 model</ManualStep>
                <ManualStep n={5}>Click Generate → Download the MP3</ManualStep>
                <ManualStep n={6}>Name the file: <strong>{topic.title.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}.mp3</strong></ManualStep>
              </ManualCard>
            </div>
          )}

          {/* ── Phase 2: HeyGen ── */}
          {phase === 'heygen' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>HeyGen — Avatar Video</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Use your generated HeyGen prompt to create the talking-head video.
              </p>

              {heygenPrompt ? (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your HeyGen Prompt</div>
                    <button onClick={() => navigator.clipboard.writeText(heygenPrompt)}
                      style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', margin: 0 }}>{heygenPrompt}</p>
                </div>
              ) : (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
                  ⚠ No HeyGen prompt found — generate it in the "HeyGen — Talking Head" section above first.
                </div>
              )}

              <button onClick={handleMarkHeygenDone} style={{ ...btnTeal(false), marginBottom: 16 }}>
                {heygenDone ? '✓ Done — Next →' : 'HeyGen Done ✓ — Continue →'}
              </button>

              <ManualCard title="MANUAL STEP: Create Avatar Video in HeyGen">
                <ManualStep n={1}>Go to <strong>HeyGen.com</strong> → Create → AI Avatar Video</ManualStep>
                <ManualStep n={2}>Select your <strong>Instant Avatar</strong></ManualStep>
                <ManualStep n={3}>Paste the prompt above into the script field</ManualStep>
                <ManualStep n={4}>Set dimensions: <strong>1080 × 1920</strong> (9:16 vertical for Reels) or 1920 × 1080 for YouTube</ManualStep>
                <ManualStep n={5}>Click <strong>Generate</strong> — takes 5–10 min</ManualStep>
                <ManualStep n={6}>Download the MP4 when done</ManualStep>
              </ManualCard>
            </div>
          )}

          {/* ── Phase 3: Higgsfield ── */}
          {phase === 'higgsfield' && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Higgsfield — B-Roll</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Use your generated Higgsfield prompt to create the walking/location b-roll.
              </p>

              {higgsfieldPrompt ? (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Higgsfield Prompt</div>
                    <button onClick={() => navigator.clipboard.writeText(higgsfieldPrompt)}
                      style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', margin: 0 }}>{higgsfieldPrompt}</p>
                </div>
              ) : (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
                  ⚠ No Higgsfield prompt found — generate it in the "Higgsfield — Walking Location" section above first.
                </div>
              )}

              <button onClick={handleMarkHiggsfieldDone} style={{ ...btnTeal(false), marginBottom: 16 }}>
                {higgsfieldDone ? '✓ Done — Next →' : 'B-Roll Done ✓ — Continue →'}
              </button>

              <ManualCard title="MANUAL STEP: Generate Walking Video in Higgsfield">
                <ManualStep n={1}>Go to <strong>app.higgsfield.ai</strong> → Create → Soul ID</ManualStep>
                <ManualStep n={2}>Select your Soul ID (your walking avatar)</ManualStep>
                <ManualStep n={3}>Paste the prompt above into the location/scene field</ManualStep>
                <ManualStep n={4}>Set aspect ratio: <strong>9:16</strong> (Reels) or 16:9 (YouTube)</ManualStep>
                <ManualStep n={5}>Click Generate — takes 2–5 min</ManualStep>
                <ManualStep n={6}>Download the MP4 when done</ManualStep>
              </ManualCard>
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
