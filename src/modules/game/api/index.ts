// The Iron Burrow API (CONTRACT §3): one object per module, keeping the latest module context.
// Over plain ports (the skin gallery, tests) it is detached: the campaign from the built-in
// records, no services. Screens reach it through `gameOf(ctx.game)`.
import { createLevelController, type BattleBooster, type BoosterKind, type LevelController, type Outcome } from '../controller/index.js';
import type { RunState } from '../core/index.js';
import { BOOSTERS, MODULES } from '../../../boot/ids.js';
import type { BoosterId, CampaignInfo, GameError, GameErrorCode, GamePorts, Haptic, IronBurrow, Match, Mode, PreStageInfo,
  StageEntry, StageResult, StageSetup } from '../index.js';
import { flat, trackingPorts } from './analytics.js';
import { Boards } from './boards.js';
import { KV, Host } from './host.js';
import { MatchImpl } from './match.js';
import { campaignInfo, prestageInfo, stageResult } from './meta.js';
import type { ModuleCtx, RealtimeApi } from './sdk.js';
import { Shop } from './shop.js';
import { createSiegePorts } from './siege.js';
import { Tutorial } from './tutorial.js';

/** Vibration patterns of GDD 23 `aud.haptics` (ms); UI and shots never vibrate. */
const HAPTICS: Readonly<Record<Haptic, number | readonly number[]>> = {
  'player-death': 80, 'core-destroyed': 200, pickup: 20, blast: [40, 40, 60], 'core-alarm': [30, 60, 30],
};
/** Haptic cooldown (GDD 23): a repeat sooner is dropped, deaths always pass. */
const HAPTIC_COOLDOWN_MS = 150;
const VERSION = '1.0.0';

export function gameError(code: GameErrorCode, message: string = code): GameError {
  return Object.assign(new Error(message), { code });
}

const KINDS: Readonly<Record<BoosterKind, BoosterId>> = { bubble: BOOSTERS.bubble, shockwave: BOOSTERS.shockwave,
  fortify: BOOSTERS.fortify, hull: BOOSTERS.hull };

export class IronBurrowApi {
  readonly host: Host;
  readonly shop: Shop;
  readonly boards: Boards;
  private controller: LevelController | null = null;
  private readonly siege;
  private setup: StageSetup | null = null;
  private match: MatchImpl | null = null;
  private readonly unconfirmed = new Map<BoosterKind, number>();
  private lastHaptic = 0;

  constructor(readonly ports: GamePorts) {
    this.host = new Host(ports);
    this.shop = new Shop(this.host);
    this.boards = new Boards(this.host);
    this.siege = createSiegePorts(this.host);
  }

  attach(ctx: ModuleCtx): void {
    if (this.host.ctx === ctx) return;
    this.host.attach(ctx);
    this.siege.reset();
    this.controller?.dispose();
    this.controller = null;
    this.match?.retire();
    this.match = null;
  }

  /** Booster count for new uses: the inventory minus the consumes not confirmed yet. */
  count(kind: BoosterKind): number {
    return Math.max(0, this.host.quantity(KINDS[kind]) - (this.unconfirmed.get(kind) ?? 0));
  }

  private ctl(): LevelController {
    if (this.controller) return this.controller;
    const host = this.host;
    const records = host.records();
    this.controller = createLevelController({
      campaign: trackingPorts(this.ports), siege: this.siege, records: records.game,
      inventory: {
        quantity: (kind) => host.quantity(KINDS[kind]),
        consume: async (kind, options) => {
          const inventory = host.inventory;
          if (!inventory) throw gameError('unavailable');
          this.unconfirmed.set(kind, (this.unconfirmed.get(kind) ?? 0) + 1);
          try { await inventory.consume(KINDS[kind], 1, options); }
          finally { this.unconfirmed.set(kind, Math.max(0, (this.unconfirmed.get(kind) ?? 1) - 1)); host.emitBalances(); }
        },
      },
      clock: { now: () => host.now(), setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms), clearTimeout: (h) => globalThis.clearTimeout(h as number) },
      uuid: () => crypto.randomUUID(),
      moves: (stage, lost, continued) => this.moves(stage, lost, continued),
    });
    return this.controller;
  }

  /** `moves` within the level record's bounds: after a continue at least the ★ bound (D-10-07). */
  private moves(stage: number, lost: number, continued: boolean): number {
    const bounds = this.bounds(stage);
    if (!bounds) return lost;
    const value = continued ? Math.max(lost, bounds.twoStar + 1) : lost;
    return Math.min(value, bounds.max);
  }

  /** `server.moves.max` and the ★★ bound of the range record that holds `stage` (configs snapshot). */
  private bounds(stage: number): { max: number; twoStar: number } | null {
    type Range = { first?: number; last?: number; server?: { moves?: { max?: number }; stars?: { moves?: { max?: number } }[] } };
    const set = this.host.configs?.get<{ index?: { key: string; first: number; last: number }[] }>('levels.main', 'set');
    const ref = set?.index?.find((r) => stage >= r.first && stage <= r.last);
    const range = ref ? this.host.configs?.get<Range>('levels.main', ref.key) : undefined;
    const max = range?.server?.moves?.max;
    const twoStar = range?.server?.stars?.[1]?.moves?.max;
    return typeof max === 'number' && typeof twoStar === 'number' ? { max, twoStar } : null;
  }

  async campaign(): Promise<CampaignInfo> {
    await this.host.ready();
    return campaignInfo(this.host, this.lastStage());
  }

  /** Last stage of the campaign set (`levels.main/set` of the snapshot, else the built-in copy). */
  private lastStage(): number {
    return this.host.records().lastStage;
  }

  async prestage(mode: Mode, n: number): Promise<PreStageInfo> {
    await this.host.ready();
    return prestageInfo(this.host, mode, n, this.count.bind(this));
  }

  select(setup: StageSetup): void { this.setup = setup; }
  selected(): StageSetup | null { return this.setup; }

  async start(): Promise<Match> {
    const setup = this.setup;
    if (!setup) throw gameError('refused', 'no stage selected');
    await this.host.ready();
    const ctl = this.ctl();
    this.match?.retire();
    this.match = null;
    const tutorial = this.tutorialFor(setup);
    const ok = await ctl.start(setup.mode === 'siege' ? { mode: 'siege', hull: setup.takeHull ? 1 : 0 }
      : { mode: 'campaign', stage: setup.n, hull: setup.takeHull ? 1 : 0, fresh: setup.from !== 'next' });
    const run = ctl.run;
    if (!ok || !run) throw gameError(this.host.online() ? 'unavailable' : 'offline');
    this.host.emitBalances();
    const entry = { ...(run.stage as unknown as StageEntry), theme: run.stage.theme as StageEntry['theme'] };
    this.match = new MatchImpl(ctl, setup, entry, {
      count: (kind: BattleBooster) => this.count(kind), hulls: () => this.count('hull'),
      defeatOffers: () => this.shop.defeatOffers(), boosterHint: () => this.boosterHint(),
      result: (match, outcome, last) => this.result(match, outcome, last),
      offline: () => gameError('offline'), qa: this.host.qa,
    }, tutorial);
    return this.match;
  }

  private tutorialFor(setup: StageSetup): Tutorial | null {
    const host = this.host;
    if (setup.mode !== 'campaign' || setup.n !== 1 || host.flag(KV.tutDone)) return null;
    const from = Number(host.value(KV.tutStep) ?? 0);
    const started = host.now();
    return new Tutorial(Number.isFinite(from) ? from : 0, {
      saveStep: (step) => {
        host.ports.track('tutorial_step', { step, step_id: `t${step}` });
        void host.setKv(KV.tutStep, step).catch(() => undefined);
      },
      done: (skipped) => {
        host.ports.track('tutorial_done', flat({ duration_s: Math.round((host.now() - started) / 1000), skipped }));
        void host.setKv(KV.tutDone, true).catch(() => undefined);
      },
    }, host.records().tun.tutorial);
  }

  private boosterHint(): boolean {
    if (this.host.flag(KV.boosterHint)) return false;
    if (!(['bubble', 'shockwave', 'fortify'] as const).some((kind) => this.count(kind) > 0)) return false;
    void this.host.setKv(KV.boosterHint, true).catch(() => undefined);
    return true;
  }

  private async result(match: MatchImpl, outcome: Outcome, run: RunState | null): Promise<StageResult> {
    const result = stageResult(this.host, match, outcome, run, this.lastStage());
    if (result.result === 'defeat' && !this.host.flag(KV.firstDefeat)) await this.host.setKv(KV.firstDefeat, true).catch(() => undefined);
    const starterDue = result.result === 'quit' ? false : await this.shop.starterDue().catch(() => false);
    return { ...result, starterDue };
  }

  boosterLimits(id: BoosterId): { readonly stage: number; readonly siege: number; readonly durationS: number | null } {
    const tun = this.host.records().tun;
    const b = tun.boosters;
    const kind = (Object.keys(KINDS) as BoosterKind[]).find((k) => KINDS[k] === id) ?? 'bubble';
    const stage = kind === 'hull' ? b.hullPrestage : b.limits[kind];
    const ticks = kind === 'bubble' ? tun.ticks.bubbleBooster : kind === 'fortify' ? tun.ticks.fortify : 0;
    return { stage, siege: stage * b.siegeMult, durationS: ticks > 0 ? Math.round(ticks / tun.tps) : null };
  }

  haptic(kind: Haptic): void {
    const haptics = this.host.ctx?.device?.haptics;
    if (!haptics || !this.host.settings().haptics || !touchFirst()) return;
    const now = this.host.now();
    const always = kind === 'player-death' || kind === 'core-destroyed';
    if (!always && now - this.lastHaptic < HAPTIC_COOLDOWN_MS) return;
    this.lastHaptic = now;
    try { if (haptics.isSupported()) haptics.vibrate(HAPTICS[kind]); } catch { /* no vibration */ }
  }

  canVibrate(): boolean {
    try { return this.host.ctx?.device?.haptics?.isSupported() === true; } catch { return false; }
  }

  async notice(): Promise<string | null> {
    try {
      const notice = this.host.svc<RealtimeApi>(MODULES.realtime)?.notice();
      const text = [notice?.title, notice?.text].filter((part) => typeof part === 'string' && part.trim()).join(' — ');
      return text || null;
    } catch { return null; }
  }

  async refresh(): Promise<void> {
    try { await this.host.configs?.refresh(); } catch { /* the snapshot stays */ }
    this.host.dropRecords();
  }
}

/** The device is touch-first (`pointer: coarse`): only there the game vibrates (GDD 23). */
function touchFirst(): boolean {
  try { return globalThis.matchMedia?.('(pointer: coarse)').matches === true; } catch { return false; }
}

/** The IronBurrow object of an API instance. */
export function ironBurrow(api: IronBurrowApi): IronBurrow {
  const { host, shop, boards, ports } = api;
  return {
    currentLevel: () => ports.currentLevel(), level: (n) => ports.level(n), beginAttempt: (n) => ports.beginAttempt(n),
    endLevel: (n, won, stats) => ports.endLevel(n, won, stats), loadSave: () => ports.loadSave(), save: (s) => ports.save(s),
    track: (e, p) => ports.track(e, p),
    get env() { return { qa: host.qa, haptics: api.canVibrate(), version: host.ctx?.appVersion ?? VERSION }; },
    ready: () => host.ready(), refresh: () => api.refresh(),
    campaign: () => api.campaign(), prestage: (mode, n) => api.prestage(mode, n),
    select: (setup) => api.select(setup), selected: () => api.selected(), start: () => api.start(),
    balances: () => {
      const b = host.balances();
      return { bst_bubble: api.count('bubble'), bst_shockwave: api.count('shockwave'), bst_fortify: api.count('fortify'), bst_hull: b.bst_hull };
    },
    onBalances: (listener) => host.onBalances(listener), boosterLimits: (id) => api.boosterLimits(id),
    startGrant: () => shop.startGrant(), claimStartGrant: () => shop.claimStartGrant(),
    offers: (placement) => shop.offers(placement), buy: (key, placement) => shop.buy(key, placement),
    starterDue: () => shop.starterDue(), starterShown: () => shop.starterShown(),
    board: (board, period) => boards.board(board, period), siegeStanding: (score) => boards.siegeStanding(score),
    settings: () => host.settings(), setSettings: (patch) => host.setSettings(patch), onSettings: (fn) => host.onSettings(fn),
    flag: (name) => host.flag(name), setFlag: (name) => host.setKv(name, true),
    haptic: (kind) => api.haptic(kind), notice: () => api.notice(), online: () => host.online(),
    event: (name, params) => { try { ports.track(name, flat(params)); } catch { /* analytics never blocks */ } },
  };
}
