# BKLG-0062 — Verification record

## Source-level verification completed August 25, 2026

The following requirements have been verified in the production source on `main`:

- Homepage point-of-use source link exists next to the 2025 supervised-practice finding and points to `/research/#strongest-evidence`.
- Homepage has canonical URL, Open Graph title/description/type/url/image, and large-image social card metadata.
- Main research brief has canonical URL, Open Graph title/description/type/url/image, and large-image social card metadata.
- Teen drowsy-driving brief has canonical/social metadata and is included in `sitemap.xml`.
- Research/state-rule governance is documented with an August 16, 2027 next scheduled review and mandatory re-verification before enabling another state.
- No analytics, tracking-pixel, or third-party behavioral-measurement service was added by BKLG-0062.
- Waitlist is explicitly `noindex,nofollow` and remains outside the public sitemap.
- Text Parker Terms language reflects the service's live pilot status.
- The former mobile header rule that depended on the Account item being `:last-child` has been removed. Mobile layout now explicitly preserves the primary Log Your Drive action and the authenticated Account control.
- Canonical header initialization is singleton-safe even when more than one page bootstrap attempts to load it.
- Canonical header persona resolution uses authenticated data: operator status from `get_authenticated_dashboard_v1` and Driver/Grown-Up self-profile kind from `profile-api`.
- Canonical account navigation differs intentionally by persona: Driver, Grown-Up, and Operator.
- Family, Profile, Driver Console, and Operator tool entry points load the shared canonical header implementation.
- Active-page treatment is applied programmatically with `aria-current="page"` to matching navigation destinations.
- Join and Waitlist help markers are upgraded by the shared header script to an explicit DOM help disclosure supporting pointer hover, click/tap, keyboard Enter/Space, Escape dismissal, click-away dismissal, focusability, and visible keyboard focus. Waitlist's former `title`-only help text is normalized into the same disclosure implementation as Join.
- Help is part of the canonical desktop public banner and the authenticated Account disclosure. Mobile remains intentionally compact; authenticated mobile users reach Help through Account, while logged-out mobile users can reach Help from the footer.

## Public sitemap banner inventory

The current public sitemap contains `/`, `/text-parker/`, `/research/`, `/research/teen-drowsy-driving/`, `/help/`, `/privacy/`, and `/terms/`. All seven load the same canonical banner controller.

## Acceptance-test location clarification

The state-requirements map and expandable state-by-state table intentionally live on the homepage, not on `/research/`. `/research/` contains research/evidence tables and citations. No duplicate state table is required.

## Runtime verification evidence — August 25, 2026

All user-run runtime acceptance checks PASS:

- Logged-out homepage banner fits at phone width without horizontal scrolling.
- Join and Waitlist help controls pass touch/tap testing; Waitlist directly exercises FDBK-0002.
- Homepage state map/expandable state table, table scrolling, source links, and Join CTA behave correctly at phone width.
- `/research/` evidence tables and representative source links behave correctly at phone width.
- Public sitemap-page banners are consistent across the site.
- Help appears in the canonical desktop public banner.
- Join/Waitlist keyboard/focus behavior passes visible focus, Enter/Space activation, and Escape dismissal.
- Operator mobile persona passes, including Help, operator destinations, phone-width usability, and logout.
- Driver (Parker) mobile persona passes: Log Your Drive remains visible; Driver Console, Profile / Settings, Feedback, Help, and Log out are present; Family is not shown merely because a Driver is authenticated; logout works.
- Grown-Up mobile persona passes using a newly onboarded Grown-Up account: Family and Help are present and account-menu/logout behavior works.

## Closeout readiness / EOS — August 25, 2026

All BKLG-0062 acceptance criteria are satisfied. The item is ready for operator terminal disposition, but is intentionally left non-terminal at the operator's request.

FDBK-0002's Join/Waitlist tooltip defect has passed its pointer/touch/keyboard/focus regression checks. Its BKLG-0062 relationship is ready for closure/disposition when the operator marks BKLG-0062 terminal.

Documentation/governance closeout:

- Central Configuration `DD-WEB-002` records the next annual research/state-rule review as August 16, 2027, mandatory re-verification before enabling another state, the sourcing/social-metadata closeout, and the no-analytics-without-intentional-privacy-decision guardrail.
- This verification record is the durable source/runtime evidence for BKLG-0062.
- No ADR change is required: ADR-030 establishes the stable public identity/endpoints; BKLG-0062 refines website quality, navigation, evidence maintenance, and accessibility without changing that architectural decision.
- No migration documentation is required for this bounded website closeout.

Post-closeout product boundary: routine discretionary website refinement is frozen after BKLG-0062. Material defects continue through normal backlog/feedback triage; product focus returns to onboarding, Text Parker, and MVP architecture work.