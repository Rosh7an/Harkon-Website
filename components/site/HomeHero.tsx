import Link from 'next/link'
import { businessContactLinks } from '@/utils/businessContact'
import ProblemPicker from './ProblemPicker'
import HeroShowcase from './HeroShowcase'
import Reveal from './Reveal'
import ui from './ui.module.css'
import s from './Home.module.css'

export default function HomeHero() {
  const { whatsapp } = businessContactLinks({ whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.heroGlow} aria-hidden="true" />
      <div className={ui.container}>
        <div className={s.heroGrid}>
          {/* Each piece lands on its own, a beat apart: headline, line, buttons, then the showcase. */}
          <div className={s.heroInner}>
            <Reveal as="h1" id="hero-title" className={`${ui.h1} ${s.heroTitle}`} mode="load" soft>
              Grow your business. <span className={ui.serif}>We handle the digital.</span>
            </Reveal>
            <Reveal as="p" className={ui.lede} mode="load" soft delay={0.07}>
              From your first website to more enquiries, happier customers and less paperwork. One partner for everything your business needs online.
            </Reveal>
            <Reveal className={s.heroActions} mode="load" delay={0.14}>
              <Link href="/cost-estimator" className={ui.btnPrimary}>
                Start a project
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              {whatsapp
                ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={ui.btnGhost}>Chat on WhatsApp</a>
                : <Link href="/services" className={ui.btnGhost}>See our services</Link>}
            </Reveal>
          </div>
          <Reveal className={s.heroShowcase} mode="load" delay={0.2}><HeroShowcase /></Reveal>
        </div>
        <div className={s.desktopOnly}><Reveal><ProblemPicker /></Reveal></div>
      </div>
    </section>
  )
}
