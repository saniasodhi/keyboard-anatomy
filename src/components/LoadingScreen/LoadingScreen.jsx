import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { unlockAudio, playUi } from '../../utils/sound'

const LINES = ['Initializing 3D system', 'Loading keyboard', 'Calibrating components', 'Preparing experience']

export function LoadingScreen({ sceneReady }) {
  const setPhase = useStore((s) => s.setPhase)
  const [pct, setPct] = useState(0)
  const [leaving, setLeaving] = useState(false)

  // Progress eases toward 92% on its own and completes once the scene has rendered
  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setPct((p) => {
        const cap = sceneReady ? 100 : 92
        return Math.min(cap, p + (cap - p) * Math.min(1, dt * (sceneReady ? 6 : 1.6)) + dt * 8)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sceneReady])

  const done = pct >= 99.5
  const active = Math.min(LINES.length - 1, Math.floor((pct / 100) * LINES.length))

  // dev convenience: ?enter skips the gate
  useEffect(() => {
    if (done && import.meta.env.DEV && location.search.includes('enter')) setPhase('ready')
  }, [done, setPhase])

  const enter = () => {
    unlockAudio()
    if (useStore.getState().soundOn) playUi('open')
    setLeaving(true)
    setTimeout(() => setPhase('ready'), 650)
  }

  return (
    <div className={`loader ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Loading Keyboard Anatomy">
      <div className="loader__inner">
        <svg className="loader__stack" viewBox="0 0 120 92" aria-hidden>
          {[3, 2, 1, 0].map((i) => (
            <path
              key={i}
              d="M60 10 L108 30 L60 50 L12 30 Z"
              style={{ transform: `translateY(${i * (7 + (pct / 100) * 7)}px)` }}
              className={i === 1 ? 'is-signal' : ''}
            />
          ))}
        </svg>
        <p className="loader__brand">Keyboard Anatomy</p>
        <ul className="loader__lines mono">
          {LINES.map((l, i) => (
            <li key={l} className={i < active || done ? 'is-done' : i === active ? 'is-on' : ''}>
              <span className="loader__tick" aria-hidden />
              {l}
            </li>
          ))}
        </ul>
        <div className="loader__meter" aria-hidden>
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="loader__foot">
          <span className="mono loader__pct" aria-live="polite">
            {Math.floor(pct)}%
          </span>
          <button className="btn btn--primary loader__enter" onClick={enter} disabled={!done} autoFocus={done}>
            Enter experience
          </button>
        </div>
      </div>
    </div>
  )
}
