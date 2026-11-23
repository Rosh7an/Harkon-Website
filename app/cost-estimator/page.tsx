import type { Metadata } from 'next'
import Nav, { TabBarSpacer } from '@/components/Nav'
import SolutionDiscovery from '@/components/SolutionDiscovery'
import Footer from '@/components/Footer'
import EstimatorGuide from '@/components/site/EstimatorGuide'
import { ESTIMATOR_DESCRIPTION, ESTIMATOR_URL, estimatorJsonLd, jsonLdScript } from '@/utils/estimatorGuide'
import { businessContactLinks } from '@/utils/businessContact'

export const metadata: Metadata = {
  title: 'Free Website & App Cost Estimator | Exter Cloud',
  alternates: { canonical: ESTIMATOR_URL },
  description: ESTIMATOR_DESCRIPTION,
  openGraph: { title: 'Free Website & App Cost Estimator', description: ESTIMATOR_DESCRIPTION, url: ESTIMATOR_URL, siteName: 'Exter Cloud', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Free Website & App Cost Estimator', description: ESTIMATOR_DESCRIPTION },
}

export default function CostEstimatorPage() {
  const contactLinks = businessContactLinks({ phone: process.env.CONTACT_PHONE || undefined, whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })
  return (
    <main className="page-with-nav min-h-screen pb-16 bg-[var(--bg)] text-[var(--text)]">
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(estimatorJsonLd()) }} />
      <SolutionDiscovery contactLinks={contactLinks} />
      <EstimatorGuide />
      <Footer showCta={false} />
      <TabBarSpacer />
    </main>
  )
}
