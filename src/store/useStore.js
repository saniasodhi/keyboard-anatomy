import { create } from 'zustand'
import gsap from 'gsap'
import { COMPONENT_BY_ID } from '../data/keyboardComponents'
import { SIGNAL_STEPS, SYSTEMS } from '../data/signalSteps'
import { partOffset } from '../data/explosion'

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Hero: a low three-quarter angle, the product sitting slightly below centre
export const DEFAULT_VIEW = { pos: [-12.6, 8.6, 23.6], target: [0, 0.35, 0.3] }
// Where the camera waits behind the loader: low on the opposite side, so entering sweeps an arc
export const INTRO_VIEW = { pos: [33.5, 5.2, 27.5], target: [0, 0.35, 0.3] }
export const TYPE_HERO_VIEW = { pos: [-8.4, 9.8, 19.5], target: [0.3, -0.9, 0.5] }
export const EXPLODED_VIEW = { pos: [-19.6, 16.4, 33.4], target: [0, 0, 0] }

// Camera-controls instance is registered here by the viewer
export const cameraRig = { controls: null, lastInteraction: 0 }
if (typeof window !== 'undefined') window.__rig = cameraRig

let explodeTween = null

export const useStore = create((set, get) => ({
  phase: 'loading', // loading → ready
  mode: 'explore', // explore | how | type
  explode: 0,
  selected: null,
  system: null,
  step: 0,
  animStart: 0,
  animKey: 0,
  soundOn: true,
  reducedMotion: prefersReduced,
  lowPower: false,
  panelTab: 'components', // components | systems
  sheet: null, // mobile: 'list' | 'info' | null
  custom: {
    keycaps: 'alloy',
    switch: 'linear',
    plate: 'aluminum',
    rgb: false,
    wireless: false,
  },
  typed: '',
  typeStage: 'intro', // intro | typing | done
  pressed: {}, // code → true
  customizeOpen: false,
  introAt: 0, // seconds (performance clock) when the reveal started
  heroTouched: false, // the visitor has orbited/zoomed away from the composed hero shot

  setPhase: (phase) => set(phase === 'ready' ? { phase, introAt: performance.now() / 1000 } : { phase }),
  setSheet: (sheet) => set({ sheet }),
  setPanelTab: (panelTab) => set({ panelTab }),
  setCustom: (patch) => set({ custom: { ...get().custom, ...patch } }),
  toggleSound: () => set({ soundOn: !get().soundOn }),
  setLowPower: (lowPower) => set({ lowPower }),
  setCustomizeOpen: (customizeOpen) => set({ customizeOpen }),

  setExplode: (v) => {
    explodeTween?.kill()
    set({ explode: Math.max(0, Math.min(1, v)) })
  },
  animateExplode: (target, duration = 1.6) => {
    explodeTween?.kill()
    const state = { v: get().explode }
    if (get().reducedMotion) duration = Math.min(duration, 0.35)
    if (Math.abs(state.v - target) < 0.002) return
    explodeTween = gsap.to(state, {
      v: target,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => set({ explode: state.v }),
    })
  },

  restartAnim: () => set({ animStart: performance.now() / 1000, animKey: get().animKey + 1 }),

  clearSelection: () => {
    const s = get()
    set({ selected: null, system: null, sheet: s.sheet === 'info' ? null : s.sheet })
  },

  // Deselect and pull the camera back to an overview of whatever state the keyboard is in
  closeSelection: () => {
    const s = get()
    s.clearSelection()
    flyTo(s.explode > 0.3 ? EXPLODED_VIEW : DEFAULT_VIEW, s.reducedMotion)
  },

  select: (id) => {
    const s = get()
    if (!id) {
      set({ selected: null, system: null, sheet: s.sheet === 'info' ? null : s.sheet })
      return
    }
    const c = COMPONENT_BY_ID[id]
    set({ selected: id, system: null, sheet: 'info' })
    get().restartAnim()
    s.animateExplode(c.explode, 1.5)
    flyTo(c.view, get().reducedMotion, 0.85, c.explode)
  },

  selectSystem: (id) => {
    const sys = SYSTEMS.find((x) => x.id === id)
    if (!sys) return set({ system: null, sheet: get().sheet === 'info' ? null : get().sheet })
    set({ system: id, selected: null, sheet: 'info' })
    get().restartAnim()
    get().animateExplode(sys.explode, 1.4)
    flyTo(EXPLODED_VIEW, get().reducedMotion)
  },

  setMode: (mode) => {
    const s = get()
    if (mode === s.mode) return
    set({ mode, selected: null, system: null, sheet: null, customizeOpen: false })
    if (mode === 'explore') {
      set({ heroTouched: false })
      s.animateExplode(0, 1.2)
      flyTo(DEFAULT_VIEW, s.reducedMotion)
    } else if (mode === 'how') {
      get().goStep(0)
    } else if (mode === 'type') {
      // keycaps lift and settle again as the desk scene fades in
      set({ typed: '', typeStage: 'intro', pressed: {}, introAt: performance.now() / 1000 + 0.6 })
      s.animateExplode(0, 1.4)
    }
  },

  goStep: (i) => {
    const step = SIGNAL_STEPS[Math.max(0, Math.min(SIGNAL_STEPS.length - 1, i))]
    const idx = SIGNAL_STEPS.indexOf(step)
    set({ step: idx })
    get().restartAnim()
    get().animateExplode(step.explode, 1.5)
    flyTo(step.view, get().reducedMotion, 0.95, step.explode)
  },

  resetView: () => {
    const s = get()
    cameraRig.lastInteraction = performance.now()
    if (s.mode === 'how') return s.goStep(s.step)
    if (s.mode === 'type') return flyTo(TYPE_HERO_VIEW, s.reducedMotion, 1.2)
    set({ selected: null, system: null, sheet: null, heroTouched: false })
    s.animateExplode(0, 1.2)
    flyTo(DEFAULT_VIEW, s.reducedMotion, 1.1)
  },

  setPressed: (code, down) => {
    const pressed = { ...get().pressed }
    if (down) pressed[code] = performance.now()
    else delete pressed[code]
    set({ pressed })
  },
  setTyped: (typed) => set({ typed }),
  setTypeStage: (typeStage) => set({ typeStage }),
}))

// The untouched, assembled hero moment
export function isHeroIdle(s) {
  return s.phase === 'ready' && s.mode === 'explore' && !s.selected && !s.system && s.explode < 0.02 && !s.heroTouched
}

// Which 3D parts are currently "in focus" (null → everything is)
export function getFocusParts(s) {
  if (s.mode === 'type') return null
  if (s.mode === 'how') {
    const step = SIGNAL_STEPS[s.step]
    return step.parts.length ? step.parts : null
  }
  if (s.selected) return COMPONENT_BY_ID[s.selected].parts
  if (s.system) return SYSTEMS.find((x) => x.id === s.system).parts
  return null
}

// Views are authored for a 16:9 stage; narrower screens pull the camera back.
export function viewScale() {
  if (typeof window === 'undefined') return 1
  const aspect = window.innerWidth / window.innerHeight
  return Math.min(2.5, Math.max(1, 1.75 / aspect))
}

// A view is either explicit {pos, target} or a focus point riding on a part + a viewing direction
export function resolveView(view, explode = 0) {
  if (view.pos) return view
  const o = view.part ? partOffset(view.part, explode, [0, 0, 0]) : [0, 0, 0]
  const target = view.p.map((v, i) => v + o[i])
  const len = Math.hypot(...view.dir)
  const pos = target.map((v, i) => v + (view.dir[i] / len) * view.dist)
  return { pos, target }
}

export function flyTo(view, reduced, smooth = 0.85, explode = 0) {
  const c = cameraRig.controls
  if (!c || !view) return
  view = resolveView(view, explode)
  c.smoothTime = reduced ? 0.12 : smooth
  const k = viewScale()
  const [tx, ty, tz] = view.target
  const pos = view.pos.map((v, i) => view.target[i] + (v - view.target[i]) * k)
  c.setLookAt(...pos, tx, ty, tz, true)
  clearTimeout(flyTo._t)
  flyTo._t = setTimeout(() => {
    if (cameraRig.controls) cameraRig.controls.smoothTime = 0.35
  }, Math.max(2200, smooth * 2800))
}

if (typeof window !== 'undefined' && import.meta.env.DEV) window.__store = useStore

// Dev helper: jump straight to a component or step without waiting on animations
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__show = (id, stepIdx) => {
    const s = useStore.getState()
    cameraRig.lastInteraction = performance.now() + 1e9
    let view
    let explode
    if (stepIdx !== undefined) {
      s.setMode('how')
      s.goStep(stepIdx)
      view = SIGNAL_STEPS[stepIdx].view
      explode = SIGNAL_STEPS[stepIdx].explode
    } else if (id) {
      s.select(id)
      view = COMPONENT_BY_ID[id].view
      explode = COMPONENT_BY_ID[id].explode
    }
    useStore.getState().setExplode(explode)
    const v = resolveView(view, explode)
    const k = viewScale()
    const pos = v.pos.map((p, i) => v.target[i] + (p - v.target[i]) * k)
    cameraRig.controls.setLookAt(...pos, ...v.target, false)
  }
}

// Dev helper for README screenshots: ?shot=hero|exploded|switch|matrix jumps straight to a finished frame
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const shot = new URLSearchParams(location.search).get('shot')
  if (shot) {
    useStore.setState({ phase: 'ready', introAt: performance.now() / 1000 - 100 })
    const apply = () => {
      const c = cameraRig.controls
      if (!c) return setTimeout(apply, 100)
      cameraRig.lastInteraction = performance.now() + 1e9
      const snap = (v) => {
        const k = viewScale()
        c.setLookAt(...v.pos.map((p, i) => v.target[i] + (p - v.target[i]) * k), ...v.target, false)
      }
      if (shot === 'hero') snap(DEFAULT_VIEW)
      if (shot === 'exploded') {
        useStore.getState().setExplode(1)
        snap(EXPLODED_VIEW)
      }
      if (shot === 'switch' || shot === 'matrix') window.__show(shot === 'switch' ? 'switches' : 'matrix')
    }
    setTimeout(apply, 300)
    // headless windows report their outer size late, so pin the stage to an exact frame for capture
    document.documentElement.classList.add('shot-mode')
  }
}
