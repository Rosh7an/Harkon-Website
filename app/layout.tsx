import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { SITE_URL } from '@/utils/siteProfile'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-bricolage', display: 'swap' })
const geist = Geist({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-geist', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-geist-mono', display: 'swap' })
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument', display: 'swap' })

const DESCRIPTION = 'Exter Cloud is a digital partner for small and growing businesses: websites, Google search (SEO), social media marketing, lead generation, CRM, WhatsApp automation, booking systems, LMS and mobile apps.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Exter Cloud: grow your business, we handle the digital',
  description: DESCRIPTION,
  openGraph: { title: 'Exter Cloud', description: DESCRIPTION, siteName: 'Exter Cloud', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Exter Cloud', description: DESCRIPTION },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [bricolage.variable, geist.variable, geistMono.variable, instrument.variable].join(' ')
  return (
    // The inline script below sets data-theme before React hydrates, so the
    // attribute legitimately differs from the server render.
    <html lang="en" className={fonts} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');try{if(localStorage.getItem('theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  )
}
