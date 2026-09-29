import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import fontUrl from '@fontsource/inter/files/inter-latin-600-normal.woff?url'
import { CASE_W, CASE_D, CASE_CENTER_Z, CASE_RADIUS, KEY_AREA_W, KEY_AREA_D, Y, HW } from '../../data/layout'
import { roundedRectShape, roundedRectPath, extrudeUp, roundedBox } from '../../utils/geometry'
import { useStore } from '../../store/useStore'

const WALL = 0.3

function aluminum(color = '#DCD8D1') {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.42,
    roughness: 0.36,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
  })
}

export function TopCase() {
  const status = useRef()
  const geo = useMemo(() => {
    const bevel = 0.05
    const s = roundedRectShape(CASE_W - bevel * 2, CASE_D - bevel * 2, CASE_RADIUS - bevel, 0, -CASE_CENTER_Z)
    s.holes.push(roundedRectPath(KEY_AREA_W + 0.14 + bevel * 2, KEY_AREA_D + 0.14 + bevel * 2, 0.16, 0, 0))
    const g = extrudeUp(s, Y.topCaseTop - Y.seam - bevel * 2, { bevel, bevelSegments: 4, curveSegments: 10 })
    g.translate(0, Y.seam + 0.004, 0)
    return g
  }, [])
  const mat = useMemo(() => aluminum(), [])
  const pipeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9FDCEA', toneMapped: false }), [])

  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000
    const connected = s.phase === 'ready'
    // gentle "breathing" status light; brighter when the LEDs are selected or while typing
    const boost = (s.mode === 'explore' && s.selected === 'leds') || s.mode === 'type' ? 1 : 0
    const v = connected ? 0.55 + 0.25 * Math.sin(t * 1.6) + boost * 0.8 : 0.2
    pipeMat.color.setRGB(0.36 * v * 2.2, 0.8 * v * 2.2, 0.92 * v * 2.2)
  })

  return (
    <group name="TopCase">
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <mesh ref={status} position={[HW.statusLed[0], Y.topCaseTop + 0.006, HW.statusLed[2]]} rotation={[-Math.PI / 2, 0, 0]} material={pipeMat}>
        <circleGeometry args={[0.045, 24]} />
      </mesh>
    </group>
  )
}

export function BottomCase() {
  const geo = useMemo(() => {
    const bevel = 0.06
    const outer = roundedRectShape(CASE_W - bevel * 2, CASE_D - bevel * 2, CASE_RADIUS - bevel, 0, -CASE_CENTER_Z)
    const walls = roundedRectShape(CASE_W - bevel * 2, CASE_D - bevel * 2, CASE_RADIUS - bevel, 0, -CASE_CENTER_Z)
    walls.holes.push(roundedRectPath(CASE_W - WALL * 2, CASE_D - WALL * 2, 0.2, 0, -CASE_CENTER_Z))
    const floorH = Y.floor - Y.bottomCaseBottom
    const floor = extrudeUp(outer, floorH - bevel * 2 + 0.02, { bevel, bevelSegments: 4, curveSegments: 10 })
    floor.translate(0, Y.bottomCaseBottom, 0)
    const wallG = extrudeUp(walls, Y.seam - Y.floor - 0.02, { bevel: 0.02, bevelSegments: 2, curveSegments: 10 })
    wallG.translate(0, Y.floor - 0.02, 0)
    return { floor, wall: wallG }
  }, [])
  const mat = useMemo(() => aluminum('#DEDBD4'), [])
  const inner = useMemo(() => new THREE.MeshStandardMaterial({ color: '#BDB9B1', roughness: 0.75, metalness: 0.25 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141618', roughness: 0.6 }), [])
  const mirror = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#E9ECEE', metalness: 1, roughness: 0.08 }), [])
  const screw = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8B9094', metalness: 1, roughness: 0.3 }), [])
  const portGeo = useMemo(() => roundedBox(0.62, 0.26, 0.1, 0.12, 0.02), [])
  const badgeGeo = useMemo(() => roundedBox(4.6, 0.02, 1.1, 0.14, 0.008), [])
  const backZ = CASE_CENTER_Z - CASE_D / 2

  const screws = [
    [-7.6, -2.9], [0, -2.9], [7.6, -2.9],
    [-7.6, 2.4], [0, 2.4], [7.6, 2.4],
  ]

  return (
    <group name="BottomCase">
      <mesh geometry={geo.floor} material={mat} castShadow receiveShadow />
      <mesh geometry={geo.wall} material={mat} castShadow receiveShadow />
      {/* interior floor, slightly darker bead-blasted finish */}
      <mesh position={[0, Y.floor + 0.001, CASE_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} material={inner} receiveShadow>
        <planeGeometry args={[CASE_W - WALL * 2 - 0.05, CASE_D - WALL * 2 - 0.05]} />
      </mesh>
      {/* USB-C opening in the back wall */}
      <mesh geometry={portGeo} material={dark} position={[HW.usbPort[0], HW.usbPort[1], backZ + 0.01]} />
      {/* polished steel weight + engraved badge on the underside */}
      <group position={[0, Y.bottomCaseBottom - 0.002, 0.3]} rotation={[Math.PI, 0, 0]}>
        <mesh geometry={badgeGeo} material={mirror} />
        <Text font={fontUrl} fontSize={0.2} letterSpacing={0.3} position={[0, 0.012, -0.08]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
          ANATOMY 75
          <meshStandardMaterial color="#9BA1A6" metalness={1} roughness={0.4} transparent />
        </Text>
        <Text font={fontUrl} fontSize={0.075} letterSpacing={0.25} position={[0, 0.012, 0.22]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
          A REPRESENTATIVE MODERN MECHANICAL KEYBOARD
          <meshStandardMaterial color="#9BA1A6" metalness={1} roughness={0.4} transparent />
        </Text>
      </group>
      {screws.map(([x, z], i) => (
        <mesh key={i} material={screw} position={[x, Y.bottomCaseBottom - 0.004, z]}>
          <cylinderGeometry args={[0.08, 0.08, 0.012, 20]} />
        </mesh>
      ))}
    </group>
  )
}

export function Feet() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3B3E41', roughness: 0.95 }), [])
  const long = useMemo(() => roundedBox(3.4, 0.09, 0.42, 0.18, 0.03), [])
  const round = useMemo(() => roundedBox(0.7, 0.07, 0.7, 0.33, 0.025), [])
  const y = Y.bottomCaseBottom - 0.045
  return (
    <group name="Feet">
      <mesh geometry={long} material={mat} position={[-5.4, y - 0.02, -2.9]} castShadow />
      <mesh geometry={long} material={mat} position={[5.4, y - 0.02, -2.9]} castShadow />
      <mesh geometry={round} material={mat} position={[-7.3, y, 2.55]} castShadow />
      <mesh geometry={round} material={mat} position={[7.3, y, 2.55]} castShadow />
    </group>
  )
}

export function CaseFoam() {
  const geo = useMemo(() => {
    const s = roundedRectShape(CASE_W - WALL * 2 - 0.1, CASE_D - WALL * 2 - 0.1, 0.18, 0, -CASE_CENTER_Z)
    // cut-outs so the battery and daughterboard can sit through the foam
    s.holes.push(roundedRectPath(4.5, 2.5, 0.12, HW.battery[0], -HW.battery[2]))
    s.holes.push(roundedRectPath(2.0, 0.9, 0.12, HW.daughter[0], -(HW.daughter[2] + 0.15)))
    const g = extrudeUp(s, Y.caseFoamTop - Y.caseFoamBottom, { curveSegments: 6 })
    g.translate(0, Y.caseFoamBottom, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#BDB8B0', roughness: 1 }), [])
  return <mesh name="Foam_Case" geometry={geo} material={mat} castShadow receiveShadow />
}
