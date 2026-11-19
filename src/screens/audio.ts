// STUB (signatures fixed by the screens lead; worker A implements). Web Audio of the screens.
import type { IronBurrow } from '../modules/game/index.js';

export interface Sound {
  /** Music loop by cue id (`mus_lobby`, `mus_stage_clay|iron|magma`, `mus_siege`); null stops it. */
  music(id: string | null): void;
  /** One-shot by cue id (`sfx_*`, `jgl_*`). */
  sfx(id: string): void;
  /** Pause state: music quieter / filtered. */
  duck(on: boolean): void;
  /** Stop everything (onSuspend, screen left). */
  stop(): void;
  /** Hidden `data-testid=audio-state` node in `root`, kept up to date; returns what removes it. */
  attach(root: HTMLElement): () => void;
}

/** The one Sound of the page for this game API (reads `settings()`, follows `onSettings`). */
export function sound(_game: IronBurrow): Sound {
  return { music: () => undefined, sfx: () => undefined, duck: () => undefined, stop: () => undefined,
    attach: () => () => undefined };
}
