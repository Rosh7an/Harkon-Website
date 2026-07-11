'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 900)
    const removeTimer = setTimeout(() => setVisible(false), 1300)
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity .4s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <Image
        src="/logo-lockup-ondark.png"
        alt="Exter Cloud"
        width={1330}
        height={882}
        priority
        className="show-on-dark"
        style={{ width: 'clamp(140px,18vw,220px)', height: 'auto', animation: 'fadeUp .6s ease both' }}
      />
      <Image
        src="/logo-lockup-onlight.png"
        alt="Exter Cloud"
        width={1330}
        height={882}
        priority
        className="show-on-light"
        style={{ width: 'clamp(140px,18vw,220px)', height: 'auto', animation: 'fadeUp .6s ease both' }}
      />
    </div>
  )
}
