# Skin bundles

Owner decisions of 24 October, client-sdk#1223. The public API lives in
`@manygamescorp/ui-kit/skin`; modules continue to provide data and actions through
ordinary UI kit components. No module inspects a skin. See [the key registry](skin-keys.md).
`@manygamescorp/ui-kit/skin.schema.json` describes skin.json for editors;
`parseSkinBundle(unknown)` also enforces registered keys and runtime typography rules.

A build-selected module.json has `kind: "skin"`, a version and
`compat: { "ui-kit": "<SDK semver range>" }`. `loadSkinBundle(ref, options)` receives
this metadata with its immutable CDN folder `baseURL` and the actual `uiKitVersion`.
It does not execute the module entry. The required `satisfies` port receives the existing SDK semver predicate
(`contracts-client/module-composition`), keeping the UI kit independent of the SDK.
The normal SDK `resolveSdk` step selects
versions; the optional `resolve(id)` port supplies already selected parent refs.
There is no additional catalog or public scope-layer model.

```json
{
  "id": "paper",
  "version": "1.0.0",
  "kind": "skin",
  "extends": "neutral",
  "compat": { "ui-kit": "^1.0.0" },
  "tokens": { "--mp-text": "#222" },
  "fonts": [{ "family": "Paper", "url": "fonts/paper.woff2" }],
  "displayTitle": { "arc": 0 },
  "closePosition": "head-right",
  "overrides": {
    "window:ui.popup:main": { "component": "popup", "template": "templates/popup.json" },
    "component:popup": "css/popup.css",
    "icon:icon-close": "icons/close.svg",
    "slot:ui.popup:main:content": "css/content.css"
  },
  "locales": { "en": "l10n/en.json" },
  "integrity": "integrity.json"
}
```

The module id is `paper`, `skin-paper` or `ui.skin.paper`; it must match the bundle's
short id. Versions and compatibility strings must agree in module.json and skin.json.
If module.json declares `ui.windows`, window overrides must belong to that selection.
A window binds its public key to a component export; one bundle cannot bind two
windows to the same export. Component CSS targets the named component. Slot CSS is
nested inside `[data-skin-slot="<slot>"]` in that window's component and requires
a window override in the same bundle. `component:shell` targets the document stylesheet. Icon/asset values are relative
resource paths. PNG icons/assets may append a decorative
`#sprite=x,y,width,height,atlasWidth,atlasHeight` fragment. Coordinates are canonical
nonnegative integers; dimensions are positive, the crop must fit the declared atlas,
and atlas dimensions are at most 32768. Only the fragment-free PNG is fetched and
hashed. Other fragments remain invalid, including CSS URL fragments.
All token and override keys must exist in skin-keys.json. Locked ManyPlay ID components
keep their fixed presentation and do not take bundle templates or CSS (E174).

The normal template is JSON: `{ "mode": "centered", "slots": ["actions", "content"] }`.
Mode can also be `fullscreen`. Slots keep their module-owned descriptors, values and
handlers; unlisted content stays visible. Popup and shop expose the registered slots.
For an exceptional complete composition, use a structural JSON `layout`:

```json
{
  "mode": "centered",
  "layout": {
    "tag": "article", "class": "paper-layout",
    "children": [{ "slot": "title" }, { "slot": "content" }, { "slot": "actions" }]
  }
}
```

The renderer moves existing slot descriptors into this layout inside the accessible
dialog frame. It retains the dialog's focus/Escape handlers, close controls and any
unmentioned module content. Layout nodes allow only div/section/article/header/footer/
aside/main, classes and children. Placeholders must be registered slots, cannot repeat,
and cannot supply data or actions. At most 128 nodes and eight nesting levels are
accepted. Raw HTML, scripts, inline styles and handlers are not accepted. The layout
supports a complete visual composition through structure and component CSS while
retaining the UI kit's accessible dialog container.

`integrity.json` is a flat relative-path → lowercase SHA-256 hex map. It covers
skin.json and **every** payload (including unused files), excluding integrity.json
itself. Every referenced file must be present. The loader verifies downloaded bytes
before applying anything. This detects corruption; it is not a signature or an
independent trust anchor. Resource URLs must be immutable because the browser later
loads images/fonts from those same URLs. There is no SRI/blob/script execution path.

Bundle base URLs require HTTPS. All paths stay inside the folder, without encoding, query or traversal; only the explicit PNG asset crop above allows a fragment.
Requests omit credentials and reject redirects. PNG payloads are limited to 2 MiB,
other responses to 1 MiB,
the entire extends chain to 8 MiB, each integrity map to 128 files, and inheritance
to eight bundles without cycles. The default timeout is 5 s (configurable up to 30 s).
CSS imports, font-face declarations outside `fonts`, escapes and image-set are refused;
CSS url() is tokenized with quoted strings, parentheses and whitespace checked; malformed tokens are refused. URLs can only reference verified files. Optional tokens.css is applied to the
component roots and document; fonts and locale dictionaries are verified too.
Locale dictionaries remain presentation resources: business texts come from module
props/l10n, and loading a bundle does not replace SDK localization dictionaries.

`applySkinBundle(ref | undefined, options)` verifies and preloads the assets, then
publishes one game skin using the existing layer mechanism. Inheritance is folded
in order **neutral → extends → bundle**; tokens, assets and windows override their
parent, while CSS/fonts follow that order. There are no observable intermediate
parent layers. Mounted components redraw, future mounts take the same presentation,
and the returned handle removes the skin. The chain starts at neutral and
does not inherit unrelated mechanic presentation. A superseded application cannot overwrite
a newer selection; an externally aborted session never installs a late fallback.

A missing, incompatible, corrupt or undecodable bundle installs an explicit neutral
skin, suppressing implicit ManyPlay presentation. The loader calls
`diagnostic('sdk:ui:skin-fallback', { skin, fallback: 'neutral', code: 'UI_SKIN_MISSING' })`;
connect this port to the SDK event bus. Development additionally warns with
`UI_SKIN_MISSING`; production stays silent. Missing icon/asset keys use the neutral empty
slot and emit the same diagnostic with `key` once per key (bounded to 128).
Diagnostics contain no URLs, resource bodies or underlying exceptions. CI coverage
for complete skins is a subsequent task; append-only registry checks already run.

Validation: skin-bundle.test.ts covers schema, integrity, compatibility, inheritance,
slots, intents, neutral fallback, diagnostics, cancellation, timeout and overlapping
applications. skin.test.ts also checks existing/future mounted components and updates.

The browser key table is generated from the maintained registry with
`node scripts/skin-key-runtime.mjs`. `npm run skin-keys:check` also verifies this
generated output; do not edit it manually.


Local producer/loader acceptance is covered by `scripts/skin-manyplay-bundle.test.mjs`
and `packages/skin-manyplay/test/local-bundle.browser.mjs` (#1228, #1423). These use
the real built ManyPlay bundle, not a reauthored fixture. The browser verifies current
reward and popup windows, repeated apply/remove, props/actions, long-list scroll,
compatibility/integrity failures and stylesheet cleanup at 390×844, 844×390 and
1440×900. See [the producer README](../packages/skin-manyplay/README.md).
The build-time skin-coverage schema still differs; this check does not claim its
alignment or live publication.
