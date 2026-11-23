import Faq from './Faq'
import Reveal from './Reveal'
import { COST_FACTORS, ESTIMATOR_FAQS, ESTIMATOR_STEPS } from '@/utils/estimatorGuide'
import ui from './ui.module.css'
import p from './Pages.module.css'

/**
 * The written guide below the estimator: how it works, what decides the cost,
 * and common questions. Plain text in the page so search engines can read it.
 */
export default function EstimatorGuide() {
  return (
    <div className={ui.container} style={{ paddingBottom: 'clamp(72px, 10vw, 128px)' }}>
      <Reveal as="section" aria-labelledby="guide-steps" className={p.guideSection}>
        <p className={ui.eyebrow}>How it works</p>
        <h2 id="guide-steps" className={ui.h2}>An estimate in three steps.</h2>
        <ol className={p.guideSteps}>
          {ESTIMATOR_STEPS.map((step, index) => (
            <li key={step.title}>
              <span className={p.guideNum} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal as="section" aria-labelledby="guide-factors" className={p.guideSection}>
        <p className={ui.eyebrow}>Pricing</p>
        <h2 id="guide-factors" className={ui.h2}>What decides the cost of a website or app.</h2>
        <dl className={p.guideFactors}>
          {COST_FACTORS.map(factor => (
            <div key={factor.title}>
              <dt>{factor.title}</dt>
              <dd>{factor.text}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal as="section" aria-labelledby="guide-faq" className={p.guideSection}>
        <p className={ui.eyebrow}>Questions</p>
        <h2 id="guide-faq" className={ui.h2} style={{ marginBottom: 32 }}>About the estimator.</h2>
        <Faq items={ESTIMATOR_FAQS.map(faq => ({ q: faq.q, a: faq.a }))} />
      </Reveal>
    </div>
  )
}
