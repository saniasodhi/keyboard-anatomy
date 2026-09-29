import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export { mergeGeometries }

// Rounded rectangle as a THREE.Shape, centered on (cx, cy)
export function roundedRectShape(w, h, r, cx = 0, cy = 0, target) {
  const s = target || new THREE.Shape()
  const x = cx - w / 2
  const y = cy - h / 2
  r = Math.min(r, w / 2, h / 2)
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

export function roundedRectPath(w, h, r, cx = 0, cy = 0) {
  return roundedRectShape(w, h, r, cx, cy, new THREE.Path())
}

// Extrude a shape "upwards" (+Y) with shape (x, y) mapped to world (x, -z)
export function extrudeUp(shape, depth, opts = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: !!opts.bevel,
    bevelSize: opts.bevel || 0,
    bevelThickness: opts.bevel || 0,
    bevelSegments: opts.bevelSegments || 3,
    curveSegments: opts.curveSegments || 8,
  })
  g.rotateX(-Math.PI / 2)
  if (opts.bevel) g.translate(0, opts.bevel, 0)
  return g
}

// Rounded rectangle outline points (constant count) in XZ
function ringPoints(w, d, r, seg = 5) {
  const pts = []
  r = Math.min(r, w / 2 - 0.001, d / 2 - 0.001)
  const corners = [
    [w / 2 - r, d / 2 - r, 0],
    [-w / 2 + r, d / 2 - r, Math.PI / 2],
    [-w / 2 + r, -d / 2 + r, Math.PI],
    [w / 2 - r, -d / 2 + r, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  return pts
}

// Sculpted, dished keycap built from lofted rounded-rect rings
const capCache = new Map()
export function keycapGeometry(wU, h, tilt) {
  const key = `${wU}|${h}|${tilt}`
  if (capCache.has(key)) return capCache.get(key)

  const bw = wU - 0.05
  const bd = 0.95
  const tw = wU - 0.3
  const td = 0.74
  const tanT = Math.tan(tilt)
  const dish = wU >= 6 ? -0.006 : wU >= 2 ? 0.018 : 0.026
  const topOffsetZ = -0.03 // tops lean slightly to the back like cylindrical profiles

  const rings = [
    { y: 0, w: bw, d: bd, r: 0.075, t: 0, zo: 0 },
    { y: 0.03, w: bw, d: bd, r: 0.078, t: 0, zo: 0 },
    { y: h * 0.5, w: bw - 0.1, d: bd - 0.08, r: 0.09, t: 0.5, zo: topOffsetZ * 0.5 },
    { y: h - 0.05, w: tw + 0.035, d: td + 0.035, r: 0.11, t: 1, zo: topOffsetZ },
    { y: h - 0.012, w: tw + 0.008, d: td + 0.008, r: 0.105, t: 1, zo: topOffsetZ },
    { y: h, w: tw - 0.03, d: td - 0.03, r: 0.09, t: 1, zo: topOffsetZ },
  ]
  const seg = 5
  const perRing = ringPoints(1, 1, 0.1, seg).length
  const positions = []
  const indices = []

  const dishAt = (x, halfW) => {
    const n = Math.min(1, Math.abs(x) / halfW)
    return dish * (1 - n * n)
  }

  rings.forEach((rg) => {
    const pts = ringPoints(rg.w, rg.d, rg.r, seg)
    for (const [x, z] of pts) {
      const zz = z + rg.zo
      let y = rg.y + zz * tanT * rg.t
      positions.push(x, y, zz)
    }
  })
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < perRing; i++) {
      const a = r * perRing + i
      const b = r * perRing + ((i + 1) % perRing)
      const c = (r + 1) * perRing + i
      const d = (r + 1) * perRing + ((i + 1) % perRing)
      indices.push(a, c, b, b, c, d)
    }
  }
  // dished top: concentric rings shrinking to the centre
  const top = rings[rings.length - 1]
  const topPts = ringPoints(top.w, top.d, top.r, seg)
  const steps = 6
  let prevStart = (rings.length - 1) * perRing
  const halfW = top.w / 2
  for (let s = 1; s <= steps; s++) {
    const k = 1 - s / (steps + 0.0001)
    const start = positions.length / 3
    if (s === steps) {
      const zz = top.zo
      positions.push(0, top.y + zz * tanT - dish, zz)
      for (let i = 0; i < perRing; i++) {
        indices.push(prevStart + i, start, prevStart + ((i + 1) % perRing))
      }
    } else {
      for (const [x, z] of topPts) {
        const px = x * k
        const pz = z * k + top.zo
        positions.push(px, top.y + pz * tanT - dishAt(px, halfW) * (1 - Math.pow(k, 6)), pz)
      }
      for (let i = 0; i < perRing; i++) {
        const a = prevStart + i
        const b = prevStart + ((i + 1) % perRing)
        const c = start + i
        const d = start + ((i + 1) % perRing)
        indices.push(a, c, b, b, c, d)
      }
      prevStart = start
    }
  }
  // flat underside
  const bottomStart = positions.length / 3
  const bottomPts = ringPoints(bw, bd, 0.075, seg)
  positions.push(0, 0, 0)
  for (const [x, z] of bottomPts) positions.push(x, 0, z)
  for (let i = 0; i < perRing; i++) {
    indices.push(bottomStart, bottomStart + 1 + i, bottomStart + 1 + ((i + 1) % perRing))
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  // fix bottom normals to point straight down
  const n = g.attributes.normal
  for (let i = bottomStart; i < positions.length / 3; i++) n.setXYZ(i, 0, -1, 0)
  g.userData.topY = (z) => h + (z + topOffsetZ) * tanT
  g.userData.dish = dish
  capCache.set(key, g)
  return g
}

// Square frustum (switch top housing): a 4-sided cylinder rotated 45°
export function frustum(bottomW, topW, h, y0 = 0) {
  const g = new THREE.CylinderGeometry(topW / Math.SQRT2, bottomW / Math.SQRT2, h, 4, 1)
  g.rotateY(Math.PI / 4)
  g.translate(0, y0 + h / 2, 0)
  return g.toNonIndexed()
}

export function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

export function cyl(r, h, x = 0, y = 0, z = 0, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, h, seg)
  g.translate(x, y, z)
  return g
}

// Rounded box via extruded rounded rect with bevel
export function roundedBox(w, h, d, r = 0.05, bevel = 0.02) {
  const s = roundedRectShape(w - bevel * 2, d - bevel * 2, Math.max(0.001, r - bevel))
  const g = extrudeUp(s, Math.max(0.001, h - bevel * 2), { bevel, bevelSegments: 3, curveSegments: 6 })
  g.translate(0, -h / 2, 0)
  return g
}

// Helical spring as a tube
export function springGeometry(radius, height, turns, wire = 0.012) {
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * turns
      return target.set(Math.cos(a) * radius, t * height, Math.sin(a) * radius)
    }
  }
  return new THREE.TubeGeometry(new Helix(), Math.round(turns * 24), wire, 6, false)
}
