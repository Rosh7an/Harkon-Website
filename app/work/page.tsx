import type { Metadata } from 'next'
import Link from 'next/link'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import WorkGallery from '@/components/site/WorkGallery'
import Reveal from '@/components/site/Reveal'
import ui from '@/components/site/ui.module.css'
import p from '@/components/site/Pages.module.css'

export const metadata: Metadata = {
  title: 'Our work: websites, booking systems, CRMs and apps | Exter Cloud',
  description: 'Hospital portals, WhatsApp assistants, CRMs, learning platforms, ordering apps and billing software designed and built by Exter Cloud.',
  alternates: { canonical: 'https://www.extercloud.in/work' },
}

export default function WorkPage() {
  return (
    <>
      <Nav />
      <main className={ui.container}>
        <WorkGallery />
        <Reveal as="section" className={p.cta} aria-labelledby="next-title">
          <h2 id="next-title" className={ui.h2}>Your business could be next</h2>
          <p className={ui.lede}>Tell us what you want to fix. The first consultation is free.</p>
          <Link href="/cost-estimator" className={ui.btnPrimary}>Start a project</Link>
        </Reveal>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
