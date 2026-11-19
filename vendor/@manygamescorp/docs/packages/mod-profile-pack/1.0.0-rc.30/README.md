# @manygamescorp/mod-profile-pack

Optional free JSON KV (`sdk.kv`), game save (`sdk.gamestate`) and profile presentation.
Headless `sdk.profile` is owned by core when `platform.json.app` is present. Each module has its own public subpath; there is no barrel. Uses only core;
no third party runtime dependencies. Configs is in core: `sdk.configs` (D-CFG).

Studio / `sdk.modules.set` selects and configures the catalog package **profile-pack**
(rc.26 and earlier: `profile`). Headless `profile` is installed by core without being declared.
That package includes the `kv`, `gamestate` and `profile-ui` runtime descriptors;
their ids are not separate Studio catalog selectors. Runtime dependencies on the
headless `profile` supplied by core do not become package self-dependencies.
Local source integrations can still import the documented factories below.

## Quickstart

```ts
import { createSdk } from '@manygamescorp/core/kernel';
import { web } from '@manygamescorp/platform-web/web';
import { kvModule, type Kv } from '@manygamescorp/mod-profile-pack/kv';
import type { Profile } from '@manygamescorp/core/profile';
import { profileUiModule } from '@manygamescorp/mod-profile-pack/ui';
import { gameStateModule, type GameStateApi } from '@manygamescorp/mod-profile-pack/state';

// platform.json: { "app": "<appCode>", "endpoints": { "api": "https://api.<domain>" }, "cdn": … }
const sdk = createSdk({
  platform: web(), platformConfig, http: { appVersion: '1.0.0' },
  modules: [kvModule(), gameStateModule(), profileUiModule()],
}) as ReturnType<typeof createSdk> & { kv: Kv; profile: Profile; gamestate: GameStateApi };
await sdk.boot(); // guest sign-in (sdk.auth), configs, then the modules start

await sdk.kv.set('slots', [1, null, true], { scope: 'inventory' });
await sdk.kv.query(['slots', 'tutorial'], { scope: 'inventory' });

const save = await sdk.gamestate.get(); // version 0 — no save yet
await sdk.gamestate.set({ level: 16 }, { version: save.version, publicData: { level: 16 } });

const me = await sdk.profile.get();
await sdk.profile.update({ name: 'Player' }, { version: me.version });
const { items } = await sdk.profile.query({ gids: [101, 102, 103] }); // leaderboard names

sdk.bus.on('sdk:reload:required', () => { /* identity changed: rebuild the scene */ });
```

## Authentication and the player change (E89, E91)

The modules have no transport or token of their own. On every start each builds its API from
`ctx.http` of its single permission — `http:player-data` (kv), `http:profiles` (profile),
`http:game-states` (gamestate) — so every request carries the token of `sdk.auth`, and a 401 goes
through its exchange. Without `platform.json` there is no `ctx.http`: the module fails to start
(`SDK_PERMISSION_DENIED`).

On an identity change (logout, another gid) the kernel aborts the requests of the previous player
in flight and stops the modules; `stop` disposes the API. A reference kept from the previous player
(`const kv = sdk.kv`) rejects `MODULE_NOT_ACTIVE` and never runs as the next one; until the restart
`sdk.kv` itself throws `MODULE_NOT_ACTIVE`. After `sdk:reload:required` read `sdk.kv` again.

## KV — `/v1/player-data/me*`

`get(key)`, `list()`, `query(keys)` (1–50 keys, one POST `/me/query`), `set(key, value)`,
`delete(key)`; options `{scope?, signal?}`, mutations also `idempotencyKey?`. get/list/query/set
return the wire `{data, updatedAt}`; `delete` returns void. `set` and `delete` generate a UUID v4
Idempotency-Key: pass your own and retain it to retry the same uncertain mutation. Scope is a write
and query body field and a read/delete query parameter; omission and `scope:'global'` are the same.
Keys `^[A-Za-z0-9:_-]{1,128}$`, values free JSON (depth ≤ 6, no `$`/`.`/`_bsontype`/prototype keys,
no lossy numbers), checked before any request.

## Profile — `/v1/profiles/*`

Own profile: `get()`, `update(patch, {version?})`, `replace(value, {version})`, `field(path)` and `setField(path, value, {version?})`. Presentation and declared client app fields live at the root. System owner fields are read-only; no scope mutation method. Nested paths address only declared application objects (max 8 safe segments).

`get()` retains a detached in-memory snapshot and ETag per player session, revalidates with
`If-None-Match`, and returns the snapshot on 304. The GET validator is opaque
(`W/"profile-<sha256>"`) and reflects the returned body, including the derived
ManyPlay nickname and active schema projection. A 200 body with the same numeric
`version` still replaces the session snapshot. Use `get().version` for mutation
options; never parse the read ETag or send it as `If-Match`. Mutation ETags remain
numeric, so the next GET establishes a representation validator with a 200.
Transport stays `cache: 'no-store'`.
`update()` and `replace()` use the operation response directly without an extra GET; older
in-flight reads cannot roll it back. A field write invalidates the full-profile validator.
Disposal/identity change clears the snapshot; nothing is persisted.

Other players of the same application (leaderboards): `summary(gid)`, `byGid(gid)` and
`query({gids})` — public projections only. `query` returns found gids in the order asked; missing
or expired ones go in batches of 100 (`POST /query`, one request each), at most 1000 gids per call.
Projections of `byGid`/`query` are kept in memory for 5 minutes (E38), absent gids too (`byGid`
then rejects `NOT_FOUND`); `{force:true}` skips the cache. The cache belongs to the API instance of
one player session: an identity change drops it.
Cache hits honor the module and caller AbortSignal too. A response arriving after cancellation
cannot populate the cache; a query keeps its result independently of concurrent cache eviction.
The demo «Лидерборды» renders names and same-origin avatars (external images use a placeholder
under the demo CSP); «Профиль» exercises both public reads by gid. Scores in this demonstration
come from the profile projection; an actual leaderboard keeps its own scores and positions (E38).

Optional `profileUiModule()` (id `profile-ui`) consumes `profile.read@1` from core
and optional `profile.presentation@1` from an explicitly installed UI Kit. The presentation
provider registers the profile entry and level counter, and one initial profile read runs
only when its topbar is active. Headless startup makes no profile request. Core emits
`profile:level:changed` for later changed snapshots even without presentation; profile-ui
updates the counter without polling. Stop/dispose removes the handles. The standalone
`levelTopBar` helper is exported from `@manygamescorp/mod-profile-pack/presentation`.
See [package boundaries](../../docs/presentation-packages.md).

## Game state — `/v1/game-states/me`

`get()` → `{version, data, publicData, updatedAt, ts}` (version 0 — no save). `set(data,
{version, publicData?, idempotencyKey?})` is a full replace with `If-Match:"<version>"` ("0" for
the first save) and an Idempotency-Key; a stale version rejects `GAME_STATE_VERSION_CONFLICT` (409)
with the server state in `details` (`currentVersion`, `data`, `publicData`, `resolution`, E36).
`clear({version?})` deletes the save. Limits of the contract, checked before the request: `data`
≤ 1 MiB, `publicData` ≤ 8 KiB serialized. Reading another player's save is not part of the SDK yet.
`sdk.state` is the SDK lifecycle state, hence the module id `gamestate`.

Wire paths and DTOs follow the pinned profile client OpenAPI (contracts-client); a type test keeps
the SDK types assignable from it. Tests: fake ports, the kernel with platform.json `app` (identity
change during a write, A↔B both ways) and the demo e2e scenario `data-identity`.

## Flat profiles (E99)

`name`, `avatar`, `locale`, `country` and declared app fields are at the root. There is no
`base`, `scopes`, `custom`, `paymentsData` or `updateScope`. `replace(value, {version})` replaces
only client fields; `update` merge-patches them; `field('preferences.sound')` reads a nested app value.

Games **read** system `level`, `score`, `xp`, `coins`, `friendsCount`, `referralCode`, `gamesPlayed`,
`gamesWon`, `totalScore`, `highestScore`, `winRate` for UI and sharing. Progress/inventory own these
values and project them through coalesced bus events; games cannot write them, even with D7.
For app-specific data, publish one flat application schema. Every root property declares
`writer: client|server` and `visibility: public|owner`; nested data inherits both. System names
are reserved. Example schema: `{type:'object', additionalProperties:false, properties:{
selectedSkin:{type:'string', writer:'client', visibility:'public'}}}`. Then
`await sdk.profile.update({selectedSkin:'blue'})`. Public queries omit owner fields, xp and coins.

End-to-end filling also requires the publishers tracked by [progress#9](https://github.com/manygamescorp/progress/issues/9) and [inventory#97](https://github.com/manygamescorp/inventory/issues/97). The receiver contract alone does not mean those fields are populated on the stand.

Schema reads include immutable typed system definitions; exact definitions can roundtrip. Games add fields at the root or in logical object groups (settings/achievements/season), never a group with the app slug or nested copies of system fields. Default game/social/stats/custom containers are absent. Only the declaration is locked for presentation fields; existing name/avatar/locale/country commands remain client-writable, while numeric system projections remain server-only.

The removed `mod-profile-pack/profile` entry has no compatibility alias. See
[headless base and optional entries](../../docs/headless-base.md) for the new composition.
