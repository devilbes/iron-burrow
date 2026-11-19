# E152: module loading and session settings (#505)

[Next-LTS exact package reference and methods lock](sdk-docs-reference.md): base versus
explicit optional package snapshots; offline fixture only, existing runtime/tool contracts unchanged.

The build fixes the module list and the base artifact versions in `platform.json.sdk.modules`.
Each reference has `source: local|remote` and `load: eager|on-demand|lazy|deferred|on-event|on-route`;
configs never add, remove or disable modules. Module selection filters remain removed. Native plugin modules cannot be remote. A required module
(`selection: required`) is `source: local` with the `load` of its module.json; any other lock
entry is refused with SDK_MODULE_INCOMPATIBLE by createSdk (bundled) or before import (loaded),
the same rule as panel's checkModuleComposition. `platform.json.sdk.modulesRevision` (integer
≥ 0, required) records the projects module-record revision the build was made from.

Local definitions supplied to createSdk keep their ordinary hook lifecycle. Unbundled local
modules are read from `<app>/sdk/modules/<id>/<baseVersion>/module.json`, then their declared
entry is imported. `loader.localBase` defaults to the application document directory.
Remote modules use the platform.json CDN. Both validate rights, settings, engines and target/store
before code import. Only remote modules use `sdk/catalog/<core>/remote.json`.

The index is captured once per session (including on-demand modules), read in parallel with
configs and sdk.overrides, with a 3 s default indexTimeoutMs. Online, a timeout, refusal or
malformed index selects the build versions (§11.2); only a network failure (offline) uses the
player's last validated index (§11.4). A 5xx on module.json reuses the cached module.json of
that exact version. Candidate package names must equal the build reference. A candidate
must fit core, adapter, target/store, the dependency versions (selected this session, then the
lock, then the bundle) and the build settings schema.
Failure, including unavailable cached code, retries the immutable build version and emits
`sdk:module:fallback {moduleId,from,to,reason}` without URLs/settings. Each artifact attempt has
its own timeout (15 s by default). Manifests use the app/origin/player loader scope; code uses
browser/WebView HTTP cache. If remote code cannot be loaded, its status is pending-network and
its dependent modules are isolated. The rest of the game starts. A bundled module that requires
a lock module without a bundled definition (remote, or local code from the build directory) waits
for it and is built after it. Neither the index nor overrides fail boot: a logout or another gid
while they load leaves the modules suspended for the next session.

`await sdk.loadModule(id)` initializes/starts any non-eager module and its required closure.
Parallel requests share one task. A failed request is refused for 30 s (core.time) without
network requests, then retried; a broken dependency stays MODULE_DEPENDENCY_FAILED and is not
rebuilt by another module's request. Eager → on-demand requires are a panel/builds dry-run
warning, not a runtime check. Identity change or
destroy cancels outstanding work and clears the in-memory session state. UI Kit declarative
entries and click activation are client-sdk#509; this change does not implement their renderer.

Builds opt into settings overrides with `sdk.overrides: {scope:"panel.sdk.overrides"}`.
The old scope `sdk.overrides` is rejected. After player facts/segments are available, the loader makes one explicit fetch for that scope. OverridesTimeoutMs
is 2 s by default, cancels the request, and uses cached ETag/version records or build defaults on
failure; `sdk:overrides:unavailable` is diagnostic only. This reader does not depend on whether the
server lists a scope as system-owned. The task package calls for ordinary configs.write authoring;
§12.2 of open architecture PR #1897 still calls it system-owned and needs alignment.

The raw multi-mode response is `configs["panel.sdk.overrides"][moduleId] = [{configId,priority,data,
filters?,minVersion?,maxVersion?,conditionals,conditionalsMode:"merge"}]` (an array: several
configs may target one module). configId is a positive integer, the configs record id (configs#299);
extra server fields (version, contentHash, conditional side) are ignored. Scope version is in the usual
`version` map; the HTTP ETag is cached with records, never credentials or signed URLs. Raw records
remain outside the game's resolved config snapshot, so refresh cannot change module settings
mid-session. Images, composite and fractional fields (number, text, reward, list, object) and
`overridable:false` fields cannot be patched; the patch format stays flat boolean/integer/string/null.

`contracts-client/module-settings` exports `validateModuleOverride(schema,data)` and
`applyModuleOverrides(schema,base,overrides,{facts,parameters?})`. The latter returns the usual
valid/errors/value plus applied configIds and ignored `{configId,path,code}` fields. Priority
ascending, then configId ascending: the last valid field wins; null restores the build/default
baseline. minVersion/maxVersion are checked by `versionMatches` (strict semver, inclusive bounds,
CFG-R-08; an unreadable bound or missing app version does not match), the same function configs
use. Record filters and first matching client conditionals use D-MATCH. A record whose patch makes
the result invalid (e.g. it reveals a hidden field with an invalid base value) is rolled back and
reported as ignored. Hidden fields are
checked in overrides and visibility pruning happens after merging. Enum values permit camelCase
for the declared bottomMenu entry. Shared vectors are in module-settings.vectors.json.

Settings and their filter facts/parameters stay fixed for the session, including late on-demand
activation. Diagnostics are `sdk:module:settings {moduleId,overrides:[configId]}` and
`sdk:module:override-ignored {moduleId,configId,path,code}`; neither contains values. Invalid build
settings still isolate the module with SDK_MODULE_SETTINGS_INVALID. Builds copy image files to
`<app>/sdk/modules/<id>/<baseVersion>/settings/<filename>`; ctx.settings contains local URL strings.
Remote upgrades keep the build version's images. No runtime signature verification was added.

Availability (#742, implemented in [#752](https://github.com/manygamescorp/client-sdk/pull/752)):
every service module's settings schema references the shared block
`{ "ref": "availability" }` (`enabled` + `availability`, a standard platform filter with
`$`-facts and `filters.params`, e.g. level/XP, `$install.days`, `$platform`, `$app.version`,
`$segment`, `$ab.<testId>`). Use `AVAILABILITY_REF` or `withAvailability(ownFields)` from
`@manygamescorp/contracts-client/module-settings`; `expandModuleSettingsSchema` resolves the
reference for portable consumers. Defaults are `enabled: true` and `availability: {}`.
The 24-field limit applies after expansion. `filter` is a top-level field type only.
`validateModuleSettings(schema, values, { parameters })` checks facts against the catalog and
project parameters against `filters.params`: unknown names return `OPTION`, mismatched types
return `TYPE`. Without `parameters`, validation checks filter shape only. Runtime matching uses
`matchFilter` with session facts and the parameter registry.

The kernel resolves the block after configs and sdk.overrides and before
activation: with `enabled=false` or a filter that does not match the session facts the module is
not initialized, started or loaded on demand (`loadModule` rejects with MODULE_NOT_ACTIVE, nothing
is published as a failed load), so it shows no HUD or windows. Exceptions: a `selection: required`
module cannot be switched off, and a module required by an active module stays active. A CDN
module's code can be fetched before the block is read (its settings schema is in its module.json).
The existing sdk.overrides reader accepts flat patches: `enabled` is overridable (also by
`$ab.<testId>` record filters); the `availability` object is ignored with NOT_OVERRIDABLE.
This is the tested implementation in #752, not the target A/B contract:
[E173](https://github.com/manygamescorp/architecture/blob/main/docs/architecture/decisions/E173-ab-configs-services-only.md)
requires removing module settings overrides in #749. Do not author new module patches or extend
their format. A/B module targeting uses the availability filter, for example:

```json
{
  "availability": {
    "$or": [
      { "$ab.t1": "A", "level": { "$gte": 3 } },
      { "$ab.t1": "B", "level": { "$gte": 5 } }
    ]
  }
}
```

Here `level` must be registered in `filters.params`; XP is likewise a project parameter (`xp`),
while `$install.days` is a catalog fact. A/B group fact integration is tracked by #748. The
panel filter editor is a separate task and must reuse FilterBuilder from segments and A/B.

`contracts-client/module-composition` exposes SdkTarget web/android/ios and maps native goals to
cordova/google_play or cordova/app_store. `checkModuleComposition` can validate a targets list:
a module needs at least one goal, and each dependency must fit the same build. `resolveSdk` is pure
and takes `(coreVersion, targets, registry)`; it selects published compatible versions. Missing
mandatory UI/build/platform/store packages return SDK_RESOLVE_FAILED. The absent app-store package
keeps iOS unavailable rather than creating a fictitious implementation. UI Kit's broader resolver
and slot placement are #509.

Catalog metadata now uses group from MODULE_GROUPS (id, localized title, order) and ≤8 tags;
catalog.json publishes groups and no categories. Registry publication seeds remote.json but
preserves a valid panel-managed newer index. It never overwrites immutable module artifacts.

Daily rewards uses entry hud (default) or bottomMenu, hudSide left/right (default right),
icon, badge and autoOpen (both true by default). bottomMenu registers in the bottom-menu center,
hud in the chosen HUD side. autoOpen emits the existing calendar open intent once per module
instance on its first start (restarts after a player change do not repeat it); the UI Kit window
queue takes it over in #509.
UI zones/fallback/window queue integration belongs to #509.

MCP integration is tracked by mcp#319: sdk.modules.list/get/set (targets/loading),
sdk.overrides.list/validate, sdk.settings.effective; configs tools author overrides with
configs.write. Image authoring uses sdk.modules.asset_put. Check tools/list before using them;
SDK preparation is not proof of release or live availability. Deployment/publication is through Studio.


## Restored activation modes (#626)

The build chooses the activation policy; settings overrides cannot change it.
`lazy` is an alias of `on-demand`, activated by `await sdk.loadModule(id)`.
`deferred` runs after `sdk:core:ready`, the first animation frame and an idle callback.
Without those browser APIs it uses timers; a 1 s deadline also handles hidden tabs.
Boot does not wait for deferred work.

`on-event` requires `onEvent`, an exact three-segment bus event, for example
`{load: "on-event", onEvent: "game:shop:open"}`. Existing sticky events activate immediately
when the ready session subscribes. An activation event starts the module; that event's payload
is not replayed to the newly installed module. Use `loadModule` before sending a command that
must be handled by it.

`on-route` requires `onRoute`, an exact screen/scene id of 1–128 characters without whitespace
or control characters: `{load: "on-route", onRoute: "shop"}`. The host reports navigation with
`sdk.uiState.setScreen("shop", "scene")` (the existing screen bridge also works). A route reported
before readiness is checked when the session becomes ready. Route changes do not unload modules.

Event names are bounded to 128 characters; wildcards, missing triggers and trigger fields on
unrelated policies are rejected by composition, lock and build parsing. A required module's
policy and trigger stay fixed to module.json. Explicit `loadModule` can activate every non-eager
policy early. Dependencies start first regardless of their own policy. Parallel automatic and
explicit requests share a promise and failures retain the existing 30 s cooldown. Identity change,
rollback and destroy cancel trigger subscriptions and deferred callbacks; the next player's
ready session gets fresh triggers and must report its route again.

Consumer synchronization: panel-web#984 must expose the policies and trigger fields; projects,
panel BFF and MCP receivers must preserve and validate them using the shared composition contract.
This SDK change does not claim those receivers or MCP knowledge have been deployed.

## Вызываемые действия (#956)

С правом `actions` модуль публикует действие в существующем реестре и объявляет
его публичный контракт в `manifest.actions.callable`:

```ts
actions: { callable: {
  minigame: { params: { type: 'object', additionalProperties: false },
    result: 'mechanic-outcome@1' }
} }
// start(ctx):
ctx.actions.publish({ minigame: { kind: 'effect', run: minigame } });
// В вызывающем модуле:
const outcome = await ctx.actions.call('mech-match3', 'minigame', {}, { signal });
```

Цель объявляется в `requires` или `optional`; у `kind: game` — в `sdk.uses`.
`ctx.sdk[id].minigame()` и действие minigame обслуживаются одним кодом механики.
Награду выдаёт механика через `inventory.exchange`; `outcome.reward` — для показа.
`attemptKey(attemptId, sub?)` из `mod-progress/mechanic` даёт UUID ключа inventory:
без sub — исходный id; с sub — первые 16 байт SHA-256(`${attemptId}:${sub}`),
с установленными битами UUID v4/варианта RFC 9562. Без Web Crypto subkey недоступен.

До запуска проверяются params; результат — строгий JSON до 16 KiB и объявленная схема.
Поддерживается ограниченная inline JSON Schema: boolean, type, properties, required,
additionalProperties, items, enum, const, minimum/maximum, minLength/maxLength,
minItems/maxItems, anyOf/oneOf/allOf и описательные title/description/$schema.
Неизвестные ключевые слова отклоняются при defineModule. До 32 действий, имена
`^[a-z][a-z0-9-]{0,63}$`; вложенность схем до 16, размер одной схемы до 32 KiB.
`VALIDATION_FAILED` содержит `details.path` и `safeParams.path` (params… или result).

Вызов по умолчанию ограничен 10 минутами, максимум 30; неверный timeoutMs отклоняется.
Отмена signal, stop любой стороны или смена игрока отменяет ожидание и сигнал цели;
поздний ответ отбрасывается. Механика должна прекращать работу по этому сигналу.
Ошибки цели проходят без замены; кулдаун и игровые исходы возвращаются как resolve.
Коды: SDK_MODULE_NOT_DECLARED, MODULE_NOT_ACTIVE, SDK_ACTION_NOT_CALLABLE,
SDK_MODULE_TIMEOUT, SDK_MODULE_CANCELLED. `MechanicOutcome` и `isMechanicOutcome`
экспортируются из `@manygamescorp/mod-progress/mechanic`.

В `TriggerActionRef` доступно `then: { won: [...], lost: [...], quit: [...],
cooldown: [...], error: [...] }`, ветвь выбирается по result.status. Максимум два
уровня then и 16 ссылок на действия суммарно со всеми ветвями; лимиты глубины цепочки,
частоты и правила продолжают действовать. Без then результат игнорируется.
У действия без callable триггер выполняет эффект, сообщает unknownAction и пропускает ветку.


UI Kit is the required foundation provider of the UI zones; see
[registration, fallback, window queue and preview](../packages/ui-kit/README.md#ui-zones-e152-client-sdk509).
`contracts-client/ui-slots` exports planUiSlots and validateUiSlots; the exported
ui-slots.vectors.json and sdk-resolution.vectors.json are consumer conformance fixtures.
resolveSdk also returns compatible skins, requiring a skin to support every selected target.
The Build Kit Web package ships [mg-build sdk pull](../packages/build-kit-web/README.md#local-sdk-kit).
Skin bundle metadata (`kind: skin`, `compat.ui-kit`, `ui.windows`) and the public
append-only target registry are documented in [skin-keys.md](skin-keys.md).
