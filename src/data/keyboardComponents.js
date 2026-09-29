// Educational content + 3D wiring for every selectable component.
// `parts`  → 3D part ids that light up when this component is selected
// `explode`→ explode amount the scene animates to when selected
// `view`   → camera {pos, target} in world space for that explode amount

export const CATEGORIES = [
  { id: 'hardware', label: 'Case & hardware' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'power', label: 'Power & connectivity' },
  { id: 'acoustics', label: 'Acoustics' },
]

export const COMPONENTS = [
  {
    id: 'keycaps',
    name: 'Keycaps',
    category: 'hardware',
    tagline: 'The part your fingers actually touch',
    shortDescription:
      'Keycaps are the sculpted covers that sit on top of each switch. Their shape, height and texture decide how the keyboard feels under your fingertips.',
    whatItDoes: 'Gives each key a surface to press and a legend to read, and passes your press straight down to the switch stem.',
    howItWorks:
      'Each cap has a cross-shaped socket underneath that grips the switch stem. Rows are sculpted at slightly different heights and angles so your fingers reach every row comfortably.',
    flow: ['Finger', 'Keycap', 'Switch stem'],
    connectedSystems: ['Switches', 'Stabilizers'],
    parts: ['keycaps'],
    animation: 'keycap-press',
    explode: 0,
    view: { part: 'keycaps', p: [0.25, 0.75, 0.62], dir: [0.45, 0.62, 0.95], dist: 6.5 },
  },
  {
    id: 'switches',
    name: 'Mechanical switch',
    category: 'hardware',
    tagline: 'The heart of the keyboard',
    shortDescription:
      'A mechanical switch detects the physical press of a key and turns that movement into an electrical signal.',
    whatItDoes: 'Every key has its own switch. It sets how heavy the key feels, how far it travels and whether it clicks, bumps or glides.',
    howItWorks:
      'Pressing the stem compresses a spring and lets two metal contact leaves touch. That closes a tiny circuit on the PCB. Release, and the spring pushes the stem back up.',
    flow: ['Key press', 'Stem moves', 'Spring compresses', 'Contacts change state', 'Controller detects it'],
    connectedSystems: ['Keycaps', 'Plate', 'PCB', 'Controller'],
    parts: ['switches'],
    animation: 'switch-actuation',
    explode: 0,
    view: { part: 'switches', p: [0.28, 0.08, 0.62], dir: [0.55, 0.45, 0.8], dist: 2.7 },
  },
  {
    id: 'stabilizers',
    name: 'Stabilizers',
    category: 'hardware',
    tagline: 'Keeping long keys level',
    shortDescription:
      'Long keys like the space bar are too wide for one switch to hold steady. Stabilizers keep them level wherever you press.',
    whatItDoes: 'Stops wide keys from tilting or sticking when you press near one end.',
    howItWorks:
      'Two small sliders sit either side of the switch, joined by a stiff metal wire. Pressing one end rotates the wire, which pulls the other end down by the same amount.',
    flow: ['Press on one side', 'Wire rotates', 'Other side follows', 'Key travels evenly'],
    connectedSystems: ['Keycaps', 'Plate', 'PCB'],
    parts: ['stabilizers'],
    animation: 'stabilizer-press',
    explode: 0,
    view: { part: 'stabilizers', p: [-1.125, 0.1, 2.5], dir: [0.2, 0.5, 0.84], dist: 11 },
  },
  {
    id: 'plate',
    name: 'Switch plate',
    category: 'hardware',
    tagline: 'The keyboard’s skeleton',
    shortDescription:
      'The plate is a thin sheet of metal with a precise square cutout for every switch.',
    whatItDoes: 'Holds every switch in exact alignment and gives the keys a firm surface to bottom out on.',
    howItWorks:
      'Switches clip into the plate cutouts from above. The plate’s material and thickness change how stiff the typing feels and how the keyboard sounds.',
    flow: ['Switch', 'Clips into plate', 'Plate spreads the load', 'Mounting system'],
    connectedSystems: ['Switches', 'Stabilizers', 'Mounting', 'Foam'],
    parts: ['plate', 'switches'],
    animation: 'plate-seat',
    explode: 0.62,
    view: { part: 'plate', p: [0, 0.6, 0], dir: [-0.45, 0.62, 0.9], dist: 26 },
  },
  {
    id: 'case',
    name: 'Case',
    category: 'hardware',
    tagline: 'A machined aluminum shell',
    shortDescription:
      'The case is the two-piece aluminum body that houses everything else. It is the biggest single factor in the keyboard’s weight and feel on the desk.',
    whatItDoes: 'Protects the internals, sets the typing angle, and gives the keyboard its mass and finish.',
    howItWorks:
      'The top frame and bottom tray are held together with screws. Rubber feet underneath stop it sliding and set a gentle typing angle.',
    flow: ['Top frame', 'Internals', 'Bottom tray', 'Feet', 'Desk'],
    connectedSystems: ['Mounting', 'Foam', 'USB-C'],
    parts: ['topCase', 'bottomCase', 'feet'],
    animation: 'case-reveal',
    explode: 0.55,
    view: { p: [0, 0.9, 0], dir: [0.7, 0.4, 0.82], dist: 35 },
  },
  {
    id: 'mounting',
    name: 'Gasket mounts',
    category: 'hardware',
    tagline: 'Suspending the plate on rubber',
    shortDescription:
      'In a gasket-mounted keyboard, the plate never touches the case directly. It floats between small rubber pads.',
    whatItDoes: 'Softens the typing feel and stops vibration travelling into the case.',
    howItWorks:
      'Tabs around the plate edge are sandwiched between rubber gaskets held by the top and bottom case. Each keystroke flexes the plate slightly into the rubber.',
    flow: ['Keystroke', 'Plate flexes', 'Gaskets compress', 'Less vibration in case'],
    connectedSystems: ['Plate', 'Case', 'Foam'],
    parts: ['gaskets', 'plate'],
    animation: 'gasket-flex',
    explode: 0.3,
    view: { part: 'gaskets', p: [-7.0, 0, -1.0], dir: [-0.7, 0.6, 0.62], dist: 11.5 },
    note: 'Other designs use top mounts, tray mounts or leaf springs — gasket mounting is one popular approach.',
  },
  {
    id: 'pcb',
    name: 'PCB',
    category: 'electronics',
    tagline: 'Where movement becomes electricity',
    shortDescription:
      'The printed circuit board is the keyboard’s nervous system. Copper traces link every switch to the controller.',
    whatItDoes: 'Connects all switches, the controller, lighting and power into one circuit.',
    howItWorks:
      'Layers of copper traces are etched onto a fibreglass board. When a switch closes, current flows along a trace, and the controller notices.',
    flow: ['Switch closes', 'Copper trace', 'Key matrix', 'Controller'],
    connectedSystems: ['Switches', 'Key matrix', 'Controller', 'Hot-swap sockets'],
    parts: ['pcb', 'keyMatrix'],
    animation: 'pcb-signal',
    explode: 0.82,
    view: { part: 'pcb', p: [0, -0.31, 0], dir: [0.3, -0.42, 0.9], dist: 25 },
  },
  {
    id: 'matrix',
    name: 'Key matrix',
    category: 'electronics',
    tagline: 'A grid of rows and columns',
    shortDescription:
      'Wiring every key to the controller separately would need 84 wires. Instead the switches are arranged in a grid of rows and columns.',
    whatItDoes: 'Lets a few dozen wires report the state of every key.',
    howItWorks:
      'The controller powers one row at a time and listens on every column. If a column answers, the key where that row and column cross is the one that’s down. Small diodes stop pressed keys confusing the scan.',
    flow: ['Row powered', 'Pressed switch', 'Column answers', 'Key found'],
    connectedSystems: ['PCB', 'Switches', 'Controller'],
    parts: ['keyMatrix', 'pcb'],
    animation: 'matrix-scan',
    explode: 0.82,
    view: { part: 'pcb', p: [0.4, -0.27, 0.3], dir: [0.12, 0.62, 0.78], dist: 14.5 },
  },
  {
    id: 'controller',
    name: 'Controller',
    category: 'electronics',
    tagline: 'The keyboard’s tiny computer',
    shortDescription:
      'A microcontroller is a small, complete computer on one chip. It runs the keyboard’s firmware.',
    whatItDoes: 'Scans the key matrix, works out which keys changed, and reports them to your computer.',
    howItWorks:
      'Hundreds of times a second it runs a scan of the matrix. It filters out switch “bounce”, looks the key up in its keymap, and sends a key code.',
    flow: ['Key matrix', 'Controller', 'Key event'],
    connectedSystems: ['Key matrix', 'USB-C', 'Wireless', 'Power system'],
    parts: ['controller', 'pcb'],
    animation: 'controller-process',
    explode: 0.82,
    view: { part: 'controller', p: [0.9, -0.4, -1.9], dir: [0.45, -0.6, 0.7], dist: 4.6 },
  },
  {
    id: 'sockets',
    name: 'Hot-swap sockets',
    category: 'electronics',
    tagline: 'Change switches without soldering',
    shortDescription:
      'Hot-swap sockets are small spring clips soldered to the underside of the PCB. They grip each switch’s metal pins.',
    whatItDoes: 'Let you pull a switch out and push a different one in, with no soldering iron.',
    howItWorks:
      'Each socket has two sprung metal sleeves. A switch’s two pins pass through the PCB and are held by friction, which also completes the electrical connection.',
    flow: ['Switch pins', 'PCB holes', 'Socket grips pins', 'Circuit complete'],
    connectedSystems: ['Switches', 'PCB'],
    parts: ['sockets', 'switches'],
    animation: 'hotswap',
    explode: 0,
    view: { part: 'sockets', p: [0.3, -0.05, 0.5], dir: [0.62, -0.22, 0.75], dist: 4.4 },
    note: 'Soldered keyboards skip the sockets and join switch pins directly to the PCB.',
  },
  {
    id: 'usb',
    name: 'USB-C daughterboard',
    category: 'electronics',
    tagline: 'Power and data in one cable',
    shortDescription:
      'The USB-C port lives on its own small board, linked to the main PCB by an internal cable.',
    whatItDoes: 'Carries power into the keyboard and key data out to your computer on a single cable.',
    howItWorks:
      'Keeping the port on a separate board means a worn or damaged port can be replaced without replacing the whole PCB, and lets the port sit exactly where the case opening is.',
    flow: ['Computer', 'USB-C cable', 'Daughterboard', 'Internal cable', 'PCB'],
    connectedSystems: ['PCB', 'Power system', 'Controller'],
    parts: ['usb', 'wiring'],
    animation: 'usb-flow',
    explode: 0.72,
    view: { part: 'usb', p: [-4.6, -0.5, -3.2], dir: [0.4, 0.38, -0.85], dist: 6.5 },
  },
  {
    id: 'battery',
    name: 'Battery',
    category: 'power',
    tagline: 'Freedom from the cable',
    shortDescription:
      'A flat rechargeable lithium-polymer cell sits in the base of the case, powering the keyboard when it’s unplugged.',
    whatItDoes: 'Stores energy so the keyboard can work wirelessly.',
    howItWorks:
      'When a cable is connected, the power system charges the cell. Unplugged, the battery supplies power through the same system.',
    flow: ['USB-C charge', 'Power system', 'Battery', 'Keyboard runs unplugged'],
    connectedSystems: ['Power system', 'Wireless', 'USB-C'],
    parts: ['battery'],
    animation: 'battery-charge',
    explode: 0.78,
    view: { part: 'battery', p: [0.4, -0.83, 0.9], dir: [0.35, 0.55, 0.8], dist: 9.5 },
  },
  {
    id: 'wireless',
    name: 'Wireless module',
    category: 'power',
    tagline: 'Keystrokes through the air',
    shortDescription:
      'A small radio module lets the keyboard talk to your computer over Bluetooth or a 2.4 GHz receiver.',
    whatItDoes: 'Sends the same key reports as the cable, but by radio.',
    howItWorks:
      'The controller hands each key event to the radio, which encodes it and transmits it through the antenna to the paired device.',
    flow: ['Controller', 'Radio module', 'Antenna', 'Computer'],
    connectedSystems: ['Controller', 'Antenna', 'Battery'],
    parts: ['wireless', 'pcb'],
    animation: 'wireless-transmit',
    explode: 0.82,
    view: { part: 'wireless', p: [5.4, -0.45, -2.35], dir: [0.55, -0.55, 0.6], dist: 5 },
  },
  {
    id: 'power',
    name: 'Power system',
    category: 'power',
    tagline: 'Clean, steady power',
    shortDescription:
      'A handful of small chips manage where power comes from and where it goes.',
    whatItDoes: 'Charges the battery safely and feeds every chip the steady voltage it needs.',
    howItWorks:
      'A charging circuit controls current into the battery. A voltage regulator turns battery or USB power into a stable supply for the controller, radio and lights.',
    flow: ['USB-C / battery', 'Power system', 'PCB'],
    connectedSystems: ['USB-C', 'Battery', 'PCB', 'Controller'],
    parts: ['power', 'pcb'],
    animation: 'power-flow',
    explode: 0.82,
    view: { part: 'power', p: [-2.6, -0.4, -2.2], dir: [-0.3, -0.6, 0.75], dist: 4.6 },
  },
  {
    id: 'antenna',
    name: 'Antenna',
    category: 'power',
    tagline: 'Letting the signal out',
    shortDescription:
      'A small flexible antenna radiates the radio signal. Its position matters as much as the radio itself.',
    whatItDoes: 'Turns the radio’s electrical signal into radio waves and back again.',
    howItWorks:
      'Metal blocks radio waves, so in an aluminum case the antenna sits near a gap or non-metal window where the signal can escape.',
    flow: ['Radio module', 'Antenna', 'Radio waves', 'Receiver'],
    connectedSystems: ['Wireless module', 'Case'],
    parts: ['antenna'],
    animation: 'wireless-transmit',
    explode: 0.82,
    view: { part: 'antenna', p: [6.9, -0.46, -3.35], dir: [0.75, 0.35, -0.6], dist: 6.5 },
  },
  {
    id: 'foam',
    name: 'Foam & dampening',
    category: 'acoustics',
    tagline: 'Tuning the sound',
    shortDescription:
      'Layers of foam fill the empty spaces inside the keyboard: one between plate and PCB, one in the base of the case.',
    whatItDoes: 'Absorbs vibration and stops the hollow case from ringing, so typing sounds deeper and more muted.',
    howItWorks:
      'Every keystroke sends a small burst of vibration through the plate. Soft foam turns part of that energy into a tiny amount of heat instead of sound.',
    flow: ['Switch', 'Plate', 'Foam', 'Case', 'Sound'],
    connectedSystems: ['Plate', 'PCB', 'Case'],
    parts: ['plateFoam', 'caseFoam'],
    animation: 'foam-damp',
    explode: 0.72,
    view: { p: [0, -1.0, 0], dir: [0.45, 0.5, 0.8], dist: 22 },
  },
  {
    id: 'leds',
    name: 'LEDs',
    category: 'acoustics',
    tagline: 'Restrained light',
    shortDescription:
      'Tiny surface-mount LEDs sit on the PCB beneath each switch, plus a single status light on the case.',
    whatItDoes: 'Backlight the keys and show connection, battery and caps-lock status.',
    howItWorks:
      'The controller switches each LED on and off very rapidly. Varying how long they are on sets brightness, and mixing red, green and blue sets colour.',
    flow: ['Controller', 'LED driver', 'LEDs', 'Light through switch housing'],
    connectedSystems: ['PCB', 'Controller', 'Switches'],
    parts: ['leds'],
    animation: 'led-wave',
    explode: 0.5,
    view: { part: 'leds', p: [0.3, -0.27, 0.3], dir: [0.3, 0.75, 0.6], dist: 12 },
  },
]

export const COMPONENT_BY_ID = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]))

// Maps a connected-system label to a component id so chips are clickable.
export const LABEL_TO_ID = {
  Keycaps: 'keycaps',
  Switches: 'switches',
  Stabilizers: 'stabilizers',
  Plate: 'plate',
  Case: 'case',
  Mounting: 'mounting',
  PCB: 'pcb',
  'Key matrix': 'matrix',
  Controller: 'controller',
  'Hot-swap sockets': 'sockets',
  'USB-C': 'usb',
  Battery: 'battery',
  Wireless: 'wireless',
  'Wireless module': 'wireless',
  'Power system': 'power',
  Antenna: 'antenna',
  Foam: 'foam',
  LEDs: 'leds',
}
