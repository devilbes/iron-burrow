// The game module's session: the latest module context, the SDK services it uses (`sdk.uses`),
// the records, and what is read once per player — kv settings and flags, the best stars of each
// stage (from the one progress read), the inventory, the store. No cloud save (network.md). Nothing here polls: after `ready()` the state
// changes only by the game's own accepted actions and by the SDK's pushed events.
import { BOOSTERS, KV_MODULE, MODULES, PROGRESS, STARS_TRACK } from '../../../boot/ids.js';
import type { BoosterId, GamePorts, Settings } from '../index.js';
import { readGameRecords, type Records } from './records.js';
import type { ConfigsApi, IapApi, InventoryApi, Json, KvApi, ModuleCtx, ProgressApi, RealtimeApi } from './sdk.js';

/** kv keys of the profile (CONTRACT §2), read once in one query. */
export const KV = Object.freeze({
  settings: 'settings', grantDone: 'onb.start_grant_done', tutStep: 'tut.stage1_step', tutDone: 'tut.stage1_done',
  boosterHint: 'tut.booster_hint_shown', prestageHint: 'tut.prestage_hint_shown', starterAt: 'offer.starter.last_auto_at',
  starterShows: 'offer.starter.auto_shows', firstDefeat: 'flag.first_defeat_seen', boosterInfo: 'booster_info.seen',
} as const);
const SETTINGS_VERSION = 1;
const DEFAULT_SETTINGS: Settings = { music: true, sfx: true, motion: false, haptics: true };
const STAR_STEP = /^stars3_(\d+)$/;

type Listener = () => void;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export class Host {
  ctx: ModuleCtx | null = null;
  private recordsCache: Records | null = null;
  private readyRun: Promise<void> | null = null;
  private kv: Record<string, Json> = {};
  private settingsValue: Settings = DEFAULT_SETTINGS;
  /** Best stars per stage (server track + this session). */
  readonly stars = new Map<number, number>();
  /** Best score per stage of this session (the game keeps no cloud save, D-INT-03). */
  readonly best = new Map<number, number>();
  /** Campaign stage to play (first not won); 1 until read. */
  current = 1;
  private readonly balanceListeners = new Set<Listener>();
  private readonly settingsListeners = new Set<(s: Settings) => void>();
  private readonly offs: (() => void)[] = [];
  private connection: 'open' | 'offline' | 'unknown' = 'unknown';
  private startedAt = 0;

  constructor(readonly ports: GamePorts) {}

  /** The context of the latest start of the module; a new one starts the session over. */
  attach(ctx: ModuleCtx): void {
    if (this.ctx === ctx) return;
    for (const off of this.offs.splice(0)) { try { off(); } catch { /* gone */ } }
    this.ctx = ctx;
    this.reset();
    const on = (pattern: string, listener: (payload: unknown) => void): void => {
      try { this.offs.push(ctx.bus.on(pattern, listener)); } catch { /* not granted */ }
    };
    on('auth:identity:changed', () => this.reset());
    on('sdk:reload:required', () => this.reset());
    on('inventory:state:changed', () => this.emitBalances());
    on('realtime:connection:connected', () => { this.connection = 'open'; });
    on('realtime:connection:disconnected', () => { this.connection = 'offline'; });
  }

  /** Forgets what was read for a player: the next `ready()` reads it again. */
  reset(): void {
    this.readyRun = null;
    this.recordsCache = null;
    this.kv = {};
    this.settingsValue = DEFAULT_SETTINGS;
    this.stars.clear();
    this.best.clear();
    this.current = 1;
  }

  /** An SDK service of `sdk.uses`, or null (detached, not installed, failed). */
  svc<T>(id: string): T | null {
    try { return (this.ctx?.sdk[id] as T | undefined) ?? null; } catch { return null; }
  }

  get inventory(): InventoryApi | null { return this.svc<InventoryApi>(MODULES.inventory); }
  get iap(): IapApi | null { return this.svc<IapApi>(MODULES.iap); }
  get configs(): ConfigsApi | null { return (this.ctx?.configs as ConfigsApi | undefined) ?? null; }
  get qa(): boolean { return this.ctx?.environment === 'test'; }
  now(): number { try { return this.ctx?.time.now() ?? Date.now(); } catch { return Date.now(); } }

  records(): Records { return (this.recordsCache ??= readGameRecords(this.configs)); }
  dropRecords(): void { this.recordsCache = null; }

  ready(): Promise<void> {
    return (this.readyRun ??= this.readAll());
  }

  private async readAll(): Promise<void> {
    this.startedAt = this.now();
    const quiet = <T>(task: () => Promise<T> | undefined): Promise<T | undefined> =>
      Promise.resolve().then(task).catch(() => undefined);
    // The level progress first: the shell reads every PROGRESS track in one `progress.init`; the
    // same key set here is answered by the progress module from that read (no second request).
    const current = await quiet(() => this.ports.currentLevel());
    const [kv, , , tracks] = await Promise.all([
      quiet(() => this.svc<KvApi>(KV_MODULE)?.query(Object.values(KV))),
      quiet(() => this.inventory?.get()),
      quiet(() => this.iap?.load()),
      quiet(() => this.svc<ProgressApi>(MODULES.progress)?.init(Object.values(PROGRESS))),
    ]);
    const stars = (tracks ?? []).filter((state) => state.key === STARS_TRACK);
    this.kv = { ...(kv?.data ?? {}) };
    this.settingsValue = this.parseSettings(this.kv[KV.settings]);
    for (const state of stars ?? []) {
      for (const [key, step] of Object.entries(state.steps)) {
        const n = Number(STAR_STEP.exec(key)?.[1] ?? 0);
        const value = Math.max(0, ...Object.values(step.conditions).map((c) => c.value));
        if (n > 0 && value > 0) this.stars.set(n, Math.min(3, value));
      }
    }
    if (typeof current === 'number') this.current = current;
    this.ports.track('session_start', { entry: 'cold' });
    this.emitBalances();
  }

  private parseSettings(value: Json | undefined): Settings {
    if (!isRecord(value)) return DEFAULT_SETTINGS;
    const pick = (key: keyof Settings): boolean => (typeof value[key] === 'boolean' ? value[key] as boolean : DEFAULT_SETTINGS[key]);
    return { music: pick('music'), sfx: pick('sfx'), motion: pick('motion'), haptics: pick('haptics') };
  }

  // ---- kv: flags and settings, written at once, read from memory.

  flag(name: string): boolean { return Boolean(this.kv[name]); }
  value(name: string): Json | undefined { return this.kv[name]; }

  async setKv(name: string, value: Json): Promise<void> {
    this.kv[name] = value;
    const kv = this.svc<KvApi>(KV_MODULE);
    if (kv) await kv.set(name, value, { idempotencyKey: crypto.randomUUID() });
  }

  settings(): Settings { return this.settingsValue; }

  async setSettings(patch: Partial<Settings>): Promise<void> {
    this.settingsValue = { ...this.settingsValue, ...patch };
    for (const listener of [...this.settingsListeners]) { try { listener(this.settingsValue); } catch { /* listener */ } }
    await this.setKv(KV.settings, { v: SETTINGS_VERSION, ...this.settingsValue });
  }

  onSettings(listener: (s: Settings) => void): () => void {
    this.settingsListeners.add(listener);
    return () => { this.settingsListeners.delete(listener); };
  }

  // ---- inventory

  quantity(id: BoosterId): number {
    try { return Math.max(0, this.inventory?.quantity(id) ?? 0); } catch { return 0; }
  }

  balances(): Readonly<Record<BoosterId, number>> {
    return { bst_bubble: this.quantity(BOOSTERS.bubble), bst_shockwave: this.quantity(BOOSTERS.shockwave),
      bst_fortify: this.quantity(BOOSTERS.fortify), bst_hull: this.quantity(BOOSTERS.hull) };
  }

  onBalances(listener: Listener): () => void {
    this.balanceListeners.add(listener);
    return () => { this.balanceListeners.delete(listener); };
  }

  emitBalances(): void {
    for (const listener of [...this.balanceListeners]) { try { listener(); } catch { /* listener */ } }
  }

  // ---- network

  online(): boolean {
    if (this.connection !== 'unknown') return this.connection === 'open';
    try {
      const state = this.svc<RealtimeApi>(MODULES.realtime)?.status().state;
      return state !== 'offline';
    } catch { return true; }
  }

  sessionSeconds(): number { return Math.max(0, Math.round((this.now() - this.startedAt) / 1000)); }

  /** Keeps the best score of a stage for this session; true when it is a new best. */
  rememberBest(n: number, score: number): boolean {
    const before = this.best.get(n) ?? 0;
    if (score <= before) return false;
    this.best.set(n, score);
    return true;
  }
}
