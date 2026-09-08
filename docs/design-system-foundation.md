# Drive Venture Design System Foundation

Status: Foundation for BKLG-0161  
Version: 1.0.0  
Date: 2026-09-08

## Purpose

This foundation extracts Drive Venture's accepted visual language into a client-agnostic contract that can be consumed by the current web application and future native clients. It is intentionally not a redesign of accepted experiences.

The design-system dependency direction is:

**Design semantics → platform mapping → experience skin**

Existing implementation is evidence, not automatic authority. Values that are repeated in source but are not supported by accepted governance or deliberate product intent remain surface-specific or candidate values until separately accepted.

## Authorities and boundaries

The foundation is governed by these existing project records:

- **WebsitePalette** in Central Configuration is the canonical website palette as of 2026-09-08 under BKLG-0161.
- **DV-STYLE-PIXEL-16BIT** remains the canonical visual-art language.
- **DV-CHAR-PARKER-PRIMARY** remains the canonical Parker character definition.
- **DD-WEB-005** and **ADR-040** require driver-console experiences to remain presentation skins over a shared functional contract.

BKLG-0161 does not reopen DV03, Parker, avatars, the logo, or accepted visual assets. It also does not move business rules into the design system.

## Token model

Machine-consumable source: `assets/design-system/tokens.json`  
Web mapping: `assets/css/design-system.css`

Tokens are divided into two layers:

1. **Primitives** are governed values such as palette colors, font families, spacing increments, border widths, radii, shadows, motion durations, and layout constants.
2. **Semantic tokens** express meaning such as canvas background, primary text, primary accent, success state, or strong border. Client implementations should prefer semantic tokens so a future native client does not depend on CSS terminology.

### Canonical palette

| Semantic role | Canonical color | Hex |
| --- | --- | --- |
| Primary background | Asphalt | `#111820` |
| Supporting background | Night Road | `#17324D` |
| Primary accent | Drive Venture Yellow | `#F4B820` |
| Primary text | Warm White | `#F7F3E8` |
| Secondary text | Silver | `#AEB8C2` |
| Success state | Highway Green | `#2F7D4A` |
| Surface | Panel Charcoal | `#202B35` |
| Outline | True Black | `#080B0E` |

These eight values are canonical. Other colors already present in web source can remain valid for a specific illustration, cockpit skin, control, or legacy surface, but they are not promoted into the shared palette by BKLG-0161.

## Typography

- **Display / game labels:** Orbitron with an Arial Narrow/sans-serif fallback.
- **Body / forms / supporting copy:** Inter with Aptos, Segoe UI, system-ui, and sans-serif fallbacks.
- Display type should be used for hierarchy, labels, gauges, achievement language, and compact game-like UI rather than long reading passages.
- Text must remain readable; do not distort text merely to make it appear pixelated.

## Spacing, shape, borders, and elevation

The token scale records the recurring spacing increments already used by the product and gives future clients a small shared vocabulary rather than requiring pixel-for-pixel web reproduction.

Drive Venture's strongest shared structural treatments are:

- crisp borders rather than soft glass effects;
- strong black outlines where game-world emphasis is intended;
- restrained radii on conventional controls;
- offset, hard-edged "pixel" shadows on game-oriented surfaces;
- spacing based on a compact quarter-rem progression.

A native client may implement platform-native elevation while preserving hierarchy and visual weight. Exact CSS box-shadow syntax is not part of the cross-platform contract.

## Semantic component contracts

The following are shared meanings. A skin can change composition and decoration while preserving the semantic state.

### Actions

**Primary action** — the dominant action in a task. It must have high contrast and an obvious pressed/hovered/focused equivalent.  
**Secondary action** — a valid alternative that is visually subordinate.  
**Destructive action** — must communicate consequence with text/iconography and confirmation appropriate to the risk; color alone is insufficient.  
**Disabled action** — must be visibly unavailable and non-interactive, while remaining legible.

### Panels and cards

**Standard panel** — groups related content on a surface.  
**Game panel** — may use stronger pixel borders, hard shadows, racing/highway motifs, or cockpit composition.  
**Inset panel** — subordinate information inside a larger panel.  

Game treatment is presentation, not a different functional contract.

### Chips and badges

Chips/badges communicate compact attributes, states, achievements, weather/road conditions, or taxonomy. They must remain readable at small sizes and must not rely solely on color to communicate a critical state.

### Progress

Progress components must distinguish current value, goal, and completion. License progress, night-hours progress, XP, quests, and milestone progress may use different visual metaphors while sharing those semantics.

### Forms

Every input needs a programmatic label or equivalent accessible name. Required/error/help states must be identifiable without color alone. Touch-oriented clients should preserve a minimum 44px target where practical. Platform-native controls are preferred when they improve accessibility without changing product meaning.

### Navigation

Navigation must clearly distinguish current location, available destinations, primary task action, and account/session actions. Actual native-app information architecture belongs to BKLG-0166; this foundation only defines shared states.

### Status and feedback

Shared states include: neutral/informational, success/completed, attention, error, loading, empty, disabled, and selected/current. Only success currently has a dedicated canonical palette color. Other critical states should use structure, iconography, copy, and accessible semantics rather than introducing an ungoverned shared color.

### Quests and achievements

Quest and achievement UI should feel part of the Drive Venture game world, use crisp readable visual hierarchy, and support status distinctions such as available, in progress, earned/completed, locked/ineligible, and repeatable where applicable. Quest logic itself remains outside the design system.

## Brand and game-world primitives

The design system references rather than duplicates the full `DV-STYLE-PIXEL-16BIT` specification. Key product-facing rules are:

- premium 16-bit / early-32-bit inspired pixel construction;
- crisp pixel edges and deliberate clusters;
- strong silhouettes and controlled detail;
- yellow road markings, asphalt, road signs, highways, exits, destinations, and racing stripes as recurring visual motifs;
- conventional UI may coexist with pixel-art scenes, but should still use the shared palette, typography hierarchy, and clear state language;
- Parker and driver avatars are governed visual assets, not generic UI icons;
- DV03 cockpit visuals are an experience-skin consumer of the system, not the source of universal component geometry.

## Accessibility baseline

All clients should meet these baseline expectations:

- maintain readable foreground/background contrast;
- expose focus visibly for keyboard-operable web controls;
- preserve logical keyboard order on web;
- provide accessible names/labels and semantic roles;
- use at least a 44px touch target where practical for primary interactive controls;
- do not communicate critical state with color alone;
- honor reduced-motion preferences by eliminating nonessential transitions/animation;
- keep text legible instead of pixelating type at the expense of readability;
- provide text alternatives for meaningful imagery and empty alt text for purely decorative art.

Where a platform's native accessibility convention is stronger than a web-specific implementation detail, use the platform convention while preserving Drive Venture semantics.

## Responsive and platform adaptation

The shared contract does **not** require a native client to reproduce CSS or web breakpoints literally.

### Canonical

- semantic role and hierarchy;
- palette meaning;
- typography roles;
- component/state meaning;
- game-world/brand language;
- accessibility expectations.

### Web mapping

- CSS custom properties;
- the current compact breakpoint (760px) as a web implementation token;
- CSS pixel shadows/borders;
- hover/focus-visible states;
- document flow and media queries.

### Native adaptation

A native implementation should map semantic tokens to platform-native primitives, use native focus/touch/accessibility conventions, and preserve hierarchy and intent. Safe-area behavior, dynamic type, native navigation containers, haptics, and platform motion conventions are platform adaptations rather than reasons to fork product semantics.

## Experience-skin rule

Classic (DV00), Prior Experience (DV02), and Default Experience (DV03) may vary in artwork, composition, labels, decorative treatment, and presentation adapters. They must not fork canonical application behavior or persistence. The design system therefore describes shared visual meaning while allowing each supported skin to remain visually distinct.

DV03 is explicitly a reference consumer: its cockpit, avatar, road, sky/weather, gauges, signage, and achievement presentation are not flattened into generic cards merely for consistency.

## Current source classification

### Canonical now

- the eight WebsitePalette colors;
- Orbitron display and Inter/body typography roles;
- crisp/pixel border and hard-shadow vocabulary for game-oriented UI;
- approved Drive Venture visual assets and DV-STYLE-PIXEL-16BIT;
- presentation-skin architecture from DD-WEB-005 / ADR-040.

### Candidate / implementation-specific

Examples include the brighter green used by the current header CTA, additional near-black menu backgrounds, and other one-off shades embedded in individual stylesheets. They may remain in place where changing them would be a redesign. They should not be copied into new shared components without deliberate acceptance.

### Surface-specific

DV03 cockpit geometry, gauges, hero placement, windshield layers, scene composition, driver-favorite-color palettes, and operator-specific data-density treatments are surface-specific consumers of shared semantics.

### Legacy/incidental

Values that exist only because of historical implementation drift, retired experiences, or one-off fixes should not become design tokens unless a later task demonstrates reusable intent.

## Adoption rule

New shared web UI should import/use `assets/css/design-system.css` and prefer semantic variables (`--dv-text-primary`, `--dv-accent-primary`, etc.). Existing surfaces do not require wholesale migration under BKLG-0161. Convert them opportunistically when the same code is already being changed and visual output can remain stable.

Future native work should consume the JSON token source or an equivalent generated platform mapping rather than parsing CSS.

## Acceptance canaries

The foundation is intended to support these representative consumers without redesign:

1. public/marketing UI;
2. Classic driver console;
3. DV03 driver console;
4. form/input flows;
5. authenticated account/navigation surfaces.

The shared canonical header is the first web canary migrated to semantic tokens. It deliberately retains component-specific colors that are not yet canonical so BKLG-0161 does not introduce visual drift.
