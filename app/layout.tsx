import type { Metadata } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'
import './globals.css'
import SplashScreen from '@/components/SplashScreen'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://exter-cloud.vercel.app'),
  title: 'Exter Cloud',
  description: 'Exter Cloud crafts custom websites, booking systems, management platforms, mobile apps and WhatsApp integrations — built to scale your business from day one.',
  openGraph: {
    title: 'Exter Cloud — Orchestrate Beyond',
    description: 'Exter Cloud crafts custom websites, booking systems, management platforms, mobile apps and WhatsApp integrations — built to scale your business from day one.',
    siteName: 'Exter Cloud',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Exter Cloud — Orchestrate Beyond',
    description: 'Exter Cloud crafts custom websites, booking systems, management platforms, mobile apps and WhatsApp integrations — built to scale your business from day one.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}`,
          }}
        />
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}
