import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { IconSound, IconReset, IconExpand, IconTune } from '../UI/Icons'
import { playUi, unlockAudio } from '../../utils/sound'
import { Customize } from '../UI/Customize'

const MODES = [
  { id: 'explore', label: 'Explore' },
  { id: 'how', label: 'How it works' },
  { id: 'type', label: 'Type test' },
]

export function Header() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const soundOn = useStore((s) => s.soundOn)
  const toggleSound = useStore((s) => s.toggleSound)
  const resetView = useStore((s) => s.resetView)
  const customizeOpen = useStore((s) => s.customizeOpen)
  const setCustomizeOpen = useStore((s) => s.setCustomizeOpen)
  const [fsOk] = useState(() => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen)

  // Customize closes on Escape or a press anywhere outside it
  useEffect(() => {
    if (!customizeOpen) return
    const onKey = (e) => e.key === 'Escape' && setCustomizeOpen(false)
    const onDown = (e) => !e.target.closest?.('.tools__pop') && setCustomizeOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [customizeOpen, setCustomizeOpen])

  const go = (id) => {
    if (soundOn) playUi('tick')
    setMode(id)
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="brand__mark" aria-hidden>
          <span />
        </div>
        <div>
          <h1 className="brand__title">Keyboard Anatomy</h1>
          <p className="brand__sub">Explore the machine behind every keystroke.</p>
        </div>
      </div>

      <nav className="modes" aria-label="Experience mode">
        {MODES.map((m) => (
          <button key={m.id} className={`modes__btn ${mode === m.id ? 'is-active' : ''}`} aria-current={mode === m.id ? 'page' : undefined} onClick={() => go(m.id)}>
            {m.label}
          </button>
        ))}
        <span className="modes__ink" style={{ '--i': MODES.findIndex((m) => m.id === mode) }} aria-hidden />
      </nav>

      <div className="tools">
        <div className="tools__pop">
          <button
            className={`icon-btn ${customizeOpen ? 'is-on' : ''}`}
            aria-label="Customize keyboard"
            aria-expanded={customizeOpen}
            title="Customize"
            onClick={() => setCustomizeOpen(!customizeOpen)}
          >
            <IconTune />
          </button>
          {customizeOpen && <Customize />}
        </div>
        <button
          className="icon-btn"
          aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
          aria-pressed={soundOn}
          title={soundOn ? 'Sound on' : 'Sound off'}
          onClick={() => {
            unlockAudio()
            toggleSound()
          }}
        >
          <IconSound on={soundOn} />
        </button>
        <button className="icon-btn" aria-label="Reset view" title="Reset view" onClick={resetView}>
          <IconReset />
        </button>
        {fsOk && (
          <button
            className="icon-btn hide-sm"
            aria-label="Toggle fullscreen"
            title="Fullscreen"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
          >
            <IconExpand />
          </button>
        )}
      </div>
    </header>
  )
}
