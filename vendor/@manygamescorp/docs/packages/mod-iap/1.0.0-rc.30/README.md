# @manygamescorp/mod-iap

In-app purchases (`sdk.iap`, E95, modules/iap.md): offers from configs, orders of the iap service,
the `StoreAdapter` port and the fake store of test/dev builds. Uses only core; no runtime
dependencies. Subpaths: `./iap` (module), `./catalog` (pure showcase), `./store` (port),
`./fake-store`.

## Quickstart

```ts
import { createSdk } from '@manygamescorp/core/kernel';
import { iapModule, type Iap } from '@manygamescorp/mod-iap/iap';
import { realtime } from '@manygamescorp/mod-realtime/realtime';

// In dev/test, configure modules with sdk.modules.set and the provider with
// iap.providers.set (MCP). platformConfig is the environment-generated result.
const sdk = createSdk({ platformConfig, http: { appVersion: '1.0.0' },
  modules: [realtime(), iapModule()] }) as ReturnType<typeof createSdk> & { iap: Iap };
await sdk.boot();

await sdk.iap.products(); // load localized store prices before rendering priceText
const offers = sdk.iap.offers({ placement: 'shop_soft' }); // this group's own block
const offer = offers.find((offer) => offer.available);
if (offer) {
  const result = await sdk.iap.purchase({ offerKey: offer.key, placement: 'shop_soft' });
  if (result.status === 'purchased') { /* the server granted; read inventory */ }
}
sdk.bus.on('iap:offers:updated', ({ placement }) => { /* re-render that placement */ });
```

## Showcase (no network)

Offers and placements are shared across skins. Read each shop group separately and render
its own block: `shop_special` (featured cards; a slider when there is more than one),
`shop_soft`, `shop_hard`, `shop_bundles`, `shop_ads`, `shop_other`. An offer belongs to exactly
one placement group. Do not create a catalog or placement keys for each skin (demo-game#152).

Offer `ui` describes `texts` (`title`, `subtitle`, `description`, `badge`, `cta`), banners,
icons, a timer and a card variant (iap#244). Image values use AssetRef `skin:<key>`,
`asset:<id>` or HTTPS with exact hosts allowed by environment configuration
(client-sdk#1235, configs#487). A semantic `skin:` key is resolved by the active skin;
it does not tie the shared offer to a skin ID. See [assets](../../docs/assets.md).

Price and price currency come only from the store. Games load `products()` and display
the resulting `priceText`; they do not put prices in game code or offer configs. The fake
provider takes prices/currency from IAP provider settings, configured through
`iap.providers.set`, never from game-side price tables (client-sdk#1240).

`offers({placement})` reads the resolved scopes `iap.placements` (ordered offer keys = priority,
`limits.perSession/perDay`), `iap.offers` and `iap.settings.products` of `sdk.configs` — conditionals
(segments, project parameters) are already applied on the player's context (E94). Disabled or
filtered-out records are not listed. Each offer carries `applied`/`scopeVersion` (sent with the
order), the default variant and all variants, the product with its internal productKey
and, once `products()` loaded, localized title/priceText; `available` or a `reason`: `cooldown`
(`availableAt`), `limit_offer`, `limit_placement`, `schedule`, `no_product`, `store_unavailable`.
Server `offerState` of init (cooldown, exhausted windows — `free`) and client counters under the
gid (paid/ad cooldown and limits, per-session counts) are combined. `schedule`: an ISO time (with
`durationSec`) or an ISO interval `start/end`; CRON is not supported yet — such an offer is
unavailable. When a context change, a configs update, init, prices or a grant change the result
of a placement read before, `iap:offers:updated {placement}` is emitted.

## Orders (`/v1/iap`, api-client.md)

- `purchase({offerKey, variantKey?, placement?, payload?})` — paid and free. paid: `POST /orders`
  (`storeKey` stays inside the host) → `StoreAdapter.purchase` → normalized server proof validation
  → wait for a matching realtime hint and read `GET /orders/{id}` → `finish` only after `granted`. Explicit store `canceled`, `failed`,
  `already_owned` or `not_available` → `cancel {user_cancelled|store_error}`. A purchase exception
  has an unknown outcome: return `pending` without canceling and observe the server for up to
  10 minutes (at most 32 orders, stopped with the session); a late `onTransaction` validates
  the open order, and the server decides grant or expiry. Store pending → `pending` (the transaction arrives later
  via `onTransaction` and is validated then). Network failure of validate → `pending`, the store
  transaction stays unfinished and is retried with the same Idempotency-Key. `granted` comes only
  from the server. The context is held (`ctx.facts.hold`) during the purchase.
- A synchronous `purchased` transaction with `orderId: null` uses the order just created;
  a different non-null order ID is rejected. Unfinished `onTransaction` deliveries without
  an ID submit that transaction directly to `/restore`, including consumables absent from
  `StoreAdapter.restore()`. Restore sends `{storeKey, purchases: [{orderId, productRef, proof}]}`;
  the server resolves the order from its purchase link. Concurrent deliveries share one flight,
  and retries reuse the persisted restore key. An unresolved/conflicting proof stays
  unfinished; a resolved order uses the usual authoritative reads, grant events and `finish` flow.
- A paid order requires a nonempty server `storeAccountToken`. Missing/blank tokens trigger
  a cancel attempt with `store_error` and return `not_available` (`SDK_IAP_NOT_AVAILABLE`).
  `StoreAdapter.purchase` is never called, even if cancel fails; the SDK never substitutes
  the order id for the account token.
- `iap:order:granted`, purchase facts and usage counters are reported once for each retained
  order across paid/free/claim and background observation. The profile's IAP storage keeps
  an LRU history of 256 order ids, isolated by app, API origin and gid; repeated grants touch
  retention without changing counters or cooldown. Redelivery of a retained order only calls
  `finish`, without validation or repeated grant events. Storage failures leave
  deduplication in session memory. Evicted orders, cleared storage and failed persistence
  across restarts can be reported again; this is a client notification cache, not server rewards.
- After successful validation, a retryable order read failure returns `pending` with the existing
  `orderId` and emits `iap:order:pending`. Observation continues in the current session, including
  realtime invalidations (up to 32 orders, 10 minutes, one deadline reconciliation). A later server grant
  finishes the store transaction and emits `iap:order:granted`; a terminal failure emits
  `iap:order:failed`. Stop/player change ends observation. Keep the pending order instead of
  starting another store purchase for it.
- For sdk.ads: `createAdOrder({offerKey, placement, variantKey?, applied?, scopeVersion?})`,
  `claim(orderId)`, `cancelOrder(orderId, 'not_shown'|'not_rewarded')`, `waitOrder`.
  `cancelOrder` and `claim` reuse a persisted key per order (and reason).
- `order`, `orders({status, cursor, limit})`, `pendingOrders()`, `restore()`, `entitlements()`,
  `load({force})` (init: single flight; the module starts it itself, offers work before it).
- Order ids are checked (lowercase UUID) before they become a path; payload keys
  `[A-Za-z0-9_-]{1,64}`, depth ≤ 4, ≤ 4 KB. Server errors propagate as SDKError with the server
  code (`IAP_OFFER_NOT_FOUND`, `IAP_AD_ADVANCE_EXHAUSTED`, …).

Facts: `ads.advanceOutstanding` (init, createAdOrder, claim); `ctx.facts.purchase()` on a grant.
Events: `iap:offers:updated`, `iap:order:created|validated|granted|pending|failed`,
`iap:store:purchase-started|purchase-cancelled|purchase-failed`, `iap:restore:completed`,
`iap:entitlement:changed`, `iap:window:open`.

Windows (Many Play Skin, #700): the module has the `windows` permission and registers `main`
(shop), `offer` and `chain` for `sdk.ui.open('iap[:offer|chain]', { placement, offerKey })` and
config triggers. `canShow` of `offer`/`chain` is true only when the given placement has an
available offer; `open` emits `iap:window:open {target, placement, offerKey}` (empty strings when
absent) and returns a ticket that is already closed, so the host owns the window lifetime. The
host draws the windows with `@manygamescorp/ui-kit/services/iap-windows` (`shopWindow`,
`offerChain`) and `.../services/shop` (`limitedOffer`): portrait and landscape from one markup,
`ui-kit` tokens only. Purchase failures use the standard ui-kit error window, not an own screen.


## StoreAdapter and the fake store

The catalog is ours (`iap.settings.products`). An adapter only prices the products it is asked
for (`products`) and runs the store side: `purchase`, `finish`, `restore`, `onTransaction`. Without
an adapter (a build without store products) paid offers are `store_unavailable`; free and ad
offers work and no store plugin is loaded. Google host-port loading is described below; Apple comes later.

The fake store plays the store side of a purchase: prices and currencies are loaded from
IAP `fakeProviders.prices[productKey]` through `POST /v1/iap/store/products`.
Missing entries return an unknown price. It opens a modal sheet
«Купить / Отмена / Ошибка / Pending» (or a fixed
`outcome`, or your own `ask`; without a sheet an ask purchase fails with
`SDK_IAP_NOT_AVAILABLE` «fakePaymentSheet missing»), a transaction with the receipt
`fake-receipt:v1:{orderId}:{transactionId}:{productId}` that the iap provider `fake_store`
checks, `settle(orderId)` for deferred purchases, restore of owned non-consumables. It throws in a
production build (`import.meta.env.PROD`) and sdk.iap ignores it unless the generated
runtime environment is `local`, `dev` or `test`. Provider-owned price loading is tracked
in client-sdk#1240; an older SDK's local price fallback is not an authoring workflow.

Tests: pure showcase, the order flow on a fake port, the fake store and the kernel (environment
gate, context change without network, A↔B identity change); demo e2e `iap.spec.ts`.


## Module and provider setup (owner decision, 24.10)

In dev/test, discover the available ManyPlay MCP tools, read the existing composition,
then use `sdk.modules.set` (dryRun, apply, readback) and `iap.providers.set` for the provider.
Use the same MCP workflow for ads (`ads.units.upsert` and the documented ads tools).
Do not enable modules/providers by editing platform.json or writing directly to Panel/Mongo.
The environment generates platform.json as runtime input. Adapter selection in
`moduleConfig.iap.storeAdapter` is a runtime implementation detail, not an authoring API.
The build includes the adapter for its target; store product bindings select its productId.
Missing/unknown adapters leave paid unavailable; free/ad remain available. Game calls stay
`sdk.iap.*`. Do not branch purchase logic on OS or substitute platform values.

For a separate web CDN adapter, select the published package/version through
`sdk.modules.set`. Core loads module.json/entry, checks engines and bounds, runs the scoped
adapter lifecycle, and disposes it when IAP stops. It must be a dependency-free `kind: adapter`
web module whose API is StoreAdapter and whose permissions fit IAP's manifest.
Errors leave paid unavailable. The adapter is selected at start, without replacement during purchases.

The fake store remains `./fake-module`. Google Play is a separate registry package:
import `googlePlayModule` from `@manygamescorp/mod-iap-google-play/google-play-module` and
include it alongside `iapModule()` in the local SDK composition. Its manifest requires `iap`,
allows only Cordova / `google_play`, and owns `nativePlugins: ["iap.google_play"]`.
The selected build adapter registers the validated port
through `iap.store@1` after IAP starts. `mod-iap` has no native plugins and does not depend on
the Google Play package. Native modules must be local build inputs, never remote adapters.
Google takes an installed StoreAdapter port named `iap.google_play` from the Cordova plugin
registry; [native/google-play](../../native/google-play/README.md) implements BillingClient
or server ack/consume. Missing native port is unavailable. Native end-to-end purchase validation
still depends on the IAP/gplay handoff. Remote default exports must keep run state per ctx.signal.

## Web redirect confirmation (client-sdk#1523)

The host passes its opaque launch `storeId` and origin-checked PortalBus at initialization:

```ts
import { iapModule } from '@manygamescorp/mod-iap/iap';
import { redirectPaymentsDomain } from '@manygamescorp/mod-iap/redirect-store';
// Both peers register the domain BEFORE WebPortalAdapter/PortalHost.start().
adapter.bus.register(redirectPaymentsDomain());
const module = iapModule({ storeId: launch.storeId, portal: adapter.bus });
```

Use the existing WebPortalAdapter with PortalOriginPolicy from build/env and an exact
portal origin. No wildcard destination, query-derived origin or second postMessage transport.
The storeId is supplied by the wrapper, never inferred from OS, host or product name.
Only the web target selects this adapter; native/fake flows retain their own adapters.

Paid purchases create `POST /v1/iap/orders` with `storeId` and `productKey` alongside
the offer/variant/context. The response supplies `confirmation: {type:'redirect', url}`.
The adapter sends exactly one `payments` / `checkout.open` request with `{orderId, url}`.
Only HTTPS URLs without credentials are accepted; the shell validates provider host allowlists.
No payment-session endpoint, embedded form, redirect-return parser or client proof is used.
The shell reply, cancellation and transport errors never prove a grant or cancel an order.

SDK reads `GET /v1/iap/orders/{id}` immediately and at bounded five-second intervals for
up to 30 seconds, even when realtime is connected. A server grant returns purchased;
otherwise purchase returns pending and the existing pending-order observer remains active.
Player switch/disposal aborts reads and timers. The existing action journal deduplicates
in-flight/replayed commands; resuming a pending order observes it without another shell request.
Prices still come from authenticated `/store/products`, using the opaque store label;
SDK has no provider-specific URLs, credentials or hardcoded prices.
The old provider-specific entrypoints and UI ports are removed without compatibility aliases.
Host initialization adds no server settings, scope, permissions or MCP methods; existing
catalog/provider authoring remains through ManyPlay MCP.

## Realtime and action IDs (client-sdk#278, E121)

Connect `mod-realtime`. IAP declares handlers for `iap.order.paid/granted/failed/refunded/revoked`.
A hint must target a player/session and match both the retained purchase rid and
`iap.orders.<orderId>` (including payload orderId). `paid`, transport ACK and rid alone
never prove a grant. For an order already returned by the server in this player run,
the guaranteed `iap.order.granted` fact from `iap`, schema v1, supplies the authoritative
`granted|granted_advance|confirmed` status and `grantStatus: granted`. The SDK applies those
fields to the retained order without a status GET. A hint without that complete fact
requires an order read before reporting `purchased`/finishing the store transaction.
Inventory alone owns balance hints: it reads the authoritative versioned snapshot once,
updates the balance and emits the reward. `paid` and balance hints do not cause IAP reads.
Thus a normal paid purchase uses validate + one inventory GET after order creation;
there are no additional IAP/progress init requests. With no grant event, the fallback
is validate + one order GET after the configured confirmation wait. Later recovery/resync and disconnected
backoff are separate from that initial confirmation budget.
A purchase returns the existing normalized failed outcome for a terminal order;
`grantStatus: rejected` is a terminal `SDK_IAP_FAILED` even if status remains `validated`: purchase
returns failed, observation emits `iap:order:failed`, and pending actions/ad rewards are cleared.
The store transaction remains unfinished. `waitOrder` rejects for terminal failure/cancellation.
Purchase waits for a matching IAP grant for the configured `confirmTimeoutMs` before
its one deadline read. If pending, it returns control to the game; the existing dismissible
processing presentation remains available until the player closes it or the order settles.
No grant or ordinary reconnect triggers `/init`. A changed epoch or sequence gap triggers
reconciliation. Public `waitOrder` reads initially and on hints and returns its last pending
state at its deadline. Disconnected background observers poll after 5, 10, 20, 40, 40 seconds,
only within the configured `offlinePollMs` budget; without that setting there is no polling.
The next timer rechecks connectivity before making a request.
Connecting any transport stops fallback reads. Late events restart bounded observation. Lost/collapsed hints
are reconciled by reads of existing orders, without creating another order or grant.

The SDK creates a UUIDv7 before a purchase or rewarded order. Games may supply a persisted
`txId` in `purchase`/`createAdOrder`. The first mutation sends identical X-Req-Id and
Idempotency-Key; validate/claim/cancel retain the action rid and their own durable mutation
keys. Up to 32 pending create commands (exact body, rid, orderId) and bounded mutation keys
are kept in app/API origin/gid scoped storage. Startup replays an unanswered create with the
same body/key and reconciles every journalled order, even without an `orderRids` entry.
Terminal orders and authoritative 404s clear the pending action; temporary read failures keep it.
A still-pending order emits `iap:order:pending`; retrying that purchase returns `pending`
without another store charge. A fresh click without `txId` can start a new purchase once the
old order is terminal or missing. It never restarts the store purchase automatically;
unfinished store transactions still arrive through the adapter. Identical concurrent purchase
calls share one flight. Persistence failure before a command prevents that command.
Receipts and account tokens are never journalled. A host using `createIap` directly must
provide durable scoped storage and a scoped realtime view to obtain these guarantees.

The public realtime envelope accepts bounded `rid` and `causationId` beside `ref`. Positive
IAP correlation needs the server implementation in realtime#12; the E23 scenario on the
pinned current realtime server covers inventory delivery and IAP reconnect reconciliation,
while SDK transport tests cover matching rid/type/ref and session changes. Release/deployment
and the live demo/Knotty p95 acceptance are owned by the orchestrator.

## Google Play subscriptions (client-sdk#921)

```ts
const subscriptions = await sdk.iap.subscriptions({ force: true });
// Read state, autoRenew and expiresAt together; a canceled renewal can retain access.
await sdk.iap.openSubscriptionManagement();
// On return from the store, refresh server entitlements.
await sdk.iap.entitlements({ force: true });
```

`openSubscriptionManagement()` uses `ctx.platform.openUrl` in `system` mode to open
[Google Play's subscription center](https://developer.android.com/google/play/billing/subscriptions#deep-link).
It requires a connected Google Play store and platform capability; otherwise it rejects with
`SDK_IAP_NOT_AVAILABLE`. Platform errors are sanitized to `SDK_IAP_STORE_ERROR`.
Game code supplies no SKU, package name, URL or proof. The center lists the store account's subscriptions.

Entitlements expose `active`, `grace`, `on_hold`, `paused`, `canceled`, `expired`, `revoked`
and `refunded`, plus `autoRenew` and ISO expiry. `canceled` is typed for the server contract
follow-up [iap#184](https://github.com/manygamescorp/iap/issues/184); the current server contract
has no such state. The SDK does not infer it from `autoRenew: false`.
`iap:entitlement:changed` lists affected product keys, including removed products and changes
to state, renewal, expiry or source order. An identical refresh does not emit an event.

Trial/base-plan offers use catalog bindings `productId`, `basePlanId`, `offerId`; the adapter
receives the exact selected binding. Eligibility and trial pricing belong to the store, grants
to the server. Purchase cancellation returns `canceled`/`SDK_IAP_CANCELED`, ownership conflicts
`already_owned`/`SDK_IAP_ALREADY_OWNED`, unavailable products/stores
`not_available`/`SDK_IAP_NOT_AVAILABLE`; raw vendor codes/messages stay private.
A `pending` purchase returns immediately with `SDK_IAP_PENDING`; listen for
`iap:order:granted` or inspect the order after a matching realtime hint, without granting locally.
The existing demo Purchases panel includes restore, subscriptions, pending orders and management.

The generated `docs/sdk-api.json` (JSDoc + `docs/sdk-api.notes/iap.json`) is the SDK source for
mcp-knowledge; no separate hand-maintained API copy is needed.

## Native build dependencies (#1255)

Native builders read versioned plugin peers from package.json, not runtime manifests.
The optional peer `cordova-plugin-purchase` is pinned to 13.19.1. The selected
Google Play adapter declares its own bridge peer separately. Native permissions
come from plugin.xml; service-account credentials remain server-side.

### Host timing policy (client-sdk#1290)

Set optional `confirmTimeoutMs` and `offlinePollMs` in
`platformConfig.moduleConfig.iap` (or the higher-priority `createSdk({moduleConfig})`).
Standalone hosts pass the same fields to `createIap({settings})`. Both values must be
integer milliseconds in 0…600000; invalid values fail with `VALIDATION_FAILED`.
The runtime copies these fields for the player session.

Without `confirmTimeoutMs`, or with zero, confirmation reads the server immediately.
Without `offlinePollMs`, or with zero, background observers use realtime hints/reconnect
without fallback polling. A positive value bounds disconnected polling; reconnect stops
it. A late grant hint remains authoritative after the polling budget ends. These are host
composition inputs, with no new configs scope or service/MCP endpoint.
