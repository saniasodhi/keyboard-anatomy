import { useEffect, useState } from 'react'
import { SIGNAL_STEPS } from '../../data/signalSteps'
import { useStore } from '../../store/useStore'
import { Flow } from '../ComponentPanel/ComponentPanel'
import { IconArrow, IconPlay } from '../UI/Icons'
import { playUi } from '../../utils/sound'

const STEP_MS = 8000
const NARRATIVE = ['press', 'actuate', 'detect', 'process', 'transmit', 'display']

export function HowItWorks() {
  const step = useStore((s) => s.step)
  const goStep = useStore((s) => s.goStep)
  const setMode = useStore((s) => s.setMode)
  const soundOn = useStore((s) => s.soundOn)
  const [playing, setPlaying] = useState(false)
  const [flowIdx, setFlowIdx] = useState(0)
  const cur = SIGNAL_STEPS[step]
  const last = step === SIGNAL_STEPS.length - 1

  const go = (i) => {
    if (soundOn) playUi('tick')
    goStep(i)
  }

  // Autoplay through the steps
  useEffect(() => {
    if (!playing) return
    if (last) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => goStep(step + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, last, goStep])

  // Walk the chain diagram node by node
  useEffect(() => {
    setFlowIdx(0)
    const id = setInterval(() => setFlowIdx((i) => (i + 1) % (cur.chain.length + 1)), 900)
    return () => clearInterval(id)
  }, [step, cur.chain.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return
      if (e.key === 'ArrowRight') goStep(Math.min(SIGNAL_STEPS.length - 1, useStore.getState().step + 1))
      if (e.key === 'ArrowLeft') goStep(Math.max(0, useStore.getState().step - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goStep])

  return (
    <>
      <aside className="rail panel how-rail" aria-label="Keystroke journey">
        <div className="how-rail__head">
          <h2 className="how-rail__title">How it works</h2>
          <p className="how-rail__sub">Follow a keystroke from your finger to the screen.</p>
        </div>
        <ol className="steps">
          {SIGNAL_STEPS.map((s, i) => (
            <li key={s.id}>
              <button className={`steps__btn ${i === step ? 'is-on' : ''} ${i < step ? 'is-done' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}>
                <span className="steps__no mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="steps__verb">{s.verb}</span>
                <span className="steps__bar" aria-hidden>
                  {i === step && playing && <span className="steps__prog" style={{ animationDuration: `${STEP_MS}ms` }} key={step} />}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <aside className="info panel is-open how-info" aria-live="polite">
        <div className="info__scroll" key={step}>
          <div className="info__meta">
            <span className="mono">
              Step {String(step + 1).padStart(2, '0')} / {String(SIGNAL_STEPS.length).padStart(2, '0')}
            </span>
            <span className="info__sep" aria-hidden />
            <span className="eyebrow">{cur.verb}</span>
          </div>
          <h2 className="info__title">{cur.title}</h2>
          <p className="info__lead">{cur.body}</p>
          <section className="info__sec">
            <h3 className="eyebrow">{last ? 'The whole journey' : 'What moves'}</h3>
            <Flow steps={cur.chain} active={flowIdx < cur.chain.length ? flowIdx : -1} />
          </section>
          {step === 3 && <MatrixDiagram />}
          <div className="how-ctrl">
            <button className="icon-btn" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous step">
              <IconArrow dir="left" />
            </button>
            <button className="btn btn--ghost" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
              <IconPlay playing={playing} />
              {playing ? 'Pause' : 'Autoplay'}
            </button>
            {last ? (
              <button className="btn btn--primary" onClick={() => setMode('type')}>
                Type test
                <IconArrow />
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => go(step + 1)}>
                Next
                <IconArrow />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="narrative panel" aria-label="Signal path">
        {NARRATIVE.map((id, i) => {
          const idx = SIGNAL_STEPS.findIndex((s) => s.id === id)
          return (
            <span key={id} className="narrative__item">
              {i > 0 && <i aria-hidden>→</i>}
              <button className={`narrative__btn ${idx === step ? 'is-on' : ''} ${idx < step ? 'is-done' : ''}`} onClick={() => go(idx)}>
                {SIGNAL_STEPS[idx].verb}
              </button>
            </span>
          )
        })}
      </div>

      {cur.id === 'display' && <Screen />}
    </>
  )
}

function MatrixDiagram() {
  // 4×4 slice of the matrix: row 3 and column 2 cross at the pressed key
  return (
    <div className="matrix" aria-label="The active row and column cross at the pressed switch">
      {Array.from({ length: 16 }).map((_, i) => {
        const r = Math.floor(i / 4)
        const c = i % 4
        const hitRow = r === 2
        const hitCol = c === 1
        return <span key={i} className={`matrix__cell ${hitRow ? 'r' : ''} ${hitCol ? 'c' : ''} ${hitRow && hitCol ? 'hit' : ''}`} />
      })}
      <span className="matrix__lab matrix__lab--row mono">Row</span>
      <span className="matrix__lab matrix__lab--col mono">Column</span>
    </div>
  )
}

function Screen() {
  const [text, setText] = useState('')
  useEffect(() => {
    const word = 'j'
    let i = 0
    const id = setInterval(() => {
      i++
      setText(word.slice(0, i % 3 === 0 ? 0 : 1))
    }, 1100)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="screen" aria-hidden>
      <div className="screen__bar">
        <i />
        <i />
        <i />
        <span className="mono">untitled.txt</span>
      </div>
      <div className="screen__body">
        <span className="screen__text">{text}</span>
        <span className="caret" />
      </div>
    </div>
  )
}
