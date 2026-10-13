import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  const to = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL
  const apiKey = process.env.RESEND_API_KEY

  if (!to || !apiKey) {
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 })
  }

  let body: { name?: string; phone?: string; email?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const phone = (body.phone ?? '').trim()
  const email = (body.email ?? '').trim()
  const message = (body.message ?? '').trim()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!name || !phone || !email || !message) {
    return NextResponse.json({ error: 'Name, phone, email, and message are required.' }, { status: 400 })
  }
  if (name.length > 100 || phone.length > 30 || email.length > 254 || message.length > 10000 || !emailPattern.test(email)) {
    return NextResponse.json({ error: 'One or more inquiry fields are invalid.' }, { status: 400 })
  }

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

  const html = `
    <div style="font-family: sans-serif; font-size: 14px; color: #0C2A43;">
      <h2 style="margin: 0 0 16px;">New query from the Exter Cloud website</h2>
      <p style="margin: 0 0 6px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin: 0 0 6px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p style="margin: 0 0 6px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
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
      subject: `New query from ${name}`,
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
