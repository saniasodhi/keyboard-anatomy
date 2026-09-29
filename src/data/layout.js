// Physical layout of the fictional "Anatomy 75" keyboard.
// Units: 1 world unit = 1u = 19.05 mm (the standard key pitch).

// [label, width(u), code(s), legendStyle]
// legendStyle: 'c' centered glyph, 'w' small word bottom-left, 'a' accent key
const ROWS = [
  [
    ['esc', 1, 'Escape', 'a'],
    ['F1', 1, 'F1'], ['F2', 1, 'F2'], ['F3', 1, 'F3'], ['F4', 1, 'F4'],
    ['F5', 1, 'F5'], ['F6', 1, 'F6'], ['F7', 1, 'F7'], ['F8', 1, 'F8'],
    ['F9', 1, 'F9'], ['F10', 1, 'F10'], ['F11', 1, 'F11'], ['F12', 1, 'F12'],
    ['prt', 1, 'PrintScreen', 'w'], ['ins', 1, 'Insert', 'w'], ['del', 1, 'Delete', 'w'],
  ],
  [
    ['`', 1, 'Backquote'], ['1', 1, 'Digit1'], ['2', 1, 'Digit2'], ['3', 1, 'Digit3'],
    ['4', 1, 'Digit4'], ['5', 1, 'Digit5'], ['6', 1, 'Digit6'], ['7', 1, 'Digit7'],
    ['8', 1, 'Digit8'], ['9', 1, 'Digit9'], ['0', 1, 'Digit0'], ['-', 1, 'Minus'],
    ['=', 1, 'Equal'], ['backspace', 2, 'Backspace', 'w'], ['home', 1, 'Home', 'w'],
  ],
  [
    ['tab', 1.5, 'Tab', 'w'], ['Q', 1, 'KeyQ'], ['W', 1, 'KeyW'], ['E', 1, 'KeyE'],
    ['R', 1, 'KeyR'], ['T', 1, 'KeyT'], ['Y', 1, 'KeyY'], ['U', 1, 'KeyU'],
    ['I', 1, 'KeyI'], ['O', 1, 'KeyO'], ['P', 1, 'KeyP'], ['[', 1, 'BracketLeft'],
    [']', 1, 'BracketRight'], ['\\', 1.5, 'Backslash'], ['pg up', 1, 'PageUp', 'w'],
  ],
  [
    ['caps', 1.75, 'CapsLock', 'w'], ['A', 1, 'KeyA'], ['S', 1, 'KeyS'], ['D', 1, 'KeyD'],
    ['F', 1, 'KeyF'], ['G', 1, 'KeyG'], ['H', 1, 'KeyH'], ['J', 1, 'KeyJ'],
    ['K', 1, 'KeyK'], ['L', 1, 'KeyL'], [';', 1, 'Semicolon'], ["'", 1, 'Quote'],
    ['return', 2.25, 'Enter', 'a'], ['pg dn', 1, 'PageDown', 'w'],
  ],
  [
    ['shift', 2.25, 'ShiftLeft', 'w'], ['Z', 1, 'KeyZ'], ['X', 1, 'KeyX'], ['C', 1, 'KeyC'],
    ['V', 1, 'KeyV'], ['B', 1, 'KeyB'], ['N', 1, 'KeyN'], ['M', 1, 'KeyM'],
    [',', 1, 'Comma'], ['.', 1, 'Period'], ['/', 1, 'Slash'], ['shift', 1.75, 'ShiftRight', 'w'],
    ['↑', 1, 'ArrowUp'], ['end', 1, 'End', 'w'],
  ],
  [
    ['ctrl', 1.25, 'ControlLeft', 'w'], ['opt', 1.25, 'MetaLeft', 'w'], ['alt', 1.25, 'AltLeft', 'w'],
    ['', 6.25, 'Space'], ['alt', 1, 'AltRight', 'w'], ['fn', 1, 'ContextMenu', 'w'],
    ['ctrl', 1, 'ControlRight', 'w'], ['←', 1, 'ArrowLeft'], ['↓', 1, 'ArrowDown'], ['→', 1, 'ArrowRight'],
  ],
]

export const PITCH = 1
export const KEY_AREA_W = 16
export const ROW_GAP_AFTER_F = 0.25
export const KEY_AREA_D = 6 + ROW_GAP_AFTER_F

// Case outline
export const CASE_MARGIN_X = 0.62
export const CASE_MARGIN_FRONT = 0.62
export const CASE_MARGIN_BACK = 0.78
export const CASE_W = KEY_AREA_W + CASE_MARGIN_X * 2
export const CASE_D = KEY_AREA_D + CASE_MARGIN_FRONT + CASE_MARGIN_BACK
export const CASE_CENTER_Z = (CASE_MARGIN_FRONT - CASE_MARGIN_BACK) / 2 // shift towards back
export const CASE_RADIUS = 0.42

// Vertical stack (plate top = 0)
export const Y = {
  plateTop: 0,
  plateBottom: -0.08,
  switchTop: 0.3,
  keycapBottom: 0.34,
  pcbTop: -0.27,
  pcbBottom: -0.355,
  foamTop: -0.095,
  foamBottom: -0.255,
  caseFoamTop: -0.5,
  caseFoamBottom: -0.64,
  floor: -0.93,
  bottomCaseBottom: -1.05,
  seam: -0.14,
  topCaseTop: 0.44,
}

export const ROW_PROFILE = [
  // height, tilt(rad) per row — a gently sculpted profile
  { h: 0.47, tilt: -0.1 },
  { h: 0.47, tilt: -0.07 },
  { h: 0.44, tilt: -0.02 },
  { h: 0.43, tilt: 0.0 },
  { h: 0.44, tilt: 0.05 },
  { h: 0.44, tilt: 0.06 },
]

export const KEYS = (() => {
  const keys = []
  let idx = 0
  ROWS.forEach((row, r) => {
    let x = -KEY_AREA_W / 2
    const zTop = -KEY_AREA_D / 2 + r + (r > 0 ? ROW_GAP_AFTER_F : 0)
    row.forEach(([label, w, code, style]) => {
      keys.push({
        index: idx++,
        row: r,
        label,
        w,
        code,
        style: style || (label.length > 1 && !/^F\d+$/.test(label) ? 'w' : 'c'),
        x: x + w / 2,
        z: zTop + 0.5,
        col: Math.min(15, Math.round(x + w / 2 + KEY_AREA_W / 2 - 0.5)),
        stab: w >= 2,
        homing: label === 'F' || label === 'J',
      })
      x += w
    })
  })
  return keys
})()

export const KEY_BY_CODE = Object.fromEntries(KEYS.map((k) => [k.code, k]))
export const HERO_KEY = KEYS.find((k) => k.label === 'J')
export const SPACE_KEY = KEYS.find((k) => k.code === 'Space')

// Positions of important internal hardware
export const HW = {
  controller: [0.9, Y.pcbBottom - 0.03, -1.9],
  wireless: [5.4, Y.pcbBottom - 0.05, -2.35],
  power: [-2.6, Y.pcbBottom - 0.03, -2.2],
  daughter: [-4.6, -0.52, CASE_CENTER_Z - CASE_D / 2 + 0.72],
  usbPort: [-4.6, -0.4, CASE_CENTER_Z - CASE_D / 2 + 0.2],
  battery: [0.4, -0.83, 0.9],
  antenna: [6.9, -0.46, CASE_CENTER_Z - CASE_D / 2 + 0.55],
  statusLed: [7.45, Y.topCaseTop, -3.55],
}
