// Pictures of the screens. Items and offers: one place — ITEMS / OFFERS of src/skin/art.ts (the
// same pictures the kit windows show); a booster without its entry yet falls back to the game's own
// icon `assets/game/icon_<item id>` of the art step (CONTRACT §7.2). Game art: `assets/game/<id>`.
// Files may still be missing while the art step works: every picture here degrades to nothing
// (the caller keeps the name / number on a plate), never to a broken screen.
import { assetUrl } from '../assets.js';
import { ITEMS, OFFERS } from '../skin/art.js';
import type { BoosterId, OfferKey } from '../modules/game/index.js';
import { view, type ViewNode } from './ui.js';

const skin = (file: string): string => assetUrl(`skin/${file}`);

/** URL of the 2x art of the game (`assets/game/<id>-2x.png`). */
export function gameArt(id: string): string {
  return assetUrl(`game/${id}-2x.png`);
}

/** URL of the picture of an inventory item (booster). */
export function itemArt(id: BoosterId | string): string {
  const file = ITEMS[id];
  if (file && !file.startsWith('icon:')) return skin(file);
  return gameArt(`icon_${id}`);
}

/** URL of the picture of an offer, or null (then the caller shows the first item's picture). */
export function offerArt(key: OfferKey | string): string | null {
  const file = OFFERS[key];
  return file && !file.startsWith('icon:') ? skin(file) : null;
}

/** `<img>` that hides itself when its file is missing. */
export function picture(src: string, alt: string, attrs: Readonly<Record<string, string | number | undefined>> = {}): ViewNode {
  return view('img', { src, alt, decoding: 'async', draggable: 'false', ...attrs,
    onError: (event: Event) => { (event.target as HTMLElement).style.visibility = 'hidden'; } });
}

/** Image cache for the Canvas field: loads once, `get` returns the image when it is ready. */
export class ImageBank {
  private readonly images = new Map<string, HTMLImageElement | null>();

  constructor(private readonly onReady: () => void = () => undefined) {}

  /** The loaded image of `assets/game/<id>-2x.png`, or null (loading or missing). */
  get(id: string): HTMLImageElement | null {
    const known = this.images.get(id);
    if (known !== undefined) return known && known.complete && known.naturalWidth > 0 ? known : null;
    if (typeof Image === 'undefined') { this.images.set(id, null); return null; }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => this.onReady();
    image.onerror = () => this.images.set(id, null);
    image.src = gameArt(id);
    this.images.set(id, image);
    return null;
  }

  /** Starts loading these ids ahead of the first frame. */
  preload(ids: readonly string[]): void { for (const id of ids) this.get(id); }
}
