import { CATEGORIES, COMPONENTS } from '../../data/keyboardComponents'
import { SYSTEMS } from '../../data/signalSteps'
import { useStore } from '../../store/useStore'
import { playUi } from '../../utils/sound'
import { IconClose } from '../UI/Icons'

export const itemNo = (id) => String(COMPONENTS.findIndex((c) => c.id === id) + 1).padStart(2, '0')

export function ComponentList() {
  const selected = useStore((s) => s.selected)
  const system = useStore((s) => s.system)
  const select = useStore((s) => s.select)
  const selectSystem = useStore((s) => s.selectSystem)
  const tab = useStore((s) => s.panelTab)
  const setTab = useStore((s) => s.setPanelTab)
  const soundOn = useStore((s) => s.soundOn)
  const click = (fn) => {
    if (soundOn) playUi('tick')
    fn()
  }

  return (
    <aside className="rail panel" aria-label="Keyboard parts">
      <div className="rail__head">
        <div className="tabs" role="tablist" aria-label="View parts by">
          {[
            ['components', 'Parts'],
            ['systems', 'Systems'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`tabs__btn ${tab === id ? 'is-on' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="mono muted hide-sm">{tab === 'components' ? `${COMPONENTS.length} parts` : `${SYSTEMS.length} systems`}</span>
        <button className="icon-btn show-sm rail__close" aria-label="Close parts list" onClick={() => useStore.getState().setSheet(null)}>
          <IconClose />
        </button>
      </div>

      <div className="rail__scroll">
        {tab === 'components' ? (
          CATEGORIES.map((cat) => (
            <section key={cat.id} className="rail__group">
              <h2 className="eyebrow rail__cat">{cat.label}</h2>
              <ul>
                {COMPONENTS.filter((c) => c.category === cat.id).map((c) => (
                  <li key={c.id}>
                    <button
                      className={`part ${selected === c.id ? 'is-on' : ''}`}
                      aria-current={selected === c.id ? 'true' : undefined}
                      onClick={() => click(() => (selected === c.id ? useStore.getState().closeSelection() : select(c.id)))}
                    >
                      <span className="part__no">{itemNo(c.id)}</span>
                      <span className="part__name">{c.name}</span>
                      <span className="part__tick" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="systems">
            {SYSTEMS.map((sy) => (
              <li key={sy.id}>
                <button className={`system ${system === sy.id ? 'is-on' : ''}`} aria-current={system === sy.id ? 'true' : undefined} onClick={() => click(() => selectSystem(system === sy.id ? null : sy.id))}>
                  <span className="system__name">{sy.name}</span>
                  <span className="system__chain">
                    {sy.chain.map((c, i) => (
                      <span key={c}>
                        {i > 0 && <i aria-hidden>→</i>}
                        {c}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
