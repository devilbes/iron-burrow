# Headless base composition (client-sdk#1456)

With `platform.json.app`, `createSdk({ modules: [], ... })` owns `sdk.auth`,
`sdk.configs` and exactly one `sdk.profile` (types/low-level factory: `core/profile`).
Profile starts after auth/configs, performs no eager reads and has no HUD/topbar/skin
imports. Session changes abort its requests and discard its API/caches. `sdk.id` is not an API.
Do not register `profile` in `modules` or `sdk.modules` lock; these overrides are rejected.

Explicit optional entries remain `mod-profile-pack/kv` (`kvModule`, id `kv`),
`mod-profile-pack/state` (`gameStateModule`, id `gamestate`) and `mod-profile-pack/ui`
(`profileUiModule`, id `profile-ui`). Presentation consumes `profile.read@1`
(`ProfileReader.get(): Promise<ProfileData>`) and `profile:level:changed`.
The old `mod-profile-pack/profile` export is removed from this source line; published artifacts
are immutable. See [the composition contract](../../docs/headless-base.md).

# Module permissions

[Core errors and UI transitions](../../docs/core-errors.md): actual startup codes,
fullscreen change deduplication and public argument-validation contracts (#1652).

`createSdk` supplies the same permission policy to lifecycle hooks and module API factories.
`Permission`, `ModuleContext`, `DeviceView` and `ScopedSdk` are public types in `core/module`.
Host composition can also use `createModuleContext` and `ModuleContextPorts` from
`core/module-context` with a validated manifest and a lifecycle-aware module resolver.

Optional context ports without a declared permission are absent (`undefined`). `http:<service>`
grants only an HTTP port for that service; `kind: 'ui'` and the `ui`/`ui.*` namespaces always
receive no HTTP port. Services owned by core — `http:auth` (id: token exchange, only
`sdk.auth`) and `http:configs` (only `sdk.configs`) — make the manifest invalid
(`SDK_MODULE_MANIFEST_INVALID`), and `createScopedHttp` refuses them with `SDK_PERMISSION_DENIED`
before any I/O. `storage`, `windows`, `screens`, `analytics`, `poller` and `platform`
each grant their corresponding port. Ports remain absent when the host has no implementation.
`secure:none` grants no secret storage: player tokens and `SecureStore` belong to core.

The device view grants only the declared groups: `device:info` (`info`, `capabilities`),
`device:haptics`, `device:geo`, `device:permissions`, `device:tracking` (`tracking`,
`advertisingId`). A denied property read on this proxy throws `SDK_PERMISSION_DENIED` before
accessing the underlying device. Unknown device groups and wildcards are invalid manifests.

`ctx.sdk` is a frozen module namespace proxy. Games declare `manifest.sdk.uses: ['profile',
'ui.shop']`; absent `uses` grants no modules. For other modules the view contains only
`requires` and `optional`. Undeclared access throws `SDK_PERMISSION_DENIED`, declared missing
modules throw `SDK_MODULE_NOT_INSTALLED`, and module APIs require the SDK and provider to be
ready. `ctx.services` additionally checks a game's `sdk.uses` against the capability provider.
This view exposes module APIs, without host `getModule`, endpoints, platform or token stores.

`ctx.strings?.registerDefaults(namespace, bundles)` installs built-in localization defaults.
Service modules can register only their own namespace; UI modules own the `sdk` presentation
namespace. This port exposes no locale mutation or transport. Its context abort revokes writes.
HUD/topbar/bottommenu defaults live in the explicit UI Kit module, outside headless core.

# Module lifecycle

`ModuleLifecycle` from `@manygamescorp/core/lifecycle` controls one definition from
`ModuleRegistry`: construct it with the definition, `ModuleContext` and the core event bus,
then call `resolve()`, `init()` and `start()`. Resolution ordering and dependency checks
belong to the kernel/loader. `stop('hidden' | 'auth-change' | 'unload')` allows a subsequent
`start()`. Stop a started instance before disposing it. `dispose()` also cleans up instances
that never started or failed. A disposed instance cannot be reused.

Each hook has a 10 second default deadline; `timeoutMs` sets all deadlines and `timeouts`
overrides individual hooks. Invalid or overlapping operations reject with
`SDK_MODULE_STATE_INVALID`. Hook exceptions, deadlines and parent cancellation enter `failed`
and reject only that instance's caller. State events are `module:state:changed`
`{ id, from, to, reason? }`; failure `reason` is an `SDKError`, stop `reason` is its argument.
Ordinary hook exceptions use `SDK_MODULE_STEP_FAILED`; existing SDK error codes are retained.
Deadlines use `SDK_MODULE_TIMEOUT`, cancellation uses `SDK_MODULE_CANCELLED`.

The context passed to hooks contains an instance lifetime signal. Failure, cancellation or
dispose aborts it; ordinary stop/start keeps it usable. Lifecycle supplies a scoped bus bound
to this signal, so subscriptions and RPC handlers are removed automatically. Release other
timers/resources in the module's dispose hook. Deadlines settle the caller
and abort the signal; hooks must cooperate with cancellation. Late results cannot advance
the state, but JavaScript cannot forcibly stop a hook that ignores its signal. Hook messages
and details are kept in the diagnostic cause and omitted from emitted/serialized errors.

# HTTP transport

`createHttpTransport` from `@manygamescorp/core/transport` implements the `HttpTransport` port:
`request<TRes, TBody>(spec)` makes one JSON HTTP attempt. Pass `endpoints` as a module-to-origin
map resolved from the game's `platform.json`, and `token()` to read the active player token for
each call. `auth: 'none'` skips the token provider. `appVersion`, `os`, `region` and `sdkContext`
populate the platform headers; SDK context rejects credentials and advertising identifiers.
`idempotent: true` generates an `Idempotency-Key` UUID for the call when no explicit key is
provided, including calls through the SDK kernel. Reuse an explicit key for a later retry of
the same operation. Automatic retries require `createReliableHttpTransport`.

```ts
const transport = createHttpTransport({
  endpoints: { profile: 'https://api.example.com' },
  token: () => session.playerToken(),
  appVersion: '1.2.3', os: 3, region: 'eu',
  sdkContext: { sdkVersion: '1.0.0', platform: 'web' },
});
const profile = await transport.request<{ gid: number }>({
  module: 'profile', method: 'GET', path: '/v1/profiles/me',
});
```

The default timeout is 10 seconds, including response body reads. Override it on the transport
or request; `signal` cancels the actual fetch. Caller cancellation yields `AbortError`; deadlines,
network failures and offline detection yield `SDKError` codes `TIMEOUT`, `NETWORK_ERROR`, `OFFLINE`.
Service errors retain `code`, `msg`, `rid`, `details` and HTTP status. Unknown error bodies and
invalid success JSON yield `HTTP_<status>`; HEAD and 204/205 return `undefined`.

Each attempt gets a fresh UUID `X-Req-Id`; `context` connects safe request logs to the caller.
Logs contain method, request ID, module and response status, without URLs, headers, bodies or
raw fetch exceptions. Cookies and redirects are disabled; the only exception is
`credentials: 'include'` on the auth module's `POST /v1/auth/oauth/attempts` and
`/v1/auth/oauth/complete` (id#134 browser binding) — on any other request it rejects with
`TypeError` before I/O. Endpoints must be HTTPS origins;
HTTP is allowed only for loopback (`localhost`, `127.0.0.0/8`, `[::1]`). GET/HEAD with a body
reject with `TypeError` before reading the token or calling fetch.
Paths must remain in `/v1/`, query credentials are rejected. `idempotencyKey`, `ifMatch` and
`ifNoneMatch` are forwarded as supplied. `idempotent: true` generates a UUID v4 even in
this one-attempt transport; explicit keys must be canonical UUID v4/v7. Retry and breaker
compose over it in `createReliableHttpTransport`. A 401 reports `onUnauthorized(token)`
and rejects with the original HTTP status and code; it is never replayed (E91).
`Deprecation`/`Sunset` event handling is also deferred to SDK-M1-09.

`maxResponseBytes` defaults to 1 MiB; set it on the transport or override it per request with a
positive safe integer. Both success and error bodies are read as a bounded byte stream.
Excessive `Content-Length` rejects before acquiring a reader; missing or understated lengths
are checked against actual decoded response bytes. Overflow cancels fetch and the body stream,
then throws nonretryable `TRANSPORT_RESPONSE_TOO_LARGE` with the request rid and HTTP status,
without retaining the response body. HEAD does not read a body or apply its representation length.
Server error messages retain at most 1024 UTF-16 code units; details larger than 4096 serialized
UTF-8 bytes (or too deep to serialize) become `{ truncated: true }`. Server rids must contain
1–64 ASCII letters, digits, `_` or `-`; otherwise the request rid is used. SDK-only catalog codes
in a server body fall back to `HTTP_<status>`; retryability then follows the actual HTTP status.

`sdkErrorFromResponse(status, body, requestRid?)` uses the same server-error parser as
HTTP transport, including code origin, message/details limits and rid validation. A body
must have string `code` and `msg`; invalid bodies become `HTTP_<status>`.
`IDEMPOTENCY_IN_PROGRESS` is retryable, but the reliable transport repeats it only with an
idempotency key. If the retry delay (Retry-After or jitter) reaches the remaining deadline,
the caller immediately receives the original HTTP error with `retryAfterMs`.

`fetch`, `online` and `logger` can be injected for tests and platform adapters. With no `online`
port, `navigator.onLine === false` rejects immediately; runtimes without navigator attempt I/O.

# Event bus

`createBus` and `createScopedBus` are exported from `@manygamescorp/core/bus`.
`ModuleLifecycle` supplies `createScopedBus(bus, manifest, {signal})` as `ModuleContext.bus`.
The scope snapshots
`manifest.id` and `manifest.events`: `emit` requires an exact `events.emits` entry;
`on`, `once`, `off`, `replay` and `request` require `events.listens` coverage.
`handle` requires an exact entry in `events.handles`; listening grants and `events.emits`
give no RPC ownership. Listening declarations can use `*` in each of the three segments.
The `sdk:`, `auth:`, `module:`, `device:` and `configs:` domains are reserved for core
publishing/handling (manifest validation, local and remote, and the scoped bus); the list is
`CORE_EVENT_DOMAINS` of `@manygamescorp/contracts-client/events` (`core-events.json`), shared with
the gates. `l10n:*` is not reserved yet: core's `sdk.l10n` emits it on the root bus (`from: core`). Every core event and its payload type is `CoreEventPayloads`
(`src/core-events.ts`); `events:gen` lists them in `contracts-client/events/events.json` with
emitter `core`, so the token gate checks core payloads too (client-sdk#131).
Modules may subscribe to them. Subscription patterns remain
`domain:*` or `domain:entity:*`; a subscription must fit entirely within one declaration.
Permission failures throw `SDKError('SDK_PERMISSION_DENIED')` synchronously.
Each scope removes only its own subscriptions, even when scopes share a listener function.
`dispose()` or lifetime signal abort removes its listeners and handlers, cancels active
handler requests with `SDK_MODULE_CANCELLED`, and rejects further operations with the same
code. Disposal is idempotent; a new instance can register the released topics.

Listeners receive `(payload, event, trace)`, with immutable `trace: { from, rid }`.
Scoped events and requests set `from` to the module id; the root bus defaults to `core`.
Each dispatch has a fresh UUID, sticky replay preserves its original trace, and
`replay(event)` returns `{ payload, trace }`. Listener failures keep the originating rid
in the `sdk:core:listener-error` trace; its payload still contains only `{ event }`.

`handle<Req, Res>(topic, (request, context) => result)` registers one handler and returns
an idempotent unsubscribe. A second handler throws `TypeError`. `request<Req, Res>(topic, req,
{ timeoutMs })` returns a Promise: no handler rejects with `SDK_NO_HANDLER`, timeout rejects
with `SDK_REQUEST_TIMEOUT`. `timeoutMs` must be finite, positive and at most `2^31 - 1`.
`context` contains `{ from, rid, signal }`; timeout aborts this signal before rejecting.
Handlers must cooperate with cancellation and check the signal before external effects.
Late results are ignored. Handler failures reject with a new `SDKError`: existing SDK codes,
safeParams and retryable are retained, arbitrary failures use `INTERNAL`, module identifies
the handler and rid identifies the request. Technical message/details/cause/stack are omitted;
the original failure goes only through the redacting logger (`createBus({logger})`).
Settled requests remove their timers and lifetime listeners.

`createBus({ mode: 'development' | 'test' | 'production' })` defaults to `development`.
Development and test modes use `structuredClone` for events, each listener, sticky reads,
requests and responses. Uncloneable inputs fail before delivery; listeners cannot mutate
another listener's payload or the sticky snapshot. Production explicitly passes references.

SDKError payloads retain their type, code and safe fields, with redacted details and a fresh
local stack, without technical message or cause. Lifecycle always emits a safe error snapshot,
including production mode; its local rejection/reason retains the diagnostic cause.

Scoped bus budgets (#76) are fixed in every mode, before input cloning/delivery:
64 KiB of accounted data, depth 32 (root depth 0), and 4096 visited values including
container entries and repeated references. UTF-8 strings and property names count their
bytes; scalar values/object references count 8 bytes, buffers/views count 8 + byteLength.
Objects are traversed once, including Map keys/values and Set members; cycles are supported.
Sparse array length is capped at 4096. Plain objects, arrays, Map, Set, Date, buffers/views
and safe SDKError snapshots are supported; accessors, other object types, functions,
symbol values and bigint reject with existing `VALIDATION_FAILED` without payload details.
RPC responses from scoped handlers have the same payload budget before response cloning.

Each scope instance has one token bucket shared by emit/request: burst 100, refill
100 operations/s using monotonic time, no reset timer. Valid payload attempts consume one
token even if delivery later fails; payload/permission failures consume none. Exhaustion
throws/rejects existing `RATE_LIMITED` with `retryAfterMs`, without allocating an RPC timer.
Emit throws synchronously; request budget failures reject a Promise. Permission/lifetime
checks retain their synchronous errors. Counters are independent across
scopes (including the same manifest id) and SDK instances. Dispose/abort clears the bucket,
removes listeners/handlers and cancels the scope's active outgoing requests. RequestOptions
also accepts a caller `signal`; cancellation is cooperative for handler side effects.
Budgets are fixed, with no new configuration or MCP surface. Production retains reference
semantics, so callers must not mutate a payload after validation.

# Localization source integration

`createSdk` owns `sdk.l10n` (D-L10N): the game's view of the engine (`t`, `setLocale`,
`registerDefaults` outside `sdk`/`ui`/`kit`/module namespaces, …) plus `refresh()`; options
`createSdk({ l10n: { defaultLocale, supported, refresh, applyUpdates, readyTimeoutMs } })` are
validated synchronously (`VALIDATION_FAILED`), module id `l10n` is reserved. Without platform.json
`app` only built-in strings answer. With `app` the kernel builds `createL10nRuntime` below over its
transport: `POST /v1/configs/fetch` of scope `localization` with the current player's token (never
sent without a session; aborted on an identity change), bundle URLs without Authorization or
cookies (`credentials: 'omit'`); cache under the gid (E89), purged with the player's data. Boot
starts it after configs and before modules (cache, else the network up to `readyTimeoutMs`); after
`auth:identity:changed` the previous player's strings are dropped at once and `init`/`refresh`
resolve once the new gid's strings are loaded (at most `readyTimeoutMs`).

The public localization source/cache entry points share an internal implementation so
common record validation and hashing compress together in the `l10n/configs` graph (#421).
The size gate includes static and dynamic imports; deferring a download path alone does
not reduce this budget. Public entry points and localization behavior stay the same.

`createL10nRuntime` from `@manygamescorp/core/l10n/configs` wires the localization engine to
`ConfigsL10nSource`, the profile cache and foreground refresh. Pass the core transport,
`createStorage({ appCode, api })`, the current authenticated `gid()` and the platform adapter.
The transport attaches the player token only to requests with `auth: 'player'`; URL downloads
use `auth: 'none'` and must not inherit Authorization or player cookies.

`PlatformAdapter.blobStore` stores binary bundles. `web()` supplies IndexedDB; Cordova hosts pass
`cordova({ blobFiles })`, where the `CordovaBlobFilePort` reads/writes a private directory under
the app data directory. The port requires `stat` (byte length without loading the body) and
`readHead` (bounded reads); see [the Cordova file port](../platform-cordova/README.md#файловый-blob-store).
`get` updates a small access-time sidecar, and corrupt files are cache misses with best-effort
cleanup, so they do not block listing healthy entries. `write` must resolve after an atomic persistent replacement. Without a
platform blob store the runtime uses memory and cannot guarantee offline persistence across launches.
Metadata is stored under `mpg:{appCode}:{originTag}:{gid}:l10n:meta`, blobs under
`mpg:{appCode}:{originTag}:{gid}:l10n:blob:{sha256}` (per player, client-sdk#91); an explicit
locale choice under the device set `mpg:{appCode}:{originTag}:device:l10n:locale`. Cache collection
stays within this application's prefix and drops bodies of the old `mpg:{appCode}:l10n:blob:` scheme.

`createSdk` supplies the common Poller to configs and localization. Localization uses the
raw-response `L10nTransport` port, separate from the JSON `HttpTransport` port above. Standalone
hosts can inject `ModuleServices.get('l10n.source@1')` and `L10nPoller.register`.
The latter receives `l10n:refresh`, a 30 minute interval and
pause-on-hidden. Without an injected Poller the runtime schedules refresh and error backoff itself.
Visibility comes from the sticky `app:lifecycle:changed` (`hidden` edges only);
`auth:identity:changed` rereads the new profile cache.

`L10nTransport` responses expose `body: ReadableStream<Uint8Array> | null` instead of
`arrayBuffer()`. Custom transports must return the raw download stream. Localization bounds
raw bytes at 10,000,000 per blob, cancels overflow and aborted reads, and uses a 10 second
fetch/body deadline. SHA-256 still covers the exact downloaded bytes before UTF-8/JSON parsing.
Module manifests use the same bounded reader with a 65,536 byte limit and the loader deadline.
Missing or understated `Content-Length` cannot bypass either bound.

`sdk:context:changed` re-resolves cached localization records on the current player facts without
network I/O, including changes to segments and A/B groups. The raw SHA/ETag validates source bytes;
it does not identify the resolved translations. A 200 with the same SHA or a 304 reuses verified raw
records and resolves them again; unchanged URL blobs are not downloaded again. The engine compares
the resulting strings (including plural forms), and emits `l10n:strings:updated` only when they change.
`ConfigsL10nSource` retains the last chain in memory as a fallback for unavailable persistent blobs;
`L10nEngine.recompute()` reads the source's optional `readCache` without fetching.

`applyUpdates: 'next-start'` persists subsequent updates without changing current strings. Local
context recomputes are deferred too; `L10nEngine.refresh(true)` / `L10nRuntime.refresh(true)` applies
the current resolution immediately. The first
network bundle on a cold start still applies if it arrives after `readyTimeoutMs`. Explicit locale
changes and profile changes also apply their own bundles immediately. A new chain (`setLocale`) is a
cache hit only if every locale of it is cached or known to be absent; otherwise the network is asked
within the same `setLocale` and the partial cache is the offline fallback (client-sdk#136). Bodies
are in IndexedDB store `blobs`, their size and access time in `meta` (lists never read bodies);
Writes and collection share a Web Lock keyed by app, API origin and namespace, held through
body storage, pointer commit and GC (#138). A denied lock rejects the operation. Without Web
Locks, collection reserves another tab's fresh unreferenced body for `ORPHAN_GRACE_MS` (10 min),
including during LRU eviction. If reservations alone exceed `maxBytes`, cleanup may temporarily
retain more bytes; the next cleanup after grace can remove unreferenced reservations. Grace
does not serialize tabs or protect a writer delayed beyond that interval. Call `dispose()` on shutdown
to remove subscriptions, cancel requests and stop timers. The default is `applyUpdates: 'immediate'`.

## Common Poller

`@manygamescorp/core/poller` exports the `PollTask` and `Poller` types and `scopePoller` (namespace
and cancellation wrapper for hosts that hand a Poller to their own components). The scheduler
itself is internal: `createSdk` owns the one controller per SDK, starts it after platform readiness
and disposes it on destroy, so no second scheduler can diverge from the lifecycle state. Standalone
hosts (configs/l10n runtimes) inject their own `register`. Modules receive only `ctx.poller.register` with permission
`poller`. IDs are scoped to the module and SDK instance. A duplicate active ID in that scope or
invalid parameters throws `VALIDATION_FAILED`. Registration returns an idempotent unsubscribe.

```ts
// In a module with permissions: ['poller']; register again on every start after a stop.
async function start(ctx: ModuleContext) {
  ctx.poller?.register({ id: 'refresh', intervalMs: 30_000,
    async run(signal) { await refreshFromOwnService(signal); },
  });
}
```

The first attempt runs asynchronously (`runOnRegister: false` defers it by the interval).
Each task runs once at a time. The next delay starts after settlement, with default ±10% jitter
(`jitter` is a fraction in [0, 1)). Errors retry after 1 s, 2 s, 4 s, etc., capped at 5 min;
`backoffBaseMs`/`backoffMaxMs` override this. Jitter is rounded to whole milliseconds and clamped
to at least 1 ms, the retry maximum and the browser timer maximum. Success resets backoff.

Hidden pauses scheduled attempts by default; `pauseWhenHidden: false` opts out. Offline pauses
all tasks. Visible resumes immediately unless `visibleAfterMs` requires a minimum age of the
last attempt; `visibleAfterMs: false` resumes the regular interval without an immediate foreground fetch.
Online resumes immediately when visible. Multiple resume edges during a pending
attempt coalesce into one follow-up. Pausing keeps an already running attempt; unsubscribe,
task/module abort, module stop/failure/dispose and SDK destroy abort its signal and prevent late
settlement from rescheduling. Task code must pass that signal to its I/O and honour cancellation.
A module's tasks are cancelled before its `stop` hook runs; inside `stop` the module's
`ctx.signal` and `ctx.bus` are still live (it may emit), and they end right after it.
Attempt ages use the server clock; a `time:offsetChanged` jump re-bases them by the offset delta,
so a clock sync neither triggers nor delays a `visibleAfterMs` refresh.

Core publishes one sticky event `app:lifecycle:changed` with the full state `{ hidden, online }`:
first after platform readiness, then once per change of either field. A module subscribing in
`init`/`start` or later gets the current state at once (listen permission `app:lifecycle:changed`).
`hidden` follows `platform.lifecycle.pause/resume` (initial value: web
`document.visibilityState`, other adapters `lifecycle.hidden`). `online` has one source,
`sdk.device.network`: when the adapter supports that group, `online` always equals
`device.network.status().online` and follows `device.network.onChange`. Only an adapter without
the network group (for example Cordova without a device provider) falls back to
`device.info().online` and lifecycle `online/offline`; `device.network.status()` is then
`undefined`, so the two can never disagree. The `app` event domain is core-only. SDK destroy
and boot failure unsubscribe the bridge. Configs polls every 5 min; localization every 30 min;
both pause hidden/offline and resume their intervals on foreground without fetching immediately.
Realtime config reload commands and explicit refresh calls still update data immediately.

# Kernel dependency container

`ModuleContainer` from `@manygamescorp/core/container` takes a `ModuleRegistry` snapshot before
initialization. Its constructor checks that every `requires` module is installed, rejects cycles
with the cycle path in `SDKError.details.cycle`, and rejects duplicate providers of the same
capability. All failures use the existing catalog code `MODULE_DEPENDENCY_FAILED`; no module
hooks run during resolution. Version ranges are resolved by lock generation, as specified in §3.3.

`order()` returns frozen definitions in topological layers of the `requires` graph, preserving
registration order within each layer. `optional` does not add a hard ordering constraint.
Later registry additions require a new container. `provider(capability)` returns the provider
definition for the exact capability version (for example `inventory.read@1`).

The kernel registers a capability object once with `provide(moduleId, capability, service)`;
the module must declare that capability in `provides`. `get<T>` returns the registered object or
`undefined`; `require<T>` throws `MODULE_DEPENDENCY_FAILED` when the object is unavailable.
Undefined services and replacement registrations are rejected. Each container owns its services.
This is an internal kernel primitive: lifecycle orchestration and the scoped service proxies of
SDK-M1-21 must wrap it before supplying `ctx.services` to modules.

# Filters (CFG-06)

`@manygamescorp/core/filters` exports `match`, `validate`, `compile`, `createFilters` and the
public types `FilterExpr`, `FilterOperators`, `FilterScalar`, `Facts`, `Filters`,
`FilterValidation`, `CompiledFilter`. `validate` returns `{ ok: true }` or
`{ ok: false, error: SDKError }` with the existing `VALIDATION_FAILED` code; invalid input makes
`match` and compiled predicates return `false` without exposing filter values in diagnostics.

```ts
import { createFilters } from '@manygamescorp/core/filters';

const filters = createFilters(() => ({ 'profile.level': 11, 'custom.vip': 'gold' }));
filters.match({ '$profile.level': { $gte: 10 }, vip: 'gold' }); // true
const isEligible = filters.compile({ $country: { $in: ['DE', 'FR'] } });
isEligible({ country: 'DE' }); // true
```

The evaluator is `@manygamescorp/contracts-client/filters` (D-MATCH, E96); core wraps it with
`SDKError`. `$name` in a field position is a native fact of the catalog (`$country` reads fact
`country`, unknown `$x` is invalid); a name without `$` is a project parameter read from
`custom.<name>`. Operators are a closed list (`$and $or $not $nor $eq $ne $gt $gte $lt $lte $in
$nin $exists $mod $startsWith $endsWith $contains`). `$segment` is an array fact (`$eq`/`$ne` —
membership, `$in`/`$nin` — intersection, `$exists`); `$uid`/`$gid` accept only `$eq $ne $in $nin`
(≤ 1000 integers, one node, 16 KB filter limit) and `$mod: [N, r]`.

The A/B group of a test is a fact `$ab.<testId>` (E173; `$ab` / `$abg` — the primary test), so a
filter, including the module `availability` block, can gate by variant. Example: module from
level 3 in group A of test `t1` and from level 5 in group B:
`{ $or: [{ '$ab.t1': 'A', level: { $gte: 3 } }, { '$ab.t1': 'B', level: { $gte: 5 } }] }`.
The block is decided before the module is activated; a player outside the test matches neither
branch. The facts come from configs init (`abs`), no extra code in the module.

Pass the current SDK's fact reader to `createFilters` for default facts; without one the default
is an empty record. Explicit facts override that reader. Facts may use flat dotted keys or nested
records; exact own dotted keys take precedence. Inherited properties and accessors are ignored.

Config conditionals resolve with `@manygamescorp/contracts-client/resolve` (E94):
`resolve(base, conditionals, facts, { conditionalsMode, sides })` applies the first matching
conditional of `sides` (default `['client']`) — `merge` (objects by key, arrays and scalars
replace, `null` removes a key) or `replace` — and returns `{ data, applied }` (`label`, `#<index>`
or `null`). Shared cases: `filters.vectors.json` and `resolve.vectors.json`.
This entry point does not persist facts; the kernel supplies its fact reader when wiring it.

Field arrays (`{ tier: ['gold', 'vip'] }`) are invalid under E96; use
`{ tier: { $in: ['gold', 'vip'] } }`. The same rejection applies inside logical branches,
to native facts (`$country`, `$segment`, `$uid`) and to module filters.
`npm run filters:conformance:ci` checks all 227 shared vectors and additional context cases
against the unmodified configs evaluator and its `factsLookup` at the SHA in
`test/fixtures/configs/sources.json`. Both evaluation and structural validation must agree;
any mismatch fails CI. This checks the pinned engine on the same facts, rather than server
collection of facts or HTTP write validation.

The CFG-06 allowlist includes `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`,
`$startsWith`, `$endsWith`, `$contains`, `$and`, `$or`, `$not`. As in configs, `$and`/`$or` combine
expressions; `$not` negates a field operator object and never matches a missing field. Direct
`null` equality never matches; explicit `$eq: null` or `$in: [null]` can match a present null.
String operations accept a nonempty argument up to 128 UTF-16 code units and a field up to 256;
the neighboring `caseInsensitive: true` uses `toLowerCase` on both strings.

Limits apply to the whole JSON tree: root depth 0, maximum depth 4, 64 nodes (including root,
arrays and scalars), and 4096 UTF-8 bytes. Unsupported syntax anywhere invalidates the whole
expression before execution, including a branch which would otherwise be skipped. Non-JSON
values, cycles, accessors and prototype traversal are rejected.

Repeated compilation of the same unchanged object returns the same predicate. A retained
predicate uses a validated snapshot; later `match`/`compile` calls detect mutations and validate
the changed filter again. The cache is weak and does not retain discarded filter objects.

## Platform (SDK-M1-15)

`createSdk({ modules, platform?: PlatformAdapter | 'auto', platformReadyTimeoutMs?: number })`
uses built-in web by default outside Cordova runtime. `web()` is exported from `core/web-platform` and
`platform-web/web`; the implementation is shared. An explicit adapter bypasses detection.
Optional adapters register a factory before `createSdk`; the last matching factory wins.
Registration returns an idempotent disposer and affects subsequently created SDK instances.
No import-time registration is used, so `sideEffects: false` and tree shaking remain valid.

```ts
import { createSdk } from '@manygamescorp/core/kernel';
import { registerCordovaPlatform } from '@manygamescorp/platform-cordova/cordova';

const unregister = registerCordovaPlatform(); // only in a build including Cordova
const sdk = createSdk({ modules: [], platform: 'auto' });
await sdk.boot();
// unregister() when the host no longer needs this factory
```

The Cordova package owns adapter detection and the readiness event. Core only probes the
runtime marker's presence; it never invokes native APIs or listens for native readiness.
In Cordova runtime, `createSdk` with omitted platform or `'auto'` requires a matching Cordova
factory. Otherwise it throws `SDK_PLATFORM_UNSUPPORTED` synchronously, including after factory
disposal; register the factory and create a new SDK. Without Cordova runtime, auto selects web
when no factory matches. An explicit adapter, including `web()`, always bypasses detection.
`ready({ signal })` must release pending resources when aborted; the kernel bounds readiness
by `platformReadyTimeoutMs` (10 seconds by default) and reports `SDK_PLATFORM_NOT_READY`.
After readiness and before module start, sticky `sdk:platform:ready` emits `{ id }`.
`sdk.platform` exposes only `{ id }`. Modules declaring permission `platform` receive
`ctx.platform` with `id`, `lifecycle`, `device`, `plugins` and `openUrl`, without SecureStore,
blobStore or readiness control. `ctx.platform.device` (E98) has `deviceId()` and `info()`.
`deviceId()` resolves the stable SDK device id: the same `did` core sends to
`POST /v1/auth/init` (IDFV/SSAID, otherwise a random UUID kept in the device set
`device:auth:did`); it survives logout and restarts, and without platform.json `app` it rejects
`SDK_PLATFORM_UNSUPPORTED`. `info()` is a copy of the typed `DeviceInfo` fields (`platform`,
`os`, `userAgent`, `language`, `online`): adapter extras and hardware identifiers (`uuid`,
`serial`…) are dropped, the raw adapter `vendorId()` stays with core. `plugins.has/get`
accept only names listed in the manifest's `nativePlugins`; core-owned plugins (`device`,
`cordova-plugin-device`, `cordova-plugin-manygames-device`, `cordova-plugin-artint-secure`,
`InAppBrowser`, `cordova-plugin-inappbrowser`, and their `<name>.` sub-paths) are refused too.
A refused name throws `SDK_PERMISSION_DENIED` before the adapter is called.
Lifecycle listeners are removed on module cleanup, and the
capability rejects use after module cleanup. Identity, device and plugin lookups are per adapter.

### Build target of a module (`targets`, `stores`)

A manifest/module.json declares `targets: ('web'|'cordova')[]` (required, non-empty) and, for
store-bound modules (store adapters, native payments/ads), `stores: string[]` (`google_play`,
`app_store`, …; requires target `cordova`). The kernel derives the build target from the platform
adapter (`cordova` → `cordova`, anything else → `web`) and the store from platform.json `store`.
A module loaded from the CDN or as an adapter module that does not fit is refused with
`SDK_MODULE_INCOMPATIBLE` naming the module, target and store; a store-bound module needs the build's
`store`. A module with non-empty `nativePlugins` is never imported from CDN: an exact
embedded artifact is used or a new build is required (requires a new build). Build tooling filters the lock with `tools/lock/resolve-targets.mjs`
(`resolveForBuild` from `@manygamescorp/contracts-client/module-targets`): a selected module without an
implementation for the target and store fails the build.

Web lifecycle maps visibility changes to pause/resume and window online/offline events to
connectivity notifications. Back interception is unsupported (subscription is a no-op).
`device.info()` returns browser metadata, `vendorId()` returns undefined, and web plugin
lookups return false/undefined. Both URL modes open an absolute HTTP(S) URL in a new context
with `noopener,noreferrer`; credentials, relative URLs and executable schemes are rejected
with `VALIDATION_FAILED`. A missing window or a thrown browser error yields
`SDK_PLATFORM_UNSUPPORTED`. Cordova native device/plugins/URL behavior is SDK-M1-16;
this task supplies its port compatibility, lifecycle, auto factory and cancellable readiness.

`core/testing/platform` exports `createFakePlatform` and `platformContractCases`. The same
contract cases run on fake and web with injectable DOM event ports (no additional dependencies).
Browser/emulator coverage belongs to SDK-M1-T3 and SDK-M1-16.

## Server time (client-sdk#499)

Ingress stamps every API response with `X-Server-Time: <unix seconds.ms>` (platform-local#1237,
exposed to browsers by `Access-Control-Expose-Headers`). The transport reads it on every attempt,
error responses included, and feeds the core clock (`core/time`). Responses with `Age > 0`
or `CF-Cache-Status: HIT` are ignored: CDN caches can replay an old ingress stamp even when
the request uses `cache: 'no-store'`. Ignored stamps leave the existing clock unchanged,
including offset 0 and `synced() === false` before the first fresh stamp:

- offset = server time − (receive time − RTT / 2); the median of the faster half of the last 8
  samples; a round trip over 10 s is dropped;
- `sdk.time.now()` — server time, epoch ms (integer); `sdk.time.offset()`; `sdk.time.synced()`;
- modules get the same clock as `ctx.time` (no permission);
- `time:offsetChanged` `{ offset, previous, synced }` — the first stamp and every move ≥ 1 s;
- before the first stamp, and with no header at all (old ingress, a local stand), it is the
  device clock: offset 0, `synced()` false, no error.

id's `POST /v1/auth/init` is the first request of `boot()`, so the offset is set before any module
init or start. Core runs on it: session expiry and `resendAt`, the filter facts `$time.now`,
`$time.dayOfWeek`, `install.days` (config windows), signed config links, `Retry-After` dates.
Modules: iap offer windows/cooldowns/limits, ads limits, HUD/top bar/bottom menu item timers, realtime message and
broadcast expiry, localization refresh intervals, profile cache TTLs and realtime heartbeat age.
These checks include device sleep when mobile browsers suspend `performance.now()`.

Local retry deadlines/circuit windows use `performance.now()`: device or server clock changes
must not change these short elapsed durations. `createL10nRuntime` requires `now`;
`createProfile(http, now, signal?, onOwn?)` receives `ctx.time.now` from the profile module.
HTTP-date `Retry-After` is ignored without a server clock; numeric seconds remain supported. `FakeTransport` uses the same local clock by default.
Login requires `now: () => sdk.time.now()`; shop/limited-offer props require the current
`now: sdk.time.now()` snapshot. Ads/IAP runtimes and realtime/broadcast handlers require
an explicit server clock, with no device-clock fallback. UUIDv7 action IDs are created with
`randomUuidV7(sdk.time.now())` (or `ctx.time.now()` inside modules).

**Rule:** game and module logic reads time only through `sdk.time.now()` / `ctx.time.now()`.
`Date.now()` and `new Date()` are forbidden for logic — windows (`startsAt`/`endsAt`), reward,
energy and cooldown timers, daily bonuses, expiry, and times sent to services
(`occurredAt: new Date(sdk.time.now()).toISOString()`). ui-kit `now` props and `createAuthFlow`
get `sdk.time.now`. ESLint enforces it on `packages/*/src` and `apps/*/src`
(`no-restricted-properties` on `Date.now`, `no-restricted-syntax` on argless `new Date()`); the
allowlist in `eslint.config.js` covers only core infrastructure measuring local durations.

## Auth: guest session (SDK-M2-AUTH-MIN)

`platform.json` field `app` is the application code (panel `appCode`, `^[a-z0-9][a-z0-9_-]{1,63}$`)
sent as `app` to id `POST /v1/auth/init`. It is optional; a present but malformed value fails
`createSdk` with `SDK_PLATFORM_CONFIG_INVALID`. With `app`, `createSdk` exposes `sdk.auth`
(`core/auth`), and sdk.auth is the transport token provider (`Authorization: Bearer`) and handles
its 401s: `http.token` or `http.onUnauthorized` together with `app` is rejected with
`VALIDATION_FAILED`. With `app`, `http.appVersion` (`X.Y.Z`, sent as `X-App-V`; configs require it)
is mandatory: a missing or malformed value fails `createSdk` synchronously with
`SDK_CONFIG_INVALID` before any request.

Portal email confirmation uses `sdk.auth.code({rid, code, audience: 'portal'})`.
It returns `{uid, audience: 'portal', expiresAt}` and sets `auth.portalSession`.
The account JWT stays private to core and does not replace `auth.session` or authorize
ordinary game HTTP requests. Portal hosts explicitly call `await auth.restorePortal()`
before reading `auth.portalSession` or rendering the account state. Ordinary game boot
and game logout do not restore or erase portal credentials.

Core persists the account under `mpg:portal:<apiOriginTag>:auth:*`, independently of
all `mpg:app:<appId>:*` game sessions. It reads the first structurally valid, unexpired
localStorage, cookie or IndexedDB copy and repairs the other copies. If only an expired
credential remains, core attempts refresh. HTTPS cookies reuse the core chunked-cookie
mechanism: host-only, Secure/SameSite, Path=/ for the portal so SPA routes share logout,
and expiry from the auth response. Browser policy can block any storage layer; persistence
requires at least one available copy. Destroy clears memory and timers, retaining storage
for reload. Logout attempts all three deletions and retains revocation markers after a
partial failure; a fresh email confirmation clears them.

`auth.refreshPortal()` and the timer renew through
`POST /v1/auth/portal/refresh {idToken}`; the JWT never crosses the public auth API.
The refresh lead derives from the remaining TTL (or `createAuth.refreshBeforeMs`).
**Server dependency:** this endpoint is a new required ID contract; ID main currently
provides only portal exchange/logout ([id#258](https://github.com/manygamescorp/id/issues/258)).
Automatic refresh must be released together with
the matching ID implementation. An expired token is never returned to the bridge when
refresh fails. No fallback to game init or a new guest is attempted.

Pass `domains: {auth: sdk.auth, locale, openId, fullscreen}` to `PortalHost` instead
of a `token` callback: core restores/refreshes and answers `auth.token.get` directly.
The game core keeps using `/v1/auth/portal/exchange {app,idToken,did,ln}`.
Portal confirmation does not resume game modules. The existing ui-kit `login` window
can use `createPortalLogin({audience:'portal',auth:sdk.auth,now:()=>sdk.time.now(),
resendDelayMs})` from `@manygamescorp/ui-kit/services/login`; the caller renders its state
and announces bridge state changes. No game profile id or credentials enter UI state.

On HTTPS web games with a numeric `appId`, auth keeps a redundant session copy in
JavaScript-managed cookies. These are host-only (no `Domain`), `Secure`, scoped to
the game's directory `Path`, and expire with the session. Top-level games use
`SameSite=Lax`; embedded games use `SameSite=None; Partitioned`. Browser policy can
block this copy; the other storage copies remain usable.

These cookies cannot be `HttpOnly`: browsers allow that attribute only on a server
`Set-Cookie` response, while this redundancy must be read and repaired through
`document.cookie`. They offer no protection from scripts running on the game's
origin; `Path` is not an isolation boundary against those scripts. Moving the
credential to a server-issued `HttpOnly` cookie requires a separate id-service
design/task and is not implemented by the SDK. Cookie values must never be logged
or included in telemetry or state snapshots. SDK logging and diagnostics redact
`Cookie`/`Set-Cookie` fields and provider `idToken`/`id_token`/`idtoken` credentials
(including query, hash and JSON representations); auth cookie failures expose only
a generic `SDK_SECURE_STORE_FAILED` message, without the cookie value.

```ts
const sdk = createSdk({ modules, http: { appVersion: '1.0.0' }, platformConfig: { app: 'collect10',
  endpoints: { api: 'https://api.example.com' }, cdn: 'https://cdn.example.com/sdk/',
  assets: { cdnBase: 'https://assets.example.com/' } } });
sdk.bus.on('auth:identity:changed', ({ previousGid, gid, reason }) => { /* reset caches */ });
await sdk.boot();             // guest sign-in after platform ready, before modules start
sdk.auth?.session;            // { uid, gid, anonymous, geo, expiresAt, restoredBy } or undefined
```

- Storage (D-TOKEN): keys are the device set `mpg:{app}:{tag}:device:auth:{session|did|device-key|revoked}`,
  where `{tag}` is a stable hash of the normalized `endpoints.api` origin (`originTag`). Keys of
  the previous scheme `mpg:{app}:auth:{tag}:…` are moved on the first read (tombstone first, a
  revoked session is not carried over; every copy is validated — a corrupted one is not carried
  and does not shadow a valid one, a valid new copy wins) and deleted from both stores only once
  the new key holds a valid copy in localStorage and in the keystore (if available). A partial
  save keeps the old keys and is retried on the next start, so clearing WebView storage still
  restores from the old keystore copy; nothing saved at all rejects `init`. Until then every delete
  covers them too, so the session survives the move and a logout cannot resurrect. Values are written to
  localStorage and, if `secureStore.isAvailable()` (Cordova keystore), to the keystore too. Reads
  try localStorage, then the keystore (when the local copy is missing or invalid), restoring the
  local copy of `session`, `did` and `device-key`. On web the SecureStore (IndexedDB) is not used.
- `init()` reads the stored session. A stored token with more than 3 days left is used without a
  request: `restoredBy: 'storage'` from localStorage, `'keystore'` when only the keystore copy was
  valid (WebView storage cleared; the local copy is restored best effort). Otherwise it
  calls `/v1/auth/init` with `{ app, os, did, ln, tk?, deviceKey? }`: `os` 3 for every non-Cordova
  platform, Cordova 2 (Android user agent) or 1; `did` is the platform vendor id or a stored
  random UUID; `ln` is the device language within id's 2–6 characters. An issued `deviceKey` is
  stored.
- The response is checked strictly: JWT payload `appId` must match the trusted numeric
  `platform.json.appId`, and `gid` must match the response. `appCode` and `uid` claims are
  optional; the session uses `uid` from the response DTO. Without a trusted `appId`, or on a mismatch,
  `SDK_AUTH_RESPONSE_INVALID` is raised and nothing is stored or used.
- `refresh()` exchanges the current token (`init {tk}`, D-GRACE). `init`/`refresh` are
  single-flight: concurrent calls share one request. The token provider starts a background
  exchange when less than 3 days remain, at most once a minute, and still returns the old token.
- The token stays on the device in every case but two (client-sdk#94): `logout()` and id refusing
  it — `401` with id's error body `UNAUTHORIZED` to `POST /v1/auth/init` (`refusedById`; id
  answers it for a `tk` of another app, a deleted or banned user, a profile of another app, a
  revoked or non-canonical deviceKey). Only then the stored token and deviceKey are dropped, the
  session is signed out and the player data purged. Every other failure of `init`, `refresh`,
  the proactive exchange and a 401 of another service keeps the token, deviceKey and the gid
  data: 5xx, 429, network error, timeout, `OFFLINE`, a malformed or non-JSON body, a 401 without
  id's body (a proxy page, `HTTP_401`), another 401 code, `403 AUTH_APP_UNAVAILABLE` and other
  4xx, storage errors.
- `boot()` includes the initial `auth.init()`. If it rejects (for example a 503 with no
  usable stored session), `boot()` rejects with that same SDKError: code, HTTP status and
  request id are preserved. No `sdk:core:ready` is published and player modules do not start.
  The SDK rolls back to `failed`; call `destroy()` and create a new SDK to retry boot.
  A cached session successfully restored offline still permits boot. This does not change
  runtime `auth.init()`/`refresh()` failures after a successful boot or token retention rules.
- Failure with a stored identity: `init()` starts offline from it on 5xx, 429, network error,
  timeout, `OFFLINE` and a body that is not id's (`SDK_AUTH_RESPONSE_INVALID`, `HTTP_<status>`);
  an id error of the request (`403 AUTH_APP_UNAVAILABLE`, 400…) rejects `init` without a session.
  `refresh()` rejects and keeps the current session. A keystore read failure (session,
  deviceKey or did) rejects `init` without a request and without touching stored records instead
  of creating a new guest; write failures do not break the session (D-TOKEN).
- 401 of another service (configs, profile, any `ctx.http` request sent with the token): the
  transport reports it to sdk.auth (`HttpTransportOptions.onUnauthorized`), which starts a
  single-flight background exchange through id — at most once a minute, none if the token was
  already replaced. The 401 itself rejects the request and deletes nothing; only id's refusal of
  that exchange does. The request is not retried: the caller retries with the new token.
- `logout()` cancels in-flight work and deletes the token from localStorage and the keystore (a
  keystore delete failure rejects `logout`) (D-NOREVOKE); the deviceKey
  stays, so the next `init()` recovers the same guest. Storage operations are serialized: a write
  started before logout cannot land after its delete.
- Tombstone: logout and id 401 first write a `revoked` record to localStorage and the keystore
  (best effort) and mark the namespace in this JS realm, then delete. While any of them stands
  (or the keystore record cannot be read — `init` rejects), no stored token is used: no restore,
  no offline start, no `tk`. It is lifted when every delete is confirmed, or after a new id
  session is written to every store. Known gap: a page reload sees no tombstone if none could be
  written, or if the keystore write failed and WebView storage was then cleared; a left-over
  copy whose delete also failed then looks valid and is restored (even offline) or sent as `tk`.
  This is local logout only: the token stays valid at id anyway (D-NOREVOKE, until id#49).
- `auth:identity:changed` (sticky) `{ previousGid, gid, reason: 'init' | 'refresh' | 'logout' | 'signin' }`
  fires on first session, another gid and sign-out. Tokens are never in events, errors or
  `sdk.auth.session`; modules have no access to the token or SecureStore.
- Boot does not fail when sign-in fails: `sdk.auth.session` stays undefined, the game retries
  `sdk.auth.init()`. `destroy()` cancels auth; later calls reject `MODULE_NOT_ACTIVE`.

## Auth: ManyPlay ID email sign-in (SDK-M2-AUTH-EMAIL, client-sdk#139)

```ts
const { rid, resendAt } = await sdk.auth.signin({ email });   // POST /v1/auth/signin
const result = await sdk.auth.code({ rid, code: '519433' });   // POST /v1/auth/code
if (result.pending) await sdk.auth.confirm();                  // or sdk.auth.discard()
```

- `signin({ email, child? })` sends `{ app, os, ln, email, child?, tk? }` (the current guest `tk`);
  the email is trimmed and lower-cased, a malformed one rejects `SDK_AUTH_INPUT_INVALID` before
  any request. A second code to the same email is refused locally for 60 s (ID-R-17):
  `SDK_AUTH_RESEND_TOO_EARLY` with `retryAfterMs` and `safeParams.seconds`. Each call generates
  an `Idempotency-Key`: id replays the same `rid/expiresAt` without a second mail for the same
  app and token gid (24 hours). Core auth uses the one-attempt transport; this does not add
  automatic retries. id errors pass through as
  `SDKError` (`RATE_LIMITED` with `retryAfterMs` from `Retry-After`, `AUTH_DELIVERY_UNAVAILABLE`…).
- `code({ rid, code })` — `rid` uuid, `code` six ASCII digits; errors `AUTH_CODE_INVALID`
  (`details.attemptsLeft` when id tells), `AUTH_CODE_EXPIRED`, `AUTH_CODE_ATTEMPTS_EXCEEDED`.
  The answer is checked like an init answer (token of this app, uid and gid; `an: false`).
  - The same uid and gid as the current session (`upgrade` of the guest): stored at once as the
    session (localStorage + keystore, a tombstone is lifted; E89/E91), `restoredBy: 'code'`, no
    identity change and no reload — the gid data stays.
  - Another account (`login`, `switch`, `migrate`, `conflict`): `pending: true`, the token is held
    in memory only (`sdk.auth.pending`). `confirm()` stores it; another gid goes through E89
    (modules stop, the old gid is purged, `sdk:reload:required {reason: 'identity'}`, the game
    calls `init()`). `discard()`, logout, a new `code()` or destroy forget it (D-NOREVOKE).
    Before the new token is applied (#448), the old session stays active. Modules' `save(signal)`
    hooks send unsaved writes with it. Then `auth:account:changing {previousGid, gid}` fires and
    `sdk.auth.onAccountChanging(listener)` Promises are awaited. Each step waits up to 5 s.
    `auth:account:changed` fires before the modules restart. Keys still unsent stay under the
    old gid until that player signs in again.
  - `linked` (after a `linkTicket` sign-in, #414) is on the result; for an upgraded guest it
    becomes `links()`.
- `link({ pr, et, nonce? })` → `POST /v1/auth/me/links` (retried: id answers a repeat with 200),
  `unlink(pr)` → `DELETE /v1/auth/me/links/{pr}`; only a registered session (`anonymous: false`),
  otherwise `SDK_AUTH_EMAIL_REQUIRED`. `links()` is the last answer for the current uid (id has
  no read route in its client contract yet). The external token is never logged or emitted.
- Events (no email, rid, code or token): `auth:signin:started {method}`,
  `auth:code:sent {method, resendAt}`, `auth:signin:succeeded {upgradeType, pending, conflict}`,
  `auth:signin:failed {method, code}`, `auth:links:changed {providers, anonymous}`.
- `@manygamescorp/core/auth-flow` — `createAuthFlow({ auth, platform, providers?, readClipboard? })`:
  the state machine of the login window (auth-ui.md §3) for the kit `login` component
  (`@manygamescorp/ui-kit/services/login`). Providers = adapters in the build ∩ enabled for the
  app ∩ platform (no Apple on Android, native first); the clipboard is read only on `paste-code`;
  `openUrl(url)` takes the mail link `https://id.<root>/l/<rid>#c=<code>` only for the rid this
  device waits for. A provider without email (`email-required`, MP·06) emits
  `auth:email:required`; its email step waits for id#57 (`SDK_NOT_IMPLEMENTED`).
- `@manygamescorp/core/testing/fake-id` — `FakeId`: an in-memory id (`fetch` for
  `createSdk({ http: { fetch } })`) with init/signin/code/links, the outcome table of id spec §4.2,
  seeded accounts (`account(email, { profile })`), one-shot errors (`fail`) and the code mails.

Keys are prefixed by `app` and the API origin tag, so two apps on one device, or prod and test
builds of one app, never see (or send to the other API) each other's session, deviceKey or did.
The original 401 request is never retried after token exchange (E91). Server logout,
`securestore-failed` telemetry and multi-profile are follow-ups.

## Storage, configs and reload (SDK-M2-CACHE-GID, client-sdk#91/#92)

With `platform.json` `app` the kernel owns one `createStorage({ appCode: app, api })` over
`SdkConfig.storage` (default `localStorage` if readable, else memory) and the platform blob store.

- Player data — `mpg:{app}:{originTag}:{gid}:{module}:…`: `sdk.configs` snapshot
  (`…:configs:snapshot`), module `ctx.storage` (permission `storage`, `…:{moduleId}:` of the gid
  the module was started with; before its start and after an identity change stopped it —
  `SDK_NOT_INITIALIZED`), l10n metadata and blobs, facts.
- Device set — `mpg:{app}:{originTag}:device:…`, only what is needed before a gid:
  `auth:session` (token record = the current gid pointer), `auth:did`, `auth:device-key`,
  `auth:revoked` (tombstone), `l10n:locale`. The keystore (Cordova) holds only `auth:*`.
- `sdk.configs` (`@manygamescorp/core/configs`, D-CFG): boot loads `POST /v1/configs/init` with
  `SdkConfig.configs` right after sign-in and before modules start; `ctx.configs` is a view of
  it without `dispose`. Configs never compose modules: the selection comes only from
  `platform.json` `sdk.modules`, and scope `panel.sdk.overrides` is read separately when the build declares
  `sdk.overrides: { scope: "panel.sdk.overrides" }`. The old scope `sdk.overrides` is rejected.
  Without scopes/keys init returns only the context, so boot follows it with `fetch` of the same selection (every client-visible config). Only this default
  selection owns the shared snapshot, its ETag, `refresh()` and the disk cache (offline the cached
  snapshot is used); `fetch(selection)` with any other selection just returns its result, and
  concurrent loads never abort each other (a late older default load is not applied). Signed out
  it reads an unpersisted scratch scope.
- Boot without a session (sign-in failed, offline new player): no module starts,
  `sdk:core:ready` lists none. The first `sdk.auth.init()`/`refresh()` that yields a session
  loads configs and starts the modules before it resolves.
- logout, id 401 (revoke) and another gid from init/refresh: after the revoke settles, core stops
  started modules (`stop('auth-change')`), drops in-memory configs, purges
  `mpg:{app}:{originTag}:{previousGid}:` in localStorage and the blob store (a failing backend
  does not stop the others) and emits `sdk:reload:required` `{ reason: 'logout' | 'revoked' |
  'identity', previousGid, gid }` (not sticky). The game recreates its scene and calls
  `sdk.auth.init()`; it resolves after configs are loaded and the modules are started again.
  Previously active `on-demand` modules from the bundle and CDN are selected again through
  the new player's composition before `sdk:core:ready`/`auth:playerChanged`. Their APIs and
  HTTP contexts belong to the new session; repeated `loadModule(id)` returns that session's
  started API. Unloaded modules stay lazy, and event/route/idle triggers are re-armed.
  A browser `visibilitychange`/`focus` does not switch identity or run this rebuild: module
  APIs and open windows stay alive; configs/l10n resume their periodic polling without a
  foreground fetch.
  `sdk.auth.logout()` resolves after the purge and the event. A logout without an in-memory
  session (boot refused with 403, never signed in) emits no event but still purges every gid of
  this app/origin, except a session obtained since; the device set stays.
- Module starts (boot, the restart after init/refresh) and identity changes run in one kernel
  queue. A change during the configs load or a start hook waits for it, then stops what was
  started before the purge; modules not yet started stay for the next session. Once the identity
  has changed, `getModule` of a module started for the previous player throws
  `MODULE_NOT_ACTIVE`, even before its stop hook runs.

```ts
sdk.bus.on('sdk:reload:required', async ({ reason }) => {
  scene.destroy();
  await sdk.auth?.init();     // guest again or the next player; configs and modules are ready
  scene = createScene(sdk);
});
```

- id 401 with no session before it (boot with a stored session, or `init`/`refresh` after a boot
  without one): no identity event fires; core purges every gid of this app and origin except a
  session obtained since (the device set stays), and no reload is emitted — no module was started.
  Only id's refusal (`401 UNAUTHORIZED`, see sdk.auth) purges: any other failure keeps every
  gid's data (client-sdk#94).
- Boot keeps only the signed-in player's data: other gids of this app and origin left by an
  interrupted or failed purge are removed. The first start after #91 also deletes keys of the
  old `mpg:{app}:{gid}:…` scheme (configs snapshot, facts, l10n metadata; the locale moves to the
  device set) and `StorageRoot.migrate()` returns their number; the session is kept (see Auth).
  Blob bodies of the old `mpg:{app}:{namespace}:blob:…` scheme are deleted on every start and
  purge, whether or not that cache still runs.
- `StorageRoot`: `prefix`, `scope(gid, module)` (gid `device` is rejected), `device()`,
  `clearGid(gid)`, `purgePrefix(prefix)` (own prefix only), `gids()`, `migrate()`;
  `purgeBlobs(store, prefix, keep?)` in `storage/blob-store` (`keep`: one prefix or a list).
- `ctx.storage` is pinned per start: on another gid the stop hook of the previous player still
  writes under its gid (purged right after), later writes reject `SDK_NOT_INITIALIZED` until the
  module is started for the new gid. Work of the old start still running after that restart is
  not told apart, so modules must stop async work on `stop('auth-change')`.
- `ctx.http` and `ctx.configs` are bound to the identity of the module's init/start (init hooks: the
  first one). From the identity change until the module is started again — its
  `stop('auth-change')` hook included — `ctx.http` rejects `AbortError` before a token is read
  and requests in flight are aborted; `ctx.configs` (no `dispose`) throws/rejects
  `MODULE_NOT_ACTIVE`. A request of the previous player is never authorized as the next one.
  `ctx.signal` stays the module's lifetime signal (aborted on unload/failure): the stop hook runs
  after the change and the module restarts with the same context.

## Module loader: full application composition and CDN (client-sdk#241)

The module selection is part of the immutable application build in `platform.json.sdk.modules`.
Studio and ManyPlay MCP select modules and settings in the project before builds runs.
Runtime configs never change the selected packages or versions. Module failures are isolated.

Every module receives `ctx.settings`: schema defaults plus validated build values, with invisible
fields removed. Image records resolve to files copied into the application build (relative to
`document.baseURI`). Invalid settings emit `sdk:module:failed` with
`SDK_MODULE_SETTINGS_INVALID`, including for a critical module; dependent modules fail and
unrelated modules continue. No untrusted setting values are included in that event.


## Module composition and resource scopes (client-sdk#124/#129)

With an application, boot obtains auth and configs, then activates the build's eager modules
and their required dependencies. Each session receives fresh module resource scopes.

The kernel gives init and the first start a resource scope. Stop cancels its signal, device
subscriptions and bus listeners, including listeners registered by api. Restart gets a new
context and signal; install recurring subscriptions in start or api. A saved old context stays
cancelled. Module sensor stop and motion.stop release only that view's subscriptions; wake lock
remains held while any module or the host requests it. Platform pause and SDK disposal still
stop all sensors. Standalone ModuleLifecycle retains its own lifetime signal semantics.


The host presenter reports committed UI state through `sdk.uiState` (`core/ui-state` types):
`setScreen(id, kind)` publishes `screen.current` and `screen.kind` together and flushes the
context transaction; `setFullscreenPopup(active)` publishes sticky
`sdk:ui:fullscreen-changed {active}`. The shell router uses this bridge while the full
headless ScreenManager stack/loading lifecycle remains a separate task. The bridge stores
no player data and is isolated per SDK instance. Dispose the presenter before `sdk.destroy()`.

### Named windows and universal triggers (#693)

Modules with the `windows` permission register named windows in `start` using
`ctx.windows.register({ main: { canShow, open }, ... })`. The registration is removed when
the run stops. A game may register a presenter for an installed module with
`sdk.modules.register('module-id', { windows: { main: { canShow, open } } })`.
`sdk.ui.canShow('module-id[:windowId]', context)` checks availability.

There is no direct open: a window is shown only through the SDK queue — one window at a time,
highest `priority` first, then arrival order. The shared helper is
`ctx.windows.show('main', params, { priority? })` (a module's own window) and
`sdk.ui.show('module-id[:windowId]', params, { priority?, context? })` (the game). Both return
`{ shown, closed, close() }`: `shown` resolves with the ticket once the window is on screen
(`undefined` when it was unavailable or cancelled), `closed` settles only when the window was
really closed (or was never shown: skipped, closed while waiting, identity switch, module
stopped), `close()` leaves the queue or closes the window.

The host supplies `sdk.ui.usePlacements({ showPlacement })`: this callback asks the server
for the configured placement and presents an available offer; rules reach it with the built-in
action `{ module: 'ui', action: 'placement', params: { placement } }` (also through the queue).
`open(params, context)` gets the same `context` as `canShow`; a trigger rule passes
`{ rule, payload }`, so a window shows the event payload (e.g. `ui.reward` and the items of
`inventory:items:granted`, client-sdk#761).

Triggers are universal (`@manygamescorp/core/triggers`). A rule in `ui.windows/main.triggers` is
`{ id, on: { event } | { element }, payload?, when?, priority?, cooldownSec?, maxPerSession?,
group?, do: [{ module, action, params? }] }`. The source is ANY bus event by name
(`domain:entity:action`, e.g. `progress:level:completed`) or a click on a ui-kit element: the
shell reports the `action` intent of an element to the host (`createUiShell({ elementAction })`,
`sdk.ui.elementAction(id)`), the SDK publishes `ui:element:action { element, payload? }` and the
config, not the button, decides what runs. `payload` is a condition on the event payload (filter
syntax, plain keys address the payload fields; a non-object payload fails it), `when` is a
condition on the player (`sdk.filters`). The action belongs to any module: an `effect` published
with `ctx.actions.publish({ name: { kind: 'effect', run(params, context) } })` (permission
`actions`; analytics, a partner event, a server request) or a window the module registered with
`ctx.windows.register` (same name). Only windows go to the queue. Example:
`{ id: 'p20', on: { event: 'progress:level:completed' }, payload: { level: 20 },
do: [{ module: 'partner', action: 'send-event', params: { name: 'level_20' } }] }`.
The kernel subscribes to the event names the config mentions and re-subscribes on
`configs:snapshot:updated`. Group fallback, cooldown and per-session limits are counted only after
an action actually ran or a window was shown. The time of the last firing of a rule with
`cooldownSec` is kept per player (`core.triggers` storage), so the cooldown survives a restart;
`maxPerSession` counts one session. An unknown module/action or a failed action emits
`sdk:ui:trigger-failed { rule?, event?, code, module?, action? }` and never rejects the emitter.
The clock is `sdk.time`; limits (memory only) and the queue reset when the player identity changes.


ManyPlay account follow-up (#360): `sdk.auth.getGames({ cursor?, limit? })` forwards the opaque
`nextCursor` as `cursor` (default limit 10). Keep it only in memory, for at most 24 hours;
start without a cursor after `VALIDATION_FAILED`. The account flow does this automatically,
replacing the previous rows on restart. Server order is preserved; MAU is not exposed.
`sdk.auth.checkMyNicknameAvailability(nickname, signal?)` reads `{ nickname, available, suggestions }`
without spending a nickname change. Availability does not reserve the name; save can still
return `ACCOUNT_NICKNAME_TAKEN`. The account flow debounces input by 350 ms, spaces reads by
at least two seconds (30/min), honors Retry-After, and cancels stale checks on input/navigation/disposal.


Shared browser tabs coordinate identity through `device:auth:revision` and `storage` events.
Core also checks the revision before returning a token or using player ports, so a late
refresh cannot restore a session removed by another tab. A stale tab's logout preserves
the newer session until explicit `init`/`refresh`. After remote logout, call `init` to
sign in again; `refresh` rejects with AbortError. Handle `sdk:reload:required` as for
local identity changes. A new revision can invalidate modules even when gid is unchanged.
Web Locks serialize browser auth anchors and asynchronous SecureStore operations when
available. Without Web Locks, cross-tab atomicity of asynchronous custom stores is not
guaranteed; memory backends stay local to their tab. See architecture `client-sdk/storage.md` §3.2.


Module activation also supports `deferred`, `on-event` with exact `onEvent`, and `on-route`
with exact `onRoute` through `sdk.uiState.setScreen`. `lazy` aliases `on-demand`.
The window queue activates a non-eager owner before presenting its registered window;
configured UI triggers also reactivate the owner before resolving its registrations.
After the host ticket closes (after unmount), it stops and disposes that runtime and unused
non-eager dependencies, removes their loaded registry entries, then admits the next request.
Opening again runs init/start again; remote factory exports create a fresh instance at the
same immutable entry URL. Eager owners and dependencies still required by another module remain
active. No application list controls this policy: it comes from the effective manifest.
See [the loading contract](../../docs/sdk-modules.md#restored-activation-modes-626) for
ready-session cancellation, idle scheduling and event delivery semantics.

## Deterministic random snapshots

`@manygamescorp/core/random` exposes `createRandom(seed)`, `Random.snapshot()` and
`restoreRandom(snapshot: unknown)`. Save the snapshot with the board/session at the
same logical turn; restoring resumes the next draw, including `int`, `pick` and
`shuffle`, without reseeding or replaying earlier draws.

```ts
import { createRandom, restoreRandom } from '@manygamescorp/core/random';
const random = createRandom('seed-1');
random.shuffle([1, 2, 3]);
const saved = JSON.stringify(random.snapshot());
const resumed = restoreRandom(JSON.parse(saved));
// resumed.nextUint32() equals random.nextUint32().
```

`RandomSnapshot` is `{version: 1, algorithm: 'CM-72', state: [s0, s1, s2, s3]}`.
The four words are uint32 numbers, not all zero. Snapshots are detached and frozen;
restoration copies its input. Missing/extra top-level fields, unknown versions or
algorithms, and invalid words raise `SDKError('RANDOM_STATE_INVALID')` in core.
This is deterministic gameplay state, not cryptographic randomness or proof of fair
play. Published continuation vectors live in `@manygamescorp/core/random.vectors.json`.

The algorithm lives in `@manygamescorp/contracts-client/random`; core delegates to it
and supplies SDK errors. Node servers can use the portable entry directly without
importing core. `@manygamescorp/contracts-client/random-conformance` exports the same
golden-vector checks used by both entry points in CI. The canonical vector file is
`packages/contracts-client/src/random.vectors.json`; the core JSON export is a generated
compatibility copy checked by `contracts:check`.

`registerModuleWindow` принимает `host.signal` (передавайте `ctx.signal`): отмена модуля
завершает ticket даже после снятия scoped bus listeners. Обычный `close()` ждёт host closed до 1500 мс, затем завершает ticket с `console.warn`
(модуль из `host.module` и имя окна). Подтверждение и отмена модуля убирают таймер.
Порт `useSkinScopes` может предоставить синхронный `generation()`: после preload очередь
сверяет снимок непосредственно перед open и повторяет ожидание при смене поколения.
Каталог ui-kit предоставляет этот метод для configs и обновления контекста игрока.

### Skin slot (#1224)

`sdk.modules.set('skin', { package, version })` changes presentation after boot without
restarting installed modules. Versions use the loader's exact artifact validation.
The host supplies `SdkConfig.skin: SkinSlot`: `prepare(selection, signal)` performs
all asynchronous validation/prefetch and returns a synchronous, atomic commit.
`dispose()` releases the installed skin. Core has no UI Kit dependency. UI Kit exports
`createSkinSlot` from `@manygamescorp/ui-kit/skin` to adapt a verified bundle loader.

`null` clears the slot; newer requests cancel older ones. Preparation has a 15-second
budget; errors keep the previous skin and emit `sdk:ui:skin-failed` with the public
package/version and `LOAD_FAILED` or `TIMEOUT`. Superseded/destroyed requests reject
with `SDK_MODULE_CANCELLED` without a failure event. Before boot/after destroy the
call rejects with `MODULE_NOT_ACTIVE`; an unconfigured slot rejects with
`SDK_MODULE_NOT_INSTALLED`. Ordinary module composition stays fixed by the build.


## Analytics events (#1431)

`sdk.analytics.sendEvent(name, payload?)` is available on every SDK instance. Without
an adapter it returns `undefined`, performs no network I/O and retains no events.
Nothing is queued for a later provider. This API requires a release containing #1431;
its presence in source does not mean the installed rc.20 already contains it.

```ts
sdk.analytics.sendEvent('level_complete', { level: 3, score: 120 });
```

The host connects an `AnalyticsProvider` from `@manygamescorp/core/analytics` using
`sdk.analytics.registerProvider(provider)`. The provider implements
`sendEvent(name: string, payload?: Readonly<Record<string, unknown>>): void | Promise<void>`.
The returned function removes that registration. Registrations belong to one SDK
instance and are cleared on destroy. Events after destroy are no-ops. Provider errors
are isolated, including rejected promises; core does not log event data or errors.

Core provides no vendor adapter, automatic telemetry, identity enrichment, transport,
consent decision or persistence here. The host-owned provider controls its own consent
and delivery. Provider modules and the broader analytics pipeline remain future work.

### Launch OS targeting and hardware OS (#1651)

`$os` is the launch category `ios | android | web`, consistent with ID token targeting.
A browser reports `web` even on macOS, Windows, Linux, iOS or Android. Core reads the
actual device provider's `platform: 'web'`; native iOS/Android names are lower-cased
for the category. Unsupported native names leave the category absent, without guessing.
`device.info().os` and `$device.os` retain the actual provider OS name, unchanged.
Use `{ $os: 'web' }` for all browsers and, for example,
`{ $os: 'web', '$device.os': 'macOS' }` for the client device context on macOS.
Hardware OS availability does not add it to server-only init targeting. These facts
select configuration only; they never select stores/providers or substitute runtime OS.
The configs-owned filter rules type `$device.os` as a nonempty string, not an alias
of the closed `$os` enum. Pair this SDK with the updated configs filter validator;
existing authored rules/data are not migrated or rewritten.
