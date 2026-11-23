import type { PreviewKind } from '@/utils/siteContent'
import s from './Preview.module.css'

const Svg = ({ d, size = 14 }: { d: React.ReactNode; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

function Toast({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className={s.toast}><span className={s.toastIcon}><Svg d={icon} /></span>{text}</div>
}

function Content({ kind }: { kind: PreviewKind }) {
  switch (kind) {
    case 'booking':
      return (
        <div className={s.fill}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#C9D1D8' }}><span>Thursday</span><span className={s.mono}>4 FREE</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            <span className={s.slot}>9:00</span><span className={s.slotTaken}>10:30</span><span className={`${s.slotOn} ${s.glowPulse}`}>12:00</span><span className={s.slot}>15:00</span>
          </div>
          <div className={s.in} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(63,185,122,0.12)', border: '1px solid rgba(63,185,122,0.3)', fontSize: 12.5, color: '#BFEFD2' }}>
            <Svg d={<path d="m5 12 4.5 4.5L19 7" />} size={15} />Booked for 12:00 · confirmation sent
          </div>
        </div>
      )
    case 'whatsapp':
      return (
        <div className={s.fill} style={{ justifyContent: 'center', borderRadius: 14, background: '#0E1A14', padding: 14 }}>
          <div className={s.bubbleOut}>Hi, what are your timings?</div>
          <div className={`${s.bubbleIn} ${s.in}`}>We’re open 9 to 7. Want to book a visit?</div>
          <div style={{ alignSelf: 'center', font: '500 10.5px/1 var(--font-mono)', color: '#7FD6A4', letterSpacing: '0.06em' }}>REPLIED INSTANTLY, AUTOMATICALLY</div>
        </div>
      )
    case 'crm':
      return (
        <>
          <div style={{ position: 'absolute', inset: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[['NEW', 3, '#7C8894'], ['TALKING', 2, '#7C8894'], ['WON', 1, '#7FD6A4']].map(([label, n, color]) => (
              <div key={label as string} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className={s.mono} style={{ color: color as string }}>{label}</span>
                {Array.from({ length: n as number }, (_, i) => <span key={i} style={{ height: 26, borderRadius: 7, background: label === 'WON' ? 'rgba(63,185,122,0.18)' : 'rgba(255,255,255,0.06)' }} />)}
              </div>
            ))}
          </div>
          <Toast icon={<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></>} text="Reminder: follow up on Tuesday’s enquiry" />
        </>
      )
    case 'lms':
      return (
        <div style={{ position: 'absolute', inset: 16, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1.3, borderRadius: 12, background: '#1A2733', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span className={s.glowPulse} style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F3EE', color: '#0C1A26', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
            <span style={{ position: 'absolute', left: 10, right: 10, bottom: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}><span style={{ display: 'block', height: 4, borderRadius: 2, background: '#D85A30', animation: 'ecBar 4.5s ease-out infinite' }} /></span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', fontSize: 11.5 }}>
            <span style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(63,185,122,0.12)', color: '#7FD6A4' }}>Lesson 1 · done</span>
            <span style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.06)' }}>Lesson 2 · watching</span>
            <span style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', color: '#7C8894' }}>Quiz · next</span>
            <span style={{ padding: '8px 10px', borderRadius: 9, border: '1px dashed rgba(240,153,123,0.5)', color: '#F0997B' }}>Certificate</span>
          </div>
        </div>
      )
    case 'app':
      return (
        <div style={{ position: 'absolute', left: '50%', top: 14, width: 150, marginLeft: -75, height: 230, borderRadius: 26, border: '1px solid rgba(255,255,255,0.16)', background: '#0B141D', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={s.in} style={{ padding: '8px 9px', borderRadius: 10, background: '#F5F3EE', color: '#0C1A26', fontSize: 10.5, fontWeight: 500 }}>Your order is on the way</div>
          <div style={{ height: 44, borderRadius: 10, background: '#1E2C39' }} />
          <div style={{ height: 30, borderRadius: 999, background: '#C24E25', color: '#FFFFFF', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Order again</div>
        </div>
      )
    case 'manage':
    default:
      return (
        <>
          <div className={s.fill}>
            <div className={s.row}><span>Item A</span><span style={{ color: '#7FD6A4' }}>In stock</span></div>
            <div className={`${s.rowHot} ${s.glowPulse}`}><span>Item B</span><span style={{ color: '#F0997B' }}>Only 3 left · reorder</span></div>
            <div className={s.row}><span>Today’s bills</span><span className={s.mono}>Sent</span></div>
          </div>
          <Toast icon={<path d="m5 12 4.5 4.5L19 7" />} text="Bill sent to customer" />
        </>
      )
  }
}

/** A decorative product screen. Hidden from assistive tech; the caption beside it carries the meaning. */
export default function Preview({ kind }: { kind: PreviewKind }) {
  return (
    <div className={s.box} aria-hidden="true">
      <div className={s.glow} />
      <Content kind={kind} />
    </div>
  )
}
