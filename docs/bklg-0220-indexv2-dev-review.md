# BKLG-0220 indexV2 — DEV review only

Production promotion is NOT authorized. Do not merge this branch as a production release.

## Boundary

Separate `/indexV2.html` surface; original `index.html`, shared headers, `/join`, paid recruitment, analytics loaders, and product behavior are unchanged. No database migrations or historical data changes. The scoped header uses canonical design tokens, semantic HTML, visible focus, a persistent Join Now CTA and an accessible mobile disclosure. Without JavaScript the navigation remains visible.

The screenshot is the accepted current DV03 homepage asset, not an interactive console or redesigned DV03. Delivery derivatives are `indexv2-logo.webp` (390 × 260 lossless resized logo) and `indexv2-cockpit.webp` (1491 × 1055, WebP quality 92). Original canonical assets remain intact. Supporting artwork loads lazily. Orbitron and Inter, Google Fonts preconnections, and font-display swap are retained. No visual-standard change is proposed.

## Production gates

- Operator visual/UAT acceptance and explicit separate production approval.
- BKLG-0243 nationwide/state-neutral onboarding and logging, including retirement of the acquisition waitlist. This branch only demonstrates proposed messaging, visibly labeled as planned.
- Reconcile final availability copy with deployed capabilities before removing preview notices.
- Keep paid-canary configuration stable (BKLG-0214).
- Restore/evaluate approved homepage analytics at the final `/` route. Existing GA4 and Meta loaders remain unchanged, host/path gated, and intentionally do not transmit from DEV. DEV performance is not evidence of production analytics performance.
- No governance, release-note, or canonical asset-register writes were made. Any needed documentation promotion should follow the Master Project Workflow approval process.

## UAT

1. Open the branch preview `/indexV2.html` at desktop width. Expect the new headline, dominant Join Now, subordinate Log Your Drive, and DV03 proof alongside the hero.
2. Repeat at 390px and 320px phone width. Expect no horizontal overflow, full-width hero/final signup buttons, and compact secondary links.
3. Open Menu; use Tab/Enter and Escape. Expect reachable navigation, accurate expanded state, visible focus, and Escape returning focus to Menu. Resize to desktop; expect all navigation visible.
4. Select See How It Works. Expect the three-step section below the sticky header; scrolling retains Join Now.
5. Try each Join Now CTA. Expect same-origin `/join/`, with only name and email required and secure-link instructions. Do not enter production data into DEV.
6. Try Log Your Drive, Help, Research, Feedback, FAQ, Text Parker, Privacy and Terms. Expect the appropriate same-origin page.
7. Read availability and the final CTA. Expect planned nationwide logging clearly distinguished from current Michigan ruleset support, no waitlist CTA, and another Join Now opportunity.
8. Compare production `/`. Expect the existing homepage; this work does not cut it over.

## Measurement methodology

`node scripts/measure-indexv2.mjs URL output.json 3`

Chrome, 390 × 844, DPR 1, mobile/touch context; a new context per run; HTTP cache disabled; CDP network latency 150 ms, download 200,000 bytes/sec (1.6 Mbps), upload 93,750 bytes/sec; CPU slowdown 4×; no scroll or interaction; observe until five seconds after load. Report the median of three runs. Target: LCP <= 2,500 ms. CLS and transferred bytes are secondary checks. Local before/after uses the same server and analytics-off environment, with external fonts allowed. Results are a controlled synthetic comparison, not field performance or a real-device guarantee. The LCP element changes from original hero art to indexV2 introductory text on mobile; image transfer reduction is reported separately.

Raw measurement artifacts and final test/UAT results accompany the operator handoff.
