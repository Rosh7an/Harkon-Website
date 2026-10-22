# Discovery experience — non-technical customer review

## Assessment

The question-first path is approachable: one topic at a time, plain answers,
optional suggestions and an explicit uncertainty choice. The earlier review screen
was too dense for a first-time customer. It exposed technical product terms,
sixteen choices and calculation language together, while the requirements summary
kept growing. A customer had to understand software categories before deciding what
to do next. This assessment is based on interface inspection, not a customer study.

## Changes

- Three visible milestones: Requirements, Plan Selection, Estimate, with a visible
  "Step X of 3", distinct active states and checks for completed phases. Each phase
  receives one third of the progress bar. Guided discovery advances by captured
  topics (including explicit uncertainty); question counts stay in the active panel.
  Manual requirements cover interface selection; features and details advance the
  selection phase. Review consent advances the final phase to at most 95%, and only
  a confirmed server estimate reaches 100%. This is workflow progress, not a
  confidence score or a declaration that every requirement is known.
- Discovery requests retry a connection failure or HTTP 502/503/504 once using the
  same serialized snapshot. Aborts, validation failures and rate limits do not retry.
  Successful responses are validated before changing the current panel, so malformed
  data leaves the existing question, inputs and draft intact.
- Outcome-first choice labels: an online workspace, customer follow-ups, staff
  logins and website search setup. Canonical IDs and pricing rules are unchanged.
- Connections and extra needs use an optional disclosure, with a selected count.
  Earlier conversation and calculation detail can also be opened when wanted.
- The right-hand summary has a bounded, keyboard-focusable scroll area. Its title
  and guidance remain outside that scroll area. On narrow screens it sits below the
  current task rather than becoming a fixed overlay.
- Glass panels add translucency, a restrained background glow, border highlights
  and depth using the existing palette. Opaque surfaces remain the blur fallback.
  Motion is limited to interaction/progress feedback and respects reduced motion.
- Missing information, partial exclusions and explicit confirmation remain visible.
  Important running-cost exclusions are not hidden in the optional section.

## What still needs customer validation

The manual builder still asks customers to choose products and features. It is a
shortcut for people who already know what they want, not the easiest starting point
for everyone. The review step also still contains several decisions: payment type,
delivery preference and how much has been decided. These choices affect pricing and
cannot be silently guessed to make the form look simpler.

Defaults are not automatically reported answers. Customers may keep valid planning
defaults and approve them as estimate assumptions without changing a dropdown.
An unanswered/undecided payment method or customer-system provider can stay as-is:
explicit partial consent excludes that work from pricing and keeps it for discussion.
Unchecked items are outside the selected scope, not statements that they are unwanted.
Hidden follow-ups are cleared on deselection, and changes reset approval and partial
consent so an old acknowledgement cannot cover a different plan.

Have a small group of non-technical customers try the guided path without coaching.
Ask whether they can explain the current stage, use the uncertainty option, find and
correct an earlier answer, review the suggested work, and explain why a partial
estimate is not the whole project cost. Record the words and decisions that cause
hesitation before adding more features. Do not claim universal usability or improved
conversion without this evidence.

## Verification scope

Automated coverage includes empty progress, normal topic progress, uncertainty,
early review, final partial estimates, canonical choice coverage, optional disclosures,
approval gates and unchanged pricing requests. Browser checks cover desktop, 375px
portrait, 812px landscape, both themes and keyboard summary scrolling. Live AI
semantics, real email delivery and a full assistive-technology audit are separate
checks, not implied by the visual review.
