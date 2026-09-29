// Tiny procedural key-sound synth (no audio files).
// A keystroke = a short filtered noise "click" + a low damped "thock" from the case.
let ctx = null
let master = null
let noiseBuf = null

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.55
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(ctx.destination)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

// Audio only starts after a user gesture has called unlockAudio()
let unlocked = false

export function unlockAudio() {
  unlocked = true
  const c = ensure()
  if (c && c.state === 'suspended') c.resume()
}

const PROFILES = {
  linear: { click: 2600, clickQ: 0.9, clickGain: 0.22, thock: 170, thockGain: 0.5 },
  tactile: { click: 2100, clickQ: 1.2, clickGain: 0.3, thock: 150, thockGain: 0.55 },
  clicky: { click: 4200, clickQ: 3, clickGain: 0.55, thock: 180, thockGain: 0.4 },
}

export function playKey({ down = true, wide = false, type = 'linear', gain = 1 } = {}) {
  if (!unlocked) return
  const c = ensure()
  if (!c) return
  const p = PROFILES[type] || PROFILES.linear
  const t = c.currentTime
  const vary = 0.9 + Math.random() * 0.2

  // click / contact noise
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = p.click * vary * (down ? 1 : 1.25)
  bp.Q.value = p.clickQ
  const g = c.createGain()
  const peak = Math.max(0.0002, (down ? p.clickGain : p.clickGain * 0.45) * (wide ? 1.1 : 1) * gain)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + (down ? 0.045 : 0.03))
  src.connect(bp).connect(g).connect(master)
  src.start(t, Math.random() * 0.1, 0.08)

  // case resonance "thock"
  if (down) {
    const o = c.createOscillator()
    o.type = 'sine'
    const f = (wide ? p.thock * 0.72 : p.thock) * vary
    o.frequency.setValueAtTime(f * 1.6, t)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03)
    const og = c.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.exponentialRampToValueAtTime(Math.max(0.0002, p.thockGain * (wide ? 1.2 : 1) * gain), t + 0.004)
    og.gain.exponentialRampToValueAtTime(0.0001, t + (wide ? 0.13 : 0.085))
    o.connect(og).connect(master)
    o.start(t)
    o.stop(t + 0.16)
  }
}

// UI sounds only fire from click handlers, which count as a user gesture
export function playUi(kind = 'tick') {
  unlockAudio()
  const c = ensure()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = kind === 'open' ? 880 : kind === 'close' ? 520 : 1320
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.08)
}
