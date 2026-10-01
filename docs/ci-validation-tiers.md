# CI validation tiers

BKLG-0218 separates validation by the kind of confidence a change needs.

## Tier 1 — source contract

Runs automatically on pull requests through `bklg-0132-regression.yml`.

Use it for syntax, unit, and static architecture contracts. It must remain fast and must not require DEV credentials.

## Tier 2 — browser integration

Driver-navigation integration runs automatically when its dashboard/operator lifecycle paths change. For other browser integration, run `BKLG-0132 Frontend Regression` manually with the smallest applicable Playwright scope:

- `fixture-canary` — validate shared DEV fixture readiness.
- `driver-navigation` — driver switching and stale asynchronous response behavior.
- `drive-mutations` — delete/edit mutation behavior.
- `drive-recovery` — drive-save recovery behavior.
- `full` — all bounded browser groups.

Tier 2 is expected when a change affects authenticated lifecycle behavior, driver switching, mutations, or another browser/DEV integration boundary. The fixture canary runs before targeted or full groups.

## Tier 3 — full browser regression

Use the `full` dispatch before release or when a change has broad cross-feature browser risk. The full suite remains partitioned into bounded groups so failures stay diagnosable and shared DEV prerequisites fail early.

Do not remove existing coverage merely to reduce CI use. Move behavior to the lowest tier that tests it realistically. BKLG-0078 source/architecture assertions remain Tier 1; its stale driver-status race is covered by Playwright in Tier 2.
