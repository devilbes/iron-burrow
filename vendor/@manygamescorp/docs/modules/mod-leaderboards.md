# @manygamescorp/mod-leaderboards

## Package boundary

The package owns the public `Leaderboards`, `BoardRef`, `BoardPage`, `ProfilePort` and
submission/error types. Import the headless client directly:

```ts
import { createLeaderboards, type BoardRef } from '@manygamescorp/mod-leaderboards/client';

// Board IDs and keys come from the application's service metadata, never guessed from titles.
const boards: readonly BoardRef[] = applicationBoards;
const leaderboards = createLeaderboards({ http: scopedLeaderboardsHttp, boards, signal });
const page = await leaderboards.get(boards[0]!.boardId, { limit: 20 });
```

`http` implements the public core `ScopedHttp.request` contract and must already be scoped
to the current player's leaderboards service. The client does not accept credentials or
perform login. Pass the session signal and call `dispose()` on teardown. It rejects late
responses after cancellation. Pagination forwards the opaque cursor unchanged.

`./client` imports no UI metadata, window adapter or HUD implementation. The existing
`./leaderboards` entry owns SDK lifecycle/window/HUD registration and also exports the
same client API/types. Both entries use one implementation. UI Kit, HUD UI and profile
are optional runtime bindings, with no npm dependency on those packages. Profile failure
leaves score reads usable; an absent profile leaves entries undecorated.

Core is an explicit **peer** at the version set in `peerDependencies`, independent of this package's own version.
This pins the tested compatibility and prevents npm from nesting another core runtime.
The offline pack/vendor consumer uses module fixture version `2.4.1` with unchanged core
version from `peerDependencies`; these fixture versions do not publish or prepare a release. The common
producer's independent-version release support belongs to #1457. Immutable releases
are untouched. Vendor artifacts retain exact package version, types, import map and
SHA-256 file inventory. Omitting the package excludes its runtime and declarations from
the selected npm/vendor closure; the shared generated OpenAPI library is unchanged.

Native metadata integration remains #1246 / PR #1427: its public `labels()` returns
service title localization keys, translated by the host. This packaging change does not
replace the metadata source, copy that implementation, or claim that pending API is in main.
The board metadata consumer fixture uses service-issued board IDs, leaderboard keys and
an unchanged title key; the existing `list()`/page/rank contract is preserved.

`leaderboardsModule()` registers `sdk.leaderboards`. The module uses the player session and
`http:leaderboards` scoped transport. Metadata comes from `GET /v1/leaderboards`; board reads use
`/v1/leaderboards/boards/{boardId}` and that path's `/ranks/*` and `/around/*` children.

```ts
import { leaderboardsModule } from '@manygamescorp/mod-leaderboards/leaderboards';

const boards = [{ boardId: '2b5ab1d2-0dc3-5f8f-a6f2-6d4f7ea5e001', leaderboardKey: 'ranked',
  title: 'Ranked' }];
const module = leaderboardsModule({ boards });
```

`list()` returns the immutable board-instance catalog passed at composition time.
`labels()` reads definition metadata from the client service. Supply board IDs issued by
the application configuration. `get(boardId, { limit?, cursor?, order? })` returns the server's
`{ items, nextCursor, me, ... }` page. `around(boardId, { above?, below?, radius? })` and
`aroundOf(boardId, gid, options?)` return `{ entries, rank, score, ... }`.
`rank(boardId)` and `rankOf(boardId, gid)` return `{ boardId, gid, rank, score }`.
The `me` methods use the server's `/me` path, so the SDK never supplies its own gid.

The optional `profile` port is `query({ gids }, { signal? })`. Pass it through module options or
install a compatible `profile` module. Page and around entries gain a `profile` field when a
public projection is available. Projection failures leave the scores usable. The port is kept
narrow and requires no package dependency on the profile module.

`canSubmit` reports whether the build-time `platform.json.clientAuthoritative` enables client scores (D7). A
missing flag means `false`, and disposal resets the property to `false`. The flag comes from
the server's auth init session and is checked again on every submission. It only identifies
whether client submission is allowed for the application; the server also enforces that the
selected leaderboard has no server event sources.

`submit(leaderboardKey, { scoreDelta?, scoreValue?, eventId, occurredAt, idempotencyKey })` sends a
score for D7 applications. `submitScore` is the same method for existing callers. When D7 is
off, either method rejects locally with `SDK_LEADERBOARD_CLIENT_SUBMIT_DISABLED` without an
HTTP request. In a server authoritative application, level results are sent through the
progress `levelEnd` flow; verified server events then update leaderboard scores. Use
`scoreDelta` for `increment`, and `scoreValue` for `replace` or `best`.
In `best` mode, the server retains only an improvement in the leaderboard's `direction` (`max` or `min`);
equal or worse values leave the score unchanged. Supply exactly one safe integer score field,
a printable ASCII event ID, an actual UTC timestamp, and a lowercase
UUID v4/v7 idempotency key. Reuse the **same whole input**, especially `eventId`, `occurredAt`, and
`idempotencyKey`, when retrying the same gameplay event. A server 404 for a leaderboard with event sources
is propagated. The SDK returns only the server's board results and never predicts a score or rank.

The module emits `leaderboards:board:fetched` with `{ boardId, leaderboardKey }` and
`leaderboards:rank:changed` with `{ boardId, rank, previousRank }` when a later own-rank read
differs. Module disposal aborts requests, rejects late responses, and suppresses late events.

E149: every board belongs to a `leaderboardKey`; supported scopes are `regional` and `clan`.
There are no recurring periods in this API. `expiresAt` is the leaderboard's `endsAt`,
or `null` for an unbounded leaderboard. Scheduling creates separate leaderboards.

`LeaderboardsError` rejects a not-yet-started write (`LEADERBOARD_NOT_STARTED`, 409),
an ended leaderboard (`LEADERBOARDS_BOARD_EXPIRED`, 410), or an invalid key
(`INVALID_LEADERBOARD_KEY`, 400). These rejections have `module: 'leaderboards'`
and `retryable: false`; they never enter an offline queue or emit success events.

Windows (client-sdk#702): with the `windows` permission the module registers the named window
`main` through `ui.windows` (`sdk.ui.show('leaderboards')`, optional `tab` parameter: the
`leaderboardKey` of the tab to open). The module has no UI of its own: `open` emits
`leaderboards:window:open` with `{ view, tab }` and the host mounts the Many Play Skin window from
`@manygamescorp/ui-kit/services/leaderboard-window` (portrait and landscape, screenshots in
`docs/ui-kit-screens/mps/mod-leaderboards/`). Failures use the standard ui-kit error window.

Board names (client-sdk#1246): `labels()` reads `GET /v1/leaderboards` with the player's
session, traverses opaque `nextCursor` pages in service order, and returns immutable
`{ leaderboardKey, name, label }` entries. Both text fields contain the service's `title`
localization key. The window host translates it through `sdk.l10n.t`, whose missing-key
behavior displays the key unchanged. No configs scope, language maps, default Russian
locale or local 16-board/64-character truncation remains. Page size is selected by the
service. Repeated cursors/keys, malformed metadata and more than 100 pages reject rather
than silently truncate. Requests follow the module lifetime; service errors propagate.
Read metadata once per opening, rather than per render. A locale change affects the next opening.

```ts
const tabs = (await sdk.leaderboards.labels())
  .map((board) => ({ id: board.leaderboardKey, label: sdk.l10n.t(board.label) }));
```

Titles are configured with native leaderboards API/MCP methods. Their translations live in
localization; the SDK never reads `configs leaderboards/main`. The showcase seeds native
`fixtures/leaderboards/*.json` definitions and keeps their strings in localization fixtures.
