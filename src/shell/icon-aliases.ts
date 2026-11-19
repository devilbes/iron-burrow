/**
 * The ManyPlay icon set draws `star` as a gift box; the top bar shows the player level with it
 * (profile-pack, `icon: 'star'`), which reads as a currency. The game points `star` at the set's
 * own rating star.
 */
export const ICON_ALIASES: Readonly<Record<string, string>> = { 'icon-star': 'icon-rating-star' };

/** A picture of `ITEMS`/`OFFERS` (src/skin/art.ts) that is a kit icon of the skin, not a file. */
export const ICON_REF = 'icon:';

/** Skin asset of an item picture: the kit draws `icon-<key>` for an item by its id (shop, reward). */
export const itemAsset = (id: string): string => `icon-${id}`;
/** Skin asset of an offer picture: the kit's offer card looks for `offer-<offer key>`. */
export const offerAsset = (key: string): string => `offer-${key}`;

/**
 * Item and offer pictures as skin assets: files go in as they are, `icon:<key>` pictures become
 * aliases of `icon-<key>`; an offer picture is also the icon `offer-<key>` (its HUD tile). The top bar capsule of the soft currency is drawn by the kit with
 * `icon-coins` whatever the item: an own file of `currency` is that picture too.
 */
export function itemArt(items: Readonly<Record<string, string>>, offers: Readonly<Record<string, string>>,
  currency: string): { files: Record<string, string>; aliases: Record<string, string> } {
  const files: Record<string, string> = {};
  const aliases: Record<string, string> = {};
  const put = (key: string, value: string): void => {
    if (value.startsWith(ICON_REF)) aliases[key] = `icon-${value.slice(ICON_REF.length)}`;
    else files[key] = value;
  };
  for (const [id, value] of Object.entries(items)) put(itemAsset(id), value);
  for (const [key, value] of Object.entries(offers)) {
    put(offerAsset(key), value);
    // The same picture as an icon (`icon-offer-<key>`): the HUD tile of the offer (shell/hud.ts).
    aliases[`icon-${offerAsset(key)}`] = value.startsWith(ICON_REF) ? `icon-${value.slice(ICON_REF.length)}` : offerAsset(key);
  }
  const coin = items[currency];
  if (coin && !coin.startsWith(ICON_REF)) aliases['icon-coins'] = itemAsset(currency);
  return { files, aliases };
}

/** `#sprite=…` of an asset URL ('' for a single file). */
const sprite = (url: string | undefined): string => url?.replace(/^[^#]*/, '') ?? '';

/**
 * Assets the game skin sets over stock: its own (src/skin/art.ts) and the aliases, which show
 * the game's picture of their source. An own entry for an alias key cancels the alias only when
 * it is a picture of its own: the stock crop repainted (the recolored atlas) does not. Item
 * aliases (`extra`, from `itemArt`) never replace an own entry of their key.
 */
export function gameAssets(stock: Readonly<Record<string, string>>,
  own: Readonly<Record<string, string>>, extra: Readonly<Record<string, string>> = {}): Record<string, string> {
  const assets: Record<string, string> = { ...own };
  for (const [key, source] of Object.entries(ICON_ALIASES)) {
    if (own[key] && sprite(own[key]) !== sprite(stock[key])) continue;
    const url = own[source] ?? stock[source];
    if (url) assets[key] = url;
  }
  for (const [key, source] of Object.entries(extra)) {
    if (own[key]) continue;
    const url = assets[source] ?? stock[source];
    if (url) assets[key] = url;
  }
  return assets;
}
