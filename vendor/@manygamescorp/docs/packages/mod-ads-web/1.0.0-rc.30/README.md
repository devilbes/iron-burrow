# @manygamescorp/mod-ads-web

`sdk.ads` (architecture: client-sdk/modules/ads.md, services/ads/config.md, E95): a mediator
adapter port, the ad pool with rotation by price, a synchronous `isAvailable` decision on the
player's configs and limits, and the rewarded offer cycle over `sdk.iap` (order → show with
`customData = o1:{orderId}` → claim/cancel → `inventory.refresh()`). Uses only core; no third party
runtime dependencies. Subpaths: `./ads` (module), `./fake` (fake mediator, dev/test builds).

## Quickstart

```ts
import { createSdk } from '@manygamescorp/core/kernel';
import { adsModule, type AdsNamespace } from '@manygamescorp/mod-ads-web/ads';
import { applovinMax } from '@manygamescorp/platform-cordova/applovin-max';

// iap and inventory are required statically (E95 п. 6): createSdk without them —
// MODULE_DEPENDENCY_FAILED.
const sdk = createSdk({ platformConfig, http: { appVersion: '1.0.0' },
  modules: [iapModule(), inventoryModule(),
    adsModule({ adapters: { applovin_max: () => applovinMax() } })],
}) as ReturnType<typeof createSdk> & { ads: AdsNamespace };
await sdk.boot(); // ads init runs in the background and never delays boot

const decision = sdk.ads.isAvailable('shop'); // sync, no network
if (decision.available) {
  const result = await sdk.ads.show(decision);
  if (result.reward === 'granted') { /* the reward is in inventory: show success */ }
}
```

## Configs it reads

`ads.settings.units` (sdkKey, units per platform), `ads.settings.mediation` (`adapter`, pools and
groups per platform `android`/`ios`/`web`, `rotation.refillDelaySec`, `rotation.retry`,
`verboseLogging`, `testDeviceAdvertisingIds`, `consent.privacyPolicyUrl`,
`consent.termsOfServiceUrl`), `ads.settings.limits` (per-format limits, `unlock`, `delays`,
`externalCooldownSec`, `advance.max`), `ads.placements` (format, pool, group, offers, limits,
fallback), `game.placements` (domain `ads`), `iap.offers` (`kind: ad`). All are resolved by
`sdk.configs` on the player's context (E94); a new snapshot or context change resolves them again
(after a show in flight).

## Decision (`isAvailable`)

Steps: `not_initialized` (adapter not ready or the placement's pool had no load attempt) →
`disabled` (not in `game.placements`/`ads.placements`, disabled placement or format, unknown pool)
→ `locked` (`unlock`, `afterSessionStartSec`, `afterInstallSec`) → `limit_placement` →
`limit_format` (per format, plus `externalCooldownSec` of interstitial) → `no_offer` (rewarded
formats need an available `kind: ad` offer; interstitial/app_open/banner take none) → `advance_exhausted`
(`$ads.advanceOutstanding ≥ advance.max`) → `no_fill` (no loaded unit) → `fallback` (≤ 3, no
cycles; a refusal carries the requested placement's reason). Counters are kept per format,
placement and offer under the gid (session in memory, rolling hour/day windows, totals).

## Mediators

`MediatorAdapter` (`init`, `load`, `price`, `show(unitKey, {customData})`, optional `hide`, events
`loaded|loadFailed|shown|showFailed|rewarded|hidden|revenue`). The adapter id comes from
`ads.settings.mediation.adapter` or the build flag `adsModule({ adapter })`; adapters are given to
`adsModule({ adapters })` or `sdk.ads.registerAdapter`. `applovin_max` is the Cordova bridge in
`@manygamescorp/platform-cordova/applovin-max` (the native plugin part is a separate task).

`createFakeAdapter()` (`./fake`) answers like a mediator for every format: rewarded and
rewarded_interstitial — a full-screen «Реклама» window with a timer until the reward;
interstitial and app_open — the same window, closable after a short timer; banner — a configured Test banner
(`hideBanner`). The fake id is refused in a production build, and `setMockConfig` exists only
outside one.

## Windows

Permission `windows`. The module draws nothing: it registers the named windows `ad-slot`,
`bonus` and `lives` (ui-kit components `promoSlot`, `promoBonus`, `promoLives` in `@manygamescorp/ui-kit/services/cross-promo`) with
`ctx.windows.register`. A window is opened only by the SDK window queue
(`sdk.ui.open('ads:ad-slot', params)` or a config trigger); the queue calls the window, which emits
`ads:window:open` `{ name, placement }` for the host's ui-kit to present. The module never opens a
window directly. These canonical ui-kit ids also define the public `name` in
`ads:window:open`; old window ids have no aliases and must be replaced in callers and triggers.
«Видео недоступно» is the standard ui-kit error window (`ui.error`).

## Kill and server answers

An order whose show never started is recorded under the gid before the show and cancelled
`not_shown` on the next start (`sdk:core:ready`). A shown, not rewarded ad is cancelled
`not_rewarded`. The reward is `granted` only by the iap claim or a polled order; no answer —
`pending`, the client changes no balance.


Banner visibility also follows sticky `sdk:ui:fullscreen-changed`: the host presenter uses
`sdk.uiState.setFullscreenPopup`. Popup, lifecycle and fullscreen-ad pauses are combined,
so finishing one never resumes a banner while another remains active.
MAX waits for `OnBannerAdLoadedEvent`, forwards position, background and refresh parameters,
and hides pending/visible views on abort. Stock Cordova MAX uses native phone/tablet views
(50/90 dp); `leader` requires width ≥728 dp and a native tablet view, otherwise standard.
A native bridge extension can supply `bannerHeight` for measured adaptive geometry. Actual
native adaptive sizing and device verification remain part of the native-shell work from
#148; unit tests verify bridge calls and cancellation, not device fill. The separate `./fake`
entry is absent from the production `./ads` import graph (tested transitively).

## MAX native startup

Pass the build's key as `applovinMax({ sdkKey: nativeBuildSdkKey })`. The nonempty key
in `ads.settings.units.main.sdkKey` takes precedence. Missing both keys rejects init
before the native plugin is called. Keys come from configuration/build inputs.

For D-KIDS use `adsModule({ kids: true, ... })`: no mediator is constructed or initialized,
including explicit `sdk.ads.init()` retries. This is a build flag, never a player fact.
For a native shell, provide `adsModule({ consent: async () => { ... }, ... })`; the shell
must complete CMP (GDPR) then ATT before resolving `{ hasUserConsent, region }`.
A rejection prevents MAX init. Without this hook, the module reads the existing
`consent.ads`/`consent.region` facts; the host must have completed consent before boot.
Alternatively configure the automated MAX UMP/ATT flow below. The bridge applies external
binary consent before `initialize`.

Mediator adapters implement `setUserId(string)` as well as `init`: active session gid
is applied before fullscreen shows and banner appearances, and on context refresh;
an absent gid clears the previous user id. Rewarded CUSTOM_DATA stays `o1:{orderId}`.
Both rewarded formats use the same server-authoritative claim/polled-order cycle.
The pinned Cordova MAX plugin does not expose `rewarded_interstitial`; that format
is covered with the fake mediator and fails explicitly on the stock native bridge.
Live MAX keys and device smoke are separate acceptance work (#378).

## MAX consent and five-format port (#1021)

`AdFormat` includes `rewarded`, `rewarded_interstitial`, `interstitial`, `app_open`, `banner`.
Use `show` for the four fullscreen formats and `showBanner`/`hideBanner` for banners.
App open is explicitly requested by the game (`show('app_resume')`), with no automatic
lifecycle show. Configure its units/pool with `format: 'app_open'` and limits in
`ads.settings.limits.main.formats.app_open` plus the placement's own limits. It never creates
an IAP order. Rewarded formats keep the existing order/SSV cycle.

For automated Google UMP, install both patches in `native/applovin-max` and configure:

```json
{
  "consent": {
    "privacyPolicyUrl": "https://your-game.test/privacy",
    "termsOfServiceUrl": "https://your-game.test/terms"
  },
  "testDeviceAdvertisingIds": ["test-device-id"],
  "verboseLogging": false
}
```

These fields belong to `ads.settings.mediation.main`; the native UMP SDK and published AdMob
message must also be configured as described in the native README. Only HTTPS policy URLs
without embedded credentials are accepted. The test-device list is deduplicated and bounded
at 32 ids (letters, digits, `_`, `-`, up to 64 characters). Production passes no test devices
and disables verbose logging. Changing these startup settings requires a fresh application process.
Existing ManyPlay `ads.settings.mediation.{list,get,create,update}` MCP methods manage the
mediation scope under ads RBAC/app-key scopes; direct `configs.*` writes to `ads.*` are forbidden.
Server schema support for app_open and the new mediation fields must be released by the ads
epic before authoring these settings. No new SDK management endpoint is introduced.

`adsModule({ consent })` remains the port for a shell that completes its own CMP then ATT;
it may return `ageRestricted` and `doNotSell`. An explicit unresolved state (`canRequestAds:
false`) or age restriction prevents mediator initialization. MAX 13.2 has no child-directed
API; an age restricted user is blocked, rather than silently initialized as an adult.

With automated UMP, the MAX initialization callback must report `canRequestAds: true`.
A user declining personalization can still receive contextual ads when UMP permits requests.
Unknown consent without a configured CMP is rejected. `sdk.ads.consentState()` returns the
last resolved state; `sdk.ads.showPrivacyOptions()` opens MAX's existing-user CMP flow.
Concurrent calls share one form, loaded pools are discarded, banners are hidden and new
requests/shows remain blocked until success. Failure keeps ads blocked; retry the form.
Privacy options cannot start during a fullscreen show. On module stop, late completion cannot
restart pools. Errors expose SDKError codes, never raw native messages or consent strings.

Events: `consent:state:changed` (ConsentState), `consent:form:required`
(`{source: 'privacy_options'}`), `consent:form:failed` (`{code}`). These module events do not
write core-owned `consent.*` facts; the external consent owner maintains those facts.

The adapter port can call distinct `loadRewardedInterstitialAd`/`showRewardedInterstitialAd`
methods supplied by a native host. The pinned stock MAX 13.2 SDK has no public rewarded
interstitial ad class, so the supplied native extension supports four formats and this fifth
format rejects `SDK_PLATFORM_UNSUPPORTED`. It is never substituted with rewarded demand.
Mock tests verify the fifth-format port, not native support. Android/iOS test-ad evidence and
any native SDK choice for that format remain with the epic's device acceptance task.

## Native build dependencies (#1255)

Native builders read versioned plugin peers from package.json, not runtime manifests.
This web package declares no native plugin dependencies. Native builds select
`@manygamescorp/mod-ads-mobile`, which declares MAX 2.1.0 and consent 3.0.3.
APPLOVIN_SDK_KEY and UMP settings come from trusted build integrations;
plugin.xml owns Android permissions. Device acceptance remains a separate task.

## Targets (#1255)

This package registers target `web`. Native builds use `@manygamescorp/mod-ads-mobile/ads`
with target `cordova` and versioned native plugin peers. Both entries reuse this package's
mediator runtime and expose the same `sdk.ads` API; select exactly one entry per build.

## Authoring in dev/test (owner decision, 24.10)

Enable SDK modules with ManyPlay MCP `sdk.modules.set`; configure provider units with
`ads.units.upsert` and the documented ads tools after checking tool availability.
Use dryRun where supported, apply and read back the result. Direct Panel/Mongo writes
and platform.json edits are not an activation workflow; the latter is generated runtime
input. Addresses come from env and limits from configs. Native `ads.*` config schemas
are registered by their owning service at startup through `configs.schema.register`
(configs#485); never create/edit a config without its schema.

## Independent package consumption

Ads uses the host's single core instance through the required npm peer
`@manygamescorp/core`. The current verified ABI is pinned to the core version set in `peerDependencies`;
this is a compatibility pin, not the ads package's own version. Broader compatibility
must be backed by consumer tests before changing the peer. Do not bypass peer conflicts
with `--force` or `--legacy-peer-deps`.

Select exactly one ads entry for the build target. Install/register real IAP and inventory
modules explicitly: `requires: { iap: '^1.0.0', inventory: '^1.0.0' }` describes runtime
capabilities, not bundled npm implementations. They are mandatory even if the current
config only shows interstitials. UI Kit and skins are selected separately; ads draws nothing.
A base consumer that omits ads has no ads package, vendor files or import-map entries.

The Cordova package depends on this package's public `definition` and `fake` entries;
it reuses the implementation and does not register the web ads entry. Keep the shared
package dependency explicit when releasing mobile with its own version. Native plugin
pins belong to the mobile package.json; they are not JavaScript runtime imports.

`test/ads-packaging.test.mjs` packs real built files into local tarballs with deliberately
independent fixture versions, installs them offline, checks the public TypeScript ABI,
capability failures and singleton identity, and builds vendor files/import maps through
`buildVendorArtifact`. It does not publish, change release versions, or implement the
future independent-version producer/catalog. Run after `npm run build`:
`npx vitest run test/ads-packaging.test.mjs`.
