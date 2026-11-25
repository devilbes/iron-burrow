# apps tools: descriptions (verbatim, from the MCP tool definitions on server manyplay-apps; captured 2026-11-25)

## apps.metadata.update

RFC 7396 merge-patch for unified application metadata: common (localized name/texts, GAME_* category, contact, privacyUrl, targetAudience, icon512), android (applicationId, versionName, project branding, orientation, containsAds, Google Play listing/rating/compliance) and ios (App Store listing/rating). Also supports showInCatalog, webUrl, portal (locales and variants including how-to-play/tips guides), covers (HTTPS URLs and localized alt) screenshots (HTTPS URL, localized alt, unique nonnegative order; up to ten) and genre. Portal locale objects merge without losing other locales; variants/covers/screenshots arrays replace. Projects validates final SEO content, word counts and cover alt coverage. Omission preserves, null removes, arrays replace; false is preserved. Uses apps.metadata.write and live owner permission. version is sent as quoted If-Match. dryRun validates without mutation or revision change. Replies include metadata, version, readiness {gp,ios}. On a version conflict or unknown outcome read back; never retry automatically. SDK composition uses sdk.modules.set; appId comes only from the verified key.

## apps.icon.update

Set or remove (null) the game icon reference of the key application in dev/test. First upload a 512x512 PNG (at most 1 MiB) to assets/icons/app-icon.png through projects.tree, projects.upload.begin, PUT the exact bytes to the returned temporary URL, then projects.upload.complete; requires projects.read and projects.files.write. Only after a successful commit, read apps.info and pass icon512 with its current version. No CDN key, URL or migration. version is sent as If-Match (CAS); on 409 PNL_METADATA_VERSION_CONFLICT or unknown outcome read apps.info, never retry automatically. Returns {metadata:{common:{icon512}},version}. appId comes only from the verified key; the same relative path refers to each application own project. Needs apps.metadata.write and the key owner current panel permission.

inputSchema:

```json
{"type":"object","properties":{"version":{"type":"integer","minimum":1,"maximum":9007199254740991,"description":"Current metadata revision from apps.info; stale versions conflict."},"icon512":{"anyOf":[{"type":"string","maxLength":256,"pattern":"^assets\\/[A-Za-z0-9_./ -]+\\.png$(?![\\s\\S])"},{"type":"null"}],"description":"Committed PNG path under assets/, for example assets/icons/app-icon.png; null clears the reference without deleting the file."}},"required":["version","icon512"],"additionalProperties":false}
```

## apps.portal.readiness

Read the key application listing readiness from panel: {ready, checks:[{id,ok,field,hint}], missing}. Checks cover publicationState, published, test=false, a safe HTTPS web/store link, cover, icon, screenshots, genre, description and portal SEO. Follow each panel hint using apps.metadata.update, apps.catalog.update or assets.upload; read back readiness and apps.catalog.get after corrections. MCP forwards diagnostics without computing listing rules or writing. No application/environment selector, tokens or internal panel methods. Enabled by the portal environment manifest in dev/test; requires the panel#2663 receiver.

inputSchema: `{"type":"object","properties":{},"additionalProperties":false}`
