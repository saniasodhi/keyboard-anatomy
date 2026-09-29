import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KEYS, KEY_AREA_W, KEY_AREA_D, Y, HW, HERO_KEY } from '../../data/layout'
import { roundedRectShape, extrudeUp, box, cyl, mergeGeometries, roundedBox } from '../../utils/geometry'
import { glowTexture } from '../../utils/materials'
import { useStore } from '../../store/useStore'
import { SIGNAL_STEPS } from '../../data/signalSteps'

export const PCB_W = KEY_AREA_W + 0.2
export const PCB_D = KEY_AREA_D + 0.2
const stabOffset = (w) => (w >= 6 ? 2.625 : 0.625)

const CW = 2560
const CH = Math.round((CW * PCB_D) / PCB_W)
const px = (x) => ((x + PCB_W / 2) / PCB_W) * CW
let flipZ = false
const pz = (z) => (((flipZ ? -z : z) + PCB_D / 2) / PCB_D) * CH
const U = CW / PCB_W

function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  return [c, c.getContext('2d')]
}

function trace(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))))
  ctx.stroke()
}

function via(ctx, x, z) {
  ctx.beginPath()
  ctx.arc(px(x), pz(z), 0.035 * U, 0, Math.PI * 2)
  ctx.fill()
}

// Decorative routing shared by colour + glow maps
function drawBuses(ctx, side) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const gapZ = -3.125 + 1 + 0.125
  if (side === 'top') {
    for (let i = 0; i < 5; i++) {
      const z = gapZ - 0.08 + i * 0.04
      trace(ctx, [
        [-7.9, z],
        [-1.2 - i * 0.04, z],
        [-0.9, z + 0.3 - i * 0.02],
      ])
      trace(ctx, [
        [7.9, z],
        [2.6 + i * 0.04, z],
      ])
    }
    // diagonal fan-ins from diodes
    KEYS.forEach((k) => {
      trace(ctx, [
        [k.x + 0.3, k.z + 0.3],
        [k.x + 0.38, k.z + 0.38],
      ])
    })
  } else {
    // bottom side: controller fan-out, power and radio buses
    const [cx, , cz] = HW.controller
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      trace(ctx, [
        [cx + Math.cos(a) * 0.2, cz + Math.sin(a) * 0.2],
        [cx + Math.cos(a) * 0.6, cz + Math.sin(a) * 0.6],
        [cx + Math.cos(a) * 0.6 + (i < 4 ? 1.4 : -1.4), cz + Math.sin(a) * 0.6],
      ])
    }
    for (let i = 0; i < 4; i++) {
      trace(ctx, [
        [cx + 0.25, cz - 0.1 + i * 0.05],
        [HW.wireless[0] - 0.5, cz - 0.1 + i * 0.05],
        [HW.wireless[0] - 0.4, HW.wireless[2] + 0.1 + i * 0.05],
      ])
      trace(ctx, [
        [cx - 0.25, cz - 0.1 + i * 0.05],
        [HW.power[0] + 0.4, cz - 0.1 + i * 0.05],
        [HW.power[0] + 0.3, HW.power[2] + i * 0.05],
      ])
      trace(ctx, [
        [HW.power[0] - 0.3, HW.power[2] - 0.2 + i * 0.05],
        [HW.daughter[0] + 0.4, HW.power[2] - 0.2 + i * 0.05],
        [HW.daughter[0] + 0.3, -3.1],
      ])
    }
    for (let r = 0; r < 6; r++) {
      const z = -2.6 + r * 1.05
      trace(ctx, [
        [-7.9, z],
        [cx - 1.6, z],
        [cx - 0.9, cz + 0.6],
      ])
    }
  }
}

function pcbTextures(side) {
  flipZ = side === 'bottom'
  const [c, ctx] = makeCanvas()
  const [e, ectx] = makeCanvas()
  // solder mask
  const g = ctx.createLinearGradient(0, 0, CW, CH)
  g.addColorStop(0, '#1A1F22')
  g.addColorStop(1, '#14181B')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CW, CH)
  ectx.fillStyle = '#000'
  ectx.fillRect(0, 0, CW, CH)

  // copper pour texture (very faint)
  ctx.fillStyle = 'rgba(255,255,255,0.018)'
  for (let i = 0; i < 26; i++) {
    const x = -8 + Math.random() * 16
    const z = -3 + Math.random() * 6
    ctx.fillRect(px(x), pz(z), (0.6 + Math.random()) * U, (0.3 + Math.random() * 0.5) * U)
  }

  ctx.strokeStyle = '#2B3438'
  ctx.lineWidth = 0.028 * U
  drawBuses(ctx, side)
  ectx.strokeStyle = '#fff'
  ectx.lineWidth = 0.028 * U
  drawBuses(ectx, side)

  const silk = 'rgba(226,231,233,0.55)'
  KEYS.forEach((k, i) => {
    const x = k.x
    const z = k.z
    ctx.strokeStyle = silk
    ctx.lineWidth = 0.012 * U
    if (side === 'top') {
      ctx.strokeRect(px(x - 0.39), pz(z - 0.39), 0.78 * U, 0.78 * U)
      // centre + post holes
      ctx.fillStyle = '#07090A'
      ctx.beginPath()
      ctx.arc(px(x), pz(z), 0.105 * U, 0, Math.PI * 2)
      ctx.fill()
      for (const dx of [-0.267, 0.267]) {
        ctx.beginPath()
        ctx.arc(px(x + dx), pz(z), 0.047 * U, 0, Math.PI * 2)
        ctx.fill()
      }
      // pin pads
      for (const [dx, dz] of [
        [-0.2, -0.133],
        [0.133, -0.267],
      ]) {
        ctx.fillStyle = '#C8A357'
        ctx.beginPath()
        ctx.arc(px(x + dx), pz(z + dz), 0.075 * U, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#07090A'
        ctx.beginPath()
        ctx.arc(px(x + dx), pz(z + dz), 0.04 * U, 0, Math.PI * 2)
        ctx.fill()
      }
      // diode
      ctx.fillStyle = '#B9BDC0'
      ctx.fillRect(px(x + 0.2), pz(z + 0.27), 0.2 * U, 0.07 * U)
      ctx.fillStyle = '#0B0C0D'
      ctx.fillRect(px(x + 0.24), pz(z + 0.265), 0.12 * U, 0.08 * U)
      // LED pads
      ctx.fillStyle = '#B9BDC0'
      ctx.fillRect(px(x - 0.09), pz(z - 0.3), 0.18 * U, 0.08 * U)
      ctx.fillStyle = silk
      ctx.font = `${0.075 * U}px "JetBrains Mono", monospace`
      ctx.fillText(`SW${i + 1}`, px(x - 0.36), pz(z + 0.36))
      if (k.stab) {
        const o = stabOffset(k.w)
        ctx.fillStyle = '#07090A'
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(px(x + s * o), pz(z - 0.3), 0.06 * U, 0, Math.PI * 2)
          ctx.arc(px(x + s * o), pz(z + 0.42), 0.08 * U, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else {
      // socket footprints (mirrored silkscreen)
      ctx.strokeRect(px(x - 0.34), pz(z - 0.37), 0.34 * U, 0.2 * U)
      ctx.strokeRect(px(x - 0.02), pz(z - 0.38), 0.3 * U, 0.2 * U)
      ctx.fillStyle = '#07090A'
      ctx.beginPath()
      ctx.arc(px(x), pz(z), 0.105 * U, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // silkscreen branding
  ctx.fillStyle = 'rgba(232,236,238,0.8)'
  const gapZ = -3.125 + 1 + 0.125
  if (side === 'top') {
    ctx.font = `600 ${0.12 * U}px "Archivo", sans-serif`
    ctx.fillText('ANATOMY 75', px(-0.4), pz(gapZ + 0.05))
    ctx.font = `${0.075 * U}px "JetBrains Mono", monospace`
    ctx.fillText('MAIN BOARD · HOT-SWAP · REV B', px(0.95), pz(gapZ + 0.045))
  } else {
    ctx.font = `600 ${0.16 * U}px "Archivo", sans-serif`
    ctx.fillText('ANATOMY 75', px(-7.6), pz(2.9))
    ctx.font = `${0.08 * U}px "JetBrains Mono", monospace`
    ctx.fillText('BOTTOM · REV B · DESIGNED FOR REPAIR', px(-7.6), pz(3.02))
    const lab = (t, x, z) => ctx.fillText(t, px(x), pz(z))
    lab('U1  CONTROLLER', HW.controller[0] - 0.4, HW.controller[2] + 0.42)
    lab('U2  RADIO', HW.wireless[0] - 0.4, HW.wireless[2] + 0.5)
    lab('U3  POWER', HW.power[0] - 0.4, HW.power[2] + 0.45)
    lab('J1  USB', HW.daughter[0] - 0.3, -2.75)
    // test pads
    ctx.fillStyle = '#C8A357'
    for (let i = 0; i < 6; i++) via(ctx, 3 + i * 0.22, 2.9)
  }
  flipZ = false
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const etex = new THREE.CanvasTexture(e)
  for (const t of [tex, etex]) {
    t.repeat.set(1 / PCB_W, side === 'bottom' ? 1 / PCB_D : 1 / PCB_D)
    t.offset.set(0.5, 0.5)
  }
  return { map: tex, emissiveMap: etex }
}

export function PCB() {
  const matsRef = useRef()
  const data = useMemo(() => {
    const shape = roundedRectShape(PCB_W, PCB_D, 0.12)
    const body = extrudeUp(shape, Y.pcbTop - Y.pcbBottom - 0.004, { curveSegments: 4 })
    body.translate(0, Y.pcbBottom + 0.002, 0)
    const top = new THREE.ShapeGeometry(shape, 4)
    top.rotateX(-Math.PI / 2)
    top.translate(0, Y.pcbTop, 0)
    // flip v so texture maps consistently (shape y == -z)
    const bottom = new THREE.ShapeGeometry(roundedRectShape(PCB_W, PCB_D, 0.12), 4)
    bottom.rotateX(Math.PI / 2)
    bottom.translate(0, Y.pcbBottom, 0)
    const t = pcbTextures('top')
    const b = pcbTextures('bottom')
    const topMat = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissiveMap, emissive: '#19A7C6', emissiveIntensity: 0, roughness: 0.42, metalness: 0.15 })
    const botMat = new THREE.MeshStandardMaterial({ map: b.map, emissiveMap: b.emissiveMap, emissive: '#19A7C6', emissiveIntensity: 0, roughness: 0.42, metalness: 0.15 })
    topMat.userData.animatedEmissive = true
    botMat.userData.animatedEmissive = true
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#23292C', roughness: 0.6 })
    return { body, top, bottom, topMat, botMat, bodyMat }
  }, [])
  matsRef.current = data

  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    const active =
      (s.mode === 'explore' && (s.selected === 'pcb' || s.selected === 'controller' || s.selected === 'power')) ||
      (s.mode === 'how' && ['power', 'detect', 'process'].includes(SIGNAL_STEPS[s.step].id))
    const target = active && !s.reducedMotion ? 0.55 + 0.45 * Math.sin(t * 2.4) : active ? 0.6 : 0
    for (const m of [data.topMat, data.botMat]) m.emissiveIntensity += (target - m.emissiveIntensity) * 0.08
  })

  return (
    <group name="PCB">
      <mesh geometry={data.body} material={data.bodyMat} castShadow receiveShadow />
      <mesh geometry={data.top} material={data.topMat} receiveShadow />
      <mesh geometry={data.bottom} material={data.botMat} receiveShadow />
    </group>
  )
}

// Row + column traces, each individually addressable
export const ROW_Z = [0, 1, 2, 3, 4, 5].map((r) => -KEY_AREA_D / 2 + r + (r > 0 ? 0.25 : 0) + 0.5 + 0.4)
export const COL_X = Array.from({ length: 16 }, (_, c) => -KEY_AREA_W / 2 + c + 0.5 + 0.42)
export const HERO_COL = Math.round(HERO_KEY.x + KEY_AREA_W / 2 - 0.5)

export function KeyMatrix() {
  const rows = useRef([])
  const cols = useRef([])
  const junction = useRef()
  const mats = useMemo(
    () => ({
      rows: ROW_Z.map(() => new THREE.MeshStandardMaterial({ color: '#3C474C', roughness: 0.35, metalness: 0.5, emissive: '#000' })),
      cols: COL_X.map(() => new THREE.MeshStandardMaterial({ color: '#3C474C', roughness: 0.35, metalness: 0.5, emissive: '#000' })),
    }),
    []
  )
  useLayoutEffect(() => {
    for (const m of [...mats.rows, ...mats.cols]) m.userData.animatedEmissive = true
  }, [mats])
  const rowGeo = useMemo(() => new THREE.BoxGeometry(PCB_W - 0.3, 0.004, 0.045), [])
  const colGeo = useMemo(() => new THREE.BoxGeometry(0.045, 0.004, PCB_D - 0.3), [])
  const signal = useMemo(() => new THREE.Color('#19A7C6'), [])
  const black = useMemo(() => new THREE.Color('#000'), [])

  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    const scanning =
      (s.mode === 'explore' && (s.selected === 'matrix' || s.selected === 'controller')) ||
      (s.mode === 'how' && ['detect', 'process'].includes(SIGNAL_STEPS[s.step].id))
    const heroRow = HERO_KEY.row
    let activeRow = -1
    let hit = 0
    if (scanning) {
      activeRow = s.reducedMotion ? heroRow : Math.floor(t / 0.42) % 6
      hit = activeRow === heroRow ? 1 : 0
    }
    mats.rows.forEach((m, i) => {
      const on = i === activeRow
      m.emissive.copy(on ? signal : black)
      m.emissiveIntensity = on ? 1.6 : 0
    })
    mats.cols.forEach((m, i) => {
      const on = hit && i === HERO_COL
      const idle = scanning ? 0.18 : 0
      m.emissive.copy(signal)
      m.emissiveIntensity = on ? 1.6 : idle
    })
    if (junction.current) {
      const target = hit ? 1 : 0
      junction.current.material.opacity += (target - junction.current.material.opacity) * 0.25
      junction.current.visible = junction.current.material.opacity > 0.01
    }
  })

  return (
    <group name="KeyMatrix" position={[0, Y.pcbTop + 0.004, 0]}>
      {ROW_Z.map((z, i) => (
        <mesh key={'r' + i} ref={(el) => { rows.current[i] = el }} geometry={rowGeo} material={mats.rows[i]} position={[0, 0, z]} />
      ))}
      {COL_X.map((x, i) => (
        <mesh key={'c' + i} ref={(el) => { cols.current[i] = el }} geometry={colGeo} material={mats.cols[i]} position={[x, 0.002, 0]} />
      ))}
      <sprite ref={junction} position={[COL_X[HERO_COL], 0.05, ROW_Z[HERO_KEY.row]]} scale={[0.9, 0.9, 0.9]} userData={{ fx: true }}>
        <spriteMaterial map={glowTexture()} color="#5FD4EE" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}

export function Sockets() {
  const body = useRef()
  const tabs = useRef()
  const geo = useMemo(
    () => ({
      body: mergeGeometries([box(0.3, 0.075, 0.18, -0.19, 0, -0.12), box(0.3, 0.075, 0.18, 0.1, 0, -0.26), box(0.14, 0.075, 0.1, -0.05, 0, -0.19)]),
      tabs: mergeGeometries([box(0.06, 0.05, 0.09, -0.37, 0.01, -0.12), box(0.06, 0.05, 0.09, 0.28, 0.01, -0.26)]),
    }),
    []
  )
  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#202224', roughness: 0.55 }),
      tabs: new THREE.MeshStandardMaterial({ color: '#C9CDD0', roughness: 0.25, metalness: 1 }),
    }),
    []
  )
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    KEYS.forEach((k, i) => {
      d.position.set(k.x, Y.pcbBottom - 0.04, k.z)
      d.updateMatrix()
      body.current.setMatrixAt(i, d.matrix)
      tabs.current.setMatrixAt(i, d.matrix)
    })
    body.current.instanceMatrix.needsUpdate = true
    tabs.current.instanceMatrix.needsUpdate = true
    body.current.computeBoundingSphere()
    tabs.current.computeBoundingSphere()
  }, [])
  return (
    <group name="HotSwapSockets">
      <instancedMesh ref={body} args={[geo.body, mats.body, KEYS.length]} castShadow />
      <instancedMesh ref={tabs} args={[geo.tabs, mats.tabs, KEYS.length]} />
    </group>
  )
}

export function LEDs() {
  const ref = useRef()
  const geo = useMemo(() => box(0.12, 0.03, 0.09), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), [])
  const off = useMemo(() => new THREE.Color('#E6E4DF'), [])
  const on = useMemo(() => new THREE.Color('#19A7C6').multiplyScalar(3.2), [])
  const warm = useMemo(() => new THREE.Color('#FFF6E8').multiplyScalar(2.2), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    KEYS.forEach((k, i) => {
      d.position.set(k.x, Y.pcbTop + 0.018, k.z - 0.29)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
      ref.current.setColorAt(i, off)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [off])
  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    const wave = s.mode === 'explore' && s.selected === 'leds'
    const rgb = s.custom.rgb
    // power-on sweep that trails the keycaps landing during the reveal
    const it = import.meta.env.DEV && window.__introT !== undefined ? window.__introT : s.phase === 'ready' ? performance.now() / 1000 - s.introAt : -1
    const sweep = !s.reducedMotion && it > 0.5 && it < 3.4
    KEYS.forEach((k, i) => {
      let v = 0
      let c = on
      if (sweep) {
        const front = (it - 0.6) * 8.5 - 1
        v = Math.max(0, 1 - Math.abs(k.x + 8 + k.row * 0.4 - front) / 2.2) * 0.9
        c = warm
      }
      if (wave) {
        const front = s.reducedMotion ? 1 : ((t * 7) % 22) - 3
        v = Math.max(0, 1 - Math.abs(k.x + 8 - front) / 2.2)
        if (s.reducedMotion) v = 0.7
      } else if (rgb) {
        v = 0.85
        c = warm
      }
      if (s.mode === 'type' && s.pressed[k.code]) {
        v = 1
        c = on
      }
      tmp.copy(off).lerp(c, v)
      ref.current.setColorAt(i, tmp)
    })
    ref.current.instanceColor.needsUpdate = true
  })
  return (
    <group name="LEDs">
      <instancedMesh ref={ref} args={[geo, mat, KEYS.length]} />
    </group>
  )
}

// Components hanging on the underside of the PCB
export function Controller() {
  const glow = useRef()
  const mats = useMemo(
    () => ({
      chip: new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.45 }),
      pad: new THREE.MeshStandardMaterial({ color: '#C9CDD0', roughness: 0.3, metalness: 1 }),
      xtal: new THREE.MeshStandardMaterial({ color: '#D5D8DA', roughness: 0.2, metalness: 1 }),
      cap: new THREE.MeshStandardMaterial({ color: '#B59C74', roughness: 0.5 }),
    }),
    []
  )
  const geo = useMemo(
    () => ({
      chip: roundedBox(0.46, 0.05, 0.46, 0.02, 0.008),
      pads: mergeGeometries(
        Array.from({ length: 32 }, (_, i) => {
          const side = Math.floor(i / 8)
          const o = -0.19 + (i % 8) * 0.054
          const pos = [
            [o, -0.245],
            [0.245, o],
            [o, 0.245],
            [-0.245, o],
          ][side]
          return box(side % 2 ? 0.04 : 0.022, 0.012, side % 2 ? 0.022 : 0.04, pos[0], 0.012, pos[1])
        })
      ),
      xtal: roundedBox(0.2, 0.05, 0.12, 0.02, 0.008),
      caps: mergeGeometries([box(0.08, 0.04, 0.045, 0.4, 0, 0.1), box(0.08, 0.04, 0.045, 0.4, 0, -0.05), box(0.045, 0.04, 0.08, -0.35, 0, 0.3)]),
    }),
    []
  )
  useFrame(() => {
    const s = useStore.getState()
    const t = performance.now() / 1000 - s.animStart
    const on = (s.mode === 'explore' && s.selected === 'controller') || (s.mode === 'how' && SIGNAL_STEPS[s.step].id === 'process')
    if (glow.current) glow.current.material.opacity += ((on ? 0.3 + 0.2 * Math.sin(t * 6) : 0) - glow.current.material.opacity) * 0.15
  })
  return (
    <group name="Controller" position={HW.controller}>
      <group rotation={[Math.PI, 0, 0]}>
        <mesh geometry={geo.chip} material={mats.chip} castShadow />
        <mesh geometry={geo.pads} material={mats.pad} />
        <mesh geometry={geo.xtal} material={mats.xtal} position={[-0.45, 0, -0.1]} />
        <mesh geometry={geo.caps} material={mats.cap} />
        <mesh position={[-0.16, 0.028, -0.16]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 12]} />
          <meshBasicMaterial color="#6d7174" />
        </mesh>
      </group>
      <sprite ref={glow} position={[0, -0.08, 0]} scale={[1.4, 1.4, 1.4]} userData={{ fx: true }}>
        <spriteMaterial map={glowTexture()} color="#39C3E0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}

export function WirelessModule() {
  const mats = useMemo(
    () => ({
      can: new THREE.MeshStandardMaterial({ color: '#D3D7DA', roughness: 0.28, metalness: 1 }),
      board: new THREE.MeshStandardMaterial({ color: '#1E2427', roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: '#D2AE62', roughness: 0.25, metalness: 1 }),
    }),
    []
  )
  return (
    <group name="WirelessModule" position={HW.wireless}>
      <mesh material={mats.board} position={[0, 0.015, 0]} castShadow>
        <boxGeometry args={[0.9, 0.03, 0.7]} />
      </mesh>
      <mesh geometry={useMemo(() => roundedBox(0.74, 0.08, 0.52, 0.04, 0.01), [])} material={mats.can} position={[-0.04, -0.04, 0]} castShadow />
      <mesh material={mats.gold} position={[0.36, -0.02, -0.25]}>
        <cylinderGeometry args={[0.045, 0.045, 0.05, 14]} />
      </mesh>
    </group>
  )
}

export function PowerSystem() {
  const mats = useMemo(
    () => ({
      chip: new THREE.MeshStandardMaterial({ color: '#1B1C1E', roughness: 0.45 }),
      inductor: new THREE.MeshStandardMaterial({ color: '#55595D', roughness: 0.6 }),
      cap: new THREE.MeshStandardMaterial({ color: '#B59C74', roughness: 0.5 }),
      conn: new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.5 }),
    }),
    []
  )
  return (
    <group name="PowerSystem" position={HW.power}>
      <mesh material={mats.chip} position={[0, -0.01, 0]} castShadow>
        <boxGeometry args={[0.26, 0.04, 0.26]} />
      </mesh>
      <mesh material={mats.chip} position={[0.42, -0.01, 0.05]} castShadow>
        <boxGeometry args={[0.18, 0.035, 0.18]} />
      </mesh>
      <mesh geometry={useMemo(() => roundedBox(0.26, 0.11, 0.26, 0.03, 0.01), [])} material={mats.inductor} position={[-0.4, -0.05, 0]} castShadow />
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={mats.cap} position={[-0.05 + i * 0.13, -0.02, 0.26]}>
          <boxGeometry args={[0.08, 0.045, 0.045]} />
        </mesh>
      ))}
      <mesh material={mats.conn} position={[0.2, -0.07, -0.34]} castShadow>
        <boxGeometry args={[0.36, 0.13, 0.16]} />
      </mesh>
    </group>
  )
}
