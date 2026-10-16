# Drive Venture web frontend

This repository contains the Drive Venture public website and web application frontend, including onboarding, the driver console, family workflows, and operator-facing pages. It also contains static visual assets and frontend tests.

## Production architecture

- **Public website and application:** <https://mydriveventure.com/>
- **Hosting and deployment:** Cloudflare Pages; production is deployed from this repository's `main` branch through the Cloudflare Git integration.
- **DNS and edge routing:** Cloudflare.
- **Domain registrar:** Network Solutions; registration transfer is a separate, future project.
- **Source control and pull requests:** GitHub (`SCOdad/MyDriveVenture-site`).
- **Application APIs, authentication, and operational data:** Supabase-backed Drive Venture services, maintained separately in `SCOdad/drive-venture-backend`.

GitHub Pages was the original static-site host and was retained temporarily as a fallback during the BKLG-0134 Cloudflare cutover. **BKLG-0192 retires that fallback.** GitHub Pages is not the intended production host, and `CNAME` in the repository was specific to its obsolete GitHub Pages configuration. Disabling the Pages feature itself is a GitHub repository-admin action and must be verified independently of source changes.

## Deployment and testing

Changes to `main` are the source for Cloudflare Pages production deployments. Cloudflare branch previews are used for review; do not mistake a merged pull request for verified production availability.

The repository contains GitHub Actions workflows for static/unit checks, targeted Playwright regression, and read-only production smoke testing. See `.github/workflows/` and `playwright.prod.config.mjs`.

For production verification, check the apex and `www` domains, HTTPS/canonical routing, public and authenticated routes, critical redirects, and the expected Cloudflare deployment. Keep the Cloudflare-specific `_redirects` and `_headers` files.

## Source privacy and cost controls

Source-repository visibility does not determine whether the website is publicly accessible. The frontend repository is intended to be private after BKLG-0192's verified retirement steps; the other Drive Venture repositories are already private.

**Cost neutrality is a BKLG-0192 acceptance condition.** Do not enable a paid GitHub or Cloudflare plan, paid runner, or chargeable automation to retire GitHub Pages. Private-repository GitHub Actions consume the account's free-minutes and storage allowances; verify usage and a strict **$0 Actions spending budget** before changing visibility. If a zero-cost path cannot be confirmed, leave visibility unchanged and record the blocker.

## Operational follow-up

- Keep Text Parker public instructions synchronized with the actual production command flow and SMS consent disclosures.
- Keep the public Privacy Policy and Terms & Conditions aligned with launch requirements.
- Treat Supabase as the authority for the active backlog and live operational data.
- Treat the **live** DriveVenture Central Configuration Google Sheets workbook as the authority for durable governance. Archived Excel exports and old project copies are historical only.
