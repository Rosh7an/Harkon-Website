import Nav    from '@/components/Nav'
import CTA    from '@/components/CTA'
import Footer from '@/components/Footer'

export const metadata = { title: 'Why Exter Cloud' }

export default function WhyPage() {
  return (
    <div className="page-with-nav" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <CTA />
      <Footer />
    </div>
  )
}
