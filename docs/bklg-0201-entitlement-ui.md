# BKLG-0201 Entitlement UI Adapter

## Purpose

This source-side note documents the frontend half of BKLG-0201. The backend PR owns the canonical family entitlement model and enforcement. This frontend adapter makes the drive-log UI aware of that server authority without adding checkout, pricing, or payment scope.

## Included

- Loads `assets/js/log-entitlements.js` on DV00, DV02, and the default DV03 route.
- Loads the adapter after `drive-save-recovery.js` and before `log-drive-rpc.js`.
- Calls `get_family_entitlement_status_v1` for authenticated family entitlement state.
- Renders a small status panel above the drive form.
- For `FREE_EXHAUSTED`, blocks new-drive submit before the drive RPC handler and clears any local unfinished-save journal.
- Leaves edit mode available so existing-drive edits remain possible.
- Patches `DV_DRIVE_SAVE_RECOVERY.isAmbiguous` so `DV_FREE_DRIVE_LIMIT_REACHED` is not treated as an uncertain save.
- Normalizes `drive-ops` entitlement-denial responses into a clear non-ambiguous error payload.

## Explicitly excluded

- Checkout UI.
- Pricing display.
- Payment-provider integration.
- Receipts, tax, subscription, or purchase mechanics.
- Final Alpha cohort disposition.

## Preservation

The adapter is additive. It does not rewrite `log-drive-rpc.js`, overlap warning logic, drive detail behavior, or PDF/export behavior. This keeps BKLG-0194 save recovery and BKLG-0005 overlap/PDF behavior intact while adding entitlement awareness.

## Validation

`tests/bklg-0201-entitlement-ui.test.js` checks:

- all supported log routes load the adapter;
- load order is recovery → entitlement adapter → drive RPC;
- the adapter recognizes `DV_FREE_DRIVE_LIMIT_REACHED`;
- save-recovery ambiguity classification is patched;
- exhausted-family submit blocking runs in the capture phase;
- the canonical status RPC is used.

Manual DEV UAT is still required against the backend BKLG-0201 DEV migration.
