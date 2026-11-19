import type { Skin } from '@manygamescorp/ui-kit/skin';

/**
 * The stock ManyPlay skin, wherever the project's SDK keeps it: in the kit
 * (`@manygamescorp/ui-kit/skins/manyplay/*`) or, in older SDKs, in the `@manygamescorp/skin-manyplay`
 * package. The first place the import map of the build (vendor/) resolves is loaded — no SDK
 * version is named; scripts/stock-skin.mjs picks the same place for the offline scripts.
 * Types are local: only one of the two packages is in vendor/.
 */
export interface ManyplayFonts { url?: string }

const PLACES = [
  { name: '@manygamescorp/ui-kit/skins/manyplay', pkg: '@manygamescorp/ui-kit', fonts: './dist/skin-bundles/manyplay/fonts/' },
  { name: '@manygamescorp/skin-manyplay', pkg: '@manygamescorp/skin-manyplay', fonts: './dist/fonts/' },
] as const;

const resolve = (specifier: string): string | undefined => {
  try {
    return (import.meta as ImportMeta & { resolve?: (specifier: string) => string }).resolve?.(specifier);
  } catch { return undefined; }
};

/** The place of the import map; without `import.meta.resolve` the first one that loads. */
async function load(): Promise<{ place: (typeof PLACES)[number]; theme: Record<string, unknown>; tokens: Record<string, unknown> }> {
  const canResolve = typeof (import.meta as ImportMeta & { resolve?: unknown }).resolve === 'function';
  let failure: unknown;
  for (const place of PLACES) {
    if (canResolve && !resolve(`${place.name}/theme`)) continue;
    const [theme, tokens] = [`${place.name}/theme`, `${place.name}/tokens`];
    try {
      return { place, theme: await import(theme) as Record<string, unknown>, tokens: await import(tokens) as Record<string, unknown> };
    } catch (error) {
      if (canResolve) throw error;
      failure = error;
    }
  }
  throw failure ?? new Error('ManyPlay skin: neither @manygamescorp/ui-kit/skins/manyplay nor @manygamescorp/skin-manyplay is in the import map');
}

const STOCK = await load();

export const manyplaySkin = STOCK.theme['manyplaySkin'] as (fonts?: ManyplayFonts) => Skin;
export const MANYPLAY_CSS = STOCK.tokens['MANYPLAY_CSS'] as string;
export const manyplayFontFaces = STOCK.tokens['manyplayFontFaces'] as (fonts?: ManyplayFonts) => string;

/** Fonts of the ManyPlay skin next to the package of the skin, resolved through the import map. */
export function manyplayFontsUrl(): string | undefined {
  const pkg = resolve(`${STOCK.place.pkg}/package.json`);
  return pkg ? new URL(STOCK.place.fonts, pkg).href : undefined;
}
