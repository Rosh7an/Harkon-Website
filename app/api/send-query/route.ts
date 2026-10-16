import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { CONTACT_MESSAGE_MAX } from '@/utils/contactLimits'

export async function POST(req: Request) {
  const to = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!to || !apiKey) {
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid inquiry fields.' }, { status: 400 })
  }
  const fields = body as Record<string, unknown>
  const intent = Object.hasOwn(fields, 'intent') ? fields.intent : 'query'
  if ((intent !== 'query' && intent !== 'callback') || (fields.preferredTime !== undefined && (typeof fields.preferredTime !== 'string' || fields.preferredTime.trim().length > 200))) {
    return NextResponse.json({ error: 'Invalid call-request fields.' }, { status: 400 })
  }
  const preferredTime = typeof fields.preferredTime === 'string' ? fields.preferredTime.trim() : ''
  if (!['name', 'phone', 'email', 'message'].every(key => typeof fields[key] === 'string')) {
    return NextResponse.json({ error: 'Invalid inquiry fields.' }, { status: 400 })
  }
  const name = (fields.name as string).trim()
  const phone = (fields.phone as string).trim()
  const email = (fields.email as string).trim()
  const message = (fields.message as string).trim()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!name || !phone || !email || !message) {
    return NextResponse.json({ error: 'Name, phone, email, and message are required.' }, { status: 400 })
  }
  if (name.length > 100 || phone.length > 30 || email.length > 254 || message.length > CONTACT_MESSAGE_MAX || !emailPattern.test(email)) {
    return NextResponse.json({ error: 'One or more inquiry fields are invalid.' }, { status: 400 })
  }

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

  const html = `
    <div style="font-family: sans-serif; font-size: 14px; color: #0C2A43;">
      <h2 style="margin: 0 0 16px;">${intent === 'callback' ? 'New team call request' : 'New query'} from the Exter Cloud website</h2>
      <p style="margin: 0 0 6px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin: 0 0 6px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p style="margin: 0 0 6px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${intent === 'callback' ? `<p style="margin: 0 0 6px;"><strong>Preferred time:</strong> ${escapeHtml(preferredTime || 'Please contact the customer to agree a time')}</p><p>The customer wants to discuss the answers and estimate below. Please confirm the time and final scope with them.</p>` : ''}
      <p style="margin: 16px 0 6px;"><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(message)}</p>
    </div>
  `

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'Exter Cloud Website <website@extercloud.in>',
      to,
      replyTo: email,
      subject: intent === 'callback' ? `Team call requested by ${name}` : `New query from ${name}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resend send failed:', err)
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 502 })
  }
}
