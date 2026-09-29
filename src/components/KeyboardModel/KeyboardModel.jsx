import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore, getFocusParts } from '../../store/useStore'
import { Part } from './Part'
import { Keycaps } from './Keycaps'
import { Switches } from './Switches'
import { Plate, PlateFoam, Gaskets, Stabilizers } from './Plate'
import { PCB, KeyMatrix, Sockets, LEDs, Controller, WirelessModule, PowerSystem } from './Electronics'
import { TopCase, BottomCase, Feet, CaseFoam } from './Case'
import { Battery, UsbDaughterboard, Antenna, Wiring, BatteryWires, AntennaCable } from './Internals'
import { SignalFX } from './SignalFX'
import { Callouts } from './Callouts'

// 3D part id → navigator component id
export const PART_TO_COMPONENT = {
  topCase: 'case',
  bottomCase: 'case',
  feet: 'case',
  keycaps: 'keycaps',
  switches: 'switches',
  stabilizers: 'stabilizers',
  plate: 'plate',
  gaskets: 'mounting',
  plateFoam: 'foam',
  caseFoam: 'foam',
  pcb: 'pcb',
  keyMatrix: 'matrix',
  leds: 'leds',
  sockets: 'sockets',
  controller: 'controller',
  power: 'power',
  wireless: 'wireless',
  usb: 'usb',
  wiring: 'usb',
  battery: 'battery',
  antenna: 'antenna',
}

function partIdOf(obj) {
  let o = obj
  while (o) {
    if (o.userData?.partId) return o.userData.partId
    o = o.parent
  }
  return null
}

export function KeyboardModel() {
  const root = useRef()
  const hoverRef = useRef(null)

  useFrame((state, dt) => {
    const s = useStore.getState()
    const idle = s.mode === 'explore' && !s.selected && !s.system && s.explode < 0.02 && !s.reducedMotion
    const t = state.clock.elapsedTime
    const g = root.current
    const k = 1 - Math.exp(-dt * 2)
    const ty = idle ? Math.sin(t * 0.7) * 0.07 : 0
    g.position.y += (ty - g.position.y) * k
    const tr = idle ? Math.sin(t * 0.45) * 0.012 : 0
    g.rotation.z += (tr - g.rotation.z) * k
  })

  const onClick = (e) => {
    const s = useStore.getState()
    if (s.mode !== 'explore' || e.delta > 5) return
    e.stopPropagation()
    const focus = getFocusParts(s)
    for (const hit of e.intersections) {
      if (hit.object.userData?.fx || !hit.object.visible) continue
      const pid = partIdOf(hit.object)
      if (!pid) continue
      if (focus && !focus.includes(pid)) continue
      const cid = PART_TO_COMPONENT[pid]
      if (cid) s.select(cid)
      return
    }
  }

  const onMove = (e) => {
    const s = useStore.getState()
    if (s.mode !== 'explore') return
    const pid = partIdOf(e.object)
    if (pid !== hoverRef.current) {
      hoverRef.current = pid
      document.body.style.cursor = pid ? 'pointer' : ''
    }
  }
  const onOut = () => {
    hoverRef.current = null
    document.body.style.cursor = ''
  }

  return (
    <group ref={root} name="Keyboard_Root" onClick={onClick} onPointerMove={onMove} onPointerOut={onOut}>
      <Part id="topCase" name="TopCase"><TopCase /></Part>
      <Part id="keycaps" name="Keycaps_All"><Keycaps /></Part>
      <Part id="switches" name="Switches_All"><Switches /></Part>
      <Part id="stabilizers" name="Stabilizers"><Stabilizers /></Part>
      <Part id="plate" name="Plate"><Plate /></Part>
      <Part id="gaskets" name="GasketMounts"><Gaskets /></Part>
      <Part id="plateFoam" name="Foam"><PlateFoam /></Part>
      <Part id="pcb" name="PCB"><PCB /></Part>
      <Part id="keyMatrix" name="KeyMatrix"><KeyMatrix /></Part>
      <Part id="leds" name="LEDs"><LEDs /></Part>
      <Part id="sockets" name="HotSwapSockets"><Sockets /></Part>
      <Part id="controller" name="Controller"><Controller /></Part>
      <Part id="power" name="PowerSystem"><PowerSystem /></Part>
      <Part id="wireless" name="WirelessModule"><WirelessModule /></Part>
      <Part id="caseFoam" name="CaseFoam"><CaseFoam /></Part>
      <Part id="usb" name="USB_Daughterboard"><UsbDaughterboard /></Part>
      <Part id="wiring" name="InternalWiring" static><Wiring /></Part>
      <Part id="battery" name="Battery"><Battery /></Part>
      <Part id="battery" name="BatteryWiring" static><BatteryWires /></Part>
      <Part id="antenna" name="Antenna"><Antenna /></Part>
      <Part id="antenna" name="AntennaCable" static><AntennaCable /></Part>
      <Part id="bottomCase" name="BottomCase"><BottomCase /></Part>
      <Part id="feet" name="Feet"><Feet /></Part>
      <SignalFX />
      <Callouts />
    </group>
  )
}
