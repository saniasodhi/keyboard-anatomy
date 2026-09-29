import { useStore } from '../../store/useStore'
import { KEYCAP_THEMES, PLATE_MATERIALS, SWITCH_TYPES } from '../../utils/materials'

function Seg({ label, value, options, onChange }) {
  return (
    <fieldset className="cz__row">
      <legend className="eyebrow">{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <button key={o.id} className={`seg__btn ${value === o.id ? 'is-on' : ''}`} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.swatch && <span className="swatch" style={{ background: o.swatch }} aria-hidden />}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function Customize() {
  const custom = useStore((s) => s.custom)
  const setCustom = useStore((s) => s.setCustom)
  return (
    <div className="popover cz" role="dialog" aria-label="Customize keyboard">
      <p className="cz__title">Customize</p>
      <Seg
        label="Keycaps"
        value={custom.keycaps}
        options={Object.entries(KEYCAP_THEMES).map(([id, t]) => ({ id, label: t.label, swatch: t.alpha }))}
        onChange={(keycaps) => setCustom({ keycaps })}
      />
      <Seg
        label="Switch"
        value={custom.switch}
        options={Object.entries(SWITCH_TYPES).map(([id, t]) => ({ id, label: t.label, swatch: t.stem }))}
        onChange={(sw) => setCustom({ switch: sw })}
      />
      <p className="cz__note">{SWITCH_TYPES[custom.switch].note}. Try it in Type test.</p>
      <Seg
        label="Plate"
        value={custom.plate}
        options={Object.entries(PLATE_MATERIALS).map(([id, t]) => ({ id, label: t.label, swatch: t.color }))}
        onChange={(plate) => setCustom({ plate })}
      />
      <Seg
        label="Backlight"
        value={custom.rgb ? 'on' : 'off'}
        options={[
          { id: 'off', label: 'Off' },
          { id: 'on', label: 'On' },
        ]}
        onChange={(v) => setCustom({ rgb: v === 'on' })}
      />
      <Seg
        label="Connection"
        value={custom.wireless ? 'wireless' : 'wired'}
        options={[
          { id: 'wired', label: 'USB-C' },
          { id: 'wireless', label: 'Wireless' },
        ]}
        onChange={(v) => setCustom({ wireless: v === 'wireless' })}
      />
    </div>
  )
}
