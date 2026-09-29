import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls, PerformanceMonitor, AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, N8AO, Outline, Selection, Bloom, ToneMapping, SMAA, Vignette, DepthOfField } from '@react-three/postprocessing'
import { ToneMappingMode, KernelSize } from 'postprocessing'
import * as THREE from 'three'
import { useStore, cameraRig, DEFAULT_VIEW, EXPLODED_VIEW, INTRO_VIEW, flyTo, isHeroIdle, viewScale } from '../../store/useStore'
import { KeyboardModel } from '../KeyboardModel/KeyboardModel'
import { StudioScene } from '../../scenes/StudioScene'

const INTRO_POS = INTRO_VIEW.pos

// Panel widths come from CSS (they change with breakpoints), sampled occasionally
const panels = { left: 314, right: 402, t: 0 }
function samplePanels() {
  const rail = document.querySelector('.rail')
  const info = document.querySelector('.info')
  panels.left = rail ? rail.offsetWidth + rail.offsetLeft : 0
  panels.right = info ? info.offsetWidth + (window.innerWidth - info.offsetLeft - info.offsetWidth) : 402
}

function Rig() {
  const ref = useRef()
  const phase = useStore((s) => s.phase)
  useEffect(() => {
    const c = ref.current
    cameraRig.controls = c
    const k = viewScale()
    c.setLookAt(...INTRO_VIEW.pos.map((v, i) => INTRO_VIEW.target[i] + (v - INTRO_VIEW.target[i]) * k), ...INTRO_VIEW.target, false)
    const onStart = () => {
      cameraRig.lastInteraction = performance.now()
      const s = useStore.getState()
      if (s.phase === 'ready' && !s.heroTouched) useStore.setState({ heroTouched: true })
    }
    c.addEventListener('controlstart', onStart)
    return () => c.removeEventListener('controlstart', onStart)
  }, [])
  useEffect(() => {
    if (phase === 'ready') {
      // camera-controls damps in spherical space, so this travels as a slow rising arc
      flyTo(DEFAULT_VIEW, useStore.getState().reducedMotion, 1.75)
      cameraRig.lastInteraction = performance.now()
    }
  }, [phase])

  // Very slow idle sway around the product
  const swayT = useRef(0)
  const focal = useRef({ x: 0, y: 0 })
  useFrame((state, dt) => {
    const s = useStore.getState()
    const c = ref.current
    if (!c) return
    if (cameraRig.controls !== c) cameraRig.controls = c
    // Keep the product centred in the space left free by the side panels
    {
      const w = state.size.width
      const h = state.size.height
      const st = useStore.getState()
      const desktop = w > 820
      const infoOpen = !!(st.selected || st.system) || st.mode === 'how'
      let sx = 0
      let sy = 0
      if (desktop) {
        if ((panels.t = (panels.t + 1) % 30) === 0) samplePanels()
        const left = st.mode !== 'type' ? panels.left : 0
        const right = infoOpen ? panels.right : 0
        sx = (left - right) / 2
      } else {
        sy = st.sheet || st.selected || st.system ? h * 0.25 : st.mode === 'how' ? h * 0.2 : st.mode === 'type' ? -h * 0.04 : h * 0.04
      }
      const dist = c.distance
      const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(c.camera.fov / 2))) / h
      const k = 1 - Math.exp(-dt * 3)
      focal.current.x += (-sx * worldPerPx - focal.current.x) * k
      focal.current.y += (-sy * worldPerPx - focal.current.y) * k
      c.setFocalOffset(focal.current.x, focal.current.y, 0, false)
    }
    const idle =
      s.phase === 'ready' &&
      s.mode === 'explore' &&
      !s.selected &&
      !s.system &&
      !s.reducedMotion &&
      performance.now() - cameraRig.lastInteraction > 5000
    if (idle) {
      // slow orbital drift with a gentle rise and fall, like a camera on a slider
      swayT.current += dt
      const w = 0.11
      const da = 0.32 * w * Math.cos(swayT.current * w) * dt
      const dp = isHeroIdle(s) ? 0.05 * 0.23 * Math.cos(swayT.current * 0.23) * dt : 0
      c.rotate(da, dp, false)
    }
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={1.4}
      maxDistance={46}
      smoothTime={0.35}
      draggingSmoothTime={0.14}
      dollySpeed={0.6}
      truckSpeed={1}
      maxPolarAngle={Math.PI * 0.92}
    />
  )
}

// Subtle pointer parallax on the whole product while idle
function Parallax({ children }) {
  const g = useRef()
  useFrame((state, dt) => {
    const s = useStore.getState()
    const idle = s.mode === 'explore' && !s.selected && !s.system && !s.reducedMotion
    const k = 1 - Math.exp(-dt * 2.5)
    const tx = idle ? state.pointer.y * -0.035 : 0
    const ty = idle ? state.pointer.x * 0.06 : 0
    g.current.rotation.x += (tx - g.current.rotation.x) * k
    g.current.rotation.y += (ty - g.current.rotation.y) * k
  })
  return <group ref={g}>{children}</group>
}

// Cinematic treatment for the untouched hero shot: shallow focus and a deeper vignette
function HeroGrade({ dof, vignette }) {
  useFrame((_, dt) => {
    const s = useStore.getState()
    const hero = isHeroIdle(s) && !s.reducedMotion
    const k = 1 - Math.exp(-dt * 2.5)
    if (dof.current) dof.current.bokehScale += ((hero ? 3.2 : 0) - dof.current.bokehScale) * k
    if (vignette.current) vignette.current.darkness += ((hero ? 0.46 : 0.3) - vignette.current.darkness) * k
  })
  return null
}

function Effects({ lowPower }) {
  const dof = useRef()
  const vignette = useRef()
  return (
    <>
    <HeroGrade dof={dof} vignette={vignette} />
    <EffectComposer multisampling={0} enableNormalPass={false} autoClear={false}>
      {!lowPower && <N8AO aoRadius={0.55} distanceFalloff={0.6} intensity={2.2} quality="medium" halfRes color="#3A4148" />}
      <Outline
        visibleEdgeColor={0x19a7c6}
        hiddenEdgeColor={0x7fcfe0}
        edgeStrength={2.2}
        width={1400}
        blur
        kernelSize={KernelSize.VERY_SMALL}
        xRay={false}
      />
      {!lowPower && <DepthOfField ref={dof} target={[0, -0.2, 0.3]} worldFocusRange={11} bokehScale={0} />}
      <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur radius={0.6} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette ref={vignette} offset={0.3} darkness={0.3} eskil={false} />
      <SMAA />
    </EffectComposer>
    </>
  )
}

function Ready({ onReady }) {
  useEffect(() => {
    const t = setTimeout(() => onReady?.(), 250)
    return () => clearTimeout(t)
  }, [onReady])
  return null
}

export function KeyboardViewer({ onReady, onLost }) {
  const lowPower = useStore((s) => s.lowPower)
  const setLowPower = useStore((s) => s.setLowPower)
  const select = useStore((s) => s.select)

  return (
    <Canvas
      className="viewer-canvas"
      shadows
      dpr={[1, lowPower ? 1.25 : 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping, stencil: false }}
      camera={{ fov: 32, near: 0.1, far: 200, position: INTRO_POS }}
      onPointerMissed={(e) => {
        const s = useStore.getState()
        if (s.sheet === 'list') s.setSheet(null)
        if (e.type === 'click' && s.mode === 'explore' && (s.selected || s.system)) {
          select(null)
          flyTo(s.explode > 0.3 ? EXPLODED_VIEW : DEFAULT_VIEW, s.reducedMotion)
        }
      }}
      aria-label="Interactive 3D model of a mechanical keyboard. Drag to rotate, scroll to zoom."
      onCreated={({ gl, scene }) => {
        if (import.meta.env.DEV) window.__scene = scene
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onLost?.()
        })
      }}
    >
      <PerformanceMonitor onDecline={() => setLowPower(true)} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Selection>
          <StudioScene lowPower={lowPower} />
          <Parallax>
            <KeyboardModel />
          </Parallax>
          <Effects lowPower={lowPower} />
        </Selection>
        <Ready onReady={onReady} />
      </Suspense>
      <Rig />
    </Canvas>
  )
}
