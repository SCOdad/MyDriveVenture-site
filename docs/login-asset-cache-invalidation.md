# Login asset cache invalidation — Drive Venture web

**Status:** Operational engineering note | **Recorded:** 2026-10-11 | **Backlog:** BKLG-0258
**Related frontend PRs:** #330 (returning zero-driver access), #331 (cache invalidation)
**Governance:** ADR-038, ADR-065, DD-WEB-007, DD-INFRA-001

## Context

Zero-driver grown-ups can legitimately have active authenticated families. PR #330 restored server-authorized Family Hub routing after a driver-only dashboard error. A previously used phone browser still displayed the old account-opening error, while Incognito worked. Changing the page URL to /log/?refresh=20261011 did not help because the referenced authentication JavaScript URL remained unchanged.

PR #331 refreshed the shared log-dashboard-entry-v5.js URL version to ?v=20261011-bklg0258-cache1 on /log/, /log/DV00/ and /log/DV02/, and configured this Cloudflare Pages _headers rule:

    /log/*
      Cache-Control: no-cache, must-revalidate

The owner verified the production HTML reference and successful login → Family Hub → logout → login again → Family Hub in the previously failing **normal-mode phone browser without clearing storage**. Actual response-header values and the prior phone cache contents were not independently captured.

## Checklist for future authentication JavaScript changes

1. Update the versioned auth-script reference on **every** supported login entry point (default, DV00, DV02).
2. Keep login HTML configured for cache revalidation, and inspect actual deployed HTTP response headers; source-controlled _headers alone does not prove the host applied them.
3. Preserve server-authorized family/driver access; client redirect decisions do not confer permission.
4. Run tests/bklg-0258-login-cache-busting.test.js and tests/bklg-0258-zero-driver-returning-login.test.js plus existing regression checks.
5. Verify DEV preview assets, zero-driver login/logout/login, and ordinary driver access.
6. Confirm the updated asset version in **live production HTML** after deployment.
7. Retest the **previously affected normal browser with existing storage intact**. Incognito success alone is insufficient.

A cache-busting query parameter on a PAGE URL does not itself alter the URLs of JavaScript dependencies. Distinguish source merge, production deployment, and owner acceptance.

## Evidence and follow-up

- Frontend PR #330 merged as 1c8079b2d59fc72b0e347256b2db8befec593df9.
- Frontend PR #331 merged as 79eacabcdf7aee1cac35f5ee6f57ded261be3382.
- Central Configuration TECH-003 records current Cloudflare Pages hosting and cache change.
- Supabase BKLG-0258 is authoritative for operational acceptance/disposition.
- The unrelated Operator Backlog styling regression is BKLG-0244 / frontend PR #311.
