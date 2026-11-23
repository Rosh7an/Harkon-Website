'use client'

import { NUMBERS } from '@/utils/siteContent'
import { useCountUp } from './useCountUp'
import ui from './ui.module.css'
import s from './Home.module.css'

function Stat({ item }: { item: (typeof NUMBERS)[number] }) {
  const { ref, value } = useCountUp<HTMLDivElement>(item.value ?? 0)
  return (
    <div ref={ref} className={s.number}>
      <span className={s.numberValue}>
        {item.value === null ? ('display' in item ? item.display : '') : value}
        {item.suffix && <span className={s.numberSuffix}>{item.suffix}</span>}
      </span>
      <span className={s.numberLabel}>{item.label}</span>
    </div>
  )
}

export default function NumbersBand() {
  return (
    <section aria-label="Exter Cloud in numbers" className={s.band}>
      <div className={ui.container}>
        <div className={s.numbers}>
          {NUMBERS.map(item => <Stat key={item.label} item={item} />)}
        </div>
      </div>
    </section>
  )
}
