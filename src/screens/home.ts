// S02 Lobby (route `home`): waits for the game API (`ready()`; `refresh()` on every mount after the
// first of the session), reads the campaign for Play / Siege / stars, shows the realtime notice and,
// on the first visit, the start grant window (S02 grant). Play → the map; Siege → S04 → the game;
// Sound → the «Sound» window (CONTRACT §3.3, §4, §6). Every call of the API is guarded: the stub
// API rejects, and the Lobby still draws (play sub-label hidden, Siege locked).
import { gameOf, type CampaignInfo, type IronBurrow, type OfferKey, type Reward } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { ScreenContext, ScreenMount } from './index.js';
import { LOBBY_CSS, renderLobby, type LobbyActions, type LobbyState } from './lobby-view.js';
import { openPrestage } from './prestage.js';
import { rewardRow } from './rewards.js';
import { openSettings } from './settings.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { currentLayout, mountLive, mountView, view, watchLayout } from './ui.js';

/** The free start grant offer (CONTRACT §8.3); analytics names its Lobby placement `lobby_grant` (§10). */
const START_GRANT: OfferKey = 'start_grant';
/** Siege is the one level of its set. */
const SIEGE_LEVEL = 1;

/** The first Lobby mount of the session skips `refresh()` (configs were just read by `ready()`). */
let mountedBefore = false;

function sfx(game: IronBurrow, id: string): void {
  try { sound(game).sfx(id); } catch { /* sound is optional */ }
}

export const mount: ScreenMount = (root, ctx) => {
  const game = gameOf(ctx.game);
  const state: LobbyState = { ready: false, campaign: null, notice: null, layout: currentLayout(), logoFailed: false, busy: false };
  let gone = false;
  let refresh = (): void => undefined;

  const actions: LobbyActions = {
    play: () => { sfx(game, 'sfx_ui_click'); ctx.go('map'); },
    siege: () => { void siege(); },
    sound: () => { sfx(game, 'sfx_ui_click'); void openSettings(ctx); },
    logoFailed: () => { if (!state.logoFailed) { state.logoFailed = true; refresh(); } },
  };
  const siege = async (): Promise<void> => {
    if (state.busy) return;
    if (state.campaign?.siege.unlocked !== true) { sfx(game, 'sfx_ui_locked'); return; }
    sfx(game, 'sfx_ui_click');
    state.busy = true;
    refresh();
    const go = await attempt(() => openPrestage(ctx, 'siege', SIEGE_LEVEL, { from: 'lobby' }), false);
    state.busy = false;
    if (gone) return;
    if (go) ctx.go('game');
    else refresh();
  };

  const live = mountLive(root, 'home', () => renderLobby(ctx, state, actions), { styles: LOBBY_CSS });
  refresh = () => { if (!gone) live.refresh(); };

  let stopAudio: () => void = () => undefined;
  try {
    const audio = sound(game);
    stopAudio = audio.attach(root);
    audio.music('mus_lobby');
  } catch { /* sound is optional */ }
  const stopLayout = watchLayout((layout) => { state.layout = layout; refresh(); });

  void (async () => {
    const first = !mountedBefore;
    mountedBefore = true;
    await attempt(() => game.ready(), undefined);
    if (!first) await attempt(() => game.refresh(), undefined);
    state.campaign = await attempt<CampaignInfo | null>(() => game.campaign(), null);
    state.notice = await attempt<string | null>(() => game.notice(), null);
    state.ready = true;
    refresh();
    if (gone) return;
    const grant = await attempt<readonly Reward[] | null>(() => game.startGrant(), null);
    if (grant !== null && !gone) await showGrant(ctx, game, grant);
  })();

  return () => { gone = true; stopLayout(); stopAudio(); live.off(); };
};

/** S02 grant: the starter boosters, «Collect» claims the free offer; the kit reward window shows the grant. */
async function showGrant(ctx: ScreenContext, game: IronBurrow, grant: readonly Reward[]): Promise<void> {
  game.event('offer_shown', { offer_id: START_GRANT, placement: 'lobby_grant' });
  const ticket = ctx.window.open({
    title: ctx.t('screen.lobby.grant_title'),
    body: (root) => mountView(root, 'grant', () => view('div', { class: 'win', 'data-window': 'grant' },
      view('p', { class: 'window-text' }, ctx.t('screen.lobby.grant_body')),
      rewardRow(ctx, grant)), { styles: WINDOW_CSS }),
    actions: [{ id: 'grant-collect', label: ctx.t('screen.common.collect'), variant: 'primary' }],
    dismissible: false,
  });
  const picked = await ticket.result.catch(() => 'close');
  // Closed by leaving the screen: the grant stays for the next Lobby visit.
  if (picked !== 'grant-collect') return;
  game.event('offer_click', { offer_id: START_GRANT, placement: 'lobby_grant' });
  sfx(game, 'sfx_reward');
  await attempt(() => game.claimStartGrant(), null);
}
