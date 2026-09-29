// GLB/GLTF bridge.
// The procedural model names its objects exactly as a production GLB should (see README),
// so a real model can be dropped in and driven by the same interaction engine.

// Object name in the model → part id used by the explode / focus system
export const NAME_TO_PART = {
  TopCase: 'topCase',
  BottomCase: 'bottomCase',
  Keycaps_All: 'keycaps',
  Switches_All: 'switches',
  Stabilizers: 'stabilizers',
  Plate: 'plate',
  GasketMounts: 'gaskets',
  Foam: 'plateFoam',
  CaseFoam: 'caseFoam',
  PCB: 'pcb',
  KeyMatrix: 'keyMatrix',
  LEDs: 'leds',
  HotSwapSockets: 'sockets',
  Controller: 'controller',
  PowerSystem: 'power',
  WirelessModule: 'wireless',
  USB_Daughterboard: 'usb',
  InternalWiring: 'wiring',
  Battery: 'battery',
  Antenna: 'antenna',
  Feet: 'feet',
}

// Walks a loaded GLB scene and returns { partId: Object3D[] }
export function collectParts(root) {
  const parts = {}
  root.traverse((o) => {
    const id = NAME_TO_PART[o.name]
    if (id) (parts[id] ||= []).push(o)
  })
  return parts
}

export function findByName(root, name) {
  return root.getObjectByName(name) || null
}
