import Nav              from '@/components/Nav'
import SideNav          from '@/components/SideNav'
import Hero             from '@/components/Hero'
import Marquee          from '@/components/Marquee'
import About            from '@/components/About'
import Services         from '@/components/Services'
import Process          from '@/components/Process'
import Stats            from '@/components/Stats'
import PricingEstimator from '@/components/PricingEstimator'
import CTA              from '@/components/CTA'
import Footer           from '@/components/Footer'

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
      <section id="pricing" style={{ background: 'var(--bg)' }}>
        <div className="text-center pt-16 px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Interactive <span className="text-[var(--accent)]">Cost Estimator</span>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Transparent, enterprise-grade cost modeling. Select your project specifications below.
          </p>
        </div>
        <PricingEstimator />
      </section>
      <CTA />
      <Footer />
    </>
  )
}
