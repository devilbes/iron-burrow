// The game's own windows of the stage flow for the skin gallery (gallery.js `LAYERS`): S04 pre-stage,
// S06 pause, S07 stage clear (and a clear the server did not verify), S08 defeat (Continue; the
// hull offer), S13 leaderboards (empty; ten rows), each opened by its screen module through
// `ctx.window.open` with test data. The Iron Burrow API behind them (gameOf of
// src/modules/game/index.ts) is a branded object that answers from memory: no SDK, no network.
// Shown over the lobby: the game route leaves to the map without a selected stage, and a screen
// change closes the windows of the screen. `fits()` — the window inside the viewport, its title and
// every kit button in sight without scrolling (tests/skin-gallery.mjs fails on it in every mode).
import { openBoards } from '/app/screens/boards.js';
import { openPrestage } from '/app/screens/prestage.js';
import { openClear, openDefeat, openPause } from '/app/screens/stage-windows.js';

const REWARDS = [{ item: 'bst_bubble', amount: 2 }, { item: 'bst_shockwave', amount: 1 }];
const SETTINGS = { music: true, sfx: true, motion: false, haptics: true };

const boardPage = (board, period, rows) => ({ board, period, guest: rows === 0, resetsAt: Date.now() + 3 * 86_400_000,
  rows: Array.from({ length: rows }, (_, i) => ({ rank: i + 1, name: `Burrower ${300 + i * 7}`, score: 9800 - i * 640, self: i === 4 })),
  self: rows ? null : { rank: 128, name: 'Player 12', score: 2500, self: true } });

/** The API the windows read: `hull` Spare Hulls owned, `rows` leaderboard rows. */
function fakeGame({ hull = 2, rows = 0 } = {}) {
  return { [Symbol.for('iron-burrow.game')]: true, env: { qa: false, haptics: true, version: '1.0.1' },
    prestage: async (mode, n) => ({ mode, n, goal: 20, best: 2500, stars: 2, hull: { owned: hull, state: hull ? 'off' : 'empty' },
      hullHint: false, tutorial: false, rewards: REWARDS }),
    onBalances: () => () => undefined, select: () => undefined, event: () => undefined, balances: () => ({}),
    offers: async () => [{ key: 'hull_pack', placement: 'defeat', price: '$1.99', items: [{ item: 'bst_hull', amount: 3 }],
      badge: null, test: false }],
    settings: () => SETTINGS, setSettings: async () => undefined, onSettings: () => () => undefined,
    board: async (board, period) => boardPage(board, period, rows),
    siegeStanding: async () => ({ best: null, rank: null, newBest: false }) };
}

const CLEAR = { mode: 'campaign', n: 2, result: 'clear', reason: null, score: 7200,
  breakdown: { kills: 3200, pickups: 1500, clear: 1000, lives: 1500, livesLeft: 3, waves: 0 }, stars: 3, verified: true,
  best: 7200, newBest: true, rewards: REWARDS, chapterDone: false, campaignDone: false, wave: null, next: 3, starterDue: false };
const UNVERIFIED = { ...CLEAR, stars: 0, verified: false, best: 0, newBest: false, rewards: [], next: null };
const DEFEAT = { reason: 'core', continue: 'available', offers: [], score: 1840, wave: null };
const DEFEAT_OFFER = { ...DEFEAT, reason: 'lives', continue: 'empty', offers: ['hull_pack'] };
const match = (info) => ({ mode: 'campaign', n: 3, defeat: () => info, continueRun: async () => 'used' });

const own = (open, options) => (ctx) => { void open({ ...ctx, game: fakeGame(options) }).catch(() => undefined); };

/** View → [route, opener]. */
export const GAME_WINDOWS = {
  prestage: ['home', own((ctx) => openPrestage(ctx, 'campaign', 2, { from: 'map' }))],
  'prestage-empty': ['home', own((ctx) => openPrestage(ctx, 'campaign', 2, { from: 'map' }), { hull: 0 })],
  clear: ['home', own((ctx) => openClear(ctx, CLEAR))],
  'clear-unverified': ['home', own((ctx) => openClear(ctx, UNVERIFIED))],
  defeat: ['home', own((ctx) => openDefeat(ctx, match(DEFEAT), DEFEAT))],
  'defeat-offer': ['home', own((ctx) => openDefeat(ctx, match(DEFEAT_OFFER), DEFEAT_OFFER))],
  pause: ['home', own((ctx) => openPause(ctx, { mode: 'campaign' }))],
  boards: ['home', own((ctx) => openBoards(ctx))],
  'boards-rows': ['home', own((ctx) => openBoards(ctx), { rows: 10 })],
};

/**
 * Problems of the open game window in the viewport: the dialog out of the viewport, its title
 * plate or a kit button cut by the viewport or by the dialog's own scroll box.
 */
export function fits() {
  const host = [...document.querySelectorAll('.mpg-shell [data-element^="game.window"]')].at(-1);
  const dialog = host?.shadowRoot?.querySelector('.dialog-backdrop>.dialog[role=dialog]');
  if (!dialog) return ['no game window open'];
  const out = [];
  const box = dialog.getBoundingClientRect();
  const inside = (r, clip) => r.left >= clip.left - 1 && r.right <= clip.right + 1 && r.top >= clip.top - 1 && r.bottom <= clip.bottom + 1;
  const view = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  if (!inside(box, view)) out.push(`window ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)} out of the viewport`);
  const title = dialog.querySelector('.dialog-head [data-skin-slot=title]');
  if (title && !inside(title.getBoundingClientRect(), view)) out.push('title plate out of the viewport');
  if (title && title.getBoundingClientRect().height > 64) out.push(`title in more than one line: ${title.textContent.trim()}`);
  for (const button of dialog.querySelectorAll('.std-actions button')) {
    if (!inside(button.getBoundingClientRect(), view) || !inside(button.getBoundingClientRect(), box)) {
      out.push(`button «${button.textContent.trim()}» not in sight`);
    }
  }
  return out;
}
