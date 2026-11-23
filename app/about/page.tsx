import type { Metadata } from 'next'
import Link from 'next/link'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import { FounderCards, StoryTimeline, ValuesTabs } from '@/components/site/AboutInteractive'
import Reveal from '@/components/site/Reveal'
import ui from '@/components/site/ui.module.css'
import p from '@/components/site/Pages.module.css'

export const metadata: Metadata = {
  title: 'About Exter Cloud: our founders, story and mission',
  description: 'Exter Cloud was started by Roshan J and Gokul A S to give small and growing businesses the digital tools big companies use, without the complexity.',
  alternates: { canonical: 'https://www.extercloud.in/about' },
}

const STATS = [
  { value: '4', unit: '+', label: 'years building for businesses' },
  { value: '7', unit: '+', label: 'long-term projects' },
  { value: '7', unit: '+', label: 'international clients' },
  { value: '15', unit: ' days', label: 'average delivery' },
]

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className={ui.container} style={{ maxWidth: 1132 }}>
        <Reveal as="header" mode="load" className={p.pageHeadCenter} style={{ paddingTop: 'clamp(48px, 8vw, 104px)' }}>
          <p className={ui.eyebrow}>About Exter Cloud</p>
          <h1 className={ui.h1} style={{ maxWidth: 1000, fontSize: 'clamp(42px, 6.4vw, 88px)' }}>Two founders, one belief: <span className={ui.serif}>good software should feel simple.</span></h1>
          <p className={ui.lede}>Exter Cloud was started by Roshan J and Gokul A S to give small and growing businesses the digital tools big companies use, without the complexity or the cost.</p>
        </Reveal>

        <Reveal as="section" aria-labelledby="founders-title" style={{ paddingTop: 32 }}>
          <h2 id="founders-title" className={ui.eyebrow} style={{ textAlign: 'center', marginBottom: 32 }}>The founders</h2>
          <FounderCards />
        </Reveal>

        <Reveal as="section" className={ui.section} aria-labelledby="story-title"><StoryTimeline /></Reveal>

        <Reveal as="section" className={ui.section} aria-label="Our mission, vision and values"><ValuesTabs /></Reveal>

        <Reveal as="section" className={ui.section} aria-label="Exter Cloud in numbers">
          <div className={p.statsRow}>
            {STATS.map(stat => (
              <div key={stat.label}>
                <div className={p.statBig} style={{ fontSize: 'clamp(48px, 5vw, 64px)' }}>{stat.value}<span>{stat.unit}</span></div>
                <div className={p.statLabel} style={{ marginTop: 10 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className={p.cta}>
          <h2 className={ui.h2}>Let’s build something <span className={ui.serif}>together.</span></h2>
          <p className={ui.lede}>You’ll talk directly to the founders.</p>
          <Link href="/contact" className={ui.btnPrimary}>Say hello</Link>
        </Reveal>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
