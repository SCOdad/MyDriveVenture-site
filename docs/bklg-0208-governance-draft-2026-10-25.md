# Exact governance draft — approval required

These are proposed additions, not authoritative governance writes. Preserve all existing cell contents. No version/release or migration ID is asserted. Source: owner-approved simplified Family Hub handoff, current live DD-PROD-001 and TECH-014, and DEV engineering verification.

## Design Decisions — DD-PROD-001, Notes (J171): append exactly

2026-10-25 — Proposed BKLG-0208 purchasing-surface amendment: Family Hub presents one contextual Buy Full License or Add Driver Capacity action. A shared Drive Venture popup obtains a fresh server quote, presents product/subtotal/tax/total and policy links, and requires explicit consent before opening HelcimPay.js. The canonical Family License Holder is independently authorized server-side; access to other Families does not confer purchasing authority. Ordinary customers are not asked to select a Family or product. Unknown or ambiguous Family context fails closed. FREE and FREE_EXHAUSTED Families qualify for the full license; PAID Families, including grandfathered Alpha Families, qualify for additional capacity. Pricing remains configurable. The standalone /checkout/ experience is retired. Entitlement changes only after independent provider verification and existing idempotent fulfillment. BKLG-0275 reuses the launcher for exhausted-state conversion; both workstreams require integrated acceptance before BKLG-0206. DEV implementation does not authorize normal purchases or production release.

## TechnologyServices — TECH-014, Service/Product (D14): replace exactly

Helcim Merchant Services / HelcimPay.js / Payment API

## TechnologyServices — TECH-014, Notes (O14): append exactly

2026-10-25 — Proposed BKLG-0208 integration update: Retain HelcimPay.js as the provider-hosted payment interface behind the shared Family-scoped Drive Venture confirmation popup. Helcim Online Checkout tax automation is a separate product capability and is not evidence of HelcimPay.js tax automation. Owner reported passing non-charging standard and Fee Saver card/ACH initialization and enabled card/ACH invoicing and Online Fee Saver. These reports do not verify actual fee amounts, ACH settlement/returns, receipts, or fulfillment. DEV gross transaction controls are $5 minimum/$35 maximum; normal purchases and live provider acceptance remain disabled. Owner contacted CPA October 22, 2026; CPA deferred the tax determination to the State of Michigan. Michigan-only DEV zero sales tax remains provisional pending that determination; no other-state or production tax approval is implied. Notifications were configured by the owner for approved, declined, reversed, refunded and pending transactions using drive+dev-payments@mydriveventure.com; supplied evidence showed batch-settlement notification Off. No notification delivery or settlement result is asserted. Non-charging operator diagnostics are separate from customer purchasing, at /operator/payments/. Prior isolated enrollment expired and does not transfer to the new Hub flow.

## Release Notes / Migration Log

No production release or new database migration occurred in this change. Retain existing history. Recommend a versioned DEV acceptance checkpoint after human Hub UAT; do not allocate or write a release/migration entry without the approved version and exact draft.
