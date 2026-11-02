# BKLG-0200 — Paid Web Beta launch decision packet (draft, preactivation)

Status: PREPARATION ONLY. No public checkout, charging, announcements, or final release approval authorized by this document.

## Established authority
- BKLG-0206 and BKLG-0214 were owner-dispositioned IMPLEMENTED in current Supabase. BKLG-0200 is IN_PROGRESS; BKLG-0284 is a separate P1, non-blocking.
- Alpha cutoff: Nov 1, 2026 00:00 America/Detroit exclusive. Forty Alpha Families preserve grandfathered paid entitlements.
- Accepted production financial evidence: prior $9.99 purchase/VOID, $24.99 purchase; no repeat canary planned. Settlement, settled refund and specified receipt proofs remain qualified waivers. Backup alert escalation deferred.
- Production offer catalog: one-time FAMILY_LICENSE $24.99, three driver seats; ADDITIONAL_DRIVER_CAPACITY $9.99 per seat. Free Family: one driver, two grown-ups, five accepted drives. Approved terms govern refunds, not marketing paraphrases.
- Public checkout controls BOTH OFF. Continue fail-closed.
- Production monitor as inspected November 2 19:20 UTC: scheduled OK, zero active/critical findings, controls OFF/OFF.
- Source: backend PR #273 merged a0db794351a73f54e9a7b69df7a32c83b607b24e; Central Configuration Release Notes 0.25.87, MIG-060, ADR-071 and TECH-014.
- No direct public-runtime browse access in this preparation session; independently verify deployed assets and browser journeys before GO.

## Activation gate — owner evidence checklist
1. Fresh production baseline: controls, price/policy versions, recent monitor, active incidents, backend/frontend deployed asset identity.
2. Source CI/security: FAQ copy verification, frontend contracts, checkout-disabled and Family Hub regression, mobile/responsive checks. Open frontend collision PRs reviewed, especially historic Family/Profile work.
3. Browser preactivation tests: unauthenticated /join and /faq, sign-in, FREE, FREE_EXHAUSTED, PAID/GRANDFATHERED_ALPHA Family Hub; holder-only upgrade launcher and explicit terms consent; no real payment.
4. Customer communications review: public price, free allowance, beta limitations, no native-app suggestion, state requirements caveat, privacy/terms, billing Feedback path.
5. Operations: authenticated commercial-operator exceptions/history, paging inbox, monitor and stop procedure; uncertain charges never retried; protected entitlements retained.
6. Owner approves precise checkout activation sequence in a separately recorded GO. A separate approval is required for public announcement copy/channels/time.
7. After activation approval, confirm switches, real customer transaction/fulfillment, no entitlement mismatch, monitor, first-hour support coverage, and stop ability; never count an unobserved live result as PASS.

## Stop / rollback
On an unauthorized charge, payment reconciliation error, security regression or material entitlement mismatch: keep or turn new purchases OFF, preserve purchase and entitlement audit, stop announcement, consult provider and operator history. Existing hosted payment sessions may persist; reconcile each provider-side record rather than retry an uncertain charge.

## Communications drafts (NOT approved for sending)
**Prelaunch / current customers:** Drive Venture is transitioning from Alpha to a limited paid web beta. Existing qualifying Alpha Families retain their grandfathered access. New Families can begin with a free allowance; paid upgrade purchases will become available only when we announce activation. Your existing driving records remain available. For help use /help/ or /feedback/.

**Launch announcement — HOLD:** Drive Venture's paid web beta is now open. Begin with a free Family license for one driver and five accepted drives. Upgrade once for $24.99 to support up to three active drivers, with optional $9.99 additional seats. Drive Venture is a web experience, not a native app; state driving rules and the Terms apply. Start at /join/ and use /feedback/ for assistance.

**Alpha-specific — HOLD:** Your qualifying Alpha Family keeps its grandfathered paid capabilities. The paid web-beta launch changes how new families obtain entitlements; it does not charge you or remove valid existing access.

## Known risks / deferred work
- BKLG-0284 signup session reuse: separate non-blocking P1; watch for duplicate or zero-driver Families, don't auto-merge.
- Historical paid recruitment BKLG-0214 yielded zero activated first drives; do not automatically scale paid Meta. Organic referral messaging deserves instrumentation review separately.
- Backup escalation deferred; financial waivers remain qualified, never reported as test PASS.
- Current public FAQ before this branch incorrectly claimed pricing unfinalized. This branch stages correction explicitly without open-checkout claim.
- Public deployed UI and full regression/CI were not established at creation of this draft; fill evidence before proposing GO.

## Governance proposals requiring separate approval
- After verified release: append release note with actual deployment and activation evidence (no invented version).
- No MIG record unless actual migration or controlled runtime policy change occurs.
- TechnologyServices TECH-014 should be reassessed following actual activation and merchant acceptance; ADR-071 should not be rewritten without a new decision.
- BKLG-0200 terminal status strictly owner-controlled.
