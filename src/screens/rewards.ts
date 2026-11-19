// A row of rewards: one card per item — a big picture (ITEMS) with `×{count}` on it and the item
// name under it (`item.<id>.title`, the catalog display.titleKey). Used by the start grant, S04,
// S07, S10/S10′ cards and S11. Display only: the real grant is the kit reward window's.
import type { Reward } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { itemArt, picture } from './media.js';
import { view, type ViewNode } from './ui.js';

/** Name of an item through the catalog key `item.<id>.title` (CONTRACT §5, strings of the records). */
export function itemName(ctx: ScreenContext, id: string): string {
  return ctx.t(`item.${id}.title`);
}

/** One reward card (`reward-item`, `reward-item-count`). */
export function rewardCard(ctx: ScreenContext, reward: Reward, options: { names?: boolean } = {}): ViewNode {
  const name = itemName(ctx, reward.item);
  return view('li', { class: 'reward', 'data-testid': 'reward-item', 'data-item': reward.item },
    picture(itemArt(reward.item), name),
    view('span', { class: 'reward-count', 'data-testid': 'reward-item-count', 'data-dynamic': '' },
      ctx.t('screen.common.count', { count: reward.amount })),
    options.names === false ? null : view('span', { class: 'reward-name' }, name));
}

/** The rewards side by side, wrapping centered (GDD 20 `ui.rewards`). */
export function rewardRow(ctx: ScreenContext, rewards: readonly Reward[], options: { names?: boolean } = {}): ViewNode {
  return view('ul', { class: 'rewards', 'data-dynamic': '' }, ...rewards.map((reward) => rewardCard(ctx, reward, options)));
}
