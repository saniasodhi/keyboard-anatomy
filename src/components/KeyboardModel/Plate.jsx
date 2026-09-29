import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KEYS, KEY_AREA_W, KEY_AREA_D, Y } from '../../data/layout'
import { EXPLOSION, partProgress } from '../../data/explosion'
import { roundedRectShape, roundedRectPath, extrudeUp, box, mergeGeometries } from '../../utils/geometry'
import { PLATE_MATERIALS } from '../../utils/materials'
import { useStore } from '../../store/useStore'
import { cyclePress, heroState, TRAVEL } from './Keycaps'

export const PLATE_W = KEY_AREA_W + 0.24
export const PLATE_D = KEY_AREA_D + 0.24

const stabOffset = (w) => (w >= 6 ? 2.625 : 0.625)

// Rectangular hole in shape-space (world z → -y)
function hole(shape, x, z, w, d, r = 0.02) {
  shape.holes.push(roundedRectPath(w, d, r, x, -z))
}

function plateShape(holeSize, withStabs) {
  const s = roundedRectShape(PLATE_W, PLATE_D, 0.12)
  for (const k of KEYS) {
    hole(s, k.x, k.z, holeSize, holeSize)
    if (withStabs && k.stab) {
      const o = stabOffset(k.w)
      hole(s, k.x - o, k.z + 0.02, 0.36, 0.74, 0.04)
      hole(s, k.x + o, k.z + 0.02, 0.36, 0.74, 0.04)
    }
  }
  return s
}

export const GASKET_SPOTS = [
  ...[-6.2, -2.1, 2.1, 6.2].map((x) => ({ x, z: -PLATE_D / 2 - 0.17, dir: [0, 0, -1], along: 'x' })),
  ...[-6.2, -2.1, 2.1, 6.2].map((x) => ({ x, z: PLATE_D / 2 + 0.17, dir: [0, 0, 1], along: 'x' })),
  { x: -PLATE_W / 2 - 0.17, z: 0, dir: [-1, 0, 0], along: 'z' },
  { x: PLATE_W / 2 + 0.17, z: 0, dir: [1, 0, 0], along: 'z' },
]

export function Plate() {
  const plateMat = useStore((s) => s.custom.plate)
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#C4C8CB', metalness: 0.85, roughness: 0.34, clearcoat: 0 }), [])
  useEffect(() => {
    const p = PLATE_MATERIALS[plateMat]
    mat.color.set(p.color)
    mat.metalness = p.metalness
    mat.roughness = p.roughness
    mat.transmission = 0
    mat.clearcoat = plateMat === 'polycarbonate' ? 0.6 : 0
  }, [plateMat, mat])

  const geo = useMemo(() => {
    const g = extrudeUp(plateShape(0.735, true), 0.08, { curveSegments: 3 })
    g.translate(0, Y.plateBottom, 0)
    const tabs = GASKET_SPOTS.map((sp) =>
      sp.along === 'x' ? box(0.62, 0.08, 0.36, sp.x, Y.plateBottom + 0.04, sp.z - sp.dir[2] * 0.02) : box(0.36, 0.08, 0.62, sp.x - sp.dir[0] * 0.02, Y.plateBottom + 0.04, sp.z)
    )
    const tabGeo = mergeGeometries(tabs.map((t) => t.toNonIndexed()))
    return { plate: g, tabs: tabGeo }
  }, [])

  return (
    <group name="Plate">
      <mesh geometry={geo.plate} material={mat} castShadow receiveShadow />
      <mesh geometry={geo.tabs} material={mat} castShadow receiveShadow />
    </group>
  )
}

export function PlateFoam() {
  const geo = useMemo(() => {
    const g = extrudeUp(plateShape(0.8, false), Y.foamTop - Y.foamBottom, { curveSegments: 3 })
    g.translate(0, Y.foamBottom, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E9E6E1', roughness: 0.95 }), [])
  return <mesh name="Foam_Plate" geometry={geo} material={mat} castShadow receiveShadow />
}

export function Gaskets() {
  const refs = useRef([])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A4E52', roughness: 0.9 }), [])
  const geo = useMemo(() => ({ x: box(0.56, 0.05, 0.3), z: box(0.3, 0.05, 0.56) }), [])
  useFrame(() => {
    const s = useStore.getState()
    const p = partProgress('gaskets', s.explode)
    const spread = EXPLOSION.gaskets.spread * p
    const sel = s.mode === 'explore' && s.selected === 'mounting' && !s.reducedMotion
    const t = performance.now() / 1000 - s.animStart
    const squish = sel ? 0.5 + 0.5 * Math.sin(t * 5) : 0
    GASKET_SPOTS.forEach((sp, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.set(sp.x + sp.dir[0] * spread, 0, sp.z + sp.dir[2] * spread)
      g.children[0].scale.y = 1 - squish * 0.35
      g.children[1].scale.y = 1 - (1 - squish) * 0.35
    })
  })
  return (
    <group name="GasketMounts">
      {GASKET_SPOTS.map((sp, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <mesh geometry={geo[sp.along]} material={mat} position={[0, Y.plateTop + 0.03, 0]} castShadow />
          <mesh geometry={geo[sp.along]} material={mat} position={[0, Y.plateBottom - 0.03, 0]} castShadow />
        </group>
      ))}
    </group>
  )
}

// Plate-mounted stabilizers with a steel wire that rotates when the key is pressed
export function Stabilizers() {
  const stabs = useMemo(() => KEYS.filter((k) => k.stab), [])
  const wires = useRef([])
  const sliders = useRef([])
  const mats = useMemo(
    () => ({
      housing: new THREE.MeshPhysicalMaterial({ color: '#F4F4F1', roughness: 0.35, clearcoat: 0.3 }),
      slider: new THREE.MeshStandardMaterial({ color: '#E6E3DD', roughness: 0.45 }),
      wire: new THREE.MeshStandardMaterial({ color: '#B9BEC2', roughness: 0.2, metalness: 1 }),
    }),
    []
  )
  const housingGeo = useMemo(
    () => mergeGeometries([box(0.3, 0.22, 0.62, 0, 0.11, 0), box(0.36, 0.03, 0.7, 0, 0.015, 0), box(0.24, 0.12, 0.5, 0, -0.06, 0)]),
    []
  )
  const sliderGeo = useMemo(() => mergeGeometries([box(0.2, 0.2, 0.2, 0, 0.22, -0.04), box(0.065, 0.12, 0.2, 0, 0.36, -0.04), box(0.2, 0.12, 0.065, 0, 0.36, -0.04)]), [])
  const wireGeos = useMemo(
    () =>
      stabs.map((k) => {
        const o = stabOffset(k.w)
        const r = 0.02
        const path = new THREE.CurvePath()
        const pts = [
          [-o, 0, 0],
          [-o, 0, 0.3],
          [o, 0, 0.3],
          [o, 0, 0],
        ]
        for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])))
        return new THREE.TubeGeometry(path, 60, r, 8, false)
      }),
    [stabs]
  )

  useFrame((_, dt) => {
    const s = useStore.getState()
    const { anim, t } = heroState(s)
    stabs.forEach((k, i) => {
      let p = s.mode === 'type' && s.pressed[k.code] ? 1 : 0
      if (anim === 'stabilizer-press' && k.code === 'Space') p = s.reducedMotion ? 0.6 : cyclePress(t + 0.3, 1.8)
      const w = wires.current[i]
      if (!w) return
      const cur = w.userData.p || 0
      const np = cur + (p - cur) * (1 - Math.exp(-dt * 28))
      w.userData.p = np
      // Wire pivots at the back: front arms dip with the key
      w.rotation.x = -np * 0.55
      const sl = sliders.current[i]
      if (sl) sl.forEach((m) => m && (m.position.y = -np * TRAVEL))
    })
  })

  return (
    <group name="Stabilizers">
      {stabs.map((k, i) => {
        const o = stabOffset(k.w)
        return (
          <group key={k.code} position={[k.x, 0, k.z]} name={k.code === 'Space' ? 'Stabilizer_Space' : `Stabilizer_${k.code}`}>
            {[-o, o].map((x, j) => (
              <group key={j} position={[x, 0, 0.02]}>
                <mesh geometry={housingGeo} material={mats.housing} castShadow />
                <mesh
                  ref={(el) => {
                    sliders.current[i] = sliders.current[i] || []
                    sliders.current[i][j] = el
                  }}
                  geometry={sliderGeo}
                  material={mats.slider}
                  castShadow
                />
              </group>
            ))}
            <group position={[0, -0.13, 0.36]}>
              <group ref={(el) => { wires.current[i] = el }}>
                <group position={[0, 0, -0.3]}>
                  <mesh geometry={wireGeos[i]} material={mats.wire} castShadow />
                </group>
              </group>
            </group>
          </group>
        )
      })}
    </group>
  )
}

