import Image from 'next/image'

export default function Footer() {
  return (
    <footer style={{ position: 'relative', zIndex: 2, borderTop: '1px solid var(--border)', padding: '24px clamp(20px,5vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: 'var(--bg)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontSize: 17, letterSpacing: '0.06em', color: 'var(--text)' }}>
        <Image src="/logo-icon-ondark.png" alt="" width={50} height={50} className="show-on-dark" style={{ flexShrink: 0 }} />
        <Image src="/logo-icon-onlight.png" alt="" width={50} height={50} className="show-on-light" style={{ flexShrink: 0 }} />
        Exter Cloud
      </span>
      <p style={{ fontSize: 11, color: 'var(--muted2)', margin: 0 }}>© 2026 Exter Cloud</p>
    </footer>
  )
}
