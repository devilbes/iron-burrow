# Inventory catalog publish log — app 360 (iron-burrow), env test

Date: 2026-11-19
Session check (mcp.session.get): appId 360, appCode iron-burrow, env test, scopes include inventory.catalog.read / inventory.catalog.write. serverVersion 1.0.0.89.
Docs read: manyplay://docs/tools/inventory.entities.create (inputSchema).
Source files: configs/remote/inventory.catalog/{bst_bubble,bst_shockwave,bst_fortify,bst_hull}.json

Entity body was the file content sent unchanged. All fields in the files are accepted by the tool schema: itemId, itemType, isStackable, maxBalance, attrsSchema, offlineAllowed, revocable, expiresAt, clientConsumable, display{name,titleKey,descriptionKey,images{iconSmall:null,iconLarge:null}}. No `enabled` field was sent. No shape fixes were needed.

Success responses carry no rid; rids are recorded only for error responses (here, the NOT_FOUND pre-state reads).

## Summary

| itemId | pre-state (rid) | call | idempotencyKey | result | entityVersion | catalogVersion | etag | readback diff vs file |
|---|---|---|---|---|---|---|---|---|
| bst_bubble | INVENTORY_ENTITY_NOT_FOUND (1777b881-41c3-4a28-b143-8ef5c6e4f461) | inventory.entities.create | app360-test-inv-create-bst_bubble-v1 | created | 1 | 1 | "1" | none |
| bst_shockwave | INVENTORY_ENTITY_NOT_FOUND (9d47cc0a-e87e-491f-a36d-08ce3d3319f4) | inventory.entities.create | app360-test-inv-create-bst_shockwave-v1 | created | 1 | 2 | "1" | none |
| bst_fortify | INVENTORY_ENTITY_NOT_FOUND (e712e6db-b45f-4949-afba-3fc691fa6e0a) | inventory.entities.create | app360-test-inv-create-bst_fortify-v1 | created | 1 | 3 | "1" | none |
| bst_hull | INVENTORY_ENTITY_NOT_FOUND (3dd3a5f2-6cef-4680-8271-8c4959a5c3bf) | inventory.entities.create | app360-test-inv-create-bst_hull-v1 | created | 1 | 4 | "1" | none |

## Per item

### bst_bubble
- Pre-state: inventory.entities.get returned INVENTORY_ENTITY_NOT_FOUND, "inventory.entities.get: itemId — inventory entity not found.", rid 1777b881-41c3-4a28-b143-8ef5c6e4f461
- Call: inventory.entities.create, idempotencyKey `app360-test-inv-create-bst_bubble-v1`, entity = file content
- Result: created, entityVersion 1, catalogVersion 1, etag "1", createdAt 2026-11-19T11:17:30.854Z
- Readback: every file field is equal (itemType stackable, isStackable true, maxBalance null, attrsSchema null, offlineAllowed false, revocable false, expiresAt null, clientConsumable true, display name "Bubble Shield", titleKey item.bst_bubble.title, descriptionKey item.bst_bubble.description, icons null/null).
- Refusals: none

### bst_shockwave
- Pre-state: INVENTORY_ENTITY_NOT_FOUND, "inventory.entities.get: itemId — inventory entity not found.", rid 9d47cc0a-e87e-491f-a36d-08ce3d3319f4
- Call: inventory.entities.create, idempotencyKey `app360-test-inv-create-bst_shockwave-v1`
- Result: created, entityVersion 1, catalogVersion 2, etag "1", createdAt 2026-11-19T11:17:33.444Z
- Readback: every file field is equal (display name "Shockwave", item.bst_shockwave.title / .description, icons null/null).
- Refusals: none

### bst_fortify
- Pre-state: INVENTORY_ENTITY_NOT_FOUND, "inventory.entities.get: itemId — inventory entity not found.", rid e712e6db-b45f-4949-afba-3fc691fa6e0a
- Call: inventory.entities.create, idempotencyKey `app360-test-inv-create-bst_fortify-v1`
- Result: created, entityVersion 1, catalogVersion 3, etag "1", createdAt 2026-11-19T11:17:35.196Z
- Readback: every file field is equal (display name "Steel Fortress", item.bst_fortify.title / .description, icons null/null).
- Refusals: none

### bst_hull
- Pre-state: INVENTORY_ENTITY_NOT_FOUND, "inventory.entities.get: itemId — inventory entity not found.", rid 3dd3a5f2-6cef-4680-8271-8c4959a5c3bf
- Call: inventory.entities.create, idempotencyKey `app360-test-inv-create-bst_hull-v1`
- Result: created, entityVersion 1, catalogVersion 4, etag "1", createdAt 2026-11-19T11:17:36.636Z
- Readback: every file field is equal (display name "Spare Hull", item.bst_hull.title / .description, icons null/null).
- Refusals: none

## Notes
- Readback also contains fields the server adds that are not in the files: enabled:true, status:"active", virtual:null, template:null, effect:null, origin:{type:"manual"}, archivedAt:null, timestamps. These are service defaults, not differences from the file.
- On a re-run, inventory.entities.get finds all 4 entities matching the files, so the expected result is "unchanged" for each and no create calls.
