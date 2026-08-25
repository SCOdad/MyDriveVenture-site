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

## Persona expectations for runtime verification

### Logged-out visitor

- Drive Venture logo/home link is visible.
- Desktop public links and Log Your Drive CTA are visible.
- On phone width, public text links collapse while the Log Your Drive CTA remains visible.
- Account control is absent when no authenticated session exists.

### Driver

- Log Your Drive CTA remains visible.
- Account control identifies the Driver or their single driver display name when available.
- Account disclosure includes Driver Console, Profile / Settings, Feedback, and Log out.
- Family management is not shown merely because a Driver is authenticated.

### Grown-Up

- Log Your Drive CTA remains visible.
- Account disclosure includes Driver Console, Family, Profile / Settings, Feedback, and Log out.
- Multiple-driver accounts may label the disclosure `My drivers`.

### Operator

- Operator status takes precedence over Driver/Grown-Up inference.
- Account disclosure identifies Operator and includes Operator Home, Operator Feedback, Backlog, Classification, Product Themes, Driver Console, Profile / Settings, Feedback, and Log out.
- Operator application pages retain their specialized workbench content while using the common top-banner shell.

## Runtime/device checks still required before closure

These cannot be conclusively proven by source inspection and must be exercised in a real browser against the deployed site:

- Phone-sized visual check of all seven sitemap pages: no horizontal overflow, clipping, overlapping header controls, or inaccessible map/table content.
- Open and close the state-by-state `<details>` table on a phone-sized viewport; horizontally inspect the table region without breaking page layout.
- Follow representative official source links and research links from phone width.
- Verify homepage Join the Michigan pilot and Log Your Drive CTA tap targets.
- Keyboard-tab through applicable interactive controls and confirm visible focus.
- Join page: exercise representative `?` help with mouse/pointer, touch/tap, keyboard focus + Enter/Space, Escape, and click-away dismissal.
- Waitlist page: perform the same help-control checks to specifically close FDBK-0002.
- Repeat top-banner verification while authenticated as Driver, Grown-Up, and Operator, including phone width and Account disclosure behavior.
- Confirm logout works from the shared Account disclosure for each authenticated persona.

BKLG-0062 should remain `PENDING_TEST` until those deployed runtime checks pass. FDBK-0002 should remain linked/open until the Join/Waitlist interaction checks pass.