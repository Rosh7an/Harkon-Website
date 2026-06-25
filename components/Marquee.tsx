const PILLS = ['Niche Websites', 'Slot Booking', 'Management Systems', 'Mobile Apps', 'WhatsApp API', 'Custom Software', 'UI/UX Design', 'Payment Gateways', 'Loyalty Systems', 'CRM Integrations']

export default function Marquee() {
  const doubled = [...PILLS, ...PILLS]

  return (
    <div style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', height: 52, flexShrink: 0 }}>
      <div className="marquee-track">
        {doubled.map((name, i) => (
          <span
            key={i}
            style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(232,245,240,0.17)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: .35, flexShrink: 0, display: 'inline-block' }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
