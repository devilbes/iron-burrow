// S14 (b) «Sound» game window: music, sound effects, Reduce Motion, vibration (touch devices that
// can vibrate only) and the version line. Each switch is a button of the body (the window stays
// open), writes the kv `settings` at once through the game API and follows `onSettings`
// (CONTRACT §4 S14, §6). `settingsBody` is the same content for any window body (S06 pause).
import { gameOf, type IronBurrow, type Settings } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { ScreenContext } from './index.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { mountLive, toggle, view, type ViewNode } from './ui.js';

type SettingKey = keyof Settings;

const DEFAULTS: Settings = { music: true, sfx: true, motion: false, haptics: true };

const SETTINGS_CSS = `
.settings{display:grid;gap:.5em;min-width:0}
.settings-version{margin:0;text-align:center;font-size:.85rem;color:var(--mp-text-2)}
`;

/** Opens the «Sound» window; resolves when it is closed. */
export async function openSettings(ctx: ScreenContext): Promise<void> {
  const ticket = ctx.window.open({
    title: ctx.t('screen.settings.title'),
    body: (root) => mountSettings(root, ctx, 'settings'),
    actions: [{ id: 'settings-close', label: ctx.t('screen.common.close'), variant: 'secondary' }],
  });
  await ticket.result.catch(() => 'close');
}

/** The toggles (music, sfx, motion, haptics) + version, for any window body (S06 pause too). */
export function settingsBody(ctx: ScreenContext): (root: HTMLElement) => () => void {
  return (root) => mountSettings(root, ctx, null);
}

function readSettings(game: IronBurrow): Settings {
  try { return { ...DEFAULTS, ...game.settings() }; } catch { return DEFAULTS; }
}

/** Vibration switch only where it means something: the device vibrates and is touch-first. */
function hapticsShown(game: IronBurrow): boolean {
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return game.env.haptics && coarse;
  } catch { return false; }
}

function mountSettings(root: HTMLElement, ctx: ScreenContext, windowName: string | null): () => void {
  const game = gameOf(ctx.game);
  let current = readSettings(game);
  let live: { refresh(): void } = { refresh: () => undefined };

  const flip = (key: SettingKey): void => {
    const was = current[key];
    current = { ...current, [key]: !was };
    live.refresh();
    try { sound(game).sfx('sfx_ui_toggle'); } catch { /* sound is optional */ }
    void attempt(async () => { await game.setSettings({ [key]: !was }); return true; }, false).then((saved) => {
      if (saved) return;
      current = { ...current, [key]: was };
      live.refresh();
    });
  };

  const shown = mountLive(root, 'settings', () => render(ctx, game, current, windowName, flip),
    { styles: WINDOW_CSS + SETTINGS_CSS });
  live = shown;
  let stop: () => void = () => undefined;
  try {
    stop = game.onSettings((next) => { current = { ...DEFAULTS, ...next }; shown.refresh(); });
  } catch { /* the stub API has no listeners */ }
  return () => { stop(); shown.off(); };
}

function render(ctx: ScreenContext, game: IronBurrow, current: Settings, windowName: string | null,
  flip: (key: SettingKey) => void): ViewNode {
  const words = { on: ctx.t('screen.settings.on'), off: ctx.t('screen.settings.off') };
  let version = '';
  try { version = game.env.version; } catch { /* stub */ }
  return view('div', { class: 'win settings', 'data-window': windowName ?? undefined },
    toggle(ctx.t('screen.settings.music'), current.music, () => flip('music'), 'settings-music', words),
    toggle(ctx.t('screen.settings.sfx'), current.sfx, () => flip('sfx'), 'settings-sfx', words),
    toggle(ctx.t('screen.settings.motion'), current.motion, () => flip('motion'), 'settings-motion', words),
    hapticsShown(game)
      ? toggle(ctx.t('screen.settings.haptics'), current.haptics, () => flip('haptics'), 'settings-haptics', words)
      : null,
    version === '' ? null
      : view('p', { class: 'settings-version', 'data-testid': 'settings-version' },
        ctx.t('screen.settings.version', { version })));
}
