# Exact package documentation graph (next LTS, client-sdk#1467)

This implements a documentation producer/consumer fixture. It does not publish LTS,
change the package release orchestrator or enable independent package releases in Studio.
Historical rc.20 and later immutable artifacts stay unchanged. Existing `api.json` is the
complete release catalog, not an assertion that a game has installed every optional API.

The data-only `@manygamescorp/docs` artifact now also contains:

- `packages.json`: inventory of exact package versions, vendor inventory SHA-256,
  documentation SHA-256 and exact SDK dependencies. It is an inventory, not the game selection.
- `packages/<unscoped-package>/<package-version>/api.json`: public package snapshot,
  including methods, parameter/return types, events/payloads and documented errors/examples.
  Public mod-* README and runtime manifest are stored beside it when available.
- `base/graph.json`, `base/api.json`, `base/sdk-methods.lock.json`: one explicitly resolved
  core dependency closure, without optional module APIs or UI renderer APIs.
- `schemas/sdk-docs-graph.schema.json`: the next-LTS producer fixture graph format.

Current core already owns id/auth/configs; current profile is still a separate mod-profile-pack.
Select that package explicitly to document its profile/kv/gamestate namespaces. This producer
will follow their actual package ownership after the separate LTS base move; it does not
pretend the profile move or an independent release has happened. Generic headless core
interfaces (including UI capability ports and the shared SDKError code union) remain truthful
to the installed declarations; they do not grant optional APIs. The core HUD utility library
has an explicit mod-hud documentation requirement and is omitted from a headless reference.

At production time `packageReference()` splits the checked `sdk-api` output by package
identity. Snapshots are bound to the package version and exact dependency closure from built
vendor artifacts. At consumer time `composeReference(graph, snapshots)` reads **only** the
selected exact snapshots. It rejects ranges, duplicate package names, missing exact
transitive dependencies, changed snapshot hashes, mismatched identities/dependencies and
namespace collisions. It never consults the latest monorepo catalog or resolves a semver range.
There is one selected version per package. Independent package producers can supply snapshots
using the same format; the common release producer still uses its existing release version.

The same call returns a composed reference and `sdk-methods.lock.json`. Each lock entry
pins namespace/member name, kind, owning package/version and the SHA-256 of the complete
member description/signature (including types/errors/example). The lock also pins the selected
graph and composed reference SHA-256. Package bytes must separately pass existing signed
catalog/vendor inventory verification; the docs composer does not download or verify them.
Unknown packages with no generated namespace have an empty API snapshot, not invented methods.

See the [executable example and A/B fixtures](examples/sdk-docs-graph/README.md).
The [schema](schemas/sdk-docs-graph.schema.json) checks structure; the composer additionally
checks dependency closure, identities and SHA-256. All outputs are deterministic and contain
no timestamps. Docs sources remain an explicit public allowlist: no recursive docs copy,
reviews, audit/tasks, internal files, credentials or build-kit implementation files.

MCP names remain `sdk.modules.list`, `sdk.modules.set`, `sdk.kit.get`. No new tool/scopes,
SDK runtime schema field or registry write is introduced. Projects/MCP adoption of this
producer graph is separate work; do not send it as an existing tool argument. Readiness
requires observed successful deps at the intended project commit SHA after kit materialization;
a returned kit or a present `platform.json` alone proves neither installation nor readiness.
