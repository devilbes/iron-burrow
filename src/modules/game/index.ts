// The game seam. The template has no game: this module only publishes GamePorts, the platform
// services a level needs, implemented and ready in src/boot/game-ports.ts. Through them a game
// gets the level to play, its own numbers (`level(n).entry`), the server seed of the attempt and
// the verified level end with stars; it needs neither the SDK nor src/boot/ids.ts. A real game puts its
// rules and level loop here and returns its own API from `api`. No SDK imports: boot passes the
// definition to `defineModule`.

/** A game's own cloud save (JSON object); a game narrows it. */
export type GameState = Readonly<Record<string, unknown>>;

/**
 * The server's answer to the level end. The reward of a won level is not part of it: the server
 * grants it later and the platform's reward window shows it when it arrives.
 */
export interface LevelResult { readonly verified: boolean; readonly stars: number }

/** A level of the set as its record describes it. */
export interface Level {
  readonly n: number;
  /** Number of the last level of the set; `null` when the set has no end. */
  readonly last: number | null;
  /** Level id (`entries[].id` of the level record), the key of its progress step. */
  readonly id: string;
  /** The level's own entry of the level record (the game's numbers, JSON); a game narrows it. */
  readonly entry: unknown;
}

export interface GamePorts {
  /** The level to play: the first one not won yet (the last one again after the set ends). */
  currentLevel(): Promise<number>;
  /** Level `n` from the level records (fetched once per session, then from memory). */
  level(n: number): Promise<Level>;
  /**
   * Starts a server-seeded attempt of the level; `seed` is the one the level end is verified
   * against. The attempt lives in memory: after a page reload the level starts again.
   */
  beginAttempt(level: number): Promise<{ readonly seed: string }>;
  /**
   * Reports the level end of the current attempt and returns as soon as the server answers:
   * verified or not and the stars. The server grants the level reward itself (the client sends
   * no amounts); the reward window shows the grant when it arrives — do not wait for it.
   */
  endLevel(level: number, won: boolean, stats: { moves: number; score: number }): Promise<LevelResult>;
  /**
   * Opt-in cloud save, only for a game that resumes a level after a reload. Nothing is read or
   * written unless the game calls these: `loadSave` reads once per session, `save` writes when
   * the game decides (pause, leaving the level — not every move); `save(null)` clears it.
   */
  loadSave(): Promise<GameState | null>;
  save(state: GameState | null): Promise<void>;
  /** Analytics event (flat string and number params); never throws. */
  track(event: string, params?: Record<string, string | number>): void;
}

export const GAME_MODULE_ID = 'game';

/** The SDK module of the game (`sdk.getModule(GAME_MODULE_ID)`); its API is the ports for now. */
export function createGameModule(makePorts: () => GamePorts) {
  let ports: GamePorts | null = null;
  const api = (): GamePorts => (ports ??= makePorts());
  return {
    manifest: {
      id: GAME_MODULE_ID,
      version: '1.0.0',
      kind: 'game',
      engines: { core: '^1.0.0' },
      permissions: [],
      events: { emits: [], listens: [] },
      load: 'eager',
      targets: ['web', 'cordova'],
      entry: 'modules/game/index.js',
    },
    init(): void { api(); },
    api,
  } as const;
}
