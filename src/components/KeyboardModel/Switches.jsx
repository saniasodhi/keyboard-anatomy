import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KEYS, HERO_KEY } from '../../data/layout'
import { partOffset } from '../../data/explosion'
import { frustum, box, cyl, mergeGeometries } from '../../utils/geometry'
import { SWITCH_TYPES } from '../../utils/materials'
import { useStore } from '../../store/useStore'
import { heroState, cyclePress, TRAVEL } from './Keycaps'
import { HeroSwitch } from './HeroSwitch'

const dummy = new THREE.Object3D()
const o1 = [0, 0, 0]
const o2 = [0, 0, 0]

export const SWITCH_GEO = {
  top: () =>
    mergeGeometries([
      frustum(0.78, 0.6, 0.2, 0),
      box(0.3, 0.035, 0.3, 0, 0.215, 0).toNonIndexed(),
      box(0.14, 0.02, 0.1, 0, 0.21, -0.2).toNonIndexed(),
    ]),
  bottom: () =>
    mergeGeometries([
      box(0.74, 0.17, 0.74, 0, -0.165, 0),
      box(0.82, 0.02, 0.82, 0, -0.01, 0),
      cyl(0.075, 0.1, 0, -0.29, 0, 14),
      cyl(0.035, 0.08, -0.267, -0.28, 0, 8),
      cyl(0.035, 0.08, 0.267, -0.28, 0, 8),
    ]),
  stem: () =>
    mergeGeometries([
      box(0.26, 0.15, 0.065, 0, 0.3, 0),
      box(0.065, 0.15, 0.26, 0, 0.3, 0),
      box(0.3, 0.1, 0.28, 0, 0.19, 0),
    ]),
  pins: () =>
    mergeGeometries([
      cyl(0.022, 0.2, -0.2, -0.33, -0.133, 8),
      cyl(0.022, 0.2, 0.133, -0.33, -0.267, 8),
    ]),
}

export function useSwitchMaterials() {
  const type = useStore((s) => s.custom.switch)
  const mats = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ color: '#EEF2F3', roughness: 0.32, metalness: 0 }),
      bottom: new THREE.MeshStandardMaterial({ color: '#CFCBC4', roughness: 0.62 }),
      stem: new THREE.MeshStandardMaterial({ color: SWITCH_TYPES.linear.stem, roughness: 0.55 }),
      pins: new THREE.MeshStandardMaterial({ color: '#D2AE62', roughness: 0.25, metalness: 1 }),
    }),
    []
  )
  useEffect(() => {
    mats.stem.color.set(SWITCH_TYPES[type].stem)
  }, [type, mats])
  return mats
}

export function Switches() {
  const refs = useRef({})
  const mats = useSwitchMaterials()
  const geos = useMemo(() => ({ top: SWITCH_GEO.top(), bottom: SWITCH_GEO.bottom(), stem: SWITCH_GEO.stem(), pins: SWITCH_GEO.pins() }), [])
  const press = useRef(KEYS.map(() => 0))

  const place = (heroHidden, seat) => {
    KEYS.forEach((k, i) => {
      const hidden = heroHidden && i === HERO_KEY.index
      for (const part of ['top', 'bottom', 'stem', 'pins']) {
        const m = refs.current[part]
        if (!m) continue
        dummy.position.set(k.x, part === 'stem' ? -press.current[i] * TRAVEL : 0, k.z)
        dummy.position.y -= seat
        dummy.scale.setScalar(hidden ? 0.0001 : 1)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      }
    })
    for (const part of ['top', 'bottom', 'stem', 'pins']) {
      const m = refs.current[part]
      if (m) m.instanceMatrix.needsUpdate = true
    }
  }

  useLayoutEffect(() => {
    place(false, 0)
    for (const part of ['top', 'bottom', 'stem', 'pins']) refs.current[part]?.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ghost versions used while a single switch is the hero
  const ghosts = useMemo(() => {
    const g = {}
    for (const k of ['top', 'bottom', 'stem', 'pins']) {
      g[k] = mats[k].clone()
      g[k].transparent = true
      g[k].opacity = 0.1
      g[k].depthWrite = false
      g[k].userData = { keepVisible: true }
    }
    return g
  }, [mats])
  const ghosted = useRef(false)
  const last = useRef('')
  useFrame((_, dt) => {
    const s = useStore.getState()
    const { anim, t } = heroState(s)
    const selAnim = s.mode === 'explore' ? s.selected : null
    const heroHidden = anim === 'switch-actuation' || selAnim === 'sockets'
    const k = 1 - Math.exp(-dt * 28)
    let changed = false
    KEYS.forEach((key, i) => {
      let p = s.mode === 'type' && s.pressed[key.code] ? 1 : 0
      if (i === HERO_KEY.index && (anim === 'keycap-press' || anim === 'display-press')) p = cyclePress(t, anim === 'display-press' ? 2.2 : 1.6)
      if (anim === 'stabilizer-press' && key.code === 'Space') p = cyclePress(t + 0.3, 1.8)
      const np = press.current[i] + (p - press.current[i]) * k
      if (Math.abs(np - press.current[i]) > 0.0005) changed = true
      press.current[i] = np
    })
    // Plate demo: switches settle down into the plate cutouts and lift out again
    let seat = 0
    if (selAnim === 'plate' && !s.reducedMotion) {
      partOffset('switches', s.explode, o1)
      partOffset('plate', s.explode, o2)
      const gap = o1[1] - o2[1]
      const ph = ((performance.now() / 1000 - s.animStart) % 3.2) / 3.2
      const e = ph < 0.35 ? THREE.MathUtils.smootherstep(ph, 0.05, 0.35) : ph < 0.7 ? 1 : 1 - THREE.MathUtils.smootherstep(ph, 0.7, 0.95)
      seat = gap * e
    }
    if (ghosted.current !== heroHidden) {
      ghosted.current = heroHidden
      ghosts.stem.color.copy(mats.stem.color)
      for (const p of ['top', 'bottom', 'stem', 'pins']) if (refs.current[p]) refs.current[p].material = heroHidden ? ghosts[p] : mats[p]
    }
    const sig = `${heroHidden}|${seat.toFixed(4)}`
    if (changed || sig !== last.current) {
      last.current = sig
      place(heroHidden, seat)
    }
  })

  return (
    <group name="Switches_All">
      <instancedMesh ref={(el) => { refs.current.top = el }} args={[geos.top, mats.top, KEYS.length]} castShadow receiveShadow />
      <instancedMesh ref={(el) => { refs.current.bottom = el }} args={[geos.bottom, mats.bottom, KEYS.length]} castShadow receiveShadow />
      <instancedMesh ref={(el) => { refs.current.stem = el }} args={[geos.stem, mats.stem, KEYS.length]} castShadow />
      <instancedMesh ref={(el) => { refs.current.pins = el }} args={[geos.pins, mats.pins, KEYS.length]} />
      <HeroSwitch />
    </group>
  )
}
