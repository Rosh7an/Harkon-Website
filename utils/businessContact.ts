export interface BusinessContactLinks { call: string | null; whatsapp: string | null }

function internationalDigits(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[+\d\s()-]+$/.test(value.trim())) return null
  const digits = value.trim().replace(/[\s()-]/g, '').replace(/^\+/, '')
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
}

export function businessContactLinks(input?: { phone?: unknown; whatsapp?: unknown } | null): BusinessContactLinks {
  const whatsapp = internationalDigits(input?.whatsapp)
  const phone = internationalDigits(input?.phone ?? input?.whatsapp)
  // Never put session answers, financial details, or contact details in an
  // external URL. The customer can choose what to share in WhatsApp themselves.
  const greeting = 'Hi Exter Cloud, I would like to discuss a project estimate.'
  return { call: phone ? `tel:+${phone}` : null, whatsapp: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(greeting)}` : null }
}
