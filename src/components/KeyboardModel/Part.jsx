import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore, getFocusParts } from '../../store/useStore'
import { partOffset } from '../../data/explosion'

const tmp = [0, 0, 0]
// Parts made of many small instances read better without an outline
const NO_OUTLINE = new Set(['switches', 'sockets', 'plate', 'foam', 'keycaps', 'leds', 'matrix'])
// a faint cool lift, not a colour wash
const HILITE = new THREE.Color('#BEEBF5').multiplyScalar(0.07)

// Applies ghosting / emphasis to every material under `root`.
function applyLook(root, dim, glow) {
  root.traverse((o) => {
    if (!o.material || o.userData.fx) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (m.userData.keepVisible) continue
      const u = m.userData
      if (u.baseOpacity === undefined) {
        u.baseOpacity = m.opacity
        u.baseTransparent = m.transparent
        u.baseDepthWrite = m.depthWrite
        if (m.emissive) {
          u.baseEmissive = m.emissive.clone()
          u.baseEmissiveIntensity = m.emissiveIntensity
        }
      }
      m.opacity = u.baseOpacity * (1 - 0.95 * dim)
      // clearcoat/sheen highlights ignore opacity, so fade them with the ghosting
      if (m.isMeshPhysicalMaterial) {
        if (u.baseClearcoat === undefined) {
          u.baseClearcoat = m.clearcoat
          u.baseSheen = m.sheen
        }
        m.clearcoat = u.baseClearcoat * (1 - dim)
        m.sheen = u.baseSheen * (1 - dim)
      }
      const wantTransparent = u.baseTransparent || dim > 0.002
      if (m.transparent !== wantTransparent) {
        m.transparent = wantTransparent
        m.needsUpdate = true
      }
      m.depthWrite = dim > 0.35 ? false : u.baseDepthWrite
      if (m.emissive && !u.animatedEmissive) {
        m.emissive.copy(u.baseEmissive).lerp(HILITE, glow)
        m.emissiveIntensity = u.baseEmissiveIntensity
      }
    }
    if (o.isMesh && o.userData.castsShadow === undefined) o.userData.castsShadow = o.castShadow
    if (o.isMesh) o.castShadow = o.userData.castsShadow && dim < 0.5
  })
}

export function Part({ id, name, children, position, static: isStatic }) {
  const outer = useRef()
  const inner = useRef()
  const look = useRef({ dim: 0, glow: 0, dirty: true })
  const highlighted = useStore((s) => {
    const f = getFocusParts(s)
    return !!(f && f.includes(id) && s.selected && !NO_OUTLINE.has(s.selected))
  })

  useFrame((_, dt) => {
    const s = useStore.getState()
    if (!isStatic) {
      partOffset(id, s.explode, tmp)
      outer.current.position.set(tmp[0], tmp[1], tmp[2])
    }

    const focus = getFocusParts(s)
    const inFocus = !focus || focus.includes(id)
    const targetDim = inFocus ? 0 : 1
    const targetGlow = focus && inFocus && (s.selected || s.system) ? 1 : 0
    const L = look.current
    const k = 1 - Math.exp(-dt * (s.reducedMotion ? 30 : 7))
    const nd = L.dim + (targetDim - L.dim) * k
    const ng = L.glow + (targetGlow - L.glow) * k
    if (L.dirty || Math.abs(nd - L.dim) > 0.0005 || Math.abs(ng - L.glow) > 0.0005 || inner.current.userData.relook) {
      L.dim = Math.abs(nd - targetDim) < 0.001 ? targetDim : nd
      L.glow = Math.abs(ng - targetGlow) < 0.001 ? targetGlow : ng
      applyLook(inner.current, L.dim, L.glow)
      L.dirty = false
      inner.current.userData.relook = false
    }
  })

  return (
    <group ref={outer} name={name}>
      <group ref={inner} position={position} userData={{ partId: id }}>
        <Select enabled={highlighted}>{children}</Select>
      </group>
    </group>
  )
}
