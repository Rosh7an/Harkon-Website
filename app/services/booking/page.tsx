import type { Metadata } from 'next'
import Link from 'next/link'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import BookingDemo from '@/components/site/BookingDemo'
import Reveal from '@/components/site/Reveal'
import ui from '@/components/site/ui.module.css'
import p from '@/components/site/Pages.module.css'

export const metadata: Metadata = {
  title: 'Online booking systems for hospitals, restaurants, classes and hotels | Exter Cloud',
  description: 'Let customers book appointments, tables, classes or rooms online any time, with automatic WhatsApp confirmations and reminders.',
  alternates: { canonical: 'https://www.extercloud.in/services/booking' },
}

const INCLUDED = [
  { title: 'Booking page', text: 'On your website, and as a link you can share anywhere.', icon: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></> },
  { title: 'WhatsApp confirmations', text: 'Confirmations and reminders sent automatically.', icon: <path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" /> },
  { title: 'Staff calendars', text: 'Each team member sees their own day.', icon: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.6.7 2.6 2.6 3 5.5" /></> },
  { title: 'Online payments', text: 'Take advance payments or deposits when customers book.', icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></> },
]

export default function BookingPage() {
  return (
    <>
      <Nav />
      <main className={ui.container}>
        <Reveal as="header" mode="load" className={p.pageHeadCenter}>
          <p className={p.crumb}><Link href="/services">Services</Link> / Win customers / Booking systems</p>
          <h1 className={ui.h1} style={{ fontSize: 'clamp(42px, 6.5vw, 88px)' }}>Bookings that <span className={ui.serif}>run themselves.</span></h1>
          <p className={ui.lede}>Appointments, tables, classes or rooms. Customers book online any time, and confirmations go out on WhatsApp automatically.</p>
        </Reveal>

        <Reveal as="section" aria-label="Try the booking demo" style={{ maxWidth: 1040, margin: '0 auto' }}><BookingDemo /></Reveal>

        <Reveal as="section" className={ui.section} aria-labelledby="changes-title">
          <div className={ui.centerHead}><h2 id="changes-title" className={ui.h2}>What changes for you</h2></div>
          <div className={p.stats3}>
            <div><span className={p.statBig}>24/7</span><span className={p.statLabel}>customers can book, even at night</span></div>
            <div><span className={p.statBig}>0</span><span className={p.statLabel}>phone calls needed to book or confirm</span></div>
            <div><span className={p.statBig}>15<span> days</span></span><span className={p.statLabel}>average time to set it up for you</span></div>
          </div>
        </Reveal>

        <Reveal as="section" className={ui.section} aria-labelledby="included-title">
          <div className={ui.centerHead}><h2 id="included-title" className={ui.h2}>What’s included</h2></div>
          <div className={p.included}>
            {INCLUDED.map(item => (
              <div key={item.title} className={p.includedCard}>
                <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                <strong>{item.title}</strong><span>{item.text}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className={ui.section} aria-labelledby="works-title" style={{ textAlign: 'center' }}>
          <h2 id="works-title" className={ui.eyebrow} style={{ marginBottom: 20 }}>Works for</h2>
          <div className={p.chips}>{['Hospitals and clinics', 'Restaurants', 'Hotels and stays', 'Coaching and classes', 'Fitness studios', 'Service businesses'].map(x => <span key={x}>{x}</span>)}</div>
        </Reveal>

        <Reveal as="section" className={ui.section} style={{ paddingBottom: 120 }}>
          <div className={p.ctaCard}>
            <h2 className={ui.h2}>Want this for your business?</h2>
            <p>Booking works best with a website and WhatsApp automation. We can build all three together.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Link href="/cost-estimator" className={ui.btnPrimary}>Start a project</Link>
              <Link href="/services" className={ui.btnGhost} style={{ color: 'var(--feature-text)' }}>See all services</Link>
            </div>
          </div>
        </Reveal>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
