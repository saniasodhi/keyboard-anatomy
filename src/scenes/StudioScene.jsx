import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { TypeTestScene } from './TypeTestScene'

const STUDIO_BG = new THREE.Color('#E9ECED')
const DESK_BG = new THREE.Color('#E6E0D7')
const FLOOR_Y = -7.6
const FLOOR_Y_NEAR = -3.1

// A large floor with a fine engineering grid that dissolves into the backdrop
function GridFloor() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color('#9AA3A8') },
          uOpacity: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec3 vPos;
          float grid(vec2 p, float size, float width) {
            vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
            float l = min(g.x, g.y);
            return 1.0 - min(l / width, 1.0);
          }
          void main() {
            float d = length(vPos.xz) ;
            float fade = smoothstep(38.0, 4.0, d);
            float minor = grid(vPos.xz, 1.0, 1.0) * 0.1;
            float major = grid(vPos.xz, 5.0, 1.2) * 0.26;
            float a = max(minor, major) * fade * uOpacity;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        extensions: { derivatives: true },
      }),
    []
  )
  useFrame(() => {
    const type = useStore.getState().mode === 'type'
    mat.uniforms.uOpacity.value += ((type ? 0 : 1) - mat.uniforms.uOpacity.value) * 0.05
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={-1}>
      <planeGeometry args={[120, 120]} />
    </mesh>
  )
}

// Soft product shadow: a pre-blurred footprint that spreads and fades as the keyboard lifts or comes apart
function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.filter = 'blur(26px)'
  ctx.fillStyle = 'rgba(40,52,62,1)'
  const w = 330
  const h = 128
  const r = 30
  const x = (512 - w) / 2
  const y = (256 - h) / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const SoftShadow = forwardRef(function SoftShadow(_, ref) {
  const mesh = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }), [])
  useFrame(() => {
    const s = useStore.getState()
    const e = Math.min(1, s.explode * 1.4)
    mat.opacity = 0.55 * (1 - e * 0.55)
    const sc = 1 + e * 0.35
    mesh.current.scale.set(26 * sc, 13 * sc, 1)
  })
  useImperativeHandle(ref, () => mesh.current)
  return <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.3]} material={mat} renderOrder={-1}><planeGeometry /></mesh>
})

// Screen-space backdrop: a soft pool of light behind the product that dims toward the edges
function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uCenter: { value: new THREE.Color('#F5F7F7') },
          uEdge: { value: new THREE.Color('#D9DEE0') },
          uAspect: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.9999, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uCenter;
          uniform vec3 uEdge;
          uniform float uAspect;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - vec2(0.5, 0.56);
            p.x *= uAspect;
            float d = length(p) / 0.95;
            float t = smoothstep(0.0, 1.0, d);
            vec3 c = mix(uCenter, uEdge, t);
            // tiny dither against banding
            float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            c += (n - 0.5) / 255.0;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    []
  )
  const studio = useMemo(() => [new THREE.Color('#F5F7F7'), new THREE.Color('#D9DEE0')], [])
  const desk = useMemo(() => [new THREE.Color('#F2EDE6'), new THREE.Color('#DCD4C9')], [])
  useFrame((state, dt) => {
    const type = useStore.getState().mode === 'type'
    const k = 1 - Math.exp(-dt * 1.8)
    const [c, e] = type ? desk : studio
    mat.uniforms.uCenter.value.lerp(c, k)
    mat.uniforms.uEdge.value.lerp(e, k)
    mat.uniforms.uAspect.value = state.size.width / state.size.height
  })
  return (
    <mesh material={mat} renderOrder={-100} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export function StudioScene({ lowPower }) {
  const key = useRef()
  const fill = useRef()
  const rim = useRef()
  const scene = useThree((s) => s.scene)
  const bg = useMemo(() => new THREE.Color().copy(STUDIO_BG), [])
  const warm = useMemo(() => new THREE.Color('#FFEEDC'), [])
  const cool = useMemo(() => new THREE.Color('#FFFFFF'), [])
  const shadowsRef = useRef()
  const floor = useRef()

  useFrame((_, dt) => {
    const type = useStore.getState().mode === 'type'
    const k = 1 - Math.exp(-dt * 1.8)
    bg.lerp(type ? DESK_BG : STUDIO_BG, k)
    scene.background = bg

    // lights come up as the reveal begins
    const st = useStore.getState()
    const it = import.meta.env.DEV && window.__introT !== undefined ? window.__introT : st.phase === 'ready' ? performance.now() / 1000 - st.introAt : 0
    const up = st.reducedMotion || type ? 1 : THREE.MathUtils.smoothstep(it, 0.1, 2.2)
    if (key.current) {
      key.current.color.lerp(type ? warm : cool, k)
      key.current.intensity = (type ? 1.9 : 1.9) * (0.25 + 0.75 * up)
    }
    if (rim.current) rim.current.intensity = 1.5 * (0.4 + 0.6 * up)
    scene.environmentIntensity = 0.3 * (0.45 + 0.55 * up)
    if (shadowsRef.current) shadowsRef.current.visible = !type
    // the floor sinks away as the keyboard comes apart so the stack always has room
    const e = useStore.getState().explode
    const fy = FLOOR_Y_NEAR + (FLOOR_Y - FLOOR_Y_NEAR) * Math.min(1, e * 1.6)
    if (floor.current) floor.current.position.y += (fy - floor.current.position.y) * (1 - Math.exp(-dt * 6))
  })

  return (
    <>
      <Backdrop />
      <ambientLight intensity={0.12} />
      <directionalLight
        ref={key}
        position={[-13, 13, 4]}
        intensity={1.75}
        castShadow
        shadow-mapSize={[lowPower ? 1024 : 2048, lowPower ? 1024 : 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <directionalLight ref={fill} position={[12, 6, 10]} intensity={0.3} color="#EAF3F7" />
      <directionalLight ref={rim} position={[9, 7, -13]} intensity={1.5} color="#E4EEF6" />
      <directionalLight position={[3, -12, 6]} intensity={0.9} color="#F2F6F8" />
      <Environment resolution={256} frames={1} environmentIntensity={0.34}>
        <color attach="background" args={['#C9CED2']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 12, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[26, 10, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-14, 4, 6]} rotation={[0, Math.PI / 2, 0]} scale={[18, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[14, 3, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[18, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 3, -14]} rotation={[0, 0, 0]} scale={[24, 3, 1]} color="#F4F8FA" />
        <Lightformer form="ring" intensity={1.2} position={[6, 7, 12]} scale={4} color="#EAF6FA" />
        <Lightformer form="rect" intensity={0.6} position={[0, -10, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} color="#E9ECED" />
      </Environment>
      <group ref={floor} position={[0, FLOOR_Y_NEAR, 0]}>
        <GridFloor />
        <SoftShadow ref={shadowsRef} />
      </group>
      <TypeTestScene />
    </>
  )
}
