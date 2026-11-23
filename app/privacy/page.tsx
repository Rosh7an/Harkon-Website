import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, LegalSection } from '@/components/LegalPage'
import { SITE_PROFILE, contactEmail } from '@/utils/siteProfile'

// Describes only what this website does today (see app/api and components).
// Update it whenever forms, AI providers, storage or analytics change, and have
// it reviewed before publishing.
export const metadata: Metadata = {
  title: 'Privacy Policy — Exter Cloud',
  description: 'How Exter Cloud collects, uses and protects the information you share on this website.',
  alternates: { canonical: 'https://www.extercloud.in/privacy' },
}

export default function PrivacyPage() {
  const email = contactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL)
  const contact = email ? <a href={`mailto:${email}`}>{email}</a> : <Link href="/contact">our contact page</Link>
  const name = SITE_PROFILE.name
  return (
    <LegalPage title="Privacy Policy" updated="6 November 2026" intro={<>
      <p>This policy explains what information {name} collects when you use this website, why we use it, who helps us process it, and the choices you have. It applies to this website only.</p>
      <p>We do not sell your information, show advertising, or use analytics or tracking cookies on this website.</p>
    </>}>
      <LegalSection title="Information you give us">
        <p><strong>Contact and call-back requests.</strong> When you send a query or ask for a call, we collect your name, phone number, email address, your message and, if you give one, a preferred time to call. We use these only to reply to you and discuss your project.</p>
        <p><strong>Cost Estimator.</strong> When you use the Cost Estimator, we process your answers about your business and the features you select, so we can suggest a solution and calculate an indicative estimate. Please do not include passwords, payment card details or other sensitive personal information in your answers.</p>
        <p><strong>WhatsApp and phone calls.</strong> Our WhatsApp and call links open your own app with a short greeting only. Anything you then send is handled under that service&apos;s own terms and privacy policy.</p>
      </LegalSection>

      <LegalSection title="Information collected automatically">
        <ul>
          <li><strong>Network address.</strong> We use your IP address to limit repeated requests and protect the website from abuse. It is held only in server memory and is forgotten about 10 minutes after your last counted request.</li>
          <li><strong>Hosting records.</strong> Like most websites, our hosting provider keeps standard request records, such as IP address, time, page requested and browser type, to operate and secure the service.</li>
          <li><strong>Error records.</strong> If the AI review fails, we record a reference number and the type of error. These records do not include your answers.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Information stored on your device">
        <ul>
          <li>Your light or dark theme choice, so the website remembers it.</li>
          <li>Your Cost Estimator draft, so you can continue after a refresh. It is kept in this browser tab&apos;s session storage, is cleared when you close the tab, and the saved plan expires after 24 hours. The plan is encrypted so it cannot be altered.</li>
          <li>The estimate PDF is created in your browser; it is not uploaded to us.</li>
        </ul>
        <p>We do not set cookies.</p>
      </LegalSection>

      <LegalSection title="Service providers we use">
        <p>We share information only with providers that help us run this website, and only as needed for that purpose:</p>
        <ul>
          <li><strong>Resend</strong> delivers contact and call-back requests to our team by email.</li>
          <li><strong>Groq</strong> runs the AI review in the Cost Estimator. When AI review runs, your estimator answers and selections are sent to Groq for analysis, which may take place outside India.</li>
          <li><strong>Our hosting provider</strong> runs the website and keeps the hosting records described above.</li>
        </ul>
        <p>We may also disclose information when the law requires it, or to protect our rights, our users or the public.</p>
      </LegalSection>

      <LegalSection title="How long we keep information">
        <p>We keep enquiry emails and related project notes only as long as we need them to respond, discuss and deliver your project, and to meet legal, accounting or tax obligations. Estimator drafts on your device expire as described above. We do not keep a separate copy of your estimator answers on our servers.</p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under India&apos;s Digital Personal Data Protection Act, 2023 and other applicable law, you can ask us to:</p>
        <ul>
          <li>confirm what personal information we hold about you and how we use it;</li>
          <li>correct, complete or update it;</li>
          <li>delete it, where we no longer need it or you withdraw your consent; and</li>
          <li>nominate someone to exercise these rights for you if you are unable to.</li>
        </ul>
        <p>To make a request or raise a concern, contact us at {contact}. We will respond within a reasonable time. If you are not satisfied with our response, you may complain to the Data Protection Board of India.</p>
      </LegalSection>

      <LegalSection title="Security">
        <p>The website is served over an encrypted connection, estimator plans are encrypted and signed, and access to enquiries is limited to our team. No method of transmission or storage is completely secure, but we take reasonable steps to protect your information.</p>
      </LegalSection>

      <LegalSection title="Children">
        <p>This website is intended for businesses and adults. We do not knowingly collect information from anyone under 18.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>We may update this policy as our website or services change. The date at the top shows when it was last updated.</p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>Questions about this policy or your information: {contact}.</p>
        {SITE_PROFILE.address.length > 0 && <address style={{ fontStyle: 'normal' }}>{name}<br />{SITE_PROFILE.address.map((line, index) => <span key={index}>{line}<br /></span>)}</address>}
      </LegalSection>
    </LegalPage>
  )
}
