# @manygamescorp/mod-progress

## Standalone package group (#1462)

Progress owns its domain API and contracts. Public entries:

- `./client`: headless `createProgress` and the same API types, without HUD/windows metadata imports.
- `./contracts`: progress state/action/level-end/attempt-seed types owned by this package.
- `./progress`: SDK lifecycle adapter and the same client/type exports.
- `./levels`, `./windows`, `./mechanic`: existing levels, window and generic mechanic helpers.

```ts
import { createProgress } from '@manygamescorp/mod-progress/client';
import type { Progress, ProgressDeps } from '@manygamescorp/mod-progress/contracts';

function playerProgress(deps: ProgressDeps): Progress {
  return createProgress(deps);
}
```

Pass an already authenticated `http:progress` scoped transport and the current session's
signal. The client never accepts an appId/token override. Dispose it when the session ends;
in-flight cancellation, eventId replay and server result validation keep their existing behavior.
The runtime no longer imports generated progress transport types from a common domain barrel;
its public request/state contracts are local. Shared generic callable-action/MechanicOutcome,
settings and realtime protocols remain in contracts-client; no gameplay engine moves into core.

Core is an explicit peer pinned to the core version set in `peerDependencies`;
contracts-client is a direct technical dependency.
Daily rewards declares progress as a required npm peer (`>=1.0.0-rc.27 <2.0.0`) as well as
its existing runtime `requires.progress`. UI/HUD/bottommenu are optional bindings, not npm
requirements. The consumer explicitly selects a compatible progress package; missing or
incompatible progress fails the offline npm consumer, and missing runtime registration fails
module composition. Runtime version ranges are resolved by the existing lock resolver.

Offline pack/vendor tests use **fixture versions** progress `1.4.0`, daily `2.3.0`, and the
core version from `peerDependencies`; they check public JS/types, exact archive/catalog versions, import maps and SHA-256
inventories, and run without UI. Those numbers are not published versions. Without selecting
the group, its package runtime/declarations are absent from the base npm/vendor closure;
shared generated OpenAPI files and generic protocols remain unchanged. The common producer
still owns release-time version stamping and independent publication (#1457); this change
neither publishes the fixtures nor rewrites existing immutable SDK releases.

Register `progressModule()` with `createSdk({ modules: [...] })` to expose `sdk.progress`.
The module uses core's player JWT and the `http:progress` port; `appId` comes from auth.

```ts
import { progressModule } from '@manygamescorp/mod-progress/progress';

// 1. Before play: obtain the server seed (see "Server attempt seeds" below).
const grant = await sdk.progress.beginAttempt(attemptInput);
// 2. After play: report the result with the same seed.
const eventId = crypto.randomUUID(); // Persist once per game attempt before submitting.
const result = await sdk.progress.levelEnd({
  set: 'main', n: 5, key: 'r_0005_0005', levelId: 'mvp_05',
  configVersion: attempt.configVersion, contentHash: attempt.contentHash,
  seed: grant.seed, moves: 3, durationMs: 9400, score: 300,
  won: true, objectives: ['clear_all'],
}, { eventId });
console.log(result.level.verified, result.level.stars);
```

`levelEnd` sends `{eventId, type: 'levelEnd', data}` to `POST /v1/progress/me/actions`.
The game captures `configVersion` and `contentHash` from the applied levels record
when the attempt starts; use the field locations of the installed SDK snapshot API.
Both `levelEnd(data, { eventId })` and `send` require a caller-owned `eventId`
(8–64 characters, matching the service contract). Persist it with the original facts
before sending. After a timeout, network failure or restart, repeat the call with the
same `eventId` and identical data; a duplicate returns the original server result.
The SDK does not generate action ids. Missing or invalid ids reject with
`VALIDATION_FAILED` before HTTP.
Reusing the id with different data yields `PROGRESS_EVENT_ID_CONFLICT`.

`send({eventId, type, data})` is the lower-level action API under `sdk.progress`.
Client action types and their data schemas are checked by the server; `levelEnd` also
has strict client validation. Server fields (`verified`, `stars`, `verify`, identity,
source, timestamp and rewards) cannot be supplied. There is no replay field in stage 1.

`202 accepted` confirms receipt, not an already updated progress state. Stars and
verification are returned by the server; an unverified result is a normal acknowledgement.
The module emits `actions:action:accepted` with `{eventId, type, duplicate}`. State caching and reward claims remain future progress module work; init is
available as described below.

## HUD badge

The `progress` HUD item (`clearOnOpen`) shows a dot when the server sends a realtime hint about the
own progress (`ref.resource = progress.me`): `progress.daily_reward.ready`,
`progress.reward.claimable`, `progress.task.completed`. Hints carry no rewards; opening the item
clears the dot, and the game re-reads the state itself. `progress.streak.changed` is informational
and sets no badge. Without the realtime module the item has no badge.

## Levels submodule (#522)

Public factories: `progressModule()` from `@manygamescorp/mod-progress/progress`
and `levelsModule()` from `@manygamescorp/mod-progress/levels`. Enable both
modules. `levels` declares `requires.progress` and reaches progress through
`ctx.sdk`; configs is the built-in core public API (`ctx.configs`). No direct
HTTP or core-internal imports are used by levels. The manifest requests SDK `storage`. Release tooling
creates a separate `sdk-runtime/levels.json` module manifest in this package.

```ts
const handle = await sdk.levels.open('main', { signal: sceneAbort.signal });
const applied = await handle.get(5, { signal: loadAbort.signal });
// The mechanic validates applied.entry or interprets applied.range generation fields.
await handle.levelEnd(applied, {
  moves: 3, durationMs: 4000, score: 100, won: true,
}, { eventId: attemptId });
handle.dispose();
```

`open` fetches only `set` inside `levels.<set>`. `get(n)` picks the narrowest
covering range and requests only that key; closed ranges beat open ones.
`prefetch(n)` computes the key for every number in the upcoming window,
deduplicates keys and fetches only missing records. The returned selection's
snapshot is authoritative; levels never reads the default configs snapshot.
Known single open generation ranges use `open('daily', { key: 'r_daily' })`
without enumerating the scope or reading a nonexistent set. Generation content
stays opaque; levels returns the range description and no fabricated entry.

E152 settings are shared by the progress package's factories and published in
`package.json` and their manifests: `chunkSize` (1–200, default 10),
`cacheMaxBytes` (81,920–16,777,216, default 2,097,152), and
`prefetchDepth` (0–4, default 1). Depth zero disables automatic prefetch;
explicit prefetch still loads one chunk. Other windows are capped at 200 numbers
and 64 missing keys per request. These are SDK settings, consumed by the existing
Studio/ManyPlay MCP module-settings flow; no new service writer, MCP method,
env or endpoint is introduced.

The module owns at most 8 handles, 64 cached ranges (each client record is capped
at 81,920 serialized UTF-8 bytes), and 16 queued calls per lane/handle. A module-wide limit of 16
physical configs fetches includes abandoned waits until their requests settle.
Each handle has one foreground lane and at most one speculative load. Foreground
reads do not queue behind prefetch IO. Explicit prefetch resolves after its window
is cached, including when an automatic request was already in flight. Cache eviction uses insertion/access order;
the LRU budget counts serialized UTF-8 bytes of raw records, versions, hashes and ETags
(including index records and metadata). Each insertion evicts least recently used records
until both byte and count budgets fit. Restoring a cache above a reduced budget
keeps the newest records that fit. Reads update LRU in memory without storage writes;
the next insertion or eviction persists that order. A record larger than the budget is returned to
foreground callers without retaining it. Persistence uses `ctx.storage`, scoped by app,
API origin, player and module; unavailable/quota-limited storage keeps the memory cache.
Raw records are re-resolved through public `configs.resolveSnapshot` on current facts,
so persistent conditionals are never treated as already applied.

Reopening a cached set revalidates its `set` key with `If-None-Match`; an unchanged
scope needs one 304 without a response body, then cached ranges need no HTTP.
The same applies after stop/start, a context change, or page reload. A changed scope
revision discards its stored ranges. Single known open ranges revalidate their own
key. Tags are never reused for different scopes/keys. Stop and context changes clear memory and indexes while retaining stored raw
records; disposing an individual handle releases its budget while retaining the set cache.
A set index is capped at 2,000 entries and the same per-record size. Dispose
handles when scenes close to release their budget. Attempts retained by the game
hold immutable data independently of this cache.

Index and range scope revisions must agree. A mismatch clears the handle's cache,
reloads the index and reselects once; a second mismatch fails. Config/context events
invalidate future reads, including keyed-only conditionals. Config changes never
replace an `AppliedLevel`: `handle.levelEnd` accepts only levels returned by that
handle and passes their original set/n/key/levelId/configVersion/contentHash to
public progress. Persist the attempt's eventId and reuse identical measurements
after an uncertain result. Cross-handle levels and metadata overrides are refused.

Every load accepts AbortSignal. Abort, stop and identity change stop waiting and
prevent late cache writes/events. Signals reach public `configs.fetch(selection, {signal})`
and physically cancel the request without cancelling unrelated requests. Old handles cannot be
used after stop. `has(n)` reports current memory availability; uncached IO offline
fails with `LEVELS_OFFLINE_MISSING`, malformed/missing/inconsistent data with
`LEVELS_NOT_LOADED`. Existing rate-limit and Retry-After errors propagate unchanged.

`levels:range:loaded` publishes only `{set, keys, scopeVer, loadedAt}`; `loadedAt`
comes from `ctx.time.now()`. No entry, token or identity is published. Sharded delivery
(E154, #534) can replace the public configs delivery port later; this release loads
only inline records and does not implement an adapter.

Contract: [progress/levels-contract](https://github.com/manygamescorp/architecture/blob/main/docs/architecture/services/progress/levels-contract.md).
Tests are written in `test/levels.test.ts` and `test/fixtures/levels.ts`; run with
module-wide acceptance, including real configs resolution and ScopedHttp wiring.

## Mechanic helper (#537, E156)

External `kind: 'game'` mechanics import `createRandom`, `isSeed`
from `@manygamescorp/core/random` and `createMechanic`, `createCurve`,
`MECHANIC_SETTINGS_FIELDS`, `parseMechanicSettings`, `checkMechanicSettingsFields`
from `@manygamescorp/mod-progress/mechanic`. The latter is a library subpath;
there is no mechanic-kit package, manifest or catalog entry.

Create one handle in `start(ctx)`, call `await handle.ready()` and dispose it in
`stop()`. Start does not access `ctx.sdk`; ready waits for sticky `sdk:core:ready`
and only checks that the selected mode's dependencies are in `modules` and not in
`failed` (core: progress + levels; secondary: progress + gamestate); it makes no
network call. An unavailable feature or missing steps surface later as
`MECHANIC_STEP_UNAVAILABLE` from `currentStep()`. Methods before readiness reject
with `MECHANIC_NOT_READY`; a disposed or aborted context rejects with
`MODULE_NOT_ACTIVE`. `id` is a lowercase kebab-case name without dots (it keys
`gamestate.data.mechanics[id]` and the `mechanic.<id>` configs scope).

```ts
const mech = createMechanic(ctx, { id: 'mech-arrows', modes: ['core', 'secondary'] });
await mech.ready();
const { n } = await mech.core.currentStep();
const applied = await mech.core.load(n);
await validateLevel(applied.entry ?? applied.range); // mechanic-owned validation
const attempt = await mech.core.begin(applied); // before the first move
const ack = await mech.core.levelEnd(attempt, { moves: 3, score: 100, won: true });
```

`progress.init(key)` reads a feature through `/me/init`. The registered module retains
up to 32 snapshots per player run and coalesces identical reads. Window opens reuse them;
progress hints, accepted actions and realtime epoch/sequence gaps invalidate them, as does
`endsAt`. Use `{ force: true }` for an explicit refresh. Standalone `createProgress` without
a host revision retains its direct-read behavior. Missing features yield an unavailable state with empty
steps. The read is safe to repeat but is not retried automatically; the caller
repeats it after a network error. `init()` and `init(keys)` return arrays. Core `load(n)` checks its step
before opening levels; missing/locked steps reject with `MECHANIC_STEP_LOCKED`.
Available and completed steps are playable. One levels handle pins metadata.
`begin` asynchronously obtains the server seed and pins its hex24 `attemptId` separately
from the UUIDv7 `eventId` used for begin idempotency and levelEnd. The UUID is retained on
uncertain retries on the same live handle; `startedAt` uses `ctx.time.now()` after the seed response. `levelEnd` pins the duration measured with
`performance.now()` since `begin` (rounded, clamped to 0…24 h, unaffected by
`time:offsetChanged`; on mobile it may pause while the device sleeps), facts and
eventId on first submission. Repeat identical facts after a lost response;
different facts reject with `MECHANIC_ATTEMPT_RESULT_MISMATCH`. Only ACK supplies
verification/stars. A completion event is emitted once; after an ACK a repeated
call returns the same ACK without a request. Concurrent calls share one request;
cancelling one caller's signal does not cancel it for the others.

Fixed/daily/perAttempt seed selection is server-owned. Begin never generates or
computes a local seed. Network errors prevent start; no attempt event is emitted.

`mech.playerLevel()` reads `progress.init(settings.progressKey)` and counts every
completed step, with no source override or cached copy. Secondary requires both
progress and gamestate. A new player's level is zero; curve evaluation clamps
zero to the first point (level 1). Pass this number into `attempts.begin` with
parameters derived from the curve. `begin` trusts the value it is given (no
override is read); the mechanic owns any further checks. The `progressKey`
setting is visible in both modes. No profile dependency is introduced.

Secondary uses `mech.attempts.restore/begin/finish/reset`. New secondary begins currently
reject with `MECHANIC_MODE_UNSUPPORTED` before HTTP, save or a start event: the server
only has a level-target begin contract (progress#231 tracks secondary grants).
Restore/finish/reset of an already saved attempt remain available. The following
begin persistence flow requires a future secondary grant implementation.
`begin({playerLevel,
params})` persists seed and parameters before returning. State is only at
`gamestate.data.mechanics[id]`; CAS retries on conflict preserve the latest other
root fields and other mechanics. There are at most three writes on conflict.
After an uncertain write its original version, payload and UUIDv4 idempotency
key are retained; the next operation (any of them, including `restore()`) first
resends it. If it applied, its event fires once; a version conflict means it
never applied and is dropped; a retryable failure is rethrown as is and retried
by the next call. `MECHANIC_ATTEMPT_CONFLICT` means three CAS conflicts in a row
or more than 16 queued calls. Finish replay returns the saved result without
another write. State is limited to 16 KiB, counters to 10^9; malformed state
rejects without replacement and only explicit reset repairs the subtree (a
non-object root `mechanics` is replaced by reset, other root fields are kept).
Invalid caller input (`begin`/`finish` arguments) rejects with
`VALIDATION_FAILED { path }`; `MECHANIC_ATTEMPT_STATE_INVALID` is only for the
stored save. `params` must fit the gamestate default `jsonMaxDepth` 6 counted from
`data.mechanics.<id>.last.attempt.params` (depth 5): a flat object of scalars or
empty containers. Apps that lower `jsonMaxDepth` below 6 cannot use secondary.
Cooldowns and `startedAt` use `ctx.time.now()` and `cooldownSec`; before the first
server time sync this is the device clock. Secondary `durationMs` is
`clamp(now − startedAt)` on server time because `startedAt` survives a restart.

```ts
const curve = createCurve({ moves: { min: 1, max: 100 }, reward: { min: 0, max: 1000 } });
const { points, record } = await mech.loadCurve(curve);
validateSettings(record); // mechanic-owned fields; points were already validated
const playerLevel = await mech.playerLevel();
const attempt = await mech.attempts.begin({ playerLevel, params: curve.evaluate(playerLevel, points) });
// On restart: restore(), then generate the initial board from active.seed and active.params.
// There is no persisted move journal.
const finished = await mech.attempts.finish(attempt.id,
  { won: true, score: 100, moves: 3, reward: 10 });
```

`loadCurve` performs one keyed configs fetch of `mechanic.<id>/<curve>` in either
mode and does not update the shared configs snapshot. Results are frozen.
`curve.jsonSchema` describes the exact point keys; validate additionally checks
first level 1, strict ordering and the 32-point limit. Interpolation uses integer
arithmetic, floors negative fractions, clamps and then checks `refine` output.
Copy the seven common E152 fields literally into package.json; CI calls
`checkMechanicSettingsFields`. Full settings schemas use `properties.curve =
curve.jsonSchema`. Both configs fetch and mechanic operations accept a signal.

Declare `sdk:core:ready` in listens and `<id>:mechanic:ready`,
`<id>:attempt:started`, `<id>:attempt:finished` in emits. Payloads contain only
mode/attemptId/n/won/verified/reward, never seeds or player state. Dependency modules
belong in `optional` and `sdk.uses` of the game manifest; service modules cannot
have `sdk.uses`. Settings are written through existing `sdk.modules.*` and
`configs.*` MCP methods; no new MCP scope/method is introduced.

Secondary restarts the attempt from its pinned seed and parameters; moves are
not stored during gameplay. Only final aggregate moves are saved on finish.
`AttemptResult.reward` is a required integer 0…10^9, calculated by the mechanic
(including its configured rewardPercent). It is returned in `finished.result`
and in `attempt:finished.reward`; core events have reward=null, since progress
owns core rewards. Finish replay returns the originally saved reward without
another completion event. The reward issuer remains TBD: the helper never
calls inventory or submits a secondary result to progress.
PRNG vectors ship at `@manygamescorp/core/random.vectors.json`. The public
library declarations and examples are generated in `docs/sdk-api.json`.

## Many Play Skin windows (#704)

The module registers `progress:<id>` windows in `ui.windows` (`levels`, `level-win`, `level-lose`,
`level-fail`, `points`, `quests`, `achievements`, `cross-quest`, `season`, `content-end`, `continue`,
`endless`, `endless-entry`, `endless-revive`, `endless-result`). `quests` shows only the tasks of a
period; the achievements are their own window `achievements` (client-sdk#808). `sdk.ui.show('progress:level-win', params)`
goes through the one SDK window queue; when the window is next, the module emits
`progress:window:open { name, params }` and the host mounts the matching component of
`@manygamescorp/ui-kit/services/progress-windows` (portrait and landscape by CSS orientation).
The ticket `closed` settles only when the host emits `progress:window:closed { name }` (the kit
window's `close` intent, unmount) or the queue calls `close()` (the module then emits
`progress:window:close { name }`), so the next queued window never overlaps this one.
The windows carry no CSS of their own: they use the default theme primitives (`card`, `row`,
`hint`, `badge`, `grid tiles`, `progress`, ...); progress bars show the exact value.
Errors are shown only by the standard kit error window (`ui.error`); the module draws none.
Screenshots: `docs/ui-kit-screens/mps-impl/progress/`.

### Server attempt seeds (#1044)

`sdk.progress.beginAttempt` sends exactly `{set,n,levelId?}` to
`POST /v1/progress/me/attempts/begin`. The SDK's mechanic/mode/applied metadata stays
local. The caller's UUID `eventId` becomes `Idempotency-Key`; the server returns
`{attemptId,seed}`, with a lowercase hex24 ID and a 43-character base64url seed.
Identity comes from the player token. There is no local seed fallback.

For the server to verify the result, pass the seed issued by `beginAttempt` to `levelEnd`
as `data.seed` (`seed: grant.seed`). `attemptId` is not sent with `levelEnd`. Without that
seed the answer is still accepted, but `level.verified` is `false` with reason
`seed_mismatch` and no points are credited.

```ts
const applied = await (await sdk.levels.open('main')).get(1);
const { set, n, key, levelId, configVersion, contentHash } = applied;
const input = { mechanic: 'mech-arrows', eventId: crypto.randomUUID(), mode: 'core' as const,
  level: { set, n, key, configVersion, contentHash,
    ...(levelId === undefined ? {} : { levelId }) } };
// Persist input before sending; reuse the exact UUID and input after an uncertain response.
const grant = await sdk.progress.beginAttempt(input);
```

The game owns durable input storage; `createMechanic().core.begin` retains its UUID
only for retries on the same live handle. A new UUID cannot recover a lost response
and can return `PROGRESS_ATTEMPT_ACTIVE`. New secondary begins reject locally with
`MECHANIC_MODE_UNSUPPORTED` until progress#231 supplies a server contract.
Secondary restore uses the saved seed/params without another grant.
See [mechanic API](../../docs/mcp-knowledge/mechanic-api.md).
