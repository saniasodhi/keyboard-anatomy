import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import fontUrl from '@fontsource/inter/files/inter-latin-600-normal.woff?url'
import { HW, Y } from '../../data/layout'
import { partOffset } from '../../data/explosion'
import { roundedBox, box, mergeGeometries } from '../../utils/geometry'
import { useStore } from '../../store/useStore'

// Anchor points used by cables and signal paths: a local point that rides along with a part
export const ANCHORS = {
  usbHeader: { part: 'pcb', p: [-4.3, Y.pcbBottom - 0.07, -2.72] },
  daughterConn: { part: 'usb', p: [HW.daughter[0] + 0.45, HW.daughter[1] + 0.06, HW.daughter[2] + 0.3] },
  daughter: { part: 'usb', p: [HW.daughter[0], HW.daughter[1] + 0.05, HW.daughter[2]] },
  usbPort: { part: 'usb', p: [HW.daughter[0], HW.daughter[1] + 0.05, HW.daughter[2] - 0.45] },
  batteryConn: { part: 'battery', p: [HW.battery[0] - 1.6, HW.battery[1] + 0.05, HW.battery[2] - 1.35] },
  battery: { part: 'battery', p: [HW.battery[0], HW.battery[1] + 0.1, HW.battery[2]] },
  powerConn: { part: 'power', p: [HW.power[0] + 0.2, HW.power[1] - 0.13, HW.power[2] - 0.34] },
  power: { part: 'power', p: [HW.power[0], HW.power[1] - 0.05, HW.power[2]] },
  radioConn: { part: 'wireless', p: [HW.wireless[0] + 0.36, HW.wireless[1] - 0.05, HW.wireless[2] - 0.25] },
  wireless: { part: 'wireless', p: [HW.wireless[0], HW.wireless[1] - 0.08, HW.wireless[2]] },
  antenna: { part: 'antenna', p: [HW.antenna[0], HW.antenna[1] + 0.02, HW.antenna[2]] },
  antennaConn: { part: 'antenna', p: [HW.antenna[0] - 0.4, HW.antenna[1] + 0.02, HW.antenna[2]] },
  controller: { part: 'controller', p: [HW.controller[0], HW.controller[1] - 0.05, HW.controller[2]] },
}

const off = [0, 0, 0]
export function anchorWorld(a, explode, out = new THREE.Vector3()) {
  const A = typeof a === 'string' ? ANCHORS[a] : a
  partOffset(A.part, explode, off)
  return out.set(A.p[0] + off[0], A.p[1] + off[1], A.p[2] + off[2])
}

function Cable({ from, to, color = '#2A2C2E', radius = 0.035, sag = 0.25, lateral = [0, 0, 0] }) {
  const mesh = useRef()
  const last = useRef(-1)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.55 }), [color])
  const a = useMemo(() => new THREE.Vector3(), [])
  const b = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const e = useStore.getState().explode
    if (Math.abs(e - last.current) < 0.0005) return
    last.current = e
    anchorWorld(from, e, a)
    anchorWorld(to, e, b)
    a.x += lateral[0]
    a.z += lateral[2]
    b.x += lateral[0]
    b.z += lateral[2]
    const mid = a.clone().lerp(b, 0.5)
    const len = a.distanceTo(b)
    mid.y = Math.min(a.y, b.y) - sag - len * 0.05
    const p1 = a.clone().lerp(mid, 0.45)
    p1.y = a.y - sag * 0.7
    const p2 = b.clone().lerp(mid, 0.45)
    p2.y = b.y - sag * 0.7
    const curve = new THREE.CatmullRomCurve3([a.clone(), p1, mid, p2, b.clone()])
    const g = new THREE.TubeGeometry(curve, 48, radius, 8, false)
    mesh.current.geometry.dispose()
    mesh.current.geometry = g
  })
  return <mesh ref={mesh} material={mat} castShadow geometry={useMemo(() => new THREE.BufferGeometry(), [])} />
}

export function Wiring() {
  return (
    <group name="InternalWiring">
      <Cable from="daughterConn" to="usbHeader" color="#2B2E31" radius={0.04} sag={0.12} />
      <Cable from="daughterConn" to="usbHeader" color="#3D4246" radius={0.04} sag={0.12} lateral={[0.09, 0, 0]} />
    </group>
  )
}

export function BatteryWires() {
  return (
    <group name="BatteryWiring">
      <Cable from="batteryConn" to="powerConn" color="#B8473D" radius={0.028} sag={0.18} />
      <Cable from="batteryConn" to="powerConn" color="#232527" radius={0.028} sag={0.18} lateral={[0.07, 0, 0]} />
    </group>
  )
}

export function AntennaCable() {
  return <Cable from="antennaConn" to="radioConn" color="#6F7478" radius={0.018} sag={0.2} />
}

export function Battery() {
  const mats = useMemo(
    () => ({
      pouch: new THREE.MeshPhysicalMaterial({ color: '#C6CCD1', metalness: 0.75, roughness: 0.34, clearcoat: 0.4 }),
      label: new THREE.MeshStandardMaterial({ color: '#F1F0EC', roughness: 0.7 }),
      tape: new THREE.MeshStandardMaterial({ color: '#C98F2A', roughness: 0.35, transparent: true, opacity: 0.85 }),
      conn: new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.5 }),
      fill: new THREE.MeshBasicMaterial({ color: '#19A7C6', transparent: true, opacity: 0, toneMapped: false }),
    }),
    []
  )
  const fill = useRef()
  useFrame(() => {
    const s = useStore.getState()
    const on = s.mode === 'explore' && s.selected === 'battery'
    const t = performance.now() / 1000 - s.animStart
    const lvl = s.reducedMotion ? 0.8 : (t * 0.28) % 1
    if (fill.current) {
      fill.current.scale.x = Math.max(0.001, lvl)
      fill.current.position.x = -1.8 + 1.8 * lvl
      mats.fill.opacity += ((on ? 0.9 : 0) - mats.fill.opacity) * 0.1
      fill.current.visible = mats.fill.opacity > 0.01
    }
  })
  const pouch = useMemo(() => roundedBox(4.2, 0.14, 2.3, 0.12, 0.05), [])
  return (
    <group name="Battery" position={HW.battery}>
      <mesh geometry={pouch} material={mats.pouch} castShadow receiveShadow />
      <mesh position={[0.3, 0.072, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={mats.label}>
        <planeGeometry args={[2.6, 1.3]} />
      </mesh>
      <Text font={fontUrl} fontSize={0.16} letterSpacing={0.12} position={[-0.8, 0.075, -0.25]} rotation={[-Math.PI / 2, 0, 0]} anchorX="left" color="#2A2D30">
        LI-PO CELL
      </Text>
      <Text font={fontUrl} fontSize={0.085} letterSpacing={0.1} position={[-0.8, 0.075, 0.05]} rotation={[-Math.PI / 2, 0, 0]} anchorX="left" color="#7A7F84">
        RECHARGEABLE · DO NOT PUNCTURE
      </Text>
      {/* charge level bar */}
      <mesh position={[-1.8, 0.078, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.1]} />
        <meshBasicMaterial color="#D9DCDE" />
      </mesh>
      <mesh ref={fill} position={[-1.8, 0.08, 0.55]} rotation={[-Math.PI / 2, 0, 0]} material={mats.fill} userData={{ fx: true }}>
        <planeGeometry args={[3.6, 0.1]} />
      </mesh>
      {/* protection circuit under kapton tape */}
      <mesh position={[-1.4, 0.02, -1.22]} material={mats.tape}>
        <boxGeometry args={[1.2, 0.09, 0.2]} />
      </mesh>
      <mesh position={[-1.6, 0.05, -1.35]} material={mats.conn} castShadow>
        <boxGeometry args={[0.32, 0.12, 0.16]} />
      </mesh>
    </group>
  )
}

export function UsbDaughterboard() {
  const mats = useMemo(
    () => ({
      board: new THREE.MeshStandardMaterial({ color: '#1C2124', roughness: 0.45 }),
      metal: new THREE.MeshStandardMaterial({ color: '#D5D9DC', roughness: 0.22, metalness: 1 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0E0F10', roughness: 0.6 }),
      chip: new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.45 }),
      conn: new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: '#D2AE62', roughness: 0.25, metalness: 1 }),
    }),
    []
  )
  const receptacle = useMemo(() => roundedBox(0.5, 0.18, 0.42, 0.085, 0.02), [])
  const mouth = useMemo(() => roundedBox(0.42, 0.1, 0.02, 0.05, 0.005), [])
  const pads = useMemo(() => mergeGeometries([0, 1, 2, 3, 4, 5].map((i) => box(0.05, 0.012, 0.09, -0.62 + i * 0.1, 0.03, 0.28))), [])
  return (
    <group name="USB_Daughterboard" position={HW.daughter}>
      <mesh material={mats.board} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.05, 0.85]} />
      </mesh>
      <mesh geometry={receptacle} material={mats.metal} position={[0, 0.12, -0.3]} castShadow />
      <mesh geometry={mouth} material={mats.dark} position={[0, 0.12, -0.515]} />
      <mesh material={mats.chip} position={[-0.45, 0.04, -0.05]}>
        <boxGeometry args={[0.2, 0.04, 0.16]} />
      </mesh>
      <mesh material={mats.chip} position={[0.45, 0.04, -0.1]}>
        <boxGeometry args={[0.14, 0.035, 0.12]} />
      </mesh>
      <mesh material={mats.conn} position={[0.45, 0.08, 0.28]} castShadow>
        <boxGeometry args={[0.46, 0.12, 0.2]} />
      </mesh>
      <mesh geometry={pads} material={mats.gold} />
    </group>
  )
}

export function Antenna() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 192
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#B57C2A'
    ctx.fillRect(0, 0, 512, 192)
    ctx.strokeStyle = '#E6B864'
    ctx.lineWidth = 10
    ctx.beginPath()
    let x = 40
    ctx.moveTo(20, 96)
    ctx.lineTo(x, 96)
    for (let i = 0; i < 9; i++) {
      ctx.lineTo(x, 30)
      x += 25
      ctx.lineTo(x, 30)
      ctx.lineTo(x, 162)
      x += 25
      ctx.lineTo(x, 162)
    }
    ctx.stroke()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group name="Antenna" position={HW.antenna}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.012, 0.42]} />
        <meshStandardMaterial map={tex} roughness={0.35} metalness={0.2} transparent opacity={0.96} />
      </mesh>
      <mesh position={[-0.52, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        <meshStandardMaterial color="#D2AE62" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  )
}
