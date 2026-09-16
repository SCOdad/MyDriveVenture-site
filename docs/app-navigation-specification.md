# Drive Venture App Navigation Specification

Status: Foundation for BKLG-0166  
Version: 1.0.0  
Date: 2026-09-13

## Purpose

This specification defines the information architecture and navigation model for a future React Native Drive Venture application. It is intentionally a navigation and product-structure specification, not a production native-app implementation and not a redesign of accepted Drive Venture functionality.

The specification has two audiences:

1. **BKLG-0167 read-only dashboard spike** — the minimum native navigation required to prove authentication, first-party dashboard data access, driver context, and Drive Venture presentation semantics.
2. **Future full native application** — the larger app navigation model that may later support drive logging, Garage management, drive edits/deletes, profile changes, notifications, offline behavior, and other production capabilities.

## Authorities and boundaries

This specification is governed by the following accepted Drive Venture records and source artifacts:

- **BKLG-0166 — App Navigation Specification**: define native information architecture and navigation from current capabilities rather than mechanically copying web URLs.
- **BKLG-0160 / ADR-038**: authentication uses Supabase Auth, while Drive Venture authorization remains server-enforced through `family_user_access` and explicit `driver_guardians` relationships.
- **BKLG-0161 / Design System Foundation**: native navigation must preserve Drive Venture semantic hierarchy, accessibility expectations, and visual-language intent without reproducing CSS literally.
- **DD-WEB-004**: the current web MVP uses passwordless access, relationship-scoped dashboards, driver-scoped Garages, and mobile-oriented drive controls.
- **DD-WEB-005 / ADR-040**: driver-console variants are skins over one shared functional contract, not separate applications.
- **BKLG-0179 / First-Party API Contracts**: `driver-api` action `dashboard`, contract version 1, is the supported first-party dashboard read contract for future native clients.

Current web implementation is evidence of product capability and naming. It is not a requirement that the native app reproduce the web document structure, URL structure, CSS layout, or DV03 cockpit geometry.

## Navigation principles

1. **Navigation follows product tasks, not website paths.** Native destinations should be named for customer-facing tasks such as Dashboard, Drive Log, Garage, and Profile rather than copied from `/log`, `/log/game`, or other web URLs.
2. **Authorization is never a navigation shortcut.** The client may show only destinations that appear relevant, but the backend remains authoritative for which families, drivers, drives, vehicles, and profile records a user may access.
3. **Driver context is explicit.** A signed-in guardian may have access to multiple drivers. A signed-in teen driver may normally see only themselves. The current driver context must be visible and switchable when more than one authorized driver exists.
4. **Read-only and mutation paths are separated.** BKLG-0167 must prove read-only dashboard access without quietly pulling in drive logging, Garage mutation, drive editing, or profile mutation.
5. **Details sit above primary navigation.** Screens such as Drive Detail, Edit Drive, invitation review, or recovery/error flows should open as stack/detail routes rather than primary tabs.
6. **Platform conventions are allowed.** Native safe areas, dynamic type, native back behavior, reduced-motion preferences, haptics, and accessibility conventions may differ from web while preserving Drive Venture semantics.
7. **Skins are presentation choices, not app forks.** Classic, DV02, DV03, or future earned experiences may change visual treatment. They must not create divergent business rules, persistence behavior, or authorization behavior.

## Recommended root navigation model

The future React Native app should use a conditional root navigator based on session state:

```text
RootNavigator
├─ AuthStack                         shown when no valid session exists
│  ├─ Welcome / SignIn
│  ├─ CheckEmail
│  ├─ AuthCallback / LinkHandler
│  ├─ ExpiredLink
│  └─ JoinPilotInfo
├─ AppStack                          shown after valid session + entitlement resolution
│  ├─ MainTabs
│  │  ├─ DashboardStack
│  │  ├─ DriveLogStack               full app only; excluded from BKLG-0167
│  │  ├─ GarageStack                 full app mutation later; read-only possible later
│  │  └─ MoreStack
│  ├─ DriverSwitcher                 modal/sheet when multiple drivers exist
│  ├─ DriveDetail                    detail route
│  ├─ AccessDenied                   detail/error route
│  └─ GlobalError                    detail/error route
└─ Bootstrap / RestoringSession       transient launch state
```

### Auth stack behavior

- A successful sign-in should replace the auth flow with the authenticated app shell rather than leaving Login on the back stack.
- If a deep link requires authentication, the app should preserve the intended destination, complete sign-in, then resolve the target only if the authenticated user is authorized for it.
- Expired or invalid auth links should land on a user-safe recovery screen with a request-new-link action.
- New/unrecognized users should see a Join Pilot or contact/support path, not raw provider errors.

### App shell behavior

`MainTabs` is the recommended default for the future native shell because Drive Venture's primary authenticated surfaces are few, persistent, and task-oriented:

1. **Dashboard** — progress, license status, night hours, recent activity, achievements, and driver context.
2. **Drive Log** — full app only; create/edit drive flows when supported by native-safe contracts.
3. **Garage** — vehicle list and later add/archive/primary vehicle actions.
4. **More** — Profile, Settings, Help, Feedback, legal/support links, sign-out, and experience/skin settings if later supported.

For BKLG-0167, the app may use a reduced shell with only `DashboardStack` plus Settings/Sign out access. It should not create placeholder tabs that imply unsupported production capability.

## Destination catalogue

| Destination | Purpose | Roles / visibility | Backend contract | State requirements | Spike scope |
| --- | --- | --- | --- | --- | --- |
| Bootstrap | Restore local session, initialize environment, resolve pending deep link. | All users. | Supabase Auth session APIs; no Drive Venture data until authenticated. | Loading, failed configuration, offline/unavailable. | Included. |
| Sign In | Request passwordless access for an entitled email. | Unauthenticated users. | Supabase Auth email link flow as approved by auth architecture. | Email sent, invalid email, unregistered/not entitled, resend throttling, expired link. | Included. |
| Auth Callback | Complete native session establishment from auth/deep link. | Users returning from email link. | Supabase Auth callback/session handling. | Success, expired link, invalid link, link already used, no entitlement. | Included. |
| Dashboard | Show selected driver's progress, license status, night hours, recent drives, achievements, and available driver context. | Authorized driver or guardian; operator behavior is out of native customer spike unless explicitly approved. | `driver-api` action `dashboard`, contract v1. | Loading, empty linked drivers, partial data, access denied, refresh error. | Included. |
| Driver Switcher | Select among drivers the signed-in user is authorized to view/manage. | Visible when dashboard contract returns more than one authorized driver. | Dashboard response plus server-enforced authorization on subsequent reads. | One driver, multiple drivers, driver removed/no longer authorized. | Included if multiple-driver fixture exists. |
| Drive History | Browse more than the dashboard's recent-drive subset. | Authorized driver/guardian. | Contract gap unless covered by future first-party history endpoint. | Empty history, pagination/loading, access denied. | Excluded; dashboard recent drives only. |
| Drive Detail | Read one drive's detail: times, vehicle, supervisor, skills, notes, night credit, source/provenance. | Authorized driver/guardian. | Current web uses `drive-detail-api`; native classification should be confirmed before use. | Loading, not found, access denied, deleted/voided. | Optional only if supported contract is explicitly approved; otherwise gap. |
| Log Drive | Create a supervised drive. | Authorized manager of selected driver. | Current write paths are browser-origin gated; native-safe write contract is a gap/future item. | Draft, validation, duration limit, save success, save failure, idempotency. | Excluded. |
| Edit Drive | Correct a drive. | Authorized manager/operator according to server policy. | Current web uses `drive-ops` plus detail/skills verification; native-safe mutation contract is a gap/future item. | Dirty form, confirm destructive/admin action, verification failure. | Excluded. |
| Delete/Void Drive | Remove/void an erroneous drive while preserving audit rules. | Authorized manager/operator according to server policy. | Current web has dedicated mutation paths; native-safe contract must be confirmed. | Confirmation, audit reason if required, success, failure. | Excluded. |
| Garage | Show selected driver's active and archived vehicles. | Authorized driver/guardian. | Dashboard includes vehicles for dashboard context; full Garage contract is future/gap if separate reads are needed. | Empty Garage, archived vehicles, access denied. | Optional read-only summary if available from dashboard response; mutation excluded. |
| Add/Edit/Archive Vehicle | Manage Garage vehicles. | Authorized manager of selected driver. | `driver-api` write actions currently classified as browser mutation; native-safe mutation is future/gap. | Validation, primary vehicle behavior, archive confirmation. | Excluded. |
| Profile | View person/family/driver profile basics. | Authenticated users for their own profile and authorized family context. | Current profile/family APIs exist but native support classification should be confirmed. | Loading, incomplete profile, contact verification pending. | Excluded unless needed for sign-out/account basics. |
| Settings | Account/session actions, sign-out, support links, notification preferences later. | Authenticated users. | Supabase Auth sign-out; notification contracts deferred. | Sign-out confirmation, failed sign-out, notification permission unavailable. | Minimal included for sign-out only if app shell needs it. |
| Help / Feedback | Surface support, feedback, and safety/help destinations. | All users, with richer authenticated context later. | Existing public/authenticated feedback surfaces are web-first; native contract TBD. | Web fallback, unavailable, submitted. | Excluded except as external/web link. |
| Experience / Skin Selection | Let a driver select visual experience if/when supported. | Future authorized users. | No current canonical preference contract identified in BKLG-0166. | Locked, unlocked, selected/current. | Excluded. |
| Notifications | Push notification permissions and routing. | Future authorized users. | BKLG-0165. | Permission prompt, denied, disabled, deep-link target. | Excluded. |
| Offline Queue | Offline draft/read/write behavior. | Future app users. | BKLG-0164. | Offline, queued, retrying, conflict. | Excluded. |

## Driver and family context

### Context source

The app should derive available drivers from the authenticated dashboard contract or a later explicitly approved first-party context contract. It must not infer access from family membership alone.

### Single-driver user

If exactly one driver is returned:

- select that driver automatically;
- do not force an extra switcher step;
- keep the current driver's name/avatar/progress visible in the dashboard header.

### Multi-driver guardian

If multiple drivers are returned:

- select the most recently selected driver when still authorized;
- otherwise select the first server-returned/default driver;
- expose a Driver Switcher as a sheet/modal from the dashboard header;
- clearly label the active driver in Dashboard, Drive Log, Garage, and Drive Detail;
- never allow a stale local preference to access a driver not present in the current authorized response.

### Operator visibility

The normal customer native app should not assume platform-operator mode. Operator fleet-wide customer-experience review belongs to operator tooling unless a later scope explicitly approves a native operator surface.

## Deep-link specification

The app should reserve stable semantic link targets even if some are deferred.

| Link target | Example semantic route | Behavior | Status |
| --- | --- | --- | --- |
| Auth callback | `driveventure://auth/callback` or approved universal-link equivalent | Complete session exchange, then navigate to pending destination or Dashboard. | Required for native auth. |
| Dashboard | `driveventure://dashboard` | Open selected/default driver dashboard after auth. | Included in spike. |
| Driver dashboard | `driveventure://drivers/{driverId}/dashboard` | Open dashboard with requested driver only if authorized; otherwise AccessDenied. | Included if driver parameter is supported. |
| Drive detail | `driveventure://drivers/{driverId}/drives/{driveId}` | Open Drive Detail only if a native-safe detail contract is approved. | Deferred/gap. |
| Join/invitation | `driveventure://join` or invitation-specific link | Route to native invitation/recovery flow only after auth architecture approves it. | Deferred. |
| Notification target | route varies by notification type | Must be defined by BKLG-0165. | Deferred. |

A deep link must never grant access. It only expresses navigation intent. Server authorization decides whether the destination may load.

## Back behavior

- From authenticated Dashboard, system back should not return to Sign In after a successful session transition.
- From Drive Detail, back returns to the previous Dashboard/History context when available; direct deep links may return to Dashboard.
- From modal Driver Switcher, dismiss returns to the previous screen without changing driver unless the user selects a driver.
- From AccessDenied, back returns to the safest available authenticated destination, usually Dashboard.
- From Sign Out, clear session state and reset to AuthStack.
- Android hardware back should follow stack history for detail screens and avoid accidental app exit from deep-linked auth or error states.

## State handling

Every destination must define these states before implementation:

- **Loading** — skeleton or progress state that names what is loading when practical.
- **Empty** — valid absence of data, such as no recent drives or no active vehicles.
- **Error** — recoverable failure with retry where appropriate.
- **Access denied** — user is authenticated but not authorized for the requested driver/drive/resource.
- **Expired/invalid link** — auth or invitation link cannot be used.
- **Offline/unavailable** — read-only cache/offline behavior remains deferred to BKLG-0164 unless explicitly included later.
- **Selected/current** — current tab, current driver, selected vehicle/drive/filter, and active screen must be visible without relying only on color.

## BKLG-0167 read-only dashboard spike subset

BKLG-0167 should implement only the following navigation subset:

```text
Bootstrap
AuthStack
├─ SignIn
├─ CheckEmail
├─ AuthCallback
├─ ExpiredLink
└─ JoinPilotInfo
AppStack
├─ Dashboard
├─ DriverSwitcher            only when more than one authorized driver exists
├─ AccessDenied
├─ GlobalError
└─ Settings / SignOut         optional minimal account route
```

### Included in the spike

- Supabase-authenticated session establishment using the approved native auth approach.
- Dashboard load through `driver-api` action `dashboard`, contract v1.
- Driver selection when the dashboard response includes multiple authorized drivers.
- Read-only display of dashboard-level driver progress, license/night progress, recent drives, quest awards, and vehicles returned by the dashboard contract.
- Refresh/retry and access-denied states.
- Native mapping of design-system tokens/semantics sufficient to prove the visual foundation works outside the web.

### Excluded from the spike

- Drive creation, edit, delete, void, or certification.
- Garage add/archive/edit/primary-vehicle mutations.
- Profile/contact edits.
- Push notifications.
- Offline write queue.
- Production app-store/TestFlight distribution decisions.
- Operator fleet tooling.
- Experience/skin unlock logic.
- New backend contracts except where separately approved as a prerequisite gap fix.

## Full-app navigation later

A future production native app may expand from the spike into:

```text
MainTabs
├─ DashboardStack
│  ├─ Dashboard
│  ├─ DriverSwitcher
│  └─ DriveDetail
├─ DriveLogStack
│  ├─ NewDrive
│  ├─ EditDrive
│  ├─ DriveSaveResult
│  └─ DriveSafetyInfo
├─ GarageStack
│  ├─ Garage
│  ├─ VehicleDetail
│  ├─ AddVehicle
│  └─ ArchiveVehicleConfirm
└─ MoreStack
   ├─ Profile
   ├─ Family
   ├─ Settings
   ├─ NotificationSettings
   ├─ Help
   ├─ Feedback
   └─ Legal
```

Full-app expansion should happen only after the required first-party contracts, offline rules, notification architecture, and mutation/idempotency boundaries are accepted.

## Contract gaps and follow-up candidates

The following are not implementation defects in BKLG-0166. They are contract gaps or deferred dependencies for later work:

1. **Native-safe drive detail contract** — current web can open drive details, but BKLG-0166 does not establish whether `drive-detail-api` is approved as a native first-party contract.
2. **Native-safe drive mutation contract** — current drive writes/edits are web/browser paths; native production drive logging should wait for BKLG-0180 or equivalent approved mutation contract.
3. **Native-safe Garage mutation contract** — current add/archive actions are classified as browser mutations in the first-party API contract documentation.
4. **Native profile/family management contract classification** — existing profile/family APIs should be classified before native app inclusion.
5. **Notification route contract** — belongs to BKLG-0165.
6. **Offline navigation and draft behavior** — belongs to BKLG-0164.
7. **Experience/skin preference persistence** — no native-ready preference contract is identified by this specification.

Recommended handling: do not create new backlog items yet for gaps already covered by BKLG-0164, BKLG-0165, BKLG-0180, or BKLG-0167. If native drive detail or native Garage mutation becomes required before existing items cover it, create a narrowly scoped backlog item at that time.

## Acceptance mapping

| BKLG-0166 acceptance criterion | Specification coverage |
| --- | --- |
| 1. Primary app destinations and navigation hierarchy are defined from current product capabilities rather than by mechanically copying web URLs. | Covered by Navigation Principles, Root Navigation Model, Destination Catalogue, and Full-App Navigation Later. |
| 2. Authenticated entry, driver/family switching, back behavior, modal/detail flows, deep links, and error/empty/loading states are specified. | Covered by Auth Stack Behavior, Driver and Family Context, Deep-Link Specification, Back Behavior, and State Handling. |
| 3. Navigation terminology and visual behavior use the approved Design System Foundation while allowing native platform conventions. | Covered by Authorities, Navigation Principles, App Shell Behavior, State Handling, and BKLG-0167 spike subset. |
| 4. The specification identifies the minimum navigation needed for the read-only dashboard spike separately from full-app navigation. | Covered by BKLG-0167 Read-only Dashboard Spike Subset and Full-App Navigation Later. |
| 5. The work does not redesign accepted product functionality outside navigation scope. | Covered by Authorities and Boundaries, Exclusions, Contract Gaps, and the explicit separation of spike/full-app work. |

## Management summary

BKLG-0166 establishes a native navigation plan without starting the native app. The recommended first step is a small authenticated dashboard app shell: sign in, resolve session, load the supported dashboard contract, choose a driver when needed, show read-only dashboard data, and sign out. Everything else remains deliberately outside the BKLG-0167 spike until the corresponding contracts and architecture items are approved.
