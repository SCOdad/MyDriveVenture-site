# BKLG-0203 + BKLG-0252 — commercial disclosure and checkout-consent handoff

> **DRAFT / CONTRACT HANDOFF ONLY.** No checkout or payment implementation is authorized by this document. BKLG-0208 owns schema, code, tests, and activation; BKLG-0206 owns final launch canary. The public policies must not be published until owner-approved wording matches actual checkout and production behavior.

## Accepted product baseline (production Supabase, October 15, 2026)

| Offer | Price | Entitlement effect | Notes |
| --- | ---: | --- | --- |
| FREE FAMILY | $0 | 1 driver, up to 2 guardians, 5 accepted drive records | Exhausted families retain history/edit/export; new drive and Text Parker drive creation disabled |
| FAMILY_LICENSE | $24.99 USD | one-time PAID Family License, capacity 3 active drivers | not a subscription; no paid-beta discount |
| ADDITIONAL_DRIVER_CAPACITY | $9.99 USD | one additional active-driver capacity for a PAID Family | purchased individually, not as packs |
| Eligible Alpha grandfathering | $0 | paid-equivalent 3-driver Family entitlement | no purchased transaction should be generated |

Prices are **before legally applicable transaction taxes**, not a claim that every U.S. purchaser owes sales tax. Initial paid web-beta market is U.S. only. SCOCRAFT LLC is the seller/operator and Drive Venture the consumer brand. The **Family** owns the entitlement, administered through its **License Holder**. No subscription, auto-renewal, cancellation fee, or native-app purchase is in the initial offer.

## User-facing disclosure placement

### Before a purchase is authorized

Show, in the checkout itself, without hiding essential terms exclusively in a distant policy link:

1. **What the Family is buying**, its included active-driver capacity or the quantity of added seats, and the intended Family identity/context.
2. **Price in USD** (currently $24.99 license / $9.99 per added active-driver seat), whether tax is added, and **the total payable amount** at confirmation.
3. **One-time, non-recurring charge**; no subscription, renewal, or recurring-cancellation requirement.
4. **Refund and correction policy**, with a working link to the full approved policy. Use the owner-approved seven-day/20-hour promise only once stale governance is reconciled and durable deleted-drive accounting and refund operations are implemented; apply it to individual $24.99 and $9.99 purchases.
5. **Material beta limits**: evolving web service, possible disruption, informational—not official—licensing advice, and actual supported licensing-rule coverage; availability of existing exports/history as applicable.
6. **Legal seller**: SCOCRAFT LLC operating Drive Venture; functioning customer support route.
7. Working **Terms and Privacy** links, their applicable revision/effective identifiers, and accessible plain-language acceptance copy.
8. Exact amount/tax and any extra capacity can be reconfirmed if the quote expires or checkout state changes.

Use real configuration-authoritative amounts. Never hard-code prices in multiple frontend entry points. Payment-card data is handled by the provider-hosted card-entry flow, not collected into Drive Venture/Supabase browser forms.

### Purchase action and affirmative acceptance

Prior to charging:

- Require an **intentional customer action** agreeing to the purchasing Terms. Do not infer agreement solely from SMS consent, a prior feedback submission, a passive page visit, or simply being a Family member.
- Capture a **server-authoritative, auditable snapshot** of what the customer agreed to: stable Terms version and immutable content digest or archived snapshot reference; Privacy notice version presented; actor/auth identity; canonical Family and License Holder context; purchase intent/product/quantity; quote currency/base amount/tax/total; UTC timestamp; acceptance surface/source; and related purchase/transaction ID when available.
- Bind acceptance to the **specific quoted commercial terms**, not an editable current-policy pointer. Reject or refresh stale/missing consent when the text, price, Family, or checkout context changed.
- Treat presenting Privacy as notice rather than silently conflating it with optional SMS or marketing consent; consult applicable law for any genuinely separate consent.
- Never log raw payment-card details or long-lived provider secrets.
- Implement authenticated authorization so an unrelated or ordinary driver cannot purchase for another Family.

**Schema proposal to BKLG-0208, not a migration in BKLG-0203/0252:** a versioned policy-content registry plus an append-only purchase-policy-acceptance event tied to purchase intent and Family; exact table/RLS/interface names belong to BKLG-0208 design. The policy can be served publicly, but acceptance evidence is sensitive and requires family/operator-scoped authorization.

### After payment

- Do not grant entitlements from a browser callback alone.
- Only verified **approved provider payment** with correct Family/purchase correlation and idempotent reconciliation can fulfill the purchase.
- Confirm the purchase and/or entitlement, with Family, item/capacity, paid amount, taxes, order reference, and a support route. Receipt content must not reveal private minor data.
- Preserve failure, abandonment, replay, duplicates, refund/correction, restoration, and dispute scenarios in tests.
- A purchase can be feature-disabled during the BKLG-0206 canary without corrupting existing entitlements.

## Helcim-specific handoff (BKLG-0205)

- HelcimPay.js iframe/provider-hosted card entry; no full-card-number Payment API handling.
- Secure backend checkout initialization, server-side token secrets, verified HMAC webhook, provider transaction lookup, idempotent purchase history.
- Current provisional Helcim transaction maximum **$29.99**. Base ($24.99) and one extra seat ($9.99) each fit **before tax** when purchased separately; **combined $34.98 before tax does not**. BKLG-0208 must choose tested separate transactions or obtain approval/config change for higher inclusive totals.
- Provider merchant configuration is not proof a purchase flow exists. No live paid-beta checkout/payment has been accepted.
- Capture purchaser billing jurisdiction for tax/nexus evaluation. Do not assume 0% sales tax nationally.

## Decisions required before final wording

1. **Refund reconciliation:** October 15 owner-approved refund revision: requests within seven days of each payment, if cumulative combined Family Drive Venture logged practice is at most 20 hours (including later-deleted drives), applies equally to $24.99 Family License and each $9.99 additional active-driver seat. Reconcile stale BKLG-0199 no-refund text, define immutable measurement and seat-capacity consequences of refunds.
2. **License/service lifecycle:** confirm paid Family entitlement description and remedy if service changes/discontinues.
3. **Feedback support:** implement dedicated Privacy and Billing categories across the form, operator UI, SQL check and insertion validation; require a safe way to receive requests and verify authority. Owner directs all new policy contact links to Feedback, not personal mailto links.
4. **Retention:** verify actual operator processes before reaffirming or replacing 12-month inactive/SMS and five-year audit promises.
5. **Final text/version:** owner approves exact Terms, Privacy, refund, beta, contact and purchase-consent statements; acceptance implementation is checked against that version.
6. **Tax check:** owner confirms initial-state transaction-tax obligations against the actual offer and markets before launch.

## Test contract handed to BKLG-0208

- FREE and exhausted Family cannot be mistakenly charged or granted extra driver capacity.
- Eligible grandfathered Alpha Family does not enter a paid-purchase requirement.
- New PAID license for eligible U.S. Family: correct authorized License Holder, 3 active-driver seats, $24.99 base, tax handling, one confirmed purchase.
- Each $9.99 additional seat increases only that paid Family's capacity once and is not a subscription.
- No purchase button before current quote/required disclosure and deliberate assent; reject stale/unversioned assent.
- Store immutable time/version/context evidence; maintain audit on retries and abandoned attempts.
- Failure, duplicate webhook, delayed/out-of-order delivery, replay, wrong-Family attack, and incorrect refund/restore do not double grant entitlement.
- Amount and tax displayed match charged/recorded amounts, respecting Helcim transaction limits.
- No family/driver private information is sent to website advertising measurement from purchase pages.
- Refund eligibility must use cumulative Family hours for the base license and the specific seat-assigned driver's cumulative hours for an extra seat, including deleted drives in either calculation. Seven days starts at each applicable purchase; deleting/reassigning a drive must never restore eligibility.
- Consent and policy links work on mobile, desktop, and with assistive technology; failed purchase still leaves the user's preexisting history available.
- Production acceptance and rollback are performed under BKLG-0206, not here.

## Release/governance rules

- BKLG-0203: policy wording and disclosures.
- BKLG-0252: plain-language rewrite, vendor disclosure audit, related navigation and copy consistency.
- BKLG-0208: commercial webpage/checkout, schema and consent capture, payment events and transaction fulfillment.
- BKLG-0206: paid-beta deployment/canary/go-no-go.
- BKLG-0237: qualified professional legal review before post-beta scale.

Do not merge/publish policy wording based on this draft alone. Do not change the canonical DD or backlog record or terminal status without further owner approval.
