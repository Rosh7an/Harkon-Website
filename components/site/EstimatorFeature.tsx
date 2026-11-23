'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { prefersReducedMotion, useInView } from './useInView'
import ui from './ui.module.css'
import s from './Home.module.css'

const QUESTIONS = [
  { q: 'What kind of business do you run?', chips: ['Shop or retail', 'Healthcare', 'Education', 'Services', 'Manufacturing'], on: [1] },
  { q: 'What do you want to fix first?', chips: ['Get more customers', 'Track leads', 'Less paperwork', 'Sell online'], on: [0, 2] },
]

/** Feature block for the Cost Estimator with a looping, decorative preview of its questions. */
export default function EstimatorFeature() {
  const [step, setStep] = useState(0)
  const { ref, inView } = useInView<HTMLDivElement>()

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return
    const timer = setInterval(() => setStep(current => (current + 1) % 3), 2800)
    return () => clearInterval(timer)
  }, [inView])

  const question = QUESTIONS[step]
  return (
    <div ref={ref} className={s.feature}>
      <div className={s.featureGlow} aria-hidden="true" />
      <div className={s.featureCopy}>
        <p className={s.eyebrowAccent}>Free cost estimator</p>
        <h2 className={ui.h2}>Know the cost before you <span className={ui.serif} style={{ color: '#F0997B' }}>commit.</span></h2>
        <ol className={s.featureSteps}>
          <li><b>1</b>Answer a few simple questions</li>
          <li><b>2</b>See what your business needs</li>
          <li><b>3</b>Get an estimate and a PDF to keep</li>
        </ol>
        <Link href="/cost-estimator" className={ui.btnPrimary} style={{ alignSelf: 'flex-start' }}>Get my free estimate</Link>
      </div>
      <div className={s.mock} aria-hidden="true">
        <div className={s.mockMeta}><span>QUESTION {step + 1} OF 3</span><span>{Math.round(((step + 1) / 3) * 100)}%</span></div>
        <div className={s.mockTrack}><span style={{ width: `${Math.round(((step + 1) / 3) * 100)}%` }} /></div>
        <div key={step} className={s.mockBody}>
          {question ? (
            <>
              <div className={s.mockQ}>{question.q}</div>
              <div className={s.mockChips}>
                {question.chips.map((chip, i) => <span key={chip} className={question.on.includes(i) ? s.mockChipOn : s.mockChip} style={{ animationDelay: `${0.05 * i + 0.1}s` }}>{chip}</span>)}
              </div>
            </>
          ) : (
            <>
              <div className={s.mockQ}>Your plan is ready</div>
              <div className={s.mockRow}><span>Website and Google search</span><span style={{ color: '#237A4B' }}>Included</span></div>
              <div className={s.mockRow}><span>Billing and stock software</span><span style={{ color: '#237A4B' }}>Included</span></div>
              <div className={s.mockRowDark}><span>Your estimate</span><span>Shown here</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
