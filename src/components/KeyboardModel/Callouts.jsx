import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CASE_W, Y } from '../../data/layout'
import { partOffset } from '../../data/explosion'
import { useStore } from '../../store/useStore'

// Engineering-drawing style leader callouts that appear as the keyboard comes apart.
const LAYERS = [
  { part: 'topCase', id: 'case', label: 'Top case', y: Y.topCaseTop - 0.1 },
  { part: 'keycaps', id: 'keycaps', label: 'Keycaps', y: 0.7 },
  { part: 'switches', id: 'switches', label: 'Switches', y: 0.1 },
  { part: 'stabilizers', id: 'stabilizers', label: 'Stabilizers', y: 0.1, x: -4.9 },
  { part: 'plate', id: 'plate', label: 'Plate', y: -0.04 },
  { part: 'plateFoam', id: 'foam', label: 'Plate foam', y: -0.17 },
  { part: 'pcb', id: 'pcb', label: 'PCB', y: -0.31 },
  { part: 'sockets', id: 'sockets', label: 'Hot-swap sockets', y: -0.4, x: 7.4 },
  { part: 'caseFoam', id: 'foam', label: 'Case foam', y: -0.57 },
  { part: 'battery', id: 'battery', label: 'Battery', y: -0.83, x: 2.5 },
  { part: 'bottomCase', id: 'case', label: 'Bottom case', y: -0.6 },
]

const o = [0, 0, 0]

function Callout({ layer, index }) {
  const ref = useRef()
  const [vis, setVis] = useState(false)
  const select = useStore((s) => s.select)
  useFrame(() => {
    const s = useStore.getState()
    partOffset(layer.part, s.explode, o)
    const x = layer.x ?? CASE_W / 2 - 0.2
    ref.current.position.set(x + o[0], layer.y + o[1], 0.2 + o[2])
    const show = s.mode === 'explore' && !s.selected && !s.system && s.explode > 0.72
    if (show !== vis) setVis(show)
  })
  return (
    <group ref={ref}>
      <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <button
          className={`callout ${vis ? 'is-on' : ''}`}
          style={{ transitionDelay: vis ? `${index * 45}ms` : '0ms', pointerEvents: vis ? 'auto' : 'none' }}
          onClick={() => select(layer.id)}
          tabIndex={vis ? 0 : -1}
          aria-hidden={!vis}
        >
          <span className="callout__dot" />
          <span className="callout__line" />
          <span className="callout__label">{layer.label}</span>
        </button>
      </Html>
    </group>
  )
}

export function Callouts() {
  return (
    <group name="Callouts">
      {LAYERS.map((l, i) => (
        <Callout key={l.label} layer={l} index={i} />
      ))}
    </group>
  )
}
