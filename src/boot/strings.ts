import record from '../../configs/remote/localization/strings.json' with { type: 'json' };

/**
 * Texts of the game come from one file: the `localization/strings` record as the localization
 * service takes it (configs/remote/localization/strings.json, a tree per locale; `npm run strings`
 * merges it from the parts in configs/remote/localization/strings/). Its base-locale branch is
 * bundled: `shell.*` of the platform wiring and `screen.*` of the game screens are the l10n
 * defaults, so the game has its texts before and without the published record, which overrides
 * them per key and adds other locales.
 */
type Tree = { [key: string]: string | Tree };
export const DEFAULT_LOCALE = 'en';
/** Namespaces of the texts the game's own code asks for; the rest of the record belongs to service records. */
export const CODE_NAMESPACES: readonly string[] = ['shell', 'screen'];
const BASE: Tree = (record as Readonly<Record<string, Tree>>)[DEFAULT_LOCALE] ?? {};

/** `screen.home.play` → the text of the base locale, `undefined` when the record has none. */
function lookup(key: string): string | undefined {
  let node: string | Tree | undefined = BASE;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || !Object.hasOwn(node, segment)) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Registers every default string with the SDK l10n. */
export function registerStrings(l10n: { registerDefaults(ns: string, bundles: Readonly<Record<string, Tree>>): void }): void {
  for (const ns of CODE_NAMESPACES) {
    const tree = BASE[ns];
    if (typeof tree === 'object') l10n.registerDefaults(ns, { [DEFAULT_LOCALE]: tree });
  }
}

/** Text before the SDK exists (loading and startup errors): the defaults with `{name}` filled. */
export function bootText(key: string, params: Readonly<Record<string, string | number>> = {}): string {
  const text = lookup(key) ?? key;
  return text.replace(/\{(\w+)\}/g, (all, name: string) => Object.hasOwn(params, name) ? String(params[name]) : all);
}
