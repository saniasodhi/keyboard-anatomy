// Every part travels along one logical axis from its assembled position.
// offset → displacement at 100% explode, range → slice of the slider in which it moves.
export const EXPLOSION = {
  topCase: { offset: [0, 6.4, 0], range: [0.0, 0.55] },
  keycaps: { offset: [0, 4.05, 0], range: [0.02, 0.62] },
  switches: { offset: [0, 2.5, 0], range: [0.08, 0.7] },
  stabilizers: { offset: [0, 1.72, 0], range: [0.1, 0.72] },
  plate: { offset: [0, 1.05, 0], range: [0.14, 0.76] },
  gaskets: { offset: [0, 1.05, 0], range: [0.14, 0.8], spread: 0.95 },
  plateFoam: { offset: [0, 0.36, 0], range: [0.18, 0.8] },
  pcb: { offset: [0, -0.72, 0], range: [0.2, 0.85] },
  keyMatrix: { offset: [0, -0.72, 0], range: [0.2, 0.85] },
  leds: { offset: [0, -0.72, 0], range: [0.2, 0.85] },
  sockets: { offset: [0, -1.16, 0], range: [0.22, 0.88] },
  controller: { offset: [0, -1.28, 0], range: [0.22, 0.88] },
  power: { offset: [0, -1.28, 0], range: [0.22, 0.88] },
  wireless: { offset: [0, -1.28, 0], range: [0.22, 0.88] },
  caseFoam: { offset: [0, -2.25, 0], range: [0.26, 0.9] },
  usb: { offset: [0, -2.65, -0.6], range: [0.28, 0.93] },
  antenna: { offset: [0.4, -2.65, -0.4], range: [0.28, 0.93] },
  battery: { offset: [0, -3.15, 0], range: [0.3, 0.95] },
  bottomCase: { offset: [0, -4.3, 0], range: [0.32, 1] },
  feet: { offset: [0, -5.1, 0], range: [0.36, 1] },
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

export function partProgress(id, explode) {
  const cfg = EXPLOSION[id]
  if (!cfg) return 0
  const [a, b] = cfg.range
  return smooth((explode - a) / (b - a))
}

// Writes the part's current displacement into `out` (array or Vector3-like)
export function partOffset(id, explode, out = [0, 0, 0]) {
  const cfg = EXPLOSION[id]
  const p = partProgress(id, explode)
  const o = cfg ? cfg.offset : [0, 0, 0]
  if (Array.isArray(out)) {
    out[0] = o[0] * p
    out[1] = o[1] * p
    out[2] = o[2] * p
  } else {
    out.set(o[0] * p, o[1] * p, o[2] * p)
  }
  return out
}
