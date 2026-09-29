import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import fontUrl from '@fontsource/inter/files/inter-latin-500-normal.woff?url'
import { KEYS, ROW_PROFILE, Y, HERO_KEY } from '../../data/layout'
import { SIGNAL_STEPS } from '../../data/signalSteps'
import { keycapGeometry } from '../../utils/geometry'
import { KEYCAP_THEMES } from '../../utils/materials'
import { useStore } from '../../store/useStore'
import { playKey } from '../../utils/sound'

export const TRAVEL = 0.2 // ≈ 4 mm

const ARROWS = { '↑': 0, '←': Math.PI / 2, '↓': Math.PI, '→': -Math.PI / 2 }
const arrowGeo = (() => {
  const s = new THREE.Shape()
  s.moveTo(0, 0.075)
  s.lineTo(0.06, -0.035)
  s.lineTo(-0.06, -0.035)
  s.closePath()
  return new THREE.ShapeGeometry(s)
})()

const glyph = (k) => {
  if (k.style === 'c') return k.label
  return k.label
}

// Which keys are "hero" (kept solid while everything else ghosts) and what they do
export function heroState(s) {
  const t = performance.now() / 1000 - s.animStart
  let anim = null
  if (s.mode === 'explore' && s.selected) {
    anim = { keycaps: 'keycap-press', switches: 'switch-actuation', stabilizers: 'stabilizer-press', sockets: 'hotswap' }[s.selected] || null
  } else if (s.mode === 'how') {
    const id = SIGNAL_STEPS[s.step].id
    anim = { press: 'keycap-press', actuate: 'switch-actuation', display: 'display-press' }[id] || null
  }
  return { anim, t }
}

// Reveal choreography: caps hang above the board, then land in a diagonal wave,
// each one bottoming out briefly as it seats on its switch.
const LIFT = 1.6
const introDelay = (key) => 0.45 + (key.x + 8) * 0.042 + key.row * 0.05
export function introOffset(key, it) {
  const p = (it - introDelay(key)) / 0.55
  if (p < 0) return [LIFT, 1]
  if (p < 1) {
    const e = 1 - Math.pow(1 - p, 3)
    return [LIFT * (1 - e), 1 - e]
  }
  if (p < 1.7) return [-TRAVEL * 0.7 * Math.sin((Math.PI * (p - 1)) / 0.7), 0]
  return [0, 0]
}

// Press depth (0..1) for a cyclic demo press
export function cyclePress(t, period = 1.6) {
  const p = (t % period) / period
  if (p < 0.12) return THREE.MathUtils.smoothstep(p, 0, 0.12)
  if (p < 0.42) return 1
  if (p < 0.6) return 1 - THREE.MathUtils.smoothstep(p, 0.42, 0.6)
  return 0
}

export function Keycaps() {
  const theme = useStore((s) => s.custom.keycaps)
  const groups = useRef([])
  const meshes = useRef([])
  const state = useRef(KEYS.map(() => ({ y: 0, lift: 0, intro: LIFT, landed: false })))
  const introSeen = useRef(0)
  const heroSig = useRef('')

  const mats = useMemo(() => {
    const mk = () =>
      new THREE.MeshPhysicalMaterial({ roughness: 0.58, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6, sheen: 0.25, sheenRoughness: 0.8 })
    const m = { alpha: mk(), mod: mk(), accent: mk() }
    m.heroAlpha = m.alpha.clone()
    m.heroMod = m.mod.clone()
    m.heroAccent = m.accent.clone()
    // see-through caps so the stabilizer underneath stays visible
    m.glass = m.mod.clone()
    m.glass.transparent = true
    m.glass.opacity = 0.32
    m.glass.depthWrite = false
    for (const k of ['heroAlpha', 'heroMod', 'heroAccent', 'glass']) m[k].userData.keepVisible = true
    return m
  }, [])

  useEffect(() => {
    const t = KEYCAP_THEMES[theme]
    mats.alpha.color.set(t.alpha)
    mats.heroAlpha.color.set(t.alpha)
    mats.mod.color.set(t.mod)
    mats.heroMod.color.set(t.mod)
    mats.glass.color.set(t.mod)
    mats.accent.color.set(t.accent)
    mats.heroAccent.color.set(t.accent)
  }, [theme, mats])

  const legendColor = KEYCAP_THEMES[theme].legend

  const kinds = useMemo(
    () => KEYS.map((k) => (k.style === 'a' ? 'accent' : k.style === 'w' || k.w > 1.01 ? 'mod' : 'alpha')),
    []
  )

  useFrame((_, dt) => {
    const s = useStore.getState()
    const { anim, t } = heroState(s)
    const reduced = s.reducedMotion
    const k = 1 - Math.exp(-dt * 28)
    const kl = 1 - Math.exp(-dt * 4)

    // decide hero keys
    let heroes = []
    if (anim === 'keycap-press' || anim === 'switch-actuation' || anim === 'display-press') heroes = [HERO_KEY.index]
    if (anim === 'stabilizer-press') heroes = KEYS.filter((x) => x.stab).map((x) => x.index)
    const glass = anim === 'stabilizer-press'
    const sig = heroes.join(',') + glass
    if (sig !== heroSig.current) {
      heroSig.current = sig
      KEYS.forEach((key, i) => {
        const kind = kinds[i]
        const hero = heroes.includes(i)
        const name = hero ? (glass ? 'glass' : 'hero' + kind[0].toUpperCase() + kind.slice(1)) : kind
        if (meshes.current[i]) meshes.current[i].material = mats[name]
      })
    }

    const now = performance.now() / 1000
    const it = import.meta.env.DEV && window.__introT !== undefined ? window.__introT : s.phase === 'ready' ? now - s.introAt : -1
    if (s.introAt !== introSeen.current) {
      introSeen.current = s.introAt
      state.current.forEach((st) => (st.landed = false))
    }
    const ki = 1 - Math.exp(-dt * 18)

    KEYS.forEach((key, i) => {
      const st = state.current[i]
      let [iy, tilt] = reduced || it > 5 ? [0, 0] : introOffset(key, it)
      if (!reduced && it >= 0 && iy <= 0 && !st.landed && it < 5) {
        st.landed = true
        if (s.soundOn && i % 2 === 0) playKey({ down: true, type: s.custom.switch, gain: 0.16 })
      }
      st.intro += (iy - st.intro) * ki
      let press = 0
      let lift = 0
      if (s.mode === 'type' && s.pressed[key.code]) press = 1
      if (heroes.includes(i)) {
        if (anim === 'keycap-press' || anim === 'display-press') press = reduced ? 0.6 : cyclePress(t, anim === 'display-press' ? 2.2 : 1.6)
        if (anim === 'switch-actuation') lift = 1
        if (anim === 'stabilizer-press' && key.code === 'Space') press = reduced ? 0.6 : cyclePress(t + 0.3, 1.8)
      }
      if (anim === 'hotswap' && i === HERO_KEY.index) lift = 1
      st.y += (press - st.y) * k
      st.lift += (lift - st.lift) * kl
      const g = groups.current[i]
      if (g) {
        const wob = (((i * 37) % 7) - 3) / 3
        g.position.y = Y.keycapBottom - st.y * TRAVEL + st.lift * 1.25 + st.intro
        g.rotation.x = st.lift * -0.35 + tilt * 0.12 * wob
        g.rotation.z = st.lift * 0.12 + tilt * 0.08 * -wob
      }
    })
  })

  return (
    <group name="Keycaps_All">
      {KEYS.map((key, i) => {
        const prof = ROW_PROFILE[key.row]
        const geo = keycapGeometry(key.w, prof.h, prof.tilt)
        const tanT = Math.tan(prof.tilt)
        const word = key.style !== 'c'
        const lx = word ? -key.w / 2 + 0.2 : 0
        const lz = word ? 0.17 : -0.03
        const ly = prof.h + (lz - 0.03) * tanT - geo.userData.dish * (word ? 0.25 : 0.98) + 0.006
        const size = word ? 0.095 : /^F\d/.test(key.label) ? 0.12 : key.label.length === 1 && /[A-Z0-9]/.test(key.label) ? 0.19 : 0.2
        const name = key.code === 'Space' ? 'Keycap_Space' : key.code === 'Enter' ? 'Keycap_Enter' : key.code === 'Escape' ? 'Keycap_Esc' : `Keycap_${key.code}`
        return (
          <group key={i} ref={(el) => { groups.current[i] = el }} position={[key.x, Y.keycapBottom, key.z]} name={name}>
            <mesh ref={(el) => { meshes.current[i] = el }} geometry={geo} material={mats[kinds[i]]} castShadow receiveShadow />
            {ARROWS[key.label] !== undefined ? (
              <mesh position={[0, ly, lz]} rotation={[-Math.PI / 2 - prof.tilt, 0, ARROWS[key.label]]} geometry={arrowGeo}>
                <meshBasicMaterial color={legendColor} toneMapped={false} transparent side={THREE.DoubleSide} />
              </mesh>
            ) : key.label && (
              <Text
                font={fontUrl}
                position={[lx, ly, lz]}
                rotation={[-Math.PI / 2 - prof.tilt, 0, 0]}
                fontSize={size}
                anchorX={word ? 'left' : 'center'}
                anchorY="middle"
                letterSpacing={word ? 0.02 : 0}
              >
                {glyph(key)}
                <meshBasicMaterial color={key.style === 'a' ? KEYCAP_THEMES[theme].accentLegend : legendColor} toneMapped={false} transparent />
              </Text>
            )}
            {key.homing && (
              <mesh position={[0, prof.h + 0.19 * tanT - geo.userData.dish * 0.5 + 0.004, 0.2]} rotation={[0, 0, Math.PI / 2]} material={mats[kinds[i]]}>
                <capsuleGeometry args={[0.012, 0.16, 4, 8]} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
