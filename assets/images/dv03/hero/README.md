# DV03 cockpit Hero contract

DV03 treats a driver's canonical headshot and cockpit Hero as separate required outputs derived from one private submitted photograph. The submitted photograph remains the identity source; it is not itself a runtime asset.

- Avatar creation produces and independently validates both runtime derivatives: the compact canonical headshot and the seated DV03 Hero.
- The active canonical assignment points to the headshot as `avatar.png` in the private `driver-avatars` bucket. It remains visible beside the driver's name and anywhere compact identity artwork is required.
- The cockpit-ready seated derivative is stored beside it as `avatar-dv03.png` and is used only by the DV03 Hero layer.
- The derivative is a transparent 1536 × 1024 PNG using the locked DV03 composition: seated three-quarter pose, steering-wheel relationship preserved, subject concentrated in the left portion of the windshield, and lower body designed to disappear behind the cockpit foreground.
- The derivative must not contain cockpit framing, landscape, road sign, dashboard UI, text, badges, or other static interface elements.
- Candidate masters remain outside the public repository. Run `npm run validate:dv03-hero -- <local-png>` before upload; it verifies the 1536 × 1024 RGBA format and the locked visible-subject composition window.
- Iteration is non-destructive and independent: retain the submitted identity source, review each derivative in its own UI context, and replace only the headshot or seated Hero that is being revised.
- DV03 requests a short-lived authenticated URL for the derivative. Missing, unreadable, or incompatible derivatives fall back to the locked Parker seated Hero.
- Driver changes clear the previous Hero immediately before resolving the next driver, preventing stale identity artwork.

This sibling-file convention preserves both photographic outputs without changing the canonical avatar assignment schema. A driver switch must update both the headshot and seated Hero to the selected driver; Parker remains only the seated-Hero fallback.
