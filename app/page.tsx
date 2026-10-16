import Nav              from '@/components/Nav'
import SideNav          from '@/components/SideNav'
import Hero             from '@/components/Hero'
import Marquee          from '@/components/Marquee'
import About            from '@/components/About'
import Services         from '@/components/Services'
import Process          from '@/components/Process'
import Stats            from '@/components/Stats'
import SolutionDiscovery from '@/components/SolutionDiscovery'
import CTA              from '@/components/CTA'
import Footer           from '@/components/Footer'
import { businessContactLinks } from '@/utils/businessContact'

export default function Home() {
  const contactLinks = businessContactLinks({
    phone: process.env.CONTACT_PHONE || undefined,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE,
  })

  return (
    <>
      <Nav />
      <SideNav />
      <Hero />
      <Marquee />
      <About />
      <Services />
      <Process />
      <Stats />
      <section id="pricing" style={{ background: 'var(--bg)' }}>
        <SolutionDiscovery contactLinks={contactLinks} headingLevel="h2" />
      </section>
      <CTA />
      <Footer />
    </>
  )
}
