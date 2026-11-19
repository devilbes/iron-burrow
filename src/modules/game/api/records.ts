// The game's number records (CONTRACT §8.5): the rules' records (game.balance … game.siege) for the
// logic and the meta records (rewards, packs, shop order, offer placements) for the API. Each key
// is the published record when it has the right shape, else the copy built into the game.
import { GAME_CONFIG, LEVEL_SET_RECORD } from '../../../boot/ids.js';
import { createTunables, mergeShape, readRecords, type GameRecords, type Tunables } from '../core/config.js';
import REWARDS from '../../../../configs/remote/game.rewards/main.json' with { type: 'json' };
import PACKS from '../../../../configs/remote/game.iap_packs/main.json' with { type: 'json' };
import SHOP_ORDER from '../../../../configs/remote/game.iap_shop_order/main.json' with { type: 'json' };
import PLACEMENTS from '../../../../configs/remote/game.iap_placements/main.json' with { type: 'json' };
import LEVEL_SET from '../../../../configs/remote/levels.main/set.json' with { type: 'json' };
import type { BoosterId, OfferKey, Reward } from '../index.js';
import type { ConfigsApi } from './sdk.js';

export type RewardsRecord = typeof REWARDS.data;
export type PacksRecord = typeof PACKS.data;
export type ShopOrderRecord = typeof SHOP_ORDER.data;
export type PlacementsRecord = typeof PLACEMENTS.data;

export interface MetaRecords {
  readonly rewards: RewardsRecord;
  readonly packs: PacksRecord;
  readonly shopOrder: ShopOrderRecord;
  readonly placements: PlacementsRecord;
}

/** Tutorial pace of stage 1 (`game.balance.tut`, GDD 14 `tut.*`). */
export type TutorialTunables = ReturnType<typeof readRecords>['game.balance']['tut'];

export interface Records {
  readonly game: GameRecords;
  readonly tun: Tunables & { readonly tutorial: TutorialTunables };
  readonly meta: MetaRecords;
  /** Last stage of the campaign set. */
  readonly lastStage: number;
}

const BOOSTER_IDS: readonly BoosterId[] = ['bst_bubble', 'bst_shockwave', 'bst_fortify', 'bst_hull'];

const read = (configs: ConfigsApi | null, ref: { scope: string; key: string }): unknown => {
  try { return configs?.get(ref.scope, ref.key); } catch { return undefined; }
};

/** The records of the configs snapshot (`null`: the built-in copies — detached mode, tests). */
export function readGameRecords(configs: ConfigsApi | null): Records {
  const game: GameRecords = {
    'game.balance': read(configs, GAME_CONFIG.balance), 'game.enemies': read(configs, GAME_CONFIG.enemies),
    'game.powerups': read(configs, GAME_CONFIG.powerups), 'game.boosters': read(configs, GAME_CONFIG.boosters),
    'game.siege': read(configs, GAME_CONFIG.siege),
  };
  const meta: MetaRecords = {
    rewards: mergeShape(REWARDS.data, read(configs, GAME_CONFIG.rewards)),
    packs: mergeShape(PACKS.data, read(configs, GAME_CONFIG.packs)),
    shopOrder: mergeShape(SHOP_ORDER.data, read(configs, GAME_CONFIG.shopOrder)),
    placements: mergeShape(PLACEMENTS.data, read(configs, GAME_CONFIG.placements)),
  };
  const set = read(configs, LEVEL_SET_RECORD) as { last?: unknown } | undefined;
  const lastStage = typeof set?.last === 'number' && set.last > 0 ? set.last : LEVEL_SET.data.last;
  return { game, tun: { ...createTunables(game), tutorial: readRecords(game)['game.balance'].tut }, meta, lastStage };
}

/** `{ bst_x: n }` as reward lines in the booster order. */
export function rewardsOf(bundle: Readonly<Record<string, number>> | undefined): Reward[] {
  if (!bundle) return [];
  return BOOSTER_IDS.filter((id) => (bundle[id] ?? 0) > 0).map((id) => ({ item: id, amount: bundle[id] as number }));
}

/** First clear reward of stage n (display only): the rotation item, plus the chapter final bundle. */
export function firstClearRewards(meta: MetaRecords, n: number): Reward[] {
  const r = meta.rewards;
  const rotation = r.first_clear_rotation as readonly string[];
  const item = rotation[(n - 1) % rotation.length] as BoosterId | undefined;
  const lines = new Map<BoosterId, number>();
  if (item && BOOSTER_IDS.includes(item)) lines.set(item, r.first_clear_qty);
  if ((r.finale_stages as readonly number[]).includes(n)) {
    for (const reward of rewardsOf(r.finale_bundle as Record<string, number>)) {
      lines.set(reward.item, (lines.get(reward.item) ?? 0) + reward.amount);
    }
  }
  return BOOSTER_IDS.filter((id) => lines.has(id)).map((id) => ({ item: id, amount: lines.get(id) as number }));
}

/**
 * Everything a verified clear of stage n grants, as the server does it: the first clear step of
 * `progress_main` (`firstClearRewards`, the same numbers) and, the first time the stage reaches three
 * stars, the step of `stars_main` (`three_star` of game.rewards mirrors its reward). Lines of one item
 * are summed — what the reward window shows next.
 */
export function clearRewards(meta: MetaRecords, n: number, earned: { firstClear: boolean; threeStar: boolean }): Reward[] {
  const lines = new Map<BoosterId, number>();
  const add = (list: readonly Reward[]): void => {
    for (const reward of list) lines.set(reward.item, (lines.get(reward.item) ?? 0) + reward.amount);
  };
  if (earned.firstClear) add(firstClearRewards(meta, n));
  if (earned.threeStar) add(rewardsOf(meta.rewards.three_star as Record<string, number>));
  return BOOSTER_IDS.filter((id) => lines.has(id)).map((id) => ({ item: id, amount: lines.get(id) as number }));
}

/** Items of a pack (offer) as reward lines; the start grant from its own bundle. */
export function packItems(meta: MetaRecords, key: OfferKey): Reward[] {
  if (key === 'start_grant') return rewardsOf(meta.rewards.start_grant as Record<string, number>);
  const pack = (meta.packs as Record<string, { items?: Record<string, number> } | undefined>)[key];
  return rewardsOf(pack?.items);
}

/** The pack is sold once (Starter Crate). */
export function oneTime(meta: MetaRecords, key: OfferKey): boolean {
  return (meta.packs as Record<string, { one_time?: boolean } | undefined>)[key]?.one_time === true;
}
