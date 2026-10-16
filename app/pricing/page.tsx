import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import SolutionDiscovery from '@/components/SolutionDiscovery'
import Footer from '@/components/Footer'
import { businessContactLinks } from '@/utils/businessContact'

export const metadata: Metadata = {
  title: 'Pricing & Cost Estimator — Exter Cloud',
  description: 'Discover the right solution for your business, review connected website, CRM, portal and mobile requirements, and estimate the confirmed scope.',
}

export default function PricingPage() {
  const contactLinks = businessContactLinks({ phone: process.env.CONTACT_PHONE || undefined, whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })
  return (
    <main className="min-h-screen pt-24 pb-16 bg-[var(--bg)] text-[var(--text)]">
      <Nav />
      <SolutionDiscovery contactLinks={contactLinks} />
      <Footer />
    </main>
  )
}
