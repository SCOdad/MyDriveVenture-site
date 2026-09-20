# DEV preview human UAT

BKLG-0211 defines the supported human-UAT path for authenticated Cloudflare DEV previews.

## Architecture

- Production Drive Venture hosts use the production Supabase project.
- `mydriveventure-dev.pages.dev` and its branch/commit preview subdomains use the separate DriveVenture DEV Supabase project.
- Human UAT uses ordinary Supabase passwordless authentication. There is no client-side authentication bypass.
- The canonical DEV UAT guardian identity is maintained outside source control and must have legitimate DEV family/driver authorization.

## Required hosted DEV Auth configuration

In the **DriveVenture DEV** Supabase project only:

1. Keep the DEV site URL pointed at the canonical DEV site.
2. Allow the canonical DEV host as an Auth redirect destination.
3. Allow Cloudflare preview subdomains:
   - `https://*.mydriveventure-dev.pages.dev/**`
4. Ensure the magic-link template honors the requested redirect destination (Supabase `RedirectTo`) rather than forcing a fixed production or DEV Site URL.

Do not add Cloudflare DEV preview wildcards to the production Supabase project.

## Human UAT procedure

1. Open the exact Cloudflare branch preview being reviewed.
2. On the Drive Venture sign-in form, enter the approved DEV UAT guardian email.
3. Request the passwordless sign-in link.
4. Open the received link.
5. Confirm the browser returns to the same preview hostname that requested the link.
6. Confirm the authenticated dashboard loads the expected DEV family/driver.
7. Execute the feature-specific UAT steps.
8. Confirm mutations appear only in DriveVenture DEV.

## Expected failure signals

- Landing on production after clicking the link: incorrect hosted Auth redirect/template configuration.
- Landing on the canonical DEV site instead of the branch preview: preview redirect was not honored or allowlisted.
- Successful Auth but no driver/dashboard access: UAT identity/access fixture problem, not redirect configuration.
- Preview resolving to the production project: environment-config regression; stop testing immediately.

## Security invariants

- No production identities or production data are required for preview UAT.
- No service-role/admin secret is present in browser code.
- Unknown deployment hosts fail closed.
- Preview hosts remain pinned to DriveVenture DEV.
- Production hosts remain pinned to production.
