import type { Metadata } from 'next'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import HomeHero from '@/components/site/HomeHero'
import NumbersBand from '@/components/site/NumbersBand'
import OnePlace from '@/components/site/OnePlace'
import EstimatorFeature from '@/components/site/EstimatorFeature'
import MobileHome from '@/components/site/MobileHome'
import Reveal from '@/components/site/Reveal'
import { MARQUEE, STEPS } from '@/utils/siteContent'
import ui from '@/components/site/ui.module.css'
import s from '@/components/site/Home.module.css'

// The home page's main address; the other pages set their own.
export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HomeHero />

        <div className={s.mobileOnly}><MobileHome /></div>

        <div className={s.desktopOnly}>
          <Reveal as="section" aria-label="Services we offer" className={s.marquee}>
            <div className={s.marqueeTrack}>
              {[0, 1].map(copy => (
                <div key={copy} className={s.marqueeRow} aria-hidden={copy === 1 || undefined}>
                  {MARQUEE.map(item => <span key={item} style={{ display: 'contents' }}><span>{item}</span><span className={s.marqueeDot} /></span>)}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal><NumbersBand /></Reveal>

          <section className={`${ui.section} ${ui.container}`} aria-labelledby="one-place-title">
            <Reveal className={ui.centerHead}>
              <h2 id="one-place-title" className={ui.h2} style={{ maxWidth: 760 }}>Everything your business needs, in one place</h2>
              <p className={ui.lede}>Start anywhere. Add more as you grow.</p>
            </Reveal>
            <Reveal delay={0.1}><OnePlace /></Reveal>
          </section>

          <section className={`${ui.section} ${ui.container}`} aria-label="Cost estimator">
            <Reveal><EstimatorFeature /></Reveal>
          </section>

          <section id="how-we-work" className={`${ui.section} ${ui.container}`} aria-labelledby="how-title" style={{ paddingBottom: 140 }}>
            <Reveal className={ui.centerHead}><h2 id="how-title" className={ui.h2}>How we work</h2></Reveal>
            <ol className={s.steps}>
              {STEPS.map((step, index) => (
                <Reveal as="li" key={step.title} className={s.step} delay={index * 0.12}>
                  <span className={s.stepNum}>STEP {index + 1}</span>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepText}>{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </section>
        </div>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
