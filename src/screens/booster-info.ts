// STUB (worker B implements). S16 Booster info game window.
import type { BoosterId, Mode } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';

/** Card of a booster; «Get more» opens the offer / shop itself before resolving 'shop'. */
export function openBoosterInfo(_ctx: ScreenContext, _id: BoosterId, _mode: Mode): Promise<'ok' | 'shop'> {
  return Promise.resolve('ok');
}
