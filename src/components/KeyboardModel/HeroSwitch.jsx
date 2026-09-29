import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { HERO_KEY } from '../../data/layout'
import { useStore } from '../../store/useStore'
import { frustum, box, cyl, springGeometry, mergeGeometries } from '../../utils/geometry'
import { glowTexture } from '../../utils/materials'
import { heroState, cyclePress, TRAVEL } from './Keycaps'
import { useSwitchMaterials } from './Switches'

const SPRING_BASE = -0.25
const SPRING_LEN = 0.39

function Edges({ geometry, opacity = 0.5 }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry])
  return (
    <lineSegments geometry={edges} userData={{ fx: true }}>
      <lineBasicMaterial color="#8FA3AA" transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  )
}

function Label({ position, children, side = 'right' }) {
  return (
    <Html position={position} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`anno anno--${side}`}>
        <span className="anno__dot" />
        <span className="anno__line" />
        <span className="anno__text">{children}</span>
      </div>
    </Html>
  )
}

export function HeroSwitch() {
  const root = useRef()
  const stem = useRef()
  const spring = useRef()
  const leaf = useRef()
  const glow = useRef()
  const [mode, setMode] = useState(null)
  const mats = useSwitchMaterials()

  const geo = useMemo(
    () => ({
      top: frustum(0.78, 0.6, 0.2, 0),
      bottom: box(0.74, 0.17, 0.74, 0, -0.165, 0),
      stem: mergeGeometries([
        box(0.26, 0.15, 0.065, 0, 0.3, 0),
        box(0.065, 0.15, 0.26, 0, 0.3, 0),
        box(0.3, 0.1, 0.28, 0, 0.19, 0),
        box(0.05, 0.2, 0.06, 0.12, 0.05, 0.08),
        box(0.05, 0.2, 0.06, -0.12, 0.05, 0.08),
        cyl(0.06, 0.08, 0, 0.1, 0, 12),
      ]),
      spring: springGeometry(0.085, 1, 7, 0.011),
      post: cyl(0.045, 0.14, 0, -0.18, 0, 12),
      pins: mergeGeometries([cyl(0.022, 0.2, -0.2, -0.33, -0.133, 8), cyl(0.022, 0.2, 0.133, -0.33, -0.267, 8)]),
      leafFixed: box(0.012, 0.24, 0.13, 0, 0.12, 0),
      leafMove: box(0.012, 0.24, 0.13, 0, 0.12, 0),
    }),
    []
  )

  const glass = useMemo(
    () => ({
      top: new THREE.MeshPhysicalMaterial({ color: '#E3F2F5', roughness: 0.08, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
      bottom: new THREE.MeshPhysicalMaterial({ color: '#D8D4CD', roughness: 0.3, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
      spring: new THREE.MeshStandardMaterial({ color: '#C9CED2', metalness: 1, roughness: 0.22 }),
      gold: new THREE.MeshStandardMaterial({ color: '#D6B066', metalness: 1, roughness: 0.25, emissive: '#000000' }),
    }),
    []
  )
  for (const m of Object.values(glass)) m.userData.keepVisible = true

  useFrame(() => {
    const s = useStore.getState()
    const { anim, t } = heroState(s)
    const m = anim === 'switch-actuation' ? 'actuate' : s.mode === 'explore' && s.selected === 'sockets' ? 'hotswap' : null
    if (m !== mode) setMode(m)
    if (!root.current) return
    root.current.visible = !!m
    if (!m) return
    const reduced = s.reducedMotion
    if (m === 'actuate') {
      const p = reduced ? 0.55 : cyclePress(t, 2.4)
      const dy = -p * TRAVEL
      stem.current.position.y = dy
      spring.current.scale.y = SPRING_LEN + dy
      const closed = p > 0.5
      leaf.current.rotation.z = THREE.MathUtils.lerp(leaf.current.rotation.z, closed ? 0 : 0.32, 0.35)
      const g = closed ? 1 : 0
      glow.current.material.opacity = THREE.MathUtils.lerp(glow.current.material.opacity, g, 0.3)
      glass.gold.emissive.set(closed ? '#19A7C6' : '#000000')
      glass.gold.emissiveIntensity = closed ? 0.5 : 0
      root.current.position.y = 0
    } else {
      // hot-swap: the whole switch is pulled out of its socket and pushed back in
      const ph = (t % 3.4) / 3.4
      const e = reduced ? 0.5 : ph < 0.4 ? THREE.MathUtils.smootherstep(ph, 0.05, 0.4) : ph < 0.6 ? 1 : 1 - THREE.MathUtils.smootherstep(ph, 0.6, 0.92)
      root.current.position.y = e * 0.85
      stem.current.position.y = 0
      spring.current.scale.y = SPRING_LEN
      leaf.current.rotation.z = 0.32
      glow.current.material.opacity = 0
    }
  })

  return (
    <group position={[HERO_KEY.x, 0, HERO_KEY.z]} name="Switch_Hero">
      <group ref={root} visible={false}>
        <mesh geometry={geo.top} material={glass.top} />
        <Edges geometry={geo.top} />
        <mesh geometry={geo.bottom} material={glass.bottom} />
        <Edges geometry={geo.bottom} opacity={0.35} />
        <mesh geometry={geo.post} material={mats.bottom} />
        <group ref={stem}>
          <mesh geometry={geo.stem} material={mats.stem} castShadow />
        </group>
        <mesh ref={spring} geometry={geo.spring} material={glass.spring} position={[0, SPRING_BASE, 0]} />
        <group position={[0.29, -0.25, 0]}>
          <mesh geometry={geo.leafFixed} material={glass.gold} />
        </group>
        <group ref={leaf} position={[0.255, -0.25, 0]}>
          <mesh geometry={geo.leafMove} material={glass.gold} />
        </group>
        <sprite ref={glow} position={[0.275, -0.05, 0]} scale={[0.28, 0.28, 0.28]} userData={{ fx: true }}>
          <spriteMaterial map={glowTexture()} color="#39C3E0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
        <mesh geometry={geo.pins} material={glass.gold} />
        {mode === 'actuate' && (
          <>
            <Label position={[-0.13, 0.36, 0]} side="left">Stem</Label>
            <Label position={[-0.09, -0.12, 0.05]} side="left">Spring</Label>
            <Label position={[0.3, -0.02, 0.06]}>Contacts</Label>
          </>
        )}
        {mode === 'hotswap' && <Label position={[0.133, -0.42, -0.267]}>Pins</Label>}
      </group>
    </group>
  )
}
