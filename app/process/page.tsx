import Nav     from '@/components/Nav'
import Process from '@/components/Process'
import Footer  from '@/components/Footer'

export const metadata = { title: 'Process — HARKON' }

export default function ProcessPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <Process />
      <Footer />
    </div>
  )
}
