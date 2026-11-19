# `@manygamescorp/mod-inventory`

`inventory()` exposes the server's `GET /v1/inventory/me` projection as `sdk.inventory`.
`get()` returns the cached response when present; `get({ force: true })` and `refresh()`
read the service. Concurrent ordinary reads share one request. A grant received while a
read is in progress schedules a following read. Successful reads update the projection;
failed reads preserve the previous one. `current()`, `get()` and `positions()` return
detached copies; their TypeScript types are read-only, while the private cached
projection is frozen.

The module keeps an ETag with each successful response and sends `If-None-Match` on
later reads. A 304 preserves the complete snapshot, including `serverTime`, without
emitting `inventory:state:changed`. A failed or malformed response keeps the snapshot
and ETag; a successful 200 without ETag clears the conditional request. The service
may omit default values: the SDK returns `0` for missing versions and quantities,
empty arrays for missing position groups, `null` for missing snapshot `updatedAt` and
position `expiresAt`, `{}` for missing instance `attrs`, and `null` for a missing
position `updatedAt` (older services and mutation states omit it). Omitted groups replace
the corresponding cached arrays. Explicit invalid values still fail validation.

Currency capsules (client-sdk#504): a tap on a capsule of the top bar emits `inventory:currency:tap`
with `{ itemId, hard }`; the module opens nothing itself, the host decides (the demo shop shows the
packs of that currency).

Windows (client-sdk#701): with the `windows` permission the module registers the named windows
`main` (inventory), `chests`, `collection`, `card`, `album`, `shelf`, `easter` and `skin` through
`ui.windows` (`sdk.ui.show('inventory:chests')`, default `main`). The module has no UI of its
own: `open` emits `inventory:window:open` with `{ view, id }` (`id` is the optional `id` open
parameter: a card, skin or set) and the host mounts the Many Play Skin window from
`@manygamescorp/ui-kit/services/inventory-windows` or `/collection` (portrait and landscape,
screenshots in `docs/ui-kit-screens/mps/mod-inventory/`). Failures use the standard ui-kit error window.

Top bar (client-sdk#504): with the UI kit top bar (`topbar.registry@1`, see ui-kit README) the
module registers one capsule per catalog currency the player holds — soft first, then hard, at
most 4 — as `currency.<itemId>` in contexts `main` and `core` (labels `sdk.topbar.soft|hard`).
The value follows every state change (grant, spend, exchange, realtime reconcile) without polling;
a currency spent to the end shows 0. Without the UI kit or with the zone off nothing is registered.

`balance(id)` sums currency positions, `positions(id)` returns currency, stack and
instance positions, and `quantity(id)` sums currency/stack quantities plus one per
unexpired instance. Expiration is evaluated against the last response's `serverTime`,
never the device clock. `inventory:state:changed` reports only item IDs whose positions
changed. `inventory()` reads at start and on a realtime epoch/sequence resync. It subscribes to
`inventory.balance.changed` only with ref `inventory.me`, checks the advertised numeric
version and never replaces the cache with an older snapshot. Duplicate/older hints skip
reads; simultaneous versioned hints share the in-flight read. A lagging response keeps
the last confirmed state and the unsatisfied version. An ordinary reconnect retries only
that unsatisfied hint; a clean reconnect makes no request. Explicit refresh also reconciles
it. Connect `mod-realtime` for live updates. There is no periodic polling or
resume/grant-event fallback; `pollMs` and `pollOnResume` were removed.

`exchange(exchangeRuleId, { idempotencyKey })` sends `POST /v1/inventory/me/exchanges`:
the server spends and grants strictly by its rule (configs scope `inventory.exchange`),
so a game only names the rule — e.g. `use_hint` with a cost of one `hint` and no reward.
The game must generate and persist a UUID v4/v7 before the first request, together with
the operation arguments. Pass it as the required `idempotencyKey` and reuse both after
a timeout, network failure or restart; a new key starts a new spend. Use `randomUuidV7(sdk.time.now())` from `@manygamescorp/core/context` for new actions. The SDK keeps
the supplied key as both `X-Req-Id` and `Idempotency-Key`, journals up to 32 pending mutation
commands under the player and replays them at start/reconnect with the same body/key.
It never generates a replacement key for an unresolved spend. If journal persistence
fails before the request, the mutation is not sent. The confirmed `state` of the answer
replaces the projection and emits `inventory:state:changed`; a read that started earlier
and answers later never restores an older version. Refusals reject with the server code:
`INVENTORY_INSUFFICIENT_ITEMS` / `_FUNDS`, `INVENTORY_EXCHANGE_RULE_NOT_FOUND`,
`INVENTORY_EXCHANGE_LIMIT_REACHED` (`details.retryAt`). A malformed rule id or key is
`VALIDATION_FAILED` without a request.

`consume(itemId, qty, { reason?, idempotencyKey })` sends `POST /v1/inventory/me/consume`:
the player spends `qty` (1…10000) of an item the catalog marks `clientConsumable` — a
hint, a second chance, a life, a booster. It only decreases the balance; the client never
credits. `reason` is a short token (`[A-Za-z0-9._:-]{1,64}`, e.g. `level_12`) recorded in
the ledger and the `inventory.consumed` event. Keys, the confirmed `state` and late reads
behave as for `exchange`. Refusals reject with the server code:
`INVENTORY_CONSUME_NOT_ALLOWED` (no `clientConsumable` flag), `INVENTORY_ITEM_UNKNOWN`,
`INVENTORY_INSUFFICIENT_ITEMS`, `RATE_LIMITED` (more than 60 spends a minute). Malformed
input is `VALIDATION_FAILED` without a request. Use `exchange` for shop-like packaged
trades "resources for resources"; there are no other mutation methods.

The projection belongs to one player session. Stop, logout, auth change and dispose
abort reads and mutations and invalidate held API objects.

`entities()` reads the first 100 public entries from `GET /v1/inventory/entities` for
empty-inventory/catalog UI. It returns only `id`, `itemType`, `status` and public `display`
(title/description keys and icon URL), and rejects late responses after module disposal.
The service contract allows `display: null`. SDK normalizes that absence to
`{titleKey: null, descriptionKey: null, iconUrl: null}`, preserving the catalog entry
and the existing non-null `InventoryEntity.display` object. Missing/malformed display
values and malformed field types remain invalid; no names or icons are invented.
Quantities still come from `quantity(id)` and the player's inventory projection.

## Chest presentation (owner decision, 24.10)

Use the chest icon from inventory catalog `images`, resolved as an AssetRef
(`skin:<key>`, `asset:<id>`, or HTTPS allowed by environment hosts). The SDK chest
presentation includes the opening VFX and an `i` badge that opens the child window
«Что внутри». Mark random rewards with `?`; the preview never promises a particular
roll. Only the server-confirmed grant supplies the result, displayed in a grid with
three items per row (client-sdk#1233/#1234). Closing the preview returns to its parent.
Check those implementation tasks and the installed SDK exports before using the UI.
The client does not choose random rewards or credit balances.

Native `inventory.*` config schemas are registered by the owning service at startup
through `configs.schema.register` (configs#485). Missing schema means no create/edit;
see [schema authoring rules](../../docs/config-schemas.md).

## Package-owned client contracts (next SDK line)

`@manygamescorp/mod-inventory/contracts` exports the inventory service's generated
`paths`, `components` and `operations` types. The public OpenAPI and provenance are
`@manygamescorp/mod-inventory/contracts/inventory.client.json` and
`@manygamescorp/mod-inventory/contracts/sources.json`. These files live with the
module; the shared `contracts-client/inventory` export is removed in the next line.
Update imports together; previously published npm/CDN versions are immutable.

The runtime requires one **host** `@manygamescorp/core` through a peer dependency.
The currently checked ABI is exactly the core version set in `peerDependencies`; this does not require the module
itself to have that version. Core and the generic contracts are development inputs
for this workspace, not runtime dependencies installed below inventory. UI slots,
HUD and topbar remain optional capabilities; no UI Kit or skin is installed by the
module. Balances, exchanges, consumes and grants retain their server authority.

```ts
import { inventory } from '@manygamescorp/mod-inventory/inventory';
import type { paths } from '@manygamescorp/mod-inventory/contracts';

type Consume = paths['/v1/inventory/me/consume']['post'];
const module = inventory();
```

Generate/check the owned contract offline:

```sh
npm run contracts:gen -w @manygamescorp/mod-inventory
npm run contracts:check -w @manygamescorp/mod-inventory
# Deliberate repin to inventory main, using existing GitHub authorization:
npm run contracts:sync -w @manygamescorp/mod-inventory -- --update
npm run contracts:gen -w @manygamescorp/mod-inventory
```

Root `contracts:gen` and `contracts:check` include this owner. The spec remains
pinned to its inventory service commit and SHA-256; there is no second source copy
in contracts-client. Generated declarations, schema and provenance are inside
`dist/`, so the existing vendor builder carries them with this package.

`scripts/inventory-package.test.mjs` packs real core/shared-contract tarballs and
an inventory-only version fixture, installs them offline, checks strict NodeNext
consumer types, one host core, and every vendor file hash/size and public export.
Selecting only core in the vendor writer excludes the inventory artifact, including
its contract and README. This proves the package boundary; the coordinated global
publisher/mixed-version catalog change belongs to #1457 and versioned shared docs
to #1467. This change does not bump/publish packages or declare a new LTS release.
