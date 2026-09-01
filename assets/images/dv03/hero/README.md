# DV03 cockpit Hero contract

DV03 treats a driver's canonical avatar and cockpit Hero as separate assets. The canonical portrait remains unchanged.

- The active canonical assignment continues to point to `avatar.png` in the private `driver-avatars` bucket.
- An optional cockpit-ready derivative is stored beside it as `avatar-dv03.png`.
- The derivative is a transparent 1536 × 1024 PNG using the locked DV03 composition: seated three-quarter pose, steering-wheel relationship preserved, subject concentrated in the left portion of the windshield, and lower body designed to disappear behind the cockpit foreground.
- The derivative must not contain cockpit framing, landscape, road sign, dashboard UI, text, badges, or other static interface elements.
- Candidate masters remain outside the public repository. Run `npm run validate:dv03-hero -- <local-png>` before upload; it verifies the 1536 × 1024 RGBA format and the locked visible-subject composition window.
- Iteration is non-destructive: retain the approved canonical portrait, review the derivative in the locked desktop and mobile cockpit, then replace only the private sibling derivative when a revision is accepted.
- DV03 requests a short-lived authenticated URL for the derivative. Missing, unreadable, or incompatible derivatives fall back to the locked Parker seated Hero.
- Driver changes clear the previous Hero immediately before resolving the next driver, preventing stale identity artwork.

This sibling-file convention adds a presentation derivative without changing the canonical avatar assignment schema or overwriting an approved portrait.
