// STUB (worker B implements). S06 Pause, S07 Stage Clear, S08 Defeat, S09 Siege Result, save-retry.
import type { DefeatInfo, Match, StageResult } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';

export function openPause(_ctx: ScreenContext, _match: Match): Promise<'resume' | 'restart' | 'quit'> {
  return Promise.resolve('resume');
}
export function openClear(_ctx: ScreenContext, _result: StageResult): Promise<'next' | 'replay' | 'map'> {
  return Promise.resolve('map');
}
export function openDefeat(_ctx: ScreenContext, _match: Match, _info: DefeatInfo): Promise<'continued' | 'retry' | 'map'> {
  return Promise.resolve('map');
}
export function openSiegeResult(_ctx: ScreenContext, _result: StageResult): Promise<'retry' | 'boards' | 'lobby'> {
  return Promise.resolve('lobby');
}
export function openSaveFailed(_ctx: ScreenContext): Promise<'retry' | 'leave'> {
  return Promise.resolve('leave');
}
