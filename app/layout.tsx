import type { Metadata } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'
import './globals.css'
import Cursor from '@/components/Cursor'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HARKON — Digital Solutions',
  description: 'HARKON crafts custom websites, booking systems, management platforms, mobile apps and WhatsApp integrations — built to scale your business from day one.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        {children}
        <Cursor />
      </body>
    </html>
  )
}
