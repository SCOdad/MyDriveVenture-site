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

## Operator revision: responsive cockpit proof and three benefits

The operator-supplied mobile screenshot now supplies the phone cockpit view. `indexv2-cockpit-mobile.webp` is a 772 × 3090 cockpit-only delivery crop (208,252 bytes); operator tools, family controls, drive-entry forms, vehicle records and trip history from the full attachment are excluded. No screenshot text or product UI is regenerated. Phones select it through responsive `<picture>` markup and do not request the desktop image. The preview is a keyboard/touch-scrollable region so the full cockpit remains readable without making the hero several screens tall.

Desktop gets manual Web/Mobile carousel selectors with pressed-state announcements and no automatic rotation. The selected desktop view survives viewport changes; phones always show mobile. Preview dimensions remain stable when switching views. This is mobile web, not a claim of an available native app.

The benefit strip now follows Requirements / Fun / Motivation: the log you need, the fun you add, and the motivation to keep going. The copy connects the log to state licensing requirements without claiming universal legal acceptance.

Additional UAT: on phone, scroll within the cockpit preview to see progress gauges; on desktop, switch Web → Mobile → Web by mouse or keyboard. Expect the matching actual screenshot and a stable preview frame. The revised targeted suite has 13 tests, all passing locally; accessibility audits at 390px/1440px still show zero WCAG violations. The existing unrelated backlog-style failure remains unchanged.

## October 3 revision: road-ahead artwork and Text Parker

Reuse the existing `road-ahead-hero.webp` (122,600 bytes) in a scenic panel, after the introductory content on desktop and between the introduction and product preview on phones. Dimensions reserve space and lazy loading defers the supporting artwork. The original image is unchanged.

Replace Road XP with experience in indexV2 copy; product screenshots remain genuine captures. The hero and “Log your way” step now explicitly offer browser or text logging with no app required. The existing Text Parker information/opt-in route remains the destination; no SMS signup, consent, or product behavior is modified.

The carousel gains Text on desktop and phones (phones retain Mobile rather than showing Web). Selecting Text loads and plays the approved 20.465-second social demonstration. Browser-compatible MP4 uses the original H.264/AAC streams, repackaged with faststart and no re-encoding. The source MOV is not duplicated in the repository. No MP4 request occurs before the user selects Text. Native playback controls, inline mobile playback, English text captions, a readable transcript, opt-in information and safety copy are included. Selecting another view or hiding the document pauses the video. Playback rejection exposes an instruction to use the native Play control.

Additional UAT: select Text on desktop and phone; expect video playback with controls. Switch to Web/Mobile; expect playback to pause. Read the transcript and follow Text Parker instructions. Verify the road-ahead panel and the new experience/browser-or-text copy. Local targeted suite: 15/15 pass, including actual media playback and no-prefetch assertions. Standard unit suite retains its one pre-existing operator-backlog styling failure; JavaScript syntax passes.

## October 3 layout refinement: closing road-ahead panel

Move the road-ahead artwork from the hero into the final call to action. Stack “Give every practice drive a place to count.”, supporting copy and Join Now over the left side of the image, with a contrast gradient. On phones, the copy sits above the visible road scene within the same closing panel. The artwork remains lazy loaded. All 13 homepage browser checks pass; desktop and phone screenshots were visually reviewed. Production homepage is unchanged.
