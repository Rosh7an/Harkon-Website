// Copy for the marketing pages, kept in one place so the home page, services
// explorer, mobile layout and footer never drift apart. Anything marked
// "sample" is placeholder content to replace with real details before launch.

export type PreviewKind = 'web' | 'seo' | 'social' | 'ads' | 'leads' | 'crm' | 'whatsapp' | 'booking' | 'manage' | 'lms' | 'app' | 'custom'

export interface Service {
  slug: string
  name: string
  tag: string
  does: string
  gets: string[]
  goodFor: string[]
  href?: string
}

export interface ServiceGroup {
  id: string
  label: string
  line: string
  services: Service[]
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: 'get-found', label: 'Get found', line: 'Bring the right people to your business.',
    services: [
      { slug: 'websites', name: 'A website that brings enquiries', tag: 'Website design', does: 'A custom website that shows what you do, builds trust and turns visitors into calls and enquiries.', gets: ['Designed for your industry and customers', 'Fast on every phone', 'Easy for you to update'], goodFor: ['Clinics', 'Shops', 'Restaurants', 'Consultants'] },
      { slug: 'seo', name: 'Show up on Google', tag: 'SEO', does: 'We set up your website and Google Business profile so people searching nearby find you first.', gets: ['Google Business profile set-up', 'Pages built around what customers search', 'Speed and technical fixes'], goodFor: ['Local businesses', 'Clinics', 'Service providers'] },
      { slug: 'social-media', name: 'Grow on Instagram and Facebook', tag: 'Social media marketing', does: 'Regular posts, reels and stories that keep your business in front of the right people.', gets: ['A content calendar planned for you', 'Posts and reels designed and published', 'A simple monthly summary'], goodFor: ['Retail', 'Food', 'Fashion', 'Education'] },
      { slug: 'ads', name: 'Ads that bring buyers', tag: 'Ad campaigns', does: 'Google and social media ads shown only to people likely to buy, within a budget you set.', gets: ['Ads on Google, Instagram and Facebook', 'Targeting by area and interest', 'A clear view of what your spend brings back'], goodFor: ['New launches', 'Offers', 'Lead-based businesses'] },
    ],
  },
  {
    id: 'win-customers', label: 'Win customers', line: 'Turn interest into paying customers.',
    services: [
      { slug: 'lead-generation', name: 'Get more enquiries every week', tag: 'Lead generation', does: 'A steady flow of enquiries from landing pages, ads and forms, sent straight to you.', gets: ['Landing pages and enquiry forms', 'Every enquiry sent to WhatsApp or email', 'See where each enquiry came from'], goodFor: ['Real estate', 'Education', 'Services'] },
      { slug: 'crm', name: 'Never forget a customer', tag: 'CRM', does: 'One list of every enquiry and customer, with reminders so no one is forgotten.', gets: ['All enquiries in one place', 'Follow-up reminders on your phone', 'See who is close to buying'], goodFor: ['Sales teams', 'Agencies', 'Clinics'] },
      { slug: 'whatsapp', name: 'WhatsApp that replies for you', tag: 'WhatsApp automation', does: 'Automatic replies, confirmations and reminders through the official WhatsApp Business API.', gets: ['Instant replies, even at night', 'Booking and payment confirmations', 'Broadcasts to your customer list'], goodFor: ['Any business on WhatsApp'] },
      { slug: 'booking', name: 'Let customers book themselves', tag: 'Booking system', does: 'Customers book appointments, tables, classes or rooms online, any time, and get reminded.', gets: ['An online booking page', 'Staff calendars', 'Reminders on WhatsApp'], goodFor: ['Hospitals', 'Restaurants', 'Hotels', 'Classes'], href: '/services/booking' },
    ],
  },
  {
    id: 'run-and-grow', label: 'Run and grow', line: 'Keep the whole business running smoothly.',
    services: [
      { slug: 'management-software', name: 'Run your business from one screen', tag: 'Management software', does: 'Software for stock, staff, billing and reports, so you can stop using paper registers.', gets: ['Stock and billing in one place', 'Staff roles and access', 'Daily reports at a glance'], goodFor: ['Retail', 'Pharmacies', 'Hospitals', 'Distributors'] },
      { slug: 'lms', name: 'Your own online classroom', tag: 'LMS', does: 'Your own platform to sell courses or train your staff, with videos, tests and certificates.', gets: ['Video lessons and tests', 'Student progress tracking', 'Certificates and payments'], goodFor: ['Coaching centres', 'Trainers', 'Companies'] },
      { slug: 'mobile-apps', name: 'Your business on their phone', tag: 'Mobile app', does: 'An iPhone and Android app so repeat customers can order, book or pay in one tap.', gets: ['iOS and Android', 'Push notifications', 'Published on the app stores'], goodFor: ['Food', 'Retail', 'Fitness'] },
      { slug: 'custom-software', name: 'Something made just for you', tag: 'Custom software', does: 'Payment gateways, loyalty programmes, delivery tracking or your own idea, built to fit.', gets: ['Scoped with you first', 'Connects to the tools you use', 'Built to grow with you'], goodFor: ['Any business'] },
    ],
  },
]

export const ALL_SERVICES = SERVICE_GROUPS.flatMap(group => group.services)

export interface Problem { id: string; label: string; short: string; build: string[]; outcome: string }

export const PROBLEMS: Problem[] = [
  { id: 'more-customers', label: 'Not enough customers', short: 'Get more customers', build: ['Show up on Google', 'Grow on Instagram and Facebook', 'Ads that bring buyers'], outcome: 'More people find you, trust you and get in touch.' },
  { id: 'lost-leads', label: 'Leads slip through the cracks', short: 'Stop losing enquiries', build: ['Get more enquiries every week', 'Never forget a customer', 'WhatsApp that replies for you'], outcome: 'Every enquiry is captured and followed up on time.' },
  { id: 'manual-work', label: 'Too much manual work', short: 'Less paperwork', build: ['Run your business from one screen', 'WhatsApp that replies for you'], outcome: 'Less paperwork and no missed messages.' },
  { id: 'teach-online', label: 'Want to teach or train online', short: 'Teach or train online', build: ['Your own online classroom', 'Your business on their phone'], outcome: 'Sell and run your courses from one place.' },
  { id: 'bookings', label: 'Customers can’t book easily', short: 'Let customers book', build: ['Let customers book themselves', 'WhatsApp that replies for you'], outcome: 'Customers book any time and get reminded on their own.' },
]

// Figures the business already states publicly. 24/7 describes how the
// products work, not a measured result.
export const NUMBERS = [
  { value: 15, prefix: '', suffix: ' days', label: 'average time to go live' },
  { value: null, display: '24/7', prefix: '', suffix: '', label: 'your customers can book, even while you sleep' },
  { value: 7, prefix: '', suffix: '+', label: 'long-term projects, in India and abroad' },
  { value: 4, prefix: '', suffix: '+ yrs', label: 'building software for businesses' },
] as const

export const MARQUEE = ['Websites', 'Google search', 'Instagram and Facebook', 'Ads', 'More enquiries', 'Customer follow-ups', 'WhatsApp replies', 'Online bookings', 'Billing and stock', 'Online courses', 'Mobile apps', 'Custom software']

export const STEPS = [
  { title: 'Tell us your problem', text: 'A free call in plain language. No technical knowledge needed.' },
  { title: 'We plan and build it', text: 'A fixed price before we start, and progress you can see every week.' },
  { title: 'You launch and grow', text: 'We train your team and stay with you as the business grows.' },
]

export const FAQS = [
  { q: 'Do I need any technical knowledge?', a: 'No. We explain everything in plain language, handle the technical work, and train your team before launch.' },
  { q: 'How long does a project take?', a: 'About 15 days on average. Bigger systems take longer, and your proposal gives the exact timeline before we start.' },
  { q: 'Can I start with one service and add more later?', a: 'Yes. Most businesses start with one thing, like a website or booking, and add more as they grow. Everything we build is designed to connect.' },
  { q: 'Do you work with businesses outside India?', a: 'Yes. We work with clients in India and abroad, and everything can be handled online.' },
  { q: 'What happens after launch?', a: 'We train your team, share simple guides, and stay on for support so the system keeps working as your business grows.' },
]

export interface Project { slug: string; title: string; category: string; tags: string[]; kind: PreviewKind; tint: string; summary: string; built: string[] }

// Sample projects showing the kind of work Exter Cloud does. Replace with real
// projects, screenshots and outcomes before launch.
export const PROJECTS: Project[] = [
  { slug: 'hospital-portal', title: 'Hospital patient portal', category: 'Healthcare · Booking', tags: ['Healthcare', 'Booking'], kind: 'booking', tint: '216, 90, 48', summary: 'Patients book appointments with any department online, get WhatsApp reminders, and see their visit details in one place.', built: ['Website', 'Booking system', 'WhatsApp reminders', 'Admin dashboard'] },
  { slug: 'clinic-whatsapp', title: 'Clinic WhatsApp assistant', category: 'Healthcare · WhatsApp', tags: ['Healthcare', 'Booking'], kind: 'whatsapp', tint: '63, 185, 122', summary: 'Patients ask questions, book visits and get reminders on WhatsApp, without waiting for the front desk.', built: ['WhatsApp automation', 'Booking system', 'Patient list'] },
  { slug: 'real-estate-crm', title: 'Real estate lead tracker', category: 'CRM', tags: ['CRM'], kind: 'crm', tint: '120, 140, 255', summary: 'Every property enquiry from ads and listing portals lands in one list, with follow-up reminders for the sales team.', built: ['CRM', 'Lead generation', 'WhatsApp follow-ups'] },
  { slug: 'coaching-lms', title: 'Coaching centre online classroom', category: 'Learning', tags: ['Learning'], kind: 'lms', tint: '240, 190, 90', summary: 'Students watch lessons, take tests and get certificates. Fees are collected online and teachers track progress.', built: ['LMS', 'Online payments', 'Mobile-friendly site'] },
  { slug: 'restaurant-app', title: 'Restaurant ordering app', category: 'Apps', tags: ['Apps'], kind: 'app', tint: '216, 90, 48', summary: 'Regular customers reorder favourites in one tap, track delivery, and get offers by push notification.', built: ['Mobile app', 'Online payments', 'Order dashboard'] },
  { slug: 'retail-billing', title: 'Retail billing and stock', category: 'Business software', tags: ['Apps'], kind: 'manage', tint: '120, 140, 255', summary: 'Billing, stock alerts and daily sales reports for a growing retail store, replacing paper registers.', built: ['Management software', 'Billing', 'Reports'] },
]

export const PROJECT_FILTERS = ['All', 'Healthcare', 'Booking', 'CRM', 'Learning', 'Apps']

export function filterProjects(filter: string): Project[] {
  return filter === 'All' ? PROJECTS : PROJECTS.filter(project => project.tags.includes(filter))
}

// Sample founder bios and story. Confirm or rewrite before launch.
export const FOUNDERS = [
  { name: 'Roshan J', role: 'Co-founder · Clients, team and growth', initial: 'R', tint: '216, 90, 48', bio: 'Roshan J looks after the people side of Exter Cloud: client relationships, managing the team and keeping every client close to their project. Roshan also shares how our work gets done, building the company’s name and network to take Exter Cloud to the next level.' },
  { name: 'Gokul A S', role: 'Co-founder · Technology and creative', initial: 'G', tint: '120, 140, 255', bio: 'Gokul A S leads the technical and creative side of Exter Cloud. Gokul puts the time and effort into bringing what we plan to life: designing, building, developing and deploying every project so it works smoothly from day one.' },
]

export const STORY = [
  { when: '2022', short: 'Graduated', title: 'Out of college and into the IT industry.', text: 'In 2022 Roshan J and Gokul A S finished college and joined different IT companies as software developers.', mark: 'Where it began' },
  { when: '2022', short: 'Learning', title: 'Years inside real software teams.', text: 'Working across several companies, we learned how software is really built and delivered, and how much everyday work is still slow, manual and repetitive.', mark: 'Several companies, one lesson' },
  { when: '2026', short: 'AI', title: 'AI showed us what is possible.', text: 'Using AI in our own work, we got far more done in a much shorter time. It showed us how fast things are about to change, and made us dream bigger.', mark: 'Seeing the possibilities' },
  { when: '2026', short: 'The decision', title: 'We chose to build something of our own.', text: 'AI is making this race faster and more competitive, so we did not wait. We started Exter Cloud to put these tools to work for businesses.', mark: 'Exter Cloud begins' },
  { when: 'Today', short: 'Automation', title: 'Websites today, automation at the heart.', text: 'We build websites for our clients, and our focus is automation: taking hectic, repetitive work off people’s plates with AI, and going beyond what clients expect.', mark: 'Automating the hectic work' },
]

export const VALUES = [
  { label: 'Mission', text: 'To automate the hectic, repetitive work in every business by putting AI to work.' },
  { label: 'Vision', text: 'To bring automation to businesses of every size, and to deliver beyond what our clients expect.' },
  { label: 'Values', text: 'To deliver products that drive real business growth, built with utmost sincerity and full transparency.' },
]
