# Graphic references (client-sdk#1235)

All configured artwork is an `AssetRef` from
`@manygamescorp/contracts-client/asset-ref`. Bare paths, `skin/…` and old module
image file records are rejected; there is no migration or dual read.

| Reference | Meaning | Rendering |
| --- | --- | --- |
| `skin:chest_gold` | Key of the active game/mechanic/scope skin | Skin artwork, including atlas sprites; follows skin changes |
| `asset:<id>` | Uploaded application image | Lazy image, unchanged by the resolver |
| `https://…` | Environment-approved external image | Same as uploaded image |

The exported `asset-ref.schema.json` uses `format: "asset-ref"`, `pattern` and a
2048-character limit. `isAssetRef` additionally checks canonical HTTPS URLs.
Configs and ManyPlay MCP adoption belongs to
[manygamescorp/configs#487](https://github.com/manygamescorp/configs/issues/487).
Syntax validation alone does not authorize an external host or an asset's appId.

```ts
const sdk = createSdk({ modules, platformConfig });
// platformConfig.assets = { cdnBase, allowedHosts } comes from the environment.
const ref = `asset:${uploaded.key}` as const;
AssetImage.mount(container, {
  ref, alt: 'Chest', width: 48, height: 48,
  assetUrl: sdk.assets.resolve,
});
// Existing components use the same adapter:
chestsWindow.mount(container, { ...props, assetUrl: sdk.assets.resolve,
  chests: [{ id: 'gold', title: 'Gold', tone: 'bronze', status: 'ready',
    icon: 'skin:chest_gold' }] });
```

`AssetImage` and `assetImageView` are exported from `@manygamescorp/ui-kit/asset-image`.
The kit resolves skin keys locally and delegates full `asset:`/`https:` references
to its `assetUrl` port. Bind it to `sdk.assets.resolve`, or an application catalog
adapter that enforces the same reference and host validation. A custom ID catalog
can use core `resolveAssetRef(ref, { assetUrl: id => catalogUrl(id), allowedHosts })`;
it returns `{kind, url}` or `undefined`. The callback receives the ID without
`asset:`. Components receive the full reference.

The current upload API returns `{key,…}`, so the default `sdk.assets.resolve`
uses that canonical E136 key as `<id>`:
`asset:apps/<appId>/<kind>/<sha256>.<ext>`. It performs no lookup by Mongo ID and
never guesses a CDN path for an unknown ID. The low-level `sdk.assets.url(key)`
remains for storage keys in skin manifests, fonts and CSS; it does not accept
AssetRefs. It is not the UI image port.

`platform.json.assets.cdnBase` is required and is the environment's public application-assets
base, separate from module `cdn`. HTTPS is required; loopback HTTP is allowed for
local development. `assets.allowedHosts` is an optional array of at most 32 exact
lowercase `host[:port]` values for direct HTTPS references. No wildcard, suffix
matching, credentials or implicit module-CDN fallback. The SDK copies this policy
when constructed. Public cross-app storage keys remain permitted by E99; upload
writers and catalogs enforce app ownership and existence, not this pure resolver.

Skins can declare `assetVariants: { chest_gold: [{url, locale?: 'en', density?: 2}] }`.
URLs resolve against the skin base, just like `assets`. Selection tries exact
locale, language and neutral, then the smallest density at least as large as the
screen (or the largest available). No filename guessing. `lang`/`density` props
can override selection; otherwise density comes from `devicePixelRatio`.
The ordinary `assets` entry is the final fallback. Scope layers and locked MPID
layers use the same lookup; locked layers never inherit game art.
Without an applicable page skin, `skin:` references show the neutral placeholder.
ManyPlay artwork requires its explicit `@manygamescorp/skin-manyplay` bundle. The public
`chest_gold` key is part of the atlas map and shares its reward-chest crop.

The `assets` block and its `cdnBase` field are required in every `platform.json`,
including builds with ui-kit. A missing or invalid base synchronously raises
`SDK_PLATFORM_CONFIG_INVALID` before modules start or perform I/O. The host supplies
this base through environment configuration; the game has no default CDN/API URLs.
Direct HTTPS references require exact lowercase `assets.allowedHosts` entries;
module CDN membership alone does not authorize them. The host CSP must allow the
same image origins, and policy changes require rebuilding the CSP.

Unknown schemes, unavailable skin keys, resolver failures and image load errors
show a placeholder. `dev: true` enables the redacted `UI_ASSET_REF_INVALID`
warning; otherwise automatic warnings are limited to loopback development hosts.
The warning never includes the reference, URL or exception text. Uploaded images
are lazy, use asynchronous decoding and do not receive any tint from the adapter.

Module settings of type `image` now store `AssetRef | null`; runtime passes the
reference unchanged to the module. Upload MIME/size constraints remain editor and
writer checks, not proof attached to the reference. Preview accepts references
and limits external HTTPS to its environment origin; data/blob image bypasses
are removed.

The showcase's existing `demo.inventory/main.chests.<key>.icon` field accepts an
AssetRef. Both built-in skins declare `chest_gold`. Set it to `skin:chest_gold` or
to `asset:${uploaded.key}` to exercise the same window with either skin. No live
upload, deployment or CDN object is fabricated by the SDK tests.

Demo builds require `SDK_DEMO_ASSETS_CDN_URL` and accept optional comma-separated
`SDK_DEMO_ASSET_HOSTS`. Both are environment values; no host is hardcoded.
Demo/showcase CSP adds those exact HTTPS origins to `img-src` only, without
expanding script privileges. The deployed host must regenerate its CSP when
this configuration changes.

The schema and pinned vectors are byte-identical to configs#499
(`6f7b4e7a224771d94aa593221a281509ba489000`), reused from client-sdk#1410.
The 2048-character limit is checked before regex evaluation; portable syntax
validation never grants host authorization or ownership.
