# Family purchase launcher — BKLG-0208

Engineering integration contract, 2026-10-25. DEV only; not a production release or payment enablement approval.

## BKLG-0275 integration

Load `/assets/js/commercial-purchase.js` after the public environment/Supabase configuration and Supabase browser library. Load Helcim's existing `https://secure.helcim.app/helcim-pay/services/start.js` before payment initialization. The launcher adds its own modal stylesheet.

- `await window.DVCommercialPurchase.mount(element, {family_id})` renders one server-authorized contextual action and availability explanation in the supplied element.
- `await window.DVCommercialPurchase.open({family_id})` opens the same price/consent popup. Requires an explicit canonical Family ID. Rejections are user-displayable errors; handle them in the calling surface. Concurrent or repeated opens do not create a second popup or payment.
- `init()` binds the Family Hub's `#dv-commercial-purchase` host only when the signed-in overview reports exactly one License-Holder Family. Multiple owned Families fail closed; there is no Family selector or first-accessible-Family fallback.
- `dv:commercial-fulfilled` on `window` carries `{family_id, purchase_id}` only after the authenticated server status is `FULFILLED`. Family Hub refreshes its existing overview/capacity without a new login. Other surfaces should refresh their authoritative data on this event.

Do not pass prices, product selections, test enrollment IDs, payment tokens, tax assumptions, or entitlement claims. `catalog` with `family_id` checks canonical License Holder authority, returns the sole applicable offer, and reports pending payments. Quote and start repeat server authority/eligibility checks. FREE/FREE_EXHAUSTED offers the full license; PAID, including GRANDFATHERED_ALPHA, offers extra capacity. Unknown states fail closed. Prices come from active server price versions.

The popup asks for United States billing state because no authoritative reusable billing jurisdiction is currently supplied by Family overview. It never preselects Michigan. Another state/country explains unavailability without requesting a quote. Michigan's DEV provisional zero tax is not a legal determination or approval for other states. Consent resets on quote changes and reopening. Terms/Privacy content digests remain server-bound; they are not technical labels in customer copy.

Browser provider messages only request verification. Declined, abandoned, uncertain, and reconciliation-held outcomes do not grant capacity or invite another charge. An unresolved server intent blocks a new launch after reload. Provider token is never stored in browser persistent storage. Existing backend idempotency, signed webhooks, independent transaction lookup and atomic fulfillment remain in place.

`/checkout`, `/checkout/`, and descendants redirect to `/family/`. Old source/assets are absent. Legacy `dev_test_run` and `test_family` query parameters are ignored. No prior isolated enrollment transfers to this interface.

DEV-only non-charging diagnostics live at `/operator/payments/`; every operation is authenticated and operator-authorized by `commercial-operator`. There are no operator diagnostics in the customer popup. No actual payment is submitted by diagnostic controls.

BKLG-0275 owns exhausted-state messaging and placement, driver/grown-up distinctions and Text Parker messaging. It should use this interface rather than duplicate commerce. Integrated BKLG-0208/BKLG-0275 human acceptance remains required before BKLG-0206.

## Human UAT

Current global purchases remain disabled. The prior enrollment expired 2026-10-25 13:07:37 UTC; do not reuse its URL or renew it implicitly.

1. Sign in to the DEV branch `/family/` as the canonical holder. Expect one disabled Buy Full License or Add Driver Capacity action with server price and a clear pause explanation. No permanent selectors or consent form. Family management still works.
2. Open `/checkout/` with or without old test parameters. Expect Family Hub with no automatic popup or bypass.
3. Check a non-holder/driver and mixed-access account. Expect no unauthorized purchase action; another Family's access does not make its viewer the License Holder. Multiple owned Families without explicit surface context fail closed.
4. Open `/operator/payments/` as the registered DEV operator if desired. Connection/card/Fee Saver checks must say no payment initiated. These checks do not prove fees, settlement, receipts or returns.
5. After a separately approved, newly scoped Hub test mechanism/enrollment is prepared, review FREE/FREE_EXHAUSTED and PAID/Alpha popups on desktop/mobile. Expect the configured offer, explicit billing state, correct subtotal/tax/total, policy links, unchecked required consent, cancel/Escape, fresh quote on reopening, and an expiry message. No payment submission is authorized by these steps.
6. Actual provider payment, notification/receipt, cancellation/decline, settlement/return, Fee Saver gross amounts and entitlement UAT require the separate bounded test plan and explicit human submission. Reconcile against provider evidence and confirm exactly one capacity update. Do not infer passing from mocked tests.

## Remaining limitations

No authenticated human acceptance or actual payment/settlement evidence is established by this change. Normal purchases and live provider acceptance remain off. DEV migration 20261025134903 adds a unique unresolved-capacity-purchase constraint; no new enrollment was applied. Concurrent capacity intents are now serialized by a database unique constraint across browser sessions and idempotency keys. Fulfilled capacity remains repeatable; uncertain or held purchases must be resolved before another starts. No production migration was applied.
