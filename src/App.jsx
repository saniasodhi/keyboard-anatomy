import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore, isHeroIdle } from './store/useStore'
import { Header } from './components/Navigation/Header'
import { ComponentList } from './components/ComponentList/ComponentList'
import { ComponentPanel } from './components/ComponentPanel/ComponentPanel'
import { ExplosionSlider } from './components/ExplosionSlider/ExplosionSlider'
import { HowItWorks } from './components/HowItWorks/HowItWorks'
import { TypeTest } from './components/TypeTest/TypeTest'
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen'
import { ErrorBoundary, Fallback, webglAvailable } from './components/UI/ErrorBoundary'
import { IconList } from './components/UI/Icons'

const KeyboardViewer = lazy(() => import('./components/KeyboardViewer/KeyboardViewer').then((m) => ({ default: m.KeyboardViewer })))

// Title card for the untouched hero shot; steps aside as soon as you start exploring
function HeroTitle() {
  const show = useStore((s) => isHeroIdle(s))
  const introAt = useStore((s) => s.introAt)
  const [ready, setReady] = useState(false)
  // wait for the reveal (camera arc + keycaps landing) before titling the shot
  useEffect(() => {
    if (!introAt) return
    const t = setTimeout(() => setReady(true), 2600)
    return () => clearTimeout(t)
  }, [introAt])
  const on = show && ready
  return (
    <div className={`hero-title ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <p className="hero-title__eyebrow mono">Anatomy 75 · 84 keys · 17 parts</p>
      <h2 className="hero-title__h">
        A keystroke,
        <br />
        <em>taken apart.</em>
      </h2>
    </div>
  )
}

function Hint() {
  const explode = useStore((s) => s.explode)
  const selected = useStore((s) => s.selected)
  return (
    <p className="hint mono" aria-hidden>
      {selected ? 'Esc to close · Click empty space to deselect' : explode > 0.7 ? 'Click any layer to inspect it' : 'Drag to rotate · Scroll to zoom · Click a part'}
    </p>
  )
}

export default function App() {
  const phase = useStore((s) => s.phase)
  const mode = useStore((s) => s.mode)
  const sheet = useStore((s) => s.sheet)
  const setSheet = useStore((s) => s.setSheet)
  const selected = useStore((s) => s.selected)
  const system = useStore((s) => s.system)
  const [sceneReady, setSceneReady] = useState(false)
  const [glOk, setGlOk] = useState(() => webglAvailable())
  const [viewerKey, setViewerKey] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => useStore.setState({ reducedMotion: mq.matches })
    mq.addEventListener?.('change', on)
    const cores = navigator.hardwareConcurrency || 8
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
    if (cores <= 4 || mobile) useStore.getState().setLowPower(true)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const retry = () => {
    setGlOk(webglAvailable())
    setSceneReady(false)
    setViewerKey((k) => k + 1)
  }

  const infoOpen = !!(selected || system)

  return (
    <div className={`app mode-${mode} ${phase === 'ready' ? 'is-ready' : ''} ${infoOpen ? 'has-info' : ''} ${sheet ? `sheet-${sheet}` : ''}`}>
      <div className="stage" aria-hidden={phase !== 'ready'}>
        {glOk ? (
          <ErrorBoundary key={viewerKey}>
            <Suspense fallback={null}>
              <KeyboardViewer onReady={() => setSceneReady(true)} onLost={() => setGlOk(false)} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <Fallback onRetry={retry} />
        )}
      </div>

      {phase !== 'ready' && <LoadingScreen sceneReady={sceneReady || !glOk} />}

      <div className="chrome">
        <Header />
        {mode === 'explore' && (
          <>
            <HeroTitle />
            <ComponentList />
            <ComponentPanel />
            <div className="dock">
              <button className="btn btn--ghost dock__parts" onClick={() => setSheet(sheet === 'list' ? null : 'list')} aria-expanded={sheet === 'list'}>
                <IconList />
                Parts
              </button>
              <ExplosionSlider />
            </div>
            <Hint />
          </>
        )}
        {mode === 'how' && <HowItWorks />}
        {mode === 'type' && <TypeTest />}
      </div>
    </div>
  )
}
