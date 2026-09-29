import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { roundedRectShape, extrudeUp } from '../utils/geometry'

const DESK_Y = -1.2

function woodTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#D8CBB8'
  ctx.fillRect(0, 0, 1024, 1024)
  // long soft grain lines
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * 1024
    const a = 0.03 + Math.random() * 0.06
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(120,95,70,${a})` : `rgba(255,248,235,${a})`
    ctx.lineWidth = 1 + Math.random() * 3
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 6)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  t.anisotropy = 8
  return t
}

function feltTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(512, 512)
  for (let i = 0; i < 512 * 512; i++) {
    const v = 128 + (Math.random() - 0.5) * 36
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(10, 5)
  return t
}

export function TypeTestScene() {
  const group = useRef()
  const fade = useRef(0)
  const mats = useMemo(() => {
    const desk = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.62, transparent: true, opacity: 0 })
    const mat = new THREE.MeshStandardMaterial({ color: '#8E8A84', roughnessMap: feltTexture(), bumpMap: feltTexture(), bumpScale: 0.6, roughness: 1, transparent: true, opacity: 0 })
    const mug = new THREE.MeshPhysicalMaterial({ color: '#F1EEE8', roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.35, transparent: true, opacity: 0 })
    const coffee = new THREE.MeshStandardMaterial({ color: '#3A2618', roughness: 0.2, transparent: true, opacity: 0 })
    const pencil = new THREE.MeshStandardMaterial({ color: '#2F3438', roughness: 0.5, transparent: true, opacity: 0 })
    const gobo = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    return { desk, mat, mug, coffee, pencil, gobo }
  }, [])
  const matGeo = useMemo(() => {
    const g = extrudeUp(roundedRectShape(26, 11, 0.6), 0.03, { bevel: 0.015, curveSegments: 10 })
    return g
  }, [])

  useFrame((_, dt) => {
    const s = useStore.getState()
    const target = s.mode === 'type' ? 1 : 0
    fade.current += (target - fade.current) * (1 - Math.exp(-dt * 2.2))
    const f = fade.current
    group.current.visible = f > 0.01
    for (const m of [mats.desk, mats.mat, mats.mug, mats.coffee, mats.pencil]) {
      m.opacity = f
      m.depthWrite = f > 0.6
    }
    group.current.position.y = (1 - f) * -0.8
  })

  return (
    <group ref={group} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y - 0.035, 0]} material={mats.desk} receiveShadow>
        <planeGeometry args={[90, 60]} />
      </mesh>
      <mesh geometry={matGeo} material={mats.mat} position={[1.5, DESK_Y - 0.03, 0.4]} receiveShadow />
      {/* ceramic mug */}
      <group position={[12.2, DESK_Y, -2.4]}>
        <mesh material={mats.mug} position={[0, 1.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 0.98, 2.3, 48, 1, true]} />
        </mesh>
        <mesh material={mats.mug} position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.98, 0.98, 0.06, 48]} />
        </mesh>
        <mesh material={mats.coffee} position={[0, 1.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.0, 48]} />
        </mesh>
        <mesh material={mats.mug} position={[1.15, 1.2, 0]} castShadow>
          <torusGeometry args={[0.48, 0.11, 16, 40, Math.PI * 1.25]} />
        </mesh>
      </group>
      {/* pencil */}
      <mesh material={mats.pencil} position={[-12.4, DESK_Y + 0.12, 3.6]} rotation={[0, 0.5, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 6.5, 6]} />
      </mesh>
      {/* invisible window frame that casts soft "window light" onto the desk */}
      <group position={[-4.8, 8.5, 4.4]} rotation={[0.7, 0.62, 0.2]}>
        {[-3, 0, 3].map((x) => (
          <mesh key={'v' + x} material={mats.gobo} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[0.18, 12, 0.18]} />
          </mesh>
        ))}
        <mesh material={mats.gobo} position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[12, 0.18, 0.18]} />
        </mesh>
      </group>
    </group>
  )
}
