import { useEffect, useRef } from 'react'
import { COMPONENTS, COMPONENT_BY_ID, CATEGORIES, LABEL_TO_ID } from '../../data/keyboardComponents'
import { SYSTEMS } from '../../data/signalSteps'
import { useStore } from '../../store/useStore'
import { IconArrow, IconClose } from '../UI/Icons'
import { itemNo } from '../ComponentList/ComponentList'

export function Flow({ steps, active = -1 }) {
  return (
    <ol className="flow">
      {steps.map((s, i) => (
        <li key={s + i} className={`flow__node ${i === active ? 'is-active' : ''}`} style={{ '--d': `${i * 70}ms` }}>
          <span className="flow__dot" aria-hidden />
          <span className="flow__text">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function ComponentInfo({ c }) {
  const select = useStore((s) => s.select)
  const idx = COMPONENTS.indexOf(c)
  const prev = COMPONENTS[(idx - 1 + COMPONENTS.length) % COMPONENTS.length]
  const next = COMPONENTS[(idx + 1) % COMPONENTS.length]
  const cat = CATEGORIES.find((x) => x.id === c.category)
  return (
    <>
      <div className="info__meta">
        <span className="mono">Part {itemNo(c.id)}</span>
        <span className="info__sep" aria-hidden />
        <span className="eyebrow">{cat.label}</span>
      </div>
      <h2 className="info__title">{c.name}</h2>
      <p className="info__tag">{c.tagline}</p>
      <p className="info__lead">{c.shortDescription}</p>

      <section className="info__sec">
        <h3 className="eyebrow">What it does</h3>
        <p>{c.whatItDoes}</p>
      </section>
      <section className="info__sec">
        <h3 className="eyebrow">How it works</h3>
        <p>{c.howItWorks}</p>
        <Flow steps={c.flow} />
      </section>
      <section className="info__sec">
        <h3 className="eyebrow">Connected systems</h3>
        <div className="chips">
          {c.connectedSystems.map((label) => {
            const id = LABEL_TO_ID[label]
            return (
              <button key={label} className="chip" onClick={() => id && select(id)} disabled={!id}>
                {label}
              </button>
            )
          })}
        </div>
      </section>
      {c.note && <p className="info__note">{c.note}</p>}
      <nav className="info__pager" aria-label="Browse parts">
        <button className="pager-btn" onClick={() => select(prev.id)}>
          <IconArrow dir="left" />
          <span>
            <small className="mono">{itemNo(prev.id)}</small> {prev.name}
          </span>
        </button>
        <button className="pager-btn pager-btn--next" onClick={() => select(next.id)}>
          <span>
            <small className="mono">{itemNo(next.id)}</small> {next.name}
          </span>
          <IconArrow />
        </button>
      </nav>
    </>
  )
}

function SystemInfo({ sys }) {
  const select = useStore((s) => s.select)
  const members = [...new Set(sys.parts.map((p) => ({ topCase: 'case', bottomCase: 'case', feet: 'case', gaskets: 'mounting', plateFoam: 'foam', caseFoam: 'foam', keyMatrix: 'matrix', wiring: 'usb' }[p] || p)))].filter((id) => COMPONENT_BY_ID[id])
  return (
    <>
      <div className="info__meta">
        <span className="mono">System</span>
      </div>
      <h2 className="info__title">{sys.name}</h2>
      <p className="info__lead">{sys.description}</p>
      <section className="info__sec">
        <h3 className="eyebrow">Signal path</h3>
        <Flow steps={sys.chain} />
      </section>
      <section className="info__sec">
        <h3 className="eyebrow">Parts involved</h3>
        <div className="chips">
          {members.map((id) => (
            <button key={id} className="chip" onClick={() => select(id)}>
              {COMPONENT_BY_ID[id].name}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

export function ComponentPanel() {
  const selected = useStore((s) => s.selected)
  const system = useStore((s) => s.system)
  const scroller = useRef()
  const c = selected && COMPONENT_BY_ID[selected]
  const sys = system && SYSTEMS.find((x) => x.id === system)
  const open = !!(c || sys)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [selected, system])

  // Closing always returns the camera to an overview of the current state
  const close = () => useStore.getState().closeSelection()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open && !useStore.getState().customizeOpen) useStore.getState().closeSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <aside className={`info panel ${open ? 'is-open' : ''}`} aria-label="Part details" aria-hidden={!open} inert={!open}>
      <button
        className="icon-btn info__close"
        aria-label="Close details"
        onClick={close}
      >
        <IconClose />
      </button>
      <div className="info__scroll" ref={scroller} key={selected || system}>
        {c && <ComponentInfo c={c} />}
        {sys && <SystemInfo sys={sys} />}
      </div>
    </aside>
  )
}
