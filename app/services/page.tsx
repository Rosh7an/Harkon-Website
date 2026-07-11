import Nav      from '@/components/Nav'
import Services from '@/components/Services'
import Footer   from '@/components/Footer'

export const metadata = { title: 'Services — Exter Cloud' }

export default function ServicesPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <Services />
      <Footer />
    </div>
  )
}
