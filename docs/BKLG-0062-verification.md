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

The current public sitemap contains:

1. `/`
2. `/text-parker/`
3. `/research/`
4. `/research/teen-drowsy-driving/`
5. `/help/`
6. `/privacy/`
7. `/terms/`

All seven load the same canonical banner controller and therefore share the same visitor/authenticated persona treatment.

## Acceptance-test location clarification

The state-requirements map and expandable state-by-state table intentionally live on the homepage, not on `/research/`. The `/research/` page contains research/evidence tables and citations. Runtime acceptance should therefore be mapped as follows:

- Homepage: state map, expandable state-by-state table, official state source links, and Join the Michigan pilot CTA.
- `/research/`: research/evidence tables, research source links/citations, and phone-sized table usability.

No duplicate state table is required on `/research/`.

## Persona expectations for runtime verification

### Logged-out visitor

- Drive Venture logo/home link is visible.
- Desktop public links include How it works, Why it matters, Feedback, Help, and Log Your Drive.
- On phone width, public text links collapse while the Log Your Drive CTA remains visible.
- Account control is absent when no authenticated session exists.
- Help remains available from the footer on mobile.

### Driver

- Log Your Drive CTA remains visible.
- Account control identifies the Driver or their single driver display name when available.
- Account disclosure includes Driver Console, Profile / Settings, Feedback, Help, and Log out.
- Family management is not shown merely because a Driver is authenticated.

### Grown-Up

- Log Your Drive CTA remains visible.
- Account disclosure includes Driver Console, Family, Profile / Settings, Feedback, Help, and Log out.
- Multiple-driver accounts may label the disclosure `My drivers`.

### Operator

- Operator status takes precedence over Driver/Grown-Up inference.
- Account disclosure identifies Operator and includes Operator Home, Operator Feedback, Backlog, Classification, Product Themes, Driver Console, Profile / Settings, Feedback, Help, and Log out.
- Operator application pages retain their specialized workbench content while using the common top-banner shell.

## Runtime verification evidence — August 25, 2026

User-tested on a phone-sized device/browser:

- Homepage logged-out banner fits without horizontal scrolling: PASS.
- Join help controls by touch/tap: PASS.
- Waitlist help controls by touch/tap, directly exercising FDBK-0002: PASS.
- Homepage state-by-state table expands and its table region behaves correctly on phone width: PASS.
- Public sitemap-page banner appearance across homepage, drowsy-driving research, Help, Privacy, Terms, and Text Parker: PASS, with Help discoverability correction subsequently applied to the canonical banner standard.

The initial test looked for the state table on `/research/`; this was a test-location mismatch rather than a product defect. The acceptance mapping above now records the intended location explicitly.

## Runtime/device checks still required before closure

- Verify `/research/` research/evidence tables and representative source links at phone width.
- Confirm Help appears in the canonical desktop public banner after deployment of the correction.
- Keyboard-tab through applicable Join/Waitlist interactive controls and confirm visible focus, Enter/Space activation, and Escape dismissal if not already exercised separately.
- Repeat top-banner verification while authenticated as Driver, Grown-Up, and Operator, including phone width and Account disclosure behavior.
- Confirm logout works from the shared Account disclosure for each authenticated persona.

BKLG-0062 should remain `PENDING_TEST` until those deployed runtime checks pass. FDBK-0002's specific Join/Waitlist touch regression has passed; keep the relationship open until BKLG-0062 completes its remaining persona/browser checks and closure recordkeeping.