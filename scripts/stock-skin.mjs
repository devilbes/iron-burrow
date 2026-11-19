// Where the SDK in vendor/ keeps the stock ManyPlay skin: in the kit (`@manygamescorp/ui-kit`
// exports `./skins/manyplay/theme`; icons in three lossless WebP atlases) or, in older SDKs, in
// the `@manygamescorp/skin-manyplay` package (one PNG atlas). Chosen by what the vendored package
// exports, the way src/shell/manyplay.ts chooses through the import map — no SDK version named.
import { existsSync, readFileSync } from 'node:fs';

const PLACES = [
  { pkg: 'ui-kit', subpath: '/skins/manyplay', assets: 'dist/skins/manyplay/assets.js' },
  { pkg: 'skin-manyplay', subpath: '', assets: 'dist/assets.js' },
];

/**
 * The stock skin of vendor/ under `root`: `{ name, theme, tokens, assets }` — import specifiers
 * of the theme and the tokens, file URL of the module with MANYPLAY_ICON_ASSETS; undefined without
 * an SDK.
 */
export function stockSkin(root = new URL('../', import.meta.url)) {
  for (const { pkg, subpath, assets } of PLACES) {
    const dir = new URL(`vendor/@manygamescorp/${pkg}/`, root);
    const manifest = new URL('package.json', dir);
    if (!existsSync(manifest)) continue;
    const { exports } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (!exports?.[`.${subpath}/theme`]) continue;
    const name = `@manygamescorp/${pkg}${subpath}`;
    return { name, theme: `${name}/theme`, tokens: `${name}/tokens`, assets: new URL(assets, dir) };
  }
  return undefined;
}

/** MANYPLAY_ICON_ASSETS of the stock skin (icon key → `atlas#sprite=x,y,w,h,W,H`); undefined without an SDK. */
export async function stockIcons(root) {
  const skin = stockSkin(root);
  return skin && existsSync(skin.assets) ? (await import(skin.assets.href)).MANYPLAY_ICON_ASSETS : undefined;
}
