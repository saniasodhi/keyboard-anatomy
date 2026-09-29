# Keyboard Anatomy

An interactive 3D anatomy of a modern 75% mechanical keyboard. Explode it layer by layer, inspect all 17 parts, follow one keystroke from your finger to the screen, then type on it.

## Run it

```bash
npm install
npm run dev
```

`npm run build` makes a production bundle in `dist/`.

## What's inside

| Mode | What it does |
| --- | --- |
| **Reveal** | After Enter, the camera sweeps in along a low arc, the lights come up, and the keycaps land row by row with a backlight sweep and quiet clicks. The assembled hero shot then gets a title card, shallow depth of field and a slow camera drift. |
| **Explore** | Rotate and zoom the keyboard. Drag the travel gauge to explode it. Click a part (in 3D or in the parts list) to fly the camera there, ghost everything else, and play that part's demo: switch actuation, stabilizer wire, matrix scan, hot-swap, radio waves and so on. The **Systems** tab highlights whole signal paths. |
| **How it works** | Seven guided steps: Power → Press → Actuate → Detect → Process → Transmit → Display. Use the arrow keys or Autoplay. |
| **Type test** | The keyboard reassembles on a desk and types its own line, then hands over to your real keyboard. Every key you press moves the 3D key and plays a synthesized switch sound. |

Customize (the sliders icon in the header) changes the keycap colour, switch type (which changes the stem colour and the sound), plate material, backlight and connection.

## Structure

```
src/
  data/            layout (key positions), explosion axes, component copy, signal steps
  store/           zustand store: mode, selection, explode tween, camera fly-to
  components/
    KeyboardModel/ procedural model, one file per layer, plus Part (explode + ghosting)
    KeyboardViewer/ Canvas, camera rig, post-processing
    ComponentList/ ComponentPanel/ ExplosionSlider/ HowItWorks/ TypeTest/ LoadingScreen/ Navigation/ UI/
  scenes/          studio backdrop + lighting, desk scene for Type test
  utils/           geometry (sculpted keycap loft, etc.), materials, sound synth, GLB bridge
```

## Swapping in a real GLB

The procedural model names every object the way a production model should (`TopCase`, `Keycaps_All`, `Switches_All`, `Plate`, `PCB`, `KeyMatrix`, `Controller`, `HotSwapSockets`, `USB_Daughterboard`, `Battery`, `WirelessModule`, `Antenna`, `Foam`, `GasketMounts`, `Stabilizers`, `LEDs`, `Feet`, …). `src/utils/modelUtils.js` maps those names to part ids. To use a GLB, load it with `useGLTF`, run `collectParts()` on the scene, and wrap each group in `<Part id=…>`. Explosion, ghosting, outlines and camera focus then work unchanged.

## Notes

- The keyboard ("Anatomy 75") is fictional but representative. The copy avoids invented specs: no forces, polling rates, battery capacities or chip model numbers.
- Motion respects `prefers-reduced-motion`. Low-power devices drop ambient occlusion and use smaller shadow maps and a lower pixel ratio. A performance monitor does the same automatically if the frame rate falls.
- If WebGL is unavailable or the context is lost, the page shows a retry screen instead of a blank canvas.
- Dev only: `?enter` skips the loading gate; `window.__introT = 1.2` freezes the reveal at a given second for inspection.
