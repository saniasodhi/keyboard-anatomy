import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { HERO_KEY, Y, HW, KEYS } from '../../data/layout'
import { partOffset } from '../../data/explosion'
import { SIGNAL_STEPS } from '../../data/signalSteps'
import { glowTexture } from '../../utils/materials'
import { useStore } from '../../store/useStore'
import { anchorWorld } from './Internals'
import { ROW_Z, COL_X, HERO_COL } from './Electronics'

const DATA = '#27B6D6'
const POWER = '#F3F6F7'

// Path = list of anchors {part, p}
const A = (part, p) => ({ part, p })
const heroPad = A('pcb', [HERO_KEY.x + 0.13, Y.pcbTop + 0.02, HERO_KEY.z - 0.27])
const heroContact = A('switches', [HERO_KEY.x + 0.27, -0.12, HERO_KEY.z])
const rowPoint = (x, r = HERO_KEY.row) => A('pcb', [x, Y.pcbTop + 0.02, ROW_Z[r]])
const underCtrl = A('pcb', [HW.controller[0], Y.pcbBottom - 0.02, HW.controller[2]])

const PATHS = {
  keyToController: [heroContact, heroPad, rowPoint(COL_X[HERO_COL]), rowPoint(HW.controller[0] - 0.4), A('pcb', [HW.controller[0] - 0.4, Y.pcbTop + 0.02, HW.controller[2]]), underCtrl, 'controller'],
  rowScan: (r) => [rowPoint(-7.9, r), rowPoint(7.9, r)],
  matrixToController: [rowPoint(-7.6, 1), A('pcb', [HW.controller[0] - 0.4, Y.pcbTop + 0.02, ROW_Z[1]]), A('pcb', [HW.controller[0] - 0.4, Y.pcbTop + 0.02, HW.controller[2]]), underCtrl, 'controller'],
  matrixToController2: [rowPoint(7.6, 4), A('pcb', [HW.controller[0] + 0.4, Y.pcbTop + 0.02, ROW_Z[4]]), A('pcb', [HW.controller[0] + 0.4, Y.pcbTop + 0.02, HW.controller[2]]), underCtrl, 'controller'],
  controllerToUsb: ['controller', A('pcb', [HW.controller[0], Y.pcbBottom - 0.05, -2.72]), 'usbHeader', 'daughterConn', 'daughter', 'usbPort', A('usb', [HW.daughter[0], HW.daughter[1] + 0.05, HW.daughter[2] - 3.2])],
  usbIn: [A('usb', [HW.daughter[0], HW.daughter[1] + 0.05, HW.daughter[2] - 3.2]), 'usbPort', 'daughter', 'daughterConn', 'usbHeader', A('pcb', [HW.power[0], Y.pcbBottom - 0.05, -2.72]), 'power'],
  powerToPcb: ['power', A('pcb', [HW.power[0], Y.pcbBottom - 0.02, HW.power[2] + 0.8]), A('pcb', [HW.power[0] + 2, Y.pcbBottom - 0.02, HW.power[2] + 0.8]), A('pcb', [HW.power[0] + 2.4, Y.pcbTop + 0.02, 0.4]), A('pcb', [HW.power[0] + 6, Y.pcbTop + 0.02, 0.4])],
  batteryToPower: ['battery', 'batteryConn', 'powerConn', 'power'],
  powerToBattery: ['power', 'powerConn', 'batteryConn', 'battery'],
  controllerToRadio: ['controller', A('pcb', [HW.controller[0] + 1.2, Y.pcbBottom - 0.03, HW.controller[2] - 0.1]), A('pcb', [HW.wireless[0] - 0.5, Y.pcbBottom - 0.03, HW.controller[2] - 0.1]), 'wireless', 'radioConn', 'antennaConn', 'antenna'],
}

const FX_BY_SELECTION = {
  pcb: [{ path: 'keyToController', color: DATA }, { path: 'matrixToController', color: DATA, delay: 0.5 }, { path: 'matrixToController2', color: DATA, delay: 1.1 }],
  controller: [{ path: 'matrixToController', color: DATA }, { path: 'matrixToController2', color: DATA, delay: 0.7 }, { path: 'controllerToUsb', color: DATA, delay: 1.2 }],
  usb: [{ path: 'usbIn', color: POWER }, { path: 'controllerToUsb', color: DATA, delay: 0.9 }],
  power: [{ path: 'usbIn', color: POWER }, { path: 'powerToPcb', color: POWER, delay: 0.8 }, { path: 'batteryToPower', color: POWER, delay: 0.4 }],
  battery: [{ path: 'usbIn', color: POWER }, { path: 'powerToBattery', color: POWER, delay: 1.2 }],
  wireless: [{ path: 'controllerToRadio', color: DATA }],
  antenna: [{ path: 'controllerToRadio', color: DATA }],
}
const FX_BY_STEP = {
  power: [{ path: 'usbIn', color: POWER }, { path: 'batteryToPower', color: POWER, delay: 0.6 }, { path: 'powerToPcb', color: POWER, delay: 1.1 }],
  process: [{ path: 'keyToController', color: DATA }, { path: 'matrixToController', color: DATA, delay: 0.8 }],
  transmit: [{ path: 'controllerToUsb', color: DATA }, { path: 'controllerToRadio', color: DATA, delay: 0.5 }],
}

function resolve(path, explode, out) {
  out.length = 0
  for (const a of path) out.push(anchorWorld(a, explode, new THREE.Vector3()))
  return out
}

// A flow of glowing pulses along a polyline, with a faint guide line
function Flow({ path, color, delay = 0, speed = 3.2, count = 3 }) {
  const line = useRef()
  const sprites = useRef([])
  const pts = useRef([])
  const init = useMemo(() => resolve(path, useStore.getState().explode, []), [path])
  const spriteMat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [color]
  )
  useFrame(() => {
    const s = useStore.getState()
    const p = resolve(path, s.explode, pts.current)
    const flat = []
    const lens = [0]
    for (let i = 0; i < p.length; i++) {
      flat.push(p[i].x, p[i].y, p[i].z)
      if (i) lens.push(lens[i - 1] + p[i].distanceTo(p[i - 1]))
    }
    line.current?.geometry.setPositions(flat)
    const total = lens[lens.length - 1] || 1
    const t = performance.now() / 1000 - s.animStart - delay
    const cycle = total / speed + 0.6
    sprites.current.forEach((sp, j) => {
      if (!sp) return
      const local = t - j * 0.22
      if (local < 0 || s.reducedMotion) {
        sp.visible = s.reducedMotion && j === 0
        if (s.reducedMotion) sp.position.copy(p[p.length - 1])
        return
      }
      const d = ((local % cycle) * speed) % (cycle * speed)
      if (d > total) {
        sp.visible = false
        return
      }
      sp.visible = true
      let k = 1
      while (k < lens.length - 1 && lens[k] < d) k++
      const seg = (d - lens[k - 1]) / Math.max(1e-6, lens[k] - lens[k - 1])
      sp.position.copy(p[k - 1]).lerp(p[k], seg)
      const sc = (j === 0 ? 0.42 : 0.3 - j * 0.05)
      sp.scale.setScalar(sc)
    })
  })
  return (
    <group>
      <Line ref={line} points={init} color={color} lineWidth={1.4} transparent opacity={0.45} depthTest={false} toneMapped={false} />
      {Array.from({ length: count }).map((_, j) => (
        <sprite key={j} ref={(el) => { sprites.current[j] = el }} material={spriteMat} renderOrder={10} visible={false} />
      ))}
    </group>
  )
}

// Expanding radio arcs from the antenna
function RadioWaves() {
  const refs = useRef([])
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(DATA).multiplyScalar(1.6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })), [])
  const geo = useMemo(() => new THREE.RingGeometry(0.96, 1, 48, 1, -Math.PI / 3, (Math.PI * 2) / 3), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    anchorWorld('antenna', s.explode, v)
    refs.current.forEach((m, i) => {
      if (!m) return
      const ph = ((t * 0.55 + i / 3) % 1)
      m.position.copy(v)
      m.scale.setScalar(0.4 + ph * 3.2)
      mats[i].opacity = s.reducedMotion ? (i === 0 ? 0.5 : 0) : Math.sin(ph * Math.PI) * 0.7
    })
  })
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} geometry={geo} material={mats[i]} rotation={[0, Math.PI / 2 + 0.3, 0]} renderOrder={9} />
      ))}
    </group>
  )
}

// Rings spreading and fading on the foam: vibration being absorbed
function FoamRipples() {
  const refs = useRef([])
  const mats = useMemo(() => Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(DATA).multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })), [])
  const geo = useMemo(() => new THREE.RingGeometry(0.94, 1, 64), [])
  const o = useMemo(() => [0, 0, 0], [])
  const spots = useMemo(() => [KEYS.find((k) => k.label === 'G'), KEYS.find((k) => k.label === 'O'), KEYS.find((k) => k.label === 'C')], [])
  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    refs.current.forEach((m, i) => {
      if (!m) return
      const layer = i % 2 === 0 ? 'plateFoam' : 'caseFoam'
      const spot = spots[Math.floor(i / 2)]
      partOffset(layer, s.explode, o)
      const y = (layer === 'plateFoam' ? Y.foamTop : Y.caseFoamTop) + 0.01 + o[1]
      const ph = ((t * 0.6 + i * 0.17) % 1)
      m.position.set(spot.x, y, spot.z)
      // energy spreads but decays quickly in the foam
      m.scale.setScalar(0.2 + ph * (layer === 'plateFoam' ? 1.6 : 1.1))
      mats[i].opacity = s.reducedMotion ? 0.3 : Math.pow(1 - ph, 2.2) * 0.9
    })
  })
  return (
    <group>
      {mats.map((m, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} geometry={geo} material={m} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9} />
      ))}
    </group>
  )
}

// Ring pulse on top of the hero keycap: "the finger"
function PressRing() {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(DATA).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const geo = useMemo(() => new THREE.RingGeometry(0.9, 1, 48), [])
  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    const ph = (t % 1.6) / 1.6
    ref.current.scale.setScalar(0.12 + ph * 0.5)
    mat.opacity = ph < 0.5 ? (1 - ph * 2) * 0.9 : 0
  })
  return <mesh ref={ref} geometry={geo} material={mat} position={[HERO_KEY.x, 0.82, HERO_KEY.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9} />
}

function KeyEventChip() {
  const [on, setOn] = useState(false)
  const ref = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const s = useStore.getState()
    anchorWorld('controller', s.explode, v)
    ref.current.position.set(v.x, v.y - 0.55, v.z)
    const t = performance.now() / 1000 - s.animStart
    const show = s.reducedMotion || (t % 2.6) > 1.1
    if (show !== on) setOn(show)
  })
  return (
    <group ref={ref}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`chip3d ${on ? 'is-on' : ''}`}>
          <span className="chip3d__k">Key event</span>
          <span className="chip3d__v">J · down</span>
        </div>
      </Html>
    </group>
  )
}

export function SignalFX() {
  const sel = useStore((s) => (s.mode === 'explore' ? s.selected : null))
  const stepId = useStore((s) => (s.mode === 'how' ? SIGNAL_STEPS[s.step].id : null))
  const animKey = useStore((s) => s.animKey)
  const flows = (sel && FX_BY_SELECTION[sel]) || (stepId && FX_BY_STEP[stepId]) || []
  const radio = sel === 'wireless' || sel === 'antenna' || stepId === 'transmit'
  const foam = sel === 'foam'
  const press = stepId === 'press'
  const chip = sel === 'controller' || stepId === 'process'
  return (
    <group key={animKey} name="SignalFX">
      {flows.map((f, i) => (
        <Flow key={i} path={PATHS[f.path]} color={f.color} delay={f.delay || 0} />
      ))}
      {radio && <RadioWaves />}
      {foam && <FoamRipples />}
      {press && <PressRing />}
      {chip && <KeyEventChip />}
    </group>
  )
}
