import type { Metadata } from 'next'
import Link from 'next/link'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import ServicesExplorer from '@/components/site/ServicesExplorer'
import Faq from '@/components/site/Faq'
import { FAQS } from '@/utils/siteContent'
import Reveal from '@/components/site/Reveal'
import ui from '@/components/site/ui.module.css'
import p from '@/components/site/Pages.module.css'

export const metadata: Metadata = {
  title: 'Digital services for growing businesses | Exter Cloud',
  description: 'Website design, SEO, social media marketing, ads, lead generation, CRM, WhatsApp automation, booking systems, business software, LMS and mobile apps for small and growing businesses.',
  alternates: { canonical: 'https://www.extercloud.in/services' },
}

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main>
        <div className={ui.container}>
          <Reveal as="header" mode="load" className={p.pageHeadCenter}>
            <h1 className={ui.h1} style={{ maxWidth: 940, fontSize: 'clamp(42px, 6.2vw, 84px)' }}>Every digital service your business needs, <span className={ui.serif}>in one place.</span></h1>
            <p className={ui.lede} style={{ maxWidth: 680 }}>Website design, Google search (SEO), social media marketing, ads, lead generation, CRM, WhatsApp automation, booking systems, business software, LMS and mobile apps for small and growing businesses.</p>
          </Reveal>
          <Reveal as="section" aria-label="Explore our services by goal"><ServicesExplorer /></Reveal>

          <Reveal as="section" className={`${ui.section} ${p.faq}`} aria-labelledby="faq-title">
            <div className={ui.centerHead}><h2 id="faq-title" className={ui.h2}>Frequently asked questions</h2></div>
            <Faq items={FAQS} />
          </Reveal>

          <Reveal as="section" className={p.cta} aria-labelledby="start-title">
            <h2 id="start-title" className={ui.h2}>Not sure where to start?</h2>
            <p className={ui.lede}>The free cost estimator suggests what your business needs and gives you an estimate.</p>
            <Link href="/cost-estimator" className={ui.btnPrimary}>Get my free estimate</Link>
          </Reveal>
        </div>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
