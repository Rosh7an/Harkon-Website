import type { Metadata } from 'next'
import Link from 'next/link'
import Nav, { TabBarSpacer } from '@/components/Nav'
import Footer from '@/components/Footer'
import ContactForm from '@/components/site/ContactForm'
import { prefillFromQuery } from '@/utils/contactPrefill'
import { businessContactLinks } from '@/utils/businessContact'
import { contactEmail, displayPhone } from '@/utils/siteProfile'
import Reveal from '@/components/site/Reveal'
import ui from '@/components/site/ui.module.css'
import p from '@/components/site/Pages.module.css'

export const metadata: Metadata = {
  title: 'Contact Exter Cloud: start your project',
  description: 'Tell us about your business. Send a query, chat on WhatsApp or call. The first consultation is free.',
  alternates: { canonical: 'https://www.extercloud.in/contact' },
}

const Icon = ({ d }: { d: React.ReactNode }) => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const prefill = prefillFromQuery(await searchParams)
  const email = contactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL)
  const { call, whatsapp } = businessContactLinks({ phone: process.env.CONTACT_PHONE || undefined, whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })

  return (
    <>
      <Nav />
      <main className={ui.container}>
        <Reveal mode="load" className={p.contactWrap}>
          <div className={p.contactInfo}>
            <p className={ui.eyebrow}>Contact</p>
            <h1 className={ui.h1} style={{ fontSize: 'clamp(42px, 5.5vw, 76px)' }}>Tell us what you’re <span className={ui.serif}>building.</span></h1>
            <p className={ui.lede} style={{ maxWidth: 460 }}>Send a few lines about your business. We’ll reply with next steps and, if it helps, a time for a free call.</p>
            <div className={p.channels}>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={p.channel}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className={p.channelIcon}><Icon d={<path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" />} /></span><span><strong>WhatsApp</strong><small>Fastest way to reach us</small></span></span>
                  <Icon d={<path d="M5 12h14M13 6l6 6-6 6" />} />
                </a>
              )}
              {call && (
                <a href={call} className={p.channel}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className={p.channelIcon}><Icon d={<path d="M8 3.5 10.5 8 8.8 9.7a12 12 0 0 0 5.5 5.5l1.7-1.7 4.5 2.5c0 2.6-1.9 4.5-4.3 4.5C9.6 20.5 3.5 14.4 3.5 7.8 3.5 5.4 5.4 3.5 8 3.5Z" />} /></span><span><strong>{displayPhone(call.replace('tel:+', ''))}</strong><small>Call us</small></span></span>
                  <Icon d={<path d="M5 12h14M13 6l6 6-6 6" />} />
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className={p.channel}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span className={p.channelIcon}><Icon d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>} /></span><span><strong>{email}</strong><small>For proposals and documents</small></span></span>
                  <Icon d={<path d="M5 12h14M13 6l6 6-6 6" />} />
                </a>
              )}
            </div>
          </div>
          <ContactForm initial={prefill} />
        </Reveal>

        <Reveal as="section" aria-label="Common questions" className={p.faqs3}>
          <div><h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20 }}>Is the first call free?</h2><p>Yes. We use it to understand your business and tell you honestly what you need.</p></div>
          <div><h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20 }}>How long does a project take?</h2><p>About 15 days on average. Your proposal gives an exact timeline.</p></div>
          <div><h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20 }}>Can I see a price first?</h2><p>Use the <Link href="/cost-estimator" style={{ color: 'var(--accent-text)' }}>free cost estimator</Link> for an indicative figure before we talk.</p></div>
        </Reveal>
      </main>
      <Footer />
      <TabBarSpacer />
    </>
  )
}
