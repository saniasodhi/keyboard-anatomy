import { useEffect, useRef, useState } from 'react'
import { useStore, flyTo, TYPE_HERO_VIEW } from '../../store/useStore'
import { KEY_BY_CODE } from '../../data/layout'
import { playKey, unlockAudio } from '../../utils/sound'

const PHRASE = 'Every keystroke has a story.'

const SHOTS = {
  hero: TYPE_HERO_VIEW,
  close: { pos: [3.4, 2.3, 6.3], target: [0.6, 0.1, 0.5] },
  low: { pos: [-10.5, 3.4, 12.5], target: [-1.2, -0.4, 0.3] },
  top: { pos: [1.4, 12.5, 6.2], target: [0.6, -0.6, 0.5] },
}

const PUNCT = { ' ': 'Space', '.': 'Period', ',': 'Comma', '/': 'Slash', ';': 'Semicolon', "'": 'Quote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', '`': 'Backquote' }
function codeFor(ch) {
  if (/[a-z]/i.test(ch)) return 'Key' + ch.toUpperCase()
  if (/[0-9]/.test(ch)) return 'Digit' + ch
  return PUNCT[ch]
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function TypeTest() {
  const typed = useStore((s) => s.typed)
  const stage = useStore((s) => s.typeStage)
  const setMode = useStore((s) => s.setMode)
  const wireless = useStore((s) => s.custom.wireless)
  const switchType = useStore((s) => s.custom.switch)
  const [showEnd, setShowEnd] = useState(false)
  const run = useRef(0)
  // true while the field still holds the demo's sentence; the visitor's first key replaces it
  const demoText = useRef(false)
  const inputRef = useRef()

  const press = (code, down) => {
    const s = useStore.getState()
    if (!KEY_BY_CODE[code]) return
    s.setPressed(code, down)
    if (s.soundOn) playKey({ down, wide: KEY_BY_CODE[code].w >= 2, type: s.custom.switch })
  }

  // Scripted opening: the keyboard types its own line while the camera drifts between shots
  const autoplay = async () => {
    const id = ++run.current
    const s = useStore.getState()
    const reduced = s.reducedMotion
    setShowEnd(false)
    demoText.current = false
    s.setTyped('')
    s.setTypeStage('intro')
    flyTo(SHOTS.hero, reduced, 1.6)
    await sleep(reduced ? 300 : 1900)
    if (id !== run.current) return
    s.setTypeStage('typing')
    let text = ''
    for (let i = 0; i < PHRASE.length; i++) {
      if (id !== run.current || useStore.getState().mode !== 'type') return
      const ch = PHRASE[i]
      if (i === 5) flyTo(SHOTS.close, reduced, 2.2)
      if (i === 15) flyTo(SHOTS.low, reduced, 2.2)
      if (i === 23) flyTo(SHOTS.top, reduced, 2.2)
      const upper = ch !== ch.toLowerCase()
      const code = codeFor(ch)
      if (upper) press('ShiftLeft', true)
      press(code, true)
      text += ch
      useStore.getState().setTyped(text)
      await sleep(70 + Math.random() * 40)
      press(code, false)
      if (upper) press('ShiftLeft', false)
      await sleep((ch === ' ' ? 90 : 40) + Math.random() * 90)
    }
    await sleep(700)
    if (id !== run.current) return
    flyTo(SHOTS.hero, reduced, 1.8)
    useStore.getState().setTypeStage('done')
    demoText.current = true
    await sleep(900)
    if (id !== run.current) return
    setShowEnd(true)
  }

  useEffect(() => {
    autoplay()
    return () => {
      run.current++
      useStore.setState({ pressed: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Your own keyboard drives the 3D one
  useEffect(() => {
    const down = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !e.code) return
      const t = e.target.closest ? e.target : document.body
      // real text fields and the customize panel keep their keys (the hidden mobile input is handled by onInput)
      if (t.closest('textarea, [role=dialog], input:not(.type-sink)')) return
      if (t.classList?.contains('type-sink')) return
      // Enter / Space still activate the finale buttons for keyboard users
      const btn = t.closest('button')
      if (btn && btn.closest('.finale') && (e.key === 'Enter' || e.key === ' ')) return
      unlockAudio()
      const s = useStore.getState()
      if (s.typeStage !== 'done') {
        // user takes over mid-demo: stop the script, keep the ending available
        run.current++
        s.setTypeStage('done')
        s.setTyped('')
        flyTo(SHOTS.hero, s.reducedMotion, 1.4)
        const id = run.current
        setTimeout(() => run.current === id && setShowEnd(true), 2500)
      }
      // stop Space/Enter from re-triggering whatever control still has focus; Tab keeps moving focus
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code.startsWith('Arrow')) e.preventDefault()
      if (!e.repeat) press(e.code, true)
      if (demoText.current && (e.key.length === 1 || e.key === 'Backspace')) {
        demoText.current = false
        useStore.getState().setTyped('')
        if (e.key === 'Backspace') return
      }
      const st = useStore.getState()
      if (e.key === 'Backspace') st.setTyped(st.typed.slice(0, -1))
      else if (e.key.length === 1) st.setTyped((st.typed + e.key).slice(-64))
    }
    const up = (e) => e.code && press(e.code, false)
    const blur = () => useStore.setState({ pressed: {} })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className={`typebar ${stage === 'intro' ? 'is-intro' : ''}`}>
        <p className="eyebrow typebar__eyebrow">{stage === 'done' ? 'Your turn: start typing' : 'Type test'}</p>
        <div className="typebar__field" role="textbox" aria-readonly="true" aria-label="Typed text" onClick={() => inputRef.current?.focus()}>
          <span className="typebar__text">{typed}</span>
          <span className="caret" />
          {!typed && stage === 'done' && <span className="typebar__ph">Press any key…</span>}
        </div>
        <p className="typebar__status mono">
          <span className="typebar__dot" aria-hidden />
          Connected via {wireless ? 'wireless' : 'USB-C'} · {switchType} switches
        </p>
        {/* hidden input lets touch devices raise a keyboard */}
        <input
          ref={inputRef}
          className="sr-only type-sink"
          aria-hidden
          tabIndex={-1}
          autoCapitalize="off"
          autoCorrect="off"
          onInput={(e) => {
            // touch keyboards rarely send usable keydown codes, so read the text instead
            const ev = e.nativeEvent
            if (demoText.current) {
              demoText.current = false
              useStore.getState().setTyped('')
            }
            const st = useStore.getState()
            if (ev.inputType === 'deleteContentBackward') st.setTyped(st.typed.slice(0, -1))
            else if (ev.data) {
              for (const ch of ev.data) {
                const code = codeFor(ch)
                if (code) {
                  press(code, true)
                  setTimeout(() => press(code, false), 90)
                }
              }
              st.setTyped((st.typed + ev.data).slice(-64))
            }
            e.target.value = ''
          }}
        />
      </div>

      <div className={`finale ${showEnd ? 'is-on' : ''}`} aria-hidden={!showEnd} inert={!showEnd}>
        <h2 className="finale__title">
          Now you know what happens
          <br />
          under <em>every keystroke.</em>
        </h2>
        <div className="finale__actions">
          <button className="btn btn--ghost" onClick={() => setMode('explore')}>
            Explore again
          </button>
          <button className="btn btn--primary" onClick={() => autoplay()}>
            Type again
          </button>
        </div>
      </div>
    </>
  )
}
