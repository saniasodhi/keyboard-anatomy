import { useMemo, useRef } from 'react'
import { useStore, flyTo, DEFAULT_VIEW, EXPLODED_VIEW } from '../../store/useStore'
import { playUi } from '../../utils/sound'

// A travel gauge: the slider reads like the ruler on an engineering drawing.
export function ExplosionSlider() {
  const explode = useStore((s) => s.explode)
  const setExplode = useStore((s) => s.setExplode)
  const animateExplode = useStore((s) => s.animateExplode)
  const soundOn = useStore((s) => s.soundOn)
  const pct = Math.round(explode * 100)
  const ticks = useMemo(() => Array.from({ length: 51 }, (_, i) => i), [])
  const startValue = useRef(0)
  // only re-frame the camera when the slider actually moved
  const settle = () => {
    const v = useStore.getState().explode
    if (Math.abs(v - startValue.current) < 0.005) return
    startValue.current = v
    flyTo(v > 0.35 ? EXPLODED_VIEW : DEFAULT_VIEW)
  }

  const explodeAll = () => {
    if (soundOn) playUi('open')
    useStore.getState().clearSelection()
    animateExplode(1, 2.2)
    flyTo(EXPLODED_VIEW)
  }
  const reassemble = () => {
    if (soundOn) playUi('close')
    useStore.getState().clearSelection()
    animateExplode(0, 1.8)
    useStore.setState({ heroTouched: false })
    flyTo(DEFAULT_VIEW)
  }

  return (
    <div className="gauge panel" role="group" aria-label="Explode the keyboard">
      <button className="btn btn--ghost" onClick={reassemble} disabled={explode < 0.001}>
        Reassemble
      </button>
      <div className="gauge__track">
        <div className="gauge__labels" aria-hidden>
          <span>Assembled</span>
          <span className="mono gauge__read">
            {String(pct).padStart(3, ' ')}
            <small>%</small>
          </span>
          <span>Exploded</span>
        </div>
        <div className="gauge__ruler" aria-hidden>
          {ticks.map((i) => (
            <i key={i} className={i % 5 === 0 ? 'maj' : ''} style={{ left: `${i * 2}%`, opacity: i * 2 <= pct ? 1 : 0.45 }} />
          ))}
          <span className="gauge__fill" style={{ width: `${pct}%` }} />
          <span className="gauge__thumb" style={{ left: `${explode * 100}%` }} />
        </div>
        <input
          className="gauge__input"
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          aria-label="Explode amount"
          aria-valuetext={`${pct} percent exploded`}
          onChange={(e) => {
            const v = +e.target.value / 100
            const s = useStore.getState()
            if (s.selected || s.system) s.clearSelection()
            setExplode(v)
          }}
          onPointerDown={() => (startValue.current = useStore.getState().explode)}
          onFocus={() => (startValue.current = useStore.getState().explode)}
          onPointerUp={settle}
          onKeyUp={(e) => /Arrow|Home|End|Page/.test(e.key) && settle()}
        />
      </div>
      <button className="btn btn--primary" onClick={explodeAll} disabled={explode > 0.999}>
        Explode
      </button>
    </div>
  )
}
