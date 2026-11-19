import type { Sdk } from '@manygamescorp/core/kernel';
import type { ProgressStore } from '../../boot/progress-state.js';
import type { ItemCatalog } from '../item-catalog.js';
import { createWindowsHost, type WindowsHost } from './presenter.js';
import { shopPresenter } from './shop.js';
import { offerPresenter } from './offer.js';
import { dailyPresenter } from './daily.js';
import { leaderboardPresenter } from './leaderboard.js';
import { playerPresenter } from './player.js';

export { createStandardWindows } from './standard.js';
export { createGameWindows, createOverlays, type GameWindowsHost, type Overlays } from './game.js';
export { createWindowOrder } from './order.js';

/** Presenters of the service windows (one SDK module + one shell module, see presenter.ts). */
export function createServiceWindows(sdk: () => Sdk, progress: ProgressStore,
  items: ItemCatalog): WindowsHost {
  return createWindowsHost(sdk, (run) => [shopPresenter(run, items), offerPresenter(run, items), dailyPresenter(run, progress, items),
    leaderboardPresenter(run), playerPresenter(run, progress)]);
}
