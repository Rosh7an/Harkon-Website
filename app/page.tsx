import Nav      from '@/components/Nav'
import SideNav  from '@/components/SideNav'
import Hero     from '@/components/Hero'
import Marquee  from '@/components/Marquee'
import About    from '@/components/About'
import Services from '@/components/Services'
import Process  from '@/components/Process'
import Stats    from '@/components/Stats'
import CTA      from '@/components/CTA'
import Footer   from '@/components/Footer'
// Testimonials kept in components/Testimonials.tsx — not rendered currently

export default function Home() {
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
      <CTA />
      <Footer />
    </>
  )
}
