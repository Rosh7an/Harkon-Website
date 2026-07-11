import Nav    from '@/components/Nav'
import CTA    from '@/components/CTA'
import Footer from '@/components/Footer'

export const metadata = { title: "Let's Talk — Exter Cloud" }

export default function ContactPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <CTA />
      <Footer />
    </div>
  )
}
