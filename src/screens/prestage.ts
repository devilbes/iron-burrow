// STUB (worker B implements). S04 Pre-stage game window.
import type { Mode, StageFrom } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';

/** Opens S04; on Start calls `game.select(...)` and resolves true; Close resolves false. */
export function openPrestage(_ctx: ScreenContext, _mode: Mode, _n: number,
  _options: { from: StageFrom; offline?: boolean }): Promise<boolean> {
  return Promise.resolve(false);
}
