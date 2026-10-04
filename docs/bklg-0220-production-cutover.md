# BKLG-0220 production homepage cutover — 2026-10-03

The operator approved production publication after reviewing the bottom road-ahead layout. This approval supersedes the earlier DEV-only boundary in the historical review notes.

## Preservation and rollback

The previous homepage is preserved byte-for-byte at `/archive/homepage-2026-10-03/` (source: `archive/homepage-2026-10-03/index.html`). Its SHA-256 is `14e86946bd92d3a21b490eb19116fc2af7f702715a4244a485cdaa21cd08ef6e`, matching `index.html` on production source commit `0aa623733dddc157b7817a5762f9ba4d8dc33b2a`. Live HTML differed only through Cloudflare email obfuscation. Existing images and shared assets remain in the repository. The archive is excluded from search indexing with an HTTP header and retains the original root canonical URL. No homepage navigation promotes the archive.

To roll back the homepage, copy the archived HTML to `index.html`, update the homepage assertions for the rollback, and deploy through the normal production branch. Shared assets have not been removed. Git also retains the complete original source and asset versions.

## Production readiness adjustments

- Publish the approved v2 at `/`, retaining `/indexV2` as a non-indexable review copy.
- Remove DEV notice and unsupported future-tense nationwide messaging. BKLG-0243 is IMPLEMENTED in the live backlog; production already advertises nationwide logging and Michigan/Kansas rulesets. Retain that distinction and the general-practice-goal explanation.
- Preserve production legal identity (Michael Stefaniak, Michigan sole proprietor), canonical and social metadata, GA4 and Meta loaders, and `/join/` handoff. No analytics implementation or paid recruitment page changes.
- Merge current main before cutover, preserving BKLG-0243 and L03 scenery work. Open PR #284 touches the separate recruitment page; #290 touches lunar scenery, not the homepage.
- Preserve original homepage content for a subsequent editorial decision. No new state-requirements or About page is introduced by this release.

## Content comparison for the next review

| Original content | Where it stands in v2 | Suggested next home |
| --- | --- | --- |
| State requirements map, 51-jurisdiction table, official-source links, CSV and research review dates | Omitted from the new homepage; complete in the archive, existing dataset/assets retained | A dedicated Requirements page, linked from the availability section and Help. Recheck source dates and wording before republishing legal guidance. Highest-value content to recover. |
| Research summary, 2025 study context, examples of varied practice | Condensed to the mission section and Research link; the existing Research page remains live | Keep detailed evidence on Research; consider a short summary link from Requirements. |
| Permit-to-license timeline and “when to use it” explanation | No standalone timeline; basic supervised-practice story remains | Getting Started / Help, with supported-ruleset versus general-goal distinctions. |
| Automatic daylight/night minutes and local-weather explanation | Visible partly in product imagery but omitted from prose | Help / logging guide, where families need to understand recorded fields. |
| “Meet Parker” biography/portrait and future native-app card | Standalone character intro and speculative app roadmap omitted; Text Parker is more prominent | About or Text Parker for character context. Keep a native-app promise off the site until there is an approved commitment. |
| Long pilot explanation and safety/legal disclaimer | Availability and safety are condensed; operator identity and official-record disclaimer preserved | FAQ/About for deeper pilot context; Terms retains legal detail. |
| Repeated game introduction, XP cards and end-of-page pitch | Consolidated into Requirements / Fun / Motivation, product proof and closing CTA; “experience” replaces “Road XP” in new copy | No relocation needed unless specific details help onboarding. |

Recommended next editorial pass: review the archived Requirements section first, then the Getting Started/Help gaps. The new homepage remains focused on joining, with educational destinations available separately.

## Validation

Targeted homepage browser coverage exercises `/` at 320, 390, 768 and 1440 pixels, navigation, Join handoff, no-JavaScript access, responsive product images and Text video loading/playback/pause. Source checks protect current availability, identity, canonical metadata and the exact archive checksum. The separate paid recruitment checks remain in the targeted suite.

The full unit suite retains its previously documented unrelated Operator Backlog terminal-color assertion failure. This release does not change those files. Authenticated backend behavior and paid campaign controls are outside the cutover scope.
