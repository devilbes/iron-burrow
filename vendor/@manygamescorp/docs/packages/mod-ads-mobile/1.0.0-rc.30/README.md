# @manygamescorp/mod-ads-mobile

Cordova implementation of `sdk.ads`, with the same API and module id `ads` as
`@manygamescorp/mod-ads-web/ads`. Import `adsModule` from `./ads` in native builds.
The shared mediator runtime is reused from `mod-ads-web/definition`; only the selected
entry is registered, with target `cordova`. The web entry targets `web`.

Native builders install the versioned MAX and consent peers from package.json.
Optional npm peers are build requirements, not runtime JavaScript imports.
Plugin variables (including APPLOVIN_SDK_KEY) come from build integrations;
plugin.xml owns native permissions. No `cordova` field is published in module.json.
See [the shared API documentation](../mod-ads-web/README.md).

Dev/test authoring follows the [MCP setup rules](../mod-ads-web/README.md#authoring-in-devtest-owner-decision-2410):
`sdk.modules.set`, `ads.units.upsert` and the documented provider tools; platform.json
is generated runtime input, not an activation workflow.

Core is a required peer pinned to the verified ABI (the core version set in `peerDependencies`), shared with the host
and `mod-ads-web`; mobile's own version is independent of that compatibility pin.
The exact dependency on `mod-ads-web` supplies the shared implementation, not a second
registered `ads` service. Explicitly select/register IAP and inventory as described in
[Independent package consumption](../mod-ads-web/README.md#independent-package-consumption).
UI Kit/skins are optional presentation choices. Offline tarball/vendor/ABI fixtures live
in `test/ads-packaging.test.mjs`; native integration/build installation is still the builder's
responsibility and is not exercised by these JavaScript fixtures.
