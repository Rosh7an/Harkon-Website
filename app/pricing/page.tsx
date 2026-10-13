import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import PricingEstimator from '@/components/PricingEstimator'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Pricing & Cost Estimator — Exter Cloud',
  description: 'Calculate real-time engineering estimates for your custom web app, mobile app, or WhatsApp integration platform.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 bg-[var(--bg)] text-[var(--text)]">
      <Nav />
      <div className="text-center pt-8 px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
          Interactive <span className="text-[var(--accent)]">Cost Estimator</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--muted)] max-w-2xl mx-auto">
          Transparent, enterprise-grade cost modeling. Select your project specifications below to get an instant scope & budget estimate.
        </p>
      </div>
      <PricingEstimator />
      <Footer />
    </main>
  )
}
