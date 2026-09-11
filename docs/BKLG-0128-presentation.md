# BKLG-0128 presentation implementation

Scope and workplan were approved in “BKLG-0128 dynamic road UAT” and explicitly continued for this build. This is implementation evidence, not a governance or backlog disposition update.

## Authority checked on 2026-09-11

- Supabase production: BKLG-0128 P2 / IN_PROGRESS, no active dependencies or linked feedback, dependent BKLG-0148 IN_PROGRESS; no linked DD/ADR IDs. Latest activity changed BLOCKED to IN_PROGRESS and cleared blocked_until. Existing acceptance text still describes the superseded recent-award model.
- Frontend baseline: f7f1cd3, including PR #184 artwork repair. Live DV03 script SHA-256 matched the baseline script before changes.
- Backend main: 38502d3. Live `get_authenticated_dashboard_v1` supplies full driver award history, award timestamps/drive IDs/XP, and joined quest display_order. No pagination truncation or new field is needed.
- Live evaluator uses `ORDER BY display_order, quest_key` ascending. Live catalog includes a real display_order/XP tie at Q000044 and Q000046.
- Master Project Workflow, DD-WEB-005/011/012, DD-DATA-005, ADR-037/040/045/063 inspected. INCLUDE: presentation policy remains separate from shared canonical behavior. No backend contract or business-rule refactor is required. BKLG-0148 remains outside scope.

## Behavior

`dv03-presentation.js` is the reusable presentation resolver. Lowest display_order wins, then highest awarded XP, then ascending quest_key. Missing ranks sort after known ranks. Inputs are not mutated.

Persistent scenery comes from the newest valid awarded_at among the selected driver's scenery-qualified awards. Equal timestamps use the same presentation comparator, then stable award ID. There is no expiry or browser-storage persistence. Reloading or changing devices derives the same scenery from the canonical ledger. A canonical award correction/deletion changes this derived view on refresh.

The registry includes the eight reviewed full-background assets: Park, School, Grocery Store, Library, Snack Run, Drive Thru, Car Wash, and Gas Station. Other awards receive the billboard treatment when featured; they do not replace persistent scenery. No new artwork is introduced.

The shared successful drive-save path emits `dv:drive-awarded` after dashboard refresh. DV03 resolves only the returned newly earned quest keys on that drive against hydrated canonical award records. Historical awards do not trigger a featured treatment on login. A featured award lasts 12 seconds. Billboard awards can cover newly earned scenery; expiry restores resting scenery and suppresses the billboard. Driver changes cancel transient state. A dashboard refresh failure does not fabricate ranking or scenery: the durable state appears on the next successful refresh.

Visual day is 06:00 inclusive to 18:00 exclusive in the driver's configured timezone, with browser-local fallback for missing/invalid timezones. It refreshes every 30 seconds and on focus. This is a visual clock convention, not an astronomical sunrise/sunset model and not the legal night-credit/XP classifier. Neither quest rules nor the night-credit service changes.

## UAT

Open `/log/DV03/staging/BKLG-0128/` as an operator, then scroll below the windshield to the harness. Synthetic scenarios replace only in-memory presentation inputs; no awards are written. Driver / Live restores canonical inputs.

1. No scenery: default landscape and milestone billboard.
2. Persistent scenery: old Park award remains visible, billboard absent.
3. Scenery-only award: Library replaces Park and remains after 12 seconds.
4. Billboard + scenery: Q000006 billboard over Library, then Library alone after 12 seconds.
5. Display order first: Q000006 wins despite lower XP.
6. XP tie-break: equal order, higher XP Q000006 wins.
7. Quest key tie-break: equal order/XP, Q000006 wins by key.
8. Day / Night: only sky changes; Park persists and billboard remains absent.
9. Driver / Live: restore selected driver's ledger-derived scenery and current local sky.

## Verification and release boundary

Unit/static, JavaScript syntax, browser state/expiry/timezone tests, mobile/desktop rendering, and existing DV03 compatibility tests are required. PR CI supplies the full authenticated DEV regression using its reserved test credentials. Production smoke compares changed runtime files byte-for-byte with the tested checkout before checking presentation behavior with in-memory synthetic data; no production award writes are used.

Rollback: revert the frontend implementation commit. There is no migration or database rollback.

## Governance recommendations — not written

- Amend BKLG-0128 acceptance/notes to replace 14-day expiry with durable scenery, independent transient ranking, billboard suppression, and dynamic sky. Keep terminal disposition with the user.
- Recommend a focused scenery/presentation DD with an ADR documenting the persistent earned-world UX decision, referencing DD-WEB-005 and ADR-040. Reuse an existing suitable record if one is identified during exact drafting.
- Append Release Notes only after exact deployment verification; identify human UAT as pending until accepted.
- No Migration Log entry is needed. Existing VisualAssets records may need usage-reference updates; no asset bytes or identities changed in this build.
