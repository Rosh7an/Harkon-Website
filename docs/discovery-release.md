# Discovery consultant — first release

## Implemented boundaries

`/pricing` now offers guided business discovery and a manual solution builder.
The original estimator/chat components remain available in source for compatibility;
the new page does not mount them. The legacy estimate endpoint still works and now
rejects inherited IDs and missing required follow-up answers.

The conversation discovers business, pain, current tools, desired workflow, users,
constraints and first-release priority. Evidence-backed extraction can populate
several fields at once. The application asks only missing topics and moves to review
when all seven topics have an answer, including explicit uncertainty. Early review
is allowed, but missing critical facts remain unresolved. There is no confidence-score
shortcut to pricing and no infinite questioning loop.

Groq returns strict JSON-schema output. Local validation additionally checks ID
membership, size bounds, exact fact evidence and recommendation evidence. The model
cannot supply prices, change confirmation state or declare completion. Semantic
accuracy still needs human/customer evaluation: a schema is not proof of understanding.

## Solution and pricing

One shared foundation is combined with website, portal, mobile and/or admin surfaces.
Capability cores are counted once; each selected supported surface adds an adapter.
Integrations, modifiers and cross-surface acceptance work are explicit allocations.
The existing PERT engine applies integration surcharge, one deployment setup allocation,
QA, project management and risk. Priority delivery changes cost, not engineering hours.

All allocations in `utils/solutionCatalog.ts` are **provisional**. The split preserves
the existing website, portal and mobile base expected hours, but new capability,
adapter and coordination estimates require comparison against completed projects.
The final displayed range is indicative, not a binding quote. Recurring fees,
maintenance, ongoing SEO/marketing and taxes are excluded.

Billing type and existing CRM provider are required to price that work, not to
continue with an explicitly approved partial estimate. “Not decided” stays unanswered;
payments, an unspecified CRM connection and another external tool remain requested
but are removed from the priced subset. The same server-owned review rules drive
the UI, confirmation, restore and proposal. Invalid selections/dependencies still
block confirmation. Migration, regulated/legacy scope, incomplete critical facts
and unavailable AI mapping also require human review.

Valid planning defaults can be retained without a change event. They are labelled
estimate assumptions, not reported customer facts. Unchecked items are not included,
not inferred refusals. AI-preselected work stays draft until approval. Removing a
feature clears its hidden follow-up; the server also normalizes inactive answers.

Review and explicit confirmation are required before an estimate. Editing a fact
clears recommendations, selections and the previous confirmation. Changing selections
clears both client approval and partial-exclusion consent; server validation repeats
every pricing check. Resolving an unknown follow-up removes its exclusion on review.

## Sessions and configuration

Set server-only `DISCOVERY_SESSION_SECRET` to a dedicated random secret of at least
32 characters in production. Production fails closed without it. `GROQ_API_KEY`
enables AI assistance. `DISCOVERY_MODEL` defaults to the existing provider model;
changes require evaluation for strict schema support. `DISCOVERY_AI_ENABLED=false`
exercises fallback without external calls. A temporary legacy server-side provider-key
fallback remains for existing installations; migrate and rotate any publicly prefixed
provider key before production publication.

Sessions are AES-256-GCM encrypted snapshots, carried by the client as bearer tokens
and stored in sessionStorage for this browser tab. They expire after 24 hours and are
invalidated by catalogue changes or key rotation. No server database stores transcripts.
Development's ephemeral key invalidates sessions on server restart/recompilation;
configure a stable local secret when testing return visits.

This first release does not provide cross-device sessions, server revocation,
sales-team collaboration or a central immutable revision ledger. Revision checks and
UI locking prevent ordinary stale responses and double submissions; an old valid token
can still be replayed as an independent branch. The token is not authorization for
external side effects. Durable database sessions with atomic revision checks are the
next step if persistent sales workflows are introduced.

The route caps body/input/output sizes, model output tokens, provider timeout and
automatic retries. A per-instance IP guard limits requests; it is not a deployment-wide
quota. Configure hosting firewall rate limits and provider spending limits before a
public pilot. Forwarded IP headers are trustworthy only behind the configured proxy.

Customer answers go to Groq when AI is enabled. The entry screen explains this and
discourages credentials/customer-record input. Routine errors do not log transcripts or
provider response bodies. Only a customer proposal submission uses the existing email
flow. AI does not send emails or create CRM records.

Contact form and API share a 40,000-character message limit so all seven maximum-length
answers and bounded review notes can be handed off without silent truncation. PDF export
uses portable standard fonts, INR amounts and paginated text. Scripts missing from those
fonts produce an actionable error directing users to the proposal form; a multilingual
embedded-font export is a later enhancement.

## Verification and pilot gate

Default/unchecked-choice fix verified on 2026-10-13: 82 tests passed, TypeScript
passed and the production build completed. Browser verification confirmed unchanged
planning defaults, undecided payment/CRM partial confirmation, unpriced external
connections, refresh recovery and proposal prefill. The final 375px review has
readable short defaults, associated explanatory text and no horizontal overflow.
The website-only priced subset remains INR 18,700–26,400 (78–110 hours), even with
undecided payments and a customer-system connection retained as requested work.
No live AI call or email was sent. The fresh final browser session had no console
errors. The local preview uses a temporary session key, so restart invalidates
older local sessions; this does not alter production configuration.

Local checks on 2026-10-13: 66 automated tests passed, TypeScript checking passed,
and the production build completed. Browser verification covered the seven-question
guided fallback, explicit partial exclusions, corrections clearing old prices,
multi-surface manual confirmation, encrypted refresh recovery, proposal prefill,
keyboard progression, and 375px dark/light layouts without horizontal overflow.
The website/portal/mobile plus CRM/SEO/accounts trace produced INR 149,400–211,000
and 623–879 hours, with one foundation and one CRM core. A synthetic three-page PDF
was generated and all pages rendered for inspection. The browser download event was
not captured, so end-to-end download verification remains open. No live AI request
or real email was sent; provider success/failure and email boundaries use mocks.

Run automated tests, type checking and production build. Browser-check guided fallback,
multi-surface manual composition, dependencies, required answers, explicit partial
estimates, corrections, refresh recovery, proposal prefill and PDF pagination. Test
dark/light themes, narrow screens, keyboard navigation and announced errors.

Before publication, evaluate actual model behaviour using synthetic discovery fixtures
and a small set of consented pilot conversations. Cover vague input, several facts in
one answer, mid-conversation corrections, mixed website/CRM/mobile scope, unsupported
requirements and failures. Review semantic extraction, recommendation relevance,
repetition and price-critical omissions. Re-run fixtures after model/prompt changes.

Do not call this production-calibrated until the team reviews hour allocations,
session configuration, deployment-wide rate limiting and real model evaluations.

## Explicit platforms and team contact

Guided discovery preserves explicit English platform requests from the original
answers, even if an AI summary or a later recommendation omits one. Website plus
mobile requests stay together as draft selections, while declined platforms stay
excluded. Uncertain/later app requests remain for team discussion. This narrow
matcher is not general natural-language understanding: consented semantic/model
evaluation and human review remain part of the pilot gate. Customers can still
edit the draft before approving it; price computation is unchanged.

The estimate keeps proposal, PDF and edit actions and adds Call, WhatsApp and
Request a team call. Configure `NEXT_PUBLIC_WHATSAPP_PHONE` with the full public
international number. Optional `CONTACT_PHONE` supplies a separate call number;
otherwise Call uses the WhatsApp number. Only validated public links reach the
browser. Missing/invalid values leave direct actions unavailable, never fake links.
Restart/rebuild the local preview or deployment after changing these settings.

Call requests use the existing email handoff with the session summary, contact
details and an optional preferred time/timezone. The team must confirm a time:
no calendar appointment is booked automatically. WhatsApp contains a generic
greeting only, not the transcript or estimate. Calls/messages are customer-initiated.

## Advanced version

Extend this same bounded system with database-backed sessions, approved human review,
industry-specific workflows, richer integration specifications, phased alternatives,
measured conversion/correction rates, and separately evaluated document/voice inputs.
Pricing remains deterministic and customer-confirmed. Multi-agent execution and
automatic external actions are not needed for the first release.
