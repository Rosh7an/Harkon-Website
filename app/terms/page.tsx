import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, LegalSection } from '@/components/LegalPage'
import { SITE_PROFILE, contactEmail } from '@/utils/siteProfile'

// Keep in line with how the Cost Estimator presents prices and with the
// Privacy Policy. Have it reviewed before publishing.
export const metadata: Metadata = {
  title: 'Terms of Use — Exter Cloud',
  description: 'The terms that apply when you use the Exter Cloud website and Cost Estimator.',
  alternates: { canonical: 'https://www.extercloud.in/terms' },
}

export default function TermsPage() {
  const email = contactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL)
  const contact = email ? <a href={`mailto:${email}`}>{email}</a> : <Link href="/contact">our contact page</Link>
  const name = SITE_PROFILE.name
  return (
    <LegalPage title="Terms of Use" updated="6 November 2026" intro={<>
      <p>These terms apply to your use of the {name} website, including the Cost Estimator. By using the website, you agree to them. If you do not agree, please do not use the website.</p>
      <p>Any project we build for you will be covered by a separate written agreement, which takes priority over these terms.</p>
    </>}>
      <LegalSection title="Estimates are not quotations">
        <p>The Cost Estimator gives an indicative price range and timeline based on the information you provide and our standard planning allowances. An estimate, including any PDF you download:</p>
        <ul>
          <li>is not a quotation, offer, invoice or agreement to deliver;</li>
          <li>may change once we review your workflow, integrations, existing data, security needs and other details with you; and</li>
          <li>excludes hosting, domains, third-party licences, messaging charges, AI usage, maintenance, ongoing marketing and taxes unless stated otherwise.</li>
        </ul>
        <p>Prices, offers and timelines are confirmed only in a written proposal from {name}, and offers may change or end at any time before that.</p>
      </LegalSection>

      <LegalSection title="AI suggestions">
        <p>The Cost Estimator uses AI to suggest features from your answers. Suggestions can be incomplete or wrong. You decide what to include, and you should review the plan before confirming it. A consultant can review it with you.</p>
      </LegalSection>

      <LegalSection title="Using the website">
        <p>Please provide accurate information and only share information you are allowed to share. You agree not to:</p>
        <ul>
          <li>use the website for anything unlawful, misleading or harmful;</li>
          <li>send automated or excessive requests, or try to get around usage limits;</li>
          <li>try to access systems or data you are not authorised to access, or disrupt the website; or</li>
          <li>submit passwords, payment card details or other sensitive personal information through our forms or the Cost Estimator.</li>
        </ul>
        <p>We may limit or block access to protect the website and other users.</p>
      </LegalSection>

      <LegalSection title="Content and ownership">
        <p>The website&apos;s design, text, graphics, logos and software belong to {name} or its licensors. You may view and share pages for your own business use, but you may not copy, resell or reuse them without our permission.</p>
        <p>You keep ownership of the information you send us. You allow us to use it to respond to you, prepare estimates and proposals, and discuss your project, as described in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </LegalSection>

      <LegalSection title="Other websites and services">
        <p>Links to WhatsApp, social networks and other services are for convenience. Those services have their own terms and privacy policies, and we are not responsible for them.</p>
      </LegalSection>

      <LegalSection title="Availability and liability">
        <p>We work to keep the website accurate and available, but we provide it &ldquo;as is&rdquo; and do not promise that it will always be available, error-free or suitable for a particular purpose.</p>
        <p>To the extent the law allows, {name} is not liable for any indirect or consequential loss, or for decisions made solely on the basis of an estimate or AI suggestion from this website. Nothing in these terms limits any liability that cannot be limited by law.</p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>These terms are governed by the laws of India.{SITE_PROFILE.jurisdiction ? ` The courts in ${SITE_PROFILE.jurisdiction} have jurisdiction over any dispute arising from them.` : ''}</p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>We may update these terms from time to time. The date at the top shows when they were last updated. Questions about these terms: {contact}.</p>
      </LegalSection>
    </LegalPage>
  )
}
