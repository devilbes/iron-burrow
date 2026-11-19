import type { Sdk } from '@manygamescorp/core/kernel';
import type { InventoryNamespace } from '@manygamescorp/mod-inventory/inventory';
import { MODULES } from '../boot/ids.js';
import { SKIN } from '../skin/index.js';

/**
 * Names and pictures of the game's items for every kit window (reward, shop, daily rewards).
 * Name: the inventory catalog `display.titleKey` through localization; the catalog is read once
 * per session (`load`, right after the start). Picture: `ITEMS` of src/skin/art.ts — the kit draws
 * the skin asset `icon-<item id>` for an item id (src/shell/icon-aliases.ts makes those assets).
 */
export interface ItemCatalog {
  /** Reads the catalog once; a failed read is tried again on the next call. */
  load(): Promise<void>;
  /** Player-facing name; `undefined` while the catalog is not read or the item has no title. */
  name(id: string): string | undefined;
  /** Kit icon key of the item's picture (its id) when the game declared one, else `undefined`. */
  icon(id: string): string | undefined;
}

export function createItemCatalog(sdk: () => Sdk): ItemCatalog {
  const titles = new Map<string, string>();
  let loading: Promise<void> | undefined;
  return {
    load() {
      loading ??= (async () => {
        const inventory = sdk().getModule<InventoryNamespace>(MODULES.inventory);
        for (const item of await inventory.entities()) {
          if (item.display.titleKey) titles.set(item.id, item.display.titleKey);
        }
      })().catch((error: unknown) => { loading = undefined; throw error; });
      return loading;
    },
    name(id) {
      const key = titles.get(id);
      return key && sdk().l10n.has(key) ? sdk().l10n.t(key) : undefined;
    },
    icon: (id) => (Object.hasOwn(SKIN.items, id) ? id : undefined),
  };
}
