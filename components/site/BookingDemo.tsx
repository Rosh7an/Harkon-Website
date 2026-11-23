'use client'

import { useState } from 'react'
import Image from 'next/image'
import ui from './ui.module.css'
import p from './Pages.module.css'

interface Industry {
  label: string
  choose: string
  options: { name: string; note: string }[]
  times: string[]
  confirm: (option: string, time: string) => string
}

export const INDUSTRIES: Industry[] = [
  { label: 'Healthcare', choose: 'Choose a department', options: [{ name: 'General medicine', note: 'Consultation' }, { name: 'Paediatrics', note: 'Child health' }], times: ['9:30', '10:30', '11:15', '16:00'], confirm: (o, t) => `Your ${o.toLowerCase()} appointment is confirmed for tomorrow at ${t}.` },
  { label: 'Restaurant', choose: 'Choose a table', options: [{ name: 'Table for 2', note: 'Indoor' }, { name: 'Table for 4', note: 'Family seating' }], times: ['19:00', '19:30', '20:15', '21:00'], confirm: (o, t) => `Your ${o.toLowerCase()} is reserved for tonight at ${t}.` },
  { label: 'Classes', choose: 'Choose a batch', options: [{ name: 'Morning batch', note: 'Beginner' }, { name: 'Weekend batch', note: 'Advanced' }], times: ['7:00', '8:30', '10:00', '18:00'], confirm: (o, t) => `Your seat in the ${o.toLowerCase()} is booked, starting ${t}.` },
  { label: 'Hotel', choose: 'Choose a room', options: [{ name: 'Deluxe room', note: '2 guests' }, { name: 'Family suite', note: '4 guests' }], times: ['Fri', 'Sat', 'Sun', 'Mon'], confirm: (o, t) => `Your ${o.toLowerCase()} is confirmed for check-in on ${t}.` },
]

/** Try-it booking flow: pick an industry, option and time, then see the WhatsApp confirmation. Nothing is sent anywhere. */
export default function BookingDemo() {
  const [industry, setIndustry] = useState(0)
  const [option, setOption] = useState(0)
  const [slot, setSlot] = useState<number | null>(null)
  const [booked, setBooked] = useState(false)
  const current = INDUSTRIES[industry]

  const pickIndustry = (index: number) => { setIndustry(index); setOption(0); setSlot(null); setBooked(false) }
  const book = () => {
    if (booked) { setSlot(null); setBooked(false) }
    else if (slot !== null) setBooked(true)
  }

  return (
    <div className={ui.glassFrame}>
      <div className={`${ui.glassInner} ${p.demo}`}>
        <div className={p.demoTop}>
          <span className={p.demoLabel}>TRY IT · PICK YOUR INDUSTRY</span>
          <div role="tablist" aria-label="Industry" className={p.segmented}>
            {INDUSTRIES.map((item, index) => (
              <button key={item.label} type="button" role="tab" aria-selected={index === industry} className={index === industry ? p.segmentOn : p.segment} onClick={() => pickIndustry(index)}>{item.label}</button>
            ))}
          </div>
        </div>

        <div className={p.demoBody}>
          <div className={p.demoForm}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className={p.demoStepLabel} id="demo-option-label">1. {current.choose}</span>
              <div className={p.optGrid} role="group" aria-labelledby="demo-option-label">
                {current.options.map((item, index) => (
                  <button key={item.name} type="button" aria-pressed={index === option} className={index === option ? p.optOn : p.opt} onClick={() => { setOption(index); setBooked(false) }}>
                    <strong>{item.name}</strong><small>{item.note}</small>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className={p.demoStepLabel} id="demo-time-label">2. Pick a time</span>
              <div className={p.slotGrid} role="group" aria-labelledby="demo-time-label">
                {current.times.map((time, index) => (
                  <button key={time} type="button" aria-pressed={index === slot} className={index === slot ? p.slotOn : p.slot} onClick={() => { setSlot(index); setBooked(false) }}>{time}</button>
                ))}
              </div>
            </div>
            <button type="button" className={booked ? p.bookDone : slot === null ? p.bookBtn : p.bookReady} onClick={book} aria-disabled={slot === null && !booked}>
              {booked ? 'Booked. Try again' : slot === null ? 'Pick a time to book' : 'Book now'}
            </button>
          </div>

          <div className={p.phone}>
            <div className={p.phoneFrame}>
              <div className={p.phoneScreen}>
                <div className={p.phoneHead}>
                  <Image src="/logo-icon-ondark.png" alt="" width={32} height={32} />
                  <span><strong>Your business</strong><small>WhatsApp · automatic</small></span>
                </div>
                <div className={p.phoneBody} aria-live="polite">
                  {booked && slot !== null ? (
                    <>
                      <div className={p.bubble}>{current.confirm(current.options[option].name, current.times[slot])}</div>
                      <div className={p.bubble} style={{ animationDelay: '.5s' }}>We’ll remind you before your time. Reply 1 to change it.</div>
                      <div className={p.badgeOk} style={{ animationDelay: '1s' }}>ADDED TO YOUR CALENDAR</div>
                    </>
                  ) : (
                    <p className={p.waiting}>Make a booking to see what your customer receives.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
