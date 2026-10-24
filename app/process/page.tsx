import Nav     from '@/components/Nav'
import Process from '@/components/Process'
import Footer  from '@/components/Footer'

export const metadata = { title: 'Process — Exter Cloud' }

export default function ProcessPage() {
  return (
    <div className="page-with-nav" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <Process />
      <Footer />
    </div>
  )
}
