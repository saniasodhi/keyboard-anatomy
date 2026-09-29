import * as THREE from 'three'

export const KEYCAP_THEMES = {
  alloy: { alpha: '#F3F2EF', mod: '#DCDAD5', accent: '#A9C6CE', legend: '#6C7277', accentLegend: '#3E5A62', label: 'Alloy' },
  graphite: { alpha: '#3A3E42', mod: '#2A2D30', accent: '#8FB9C4', legend: '#C9CDD0', accentLegend: '#233A41', label: 'Graphite' },
  mist: { alpha: '#E6ECEE', mod: '#C9D5D9', accent: '#6FA9B8', legend: '#5D6B71', accentLegend: '#F4FAFB', label: 'Mist' },
}

export const PLATE_MATERIALS = {
  aluminum: { color: '#BCC1C5', metalness: 0.75, roughness: 0.34, label: 'Aluminum' },
  brass: { color: '#C8A55E', metalness: 1, roughness: 0.28, label: 'Brass' },
  polycarbonate: { color: '#E9EEF0', metalness: 0, roughness: 0.22, label: 'Polycarbonate' },
}

export const SWITCH_TYPES = {
  linear: { stem: '#3E9FB8', label: 'Linear', note: 'Smooth, no bump' },
  tactile: { stem: '#C99A69', label: 'Tactile', note: 'A bump you can feel' },
  clicky: { stem: '#6479D8', label: 'Clicky', note: 'Bump plus a click' },
}

// Radial glow sprite
let glowTex
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}
