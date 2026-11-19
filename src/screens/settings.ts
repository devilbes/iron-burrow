// STUB (worker C implements). S14 (b) Sound settings game window and its toggles.
import type { ScreenContext } from './index.js';

export function openSettings(_ctx: ScreenContext): Promise<void> { return Promise.resolve(); }
/** The toggles (music, sfx, motion, haptics) + version, for any window body (S06 pause too). */
export function settingsBody(_ctx: ScreenContext): (root: HTMLElement) => () => void {
  return () => () => undefined;
}
