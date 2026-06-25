export default function Footer() {
  return (
    <footer style={{ position: 'relative', zIndex: 2, borderTop: '1px solid var(--border)', padding: '24px clamp(20px,5vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--font)', fontSize: 17, letterSpacing: '0.06em', color: 'var(--text)' }}>
        <span style={{ color: 'var(--accent)' }}>H</span>ARKON
      </span>
      <p style={{ fontSize: 11, color: 'var(--muted2)', margin: 0 }}>© 2026 HARKON</p>
    </footer>
  )
}
