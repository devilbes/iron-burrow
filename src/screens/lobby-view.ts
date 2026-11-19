// S02 Lobby view: the logo (or the game title on a plate when the picture is missing), the stars
// plate, the notice plate and the buttons Play, Siege, Sound — straight on the shell's scene, no
// card of its own, text only on plates and buttons (CONTRACT §4). The top bar and the HUD columns
// (daily + boards left, shop right) lie over the screen: the content keeps clear of them. Three
// layouts by `data-layout`: portrait — one column under the HUD zone, landscape — logo left and
// buttons right, desktop — one centered column. Theme tokens only.
import type { CampaignInfo, Layout } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { gameArt, picture } from './media.js';
import { formatNumber, icon, view, type ViewNode } from './ui.js';

export interface LobbyState {
  ready: boolean;
  campaign: CampaignInfo | null;
  notice: string | null;
  layout: Layout;
  logoFailed: boolean;
  busy: boolean;
}

export interface LobbyActions {
  play(): void;
  siege(): void;
  sound(): void;
  logoFailed(): void;
}

/** Room of the HUD columns over the screen: a 64px tile (src/shell/skin.ts HUD_CSS) and a gap. */
export const LOBBY_CSS = `
.lobby{--hud-side:calc(64px + var(--mp-gap));--hud-zone:calc(2 * 64px + var(--mp-gap));
 display:grid;height:100%;min-height:0;overflow:hidden;gap:var(--mp-gap);
 grid-template-areas:"brand" "info" "actions";grid-template-rows:minmax(0,1fr) auto auto;
 grid-template-columns:minmax(0,1fr)}
.brand{grid-area:brand;display:grid;place-items:center;min-height:0;min-width:0;height:100%;
 padding-top:var(--hud-zone)}
.logo{width:100%;max-width:520px;height:auto;max-height:100%;object-fit:contain}
.info{grid-area:info;display:flex;flex-direction:column;align-items:center;justify-content:center;
 gap:.5em;min-height:0;min-width:0}
.actions{grid-area:actions;display:grid;gap:.75em;width:100%;max-width:420px;justify-self:center;min-width:0}
.stars-plate{display:inline-flex;align-items:center;gap:.4em;font-family:var(--mp-font-ui);font-weight:700;
 font-variant-numeric:tabular-nums}
.notice{max-width:420px;text-align:center;font-size:.9rem;overflow-wrap:anywhere}
.cta{display:grid;justify-items:center;line-height:1.15}
.cta small{font-size:.8rem;font-weight:500;opacity:.9}
.btn-art{flex:none;width:var(--mp-icon-m);height:var(--mp-icon-m);object-fit:contain}
.sound{justify-self:center;width:auto;min-width:50%}
[data-layout=landscape].lobby{grid-template-areas:"brand actions" "info actions";
 grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;
 padding-inline:var(--hud-side);align-items:center}
[data-layout=landscape] .brand,[data-layout=desktop] .brand{padding-top:0}
[data-layout=landscape] .actions{align-self:center;gap:.5em}
[data-layout=desktop].lobby{padding-inline:var(--hud-side);grid-template-rows:minmax(0,1fr) auto auto;
 align-content:center}
[data-layout=desktop] .logo{max-width:640px}
[data-layout=desktop] .info{justify-content:flex-start}
.title-plate{max-width:100%}
`;

function brand(ctx: ScreenContext, state: LobbyState, on: LobbyActions): ViewNode {
  const title = ctx.t('shell.title');
  const content = state.logoFailed
    ? view('h1', { class: 'plate title-plate', 'data-testid': 'lobby-title' }, title)
    : view('img', { class: 'logo', src: gameArt('logo_iron_burrow'), alt: title, decoding: 'async', draggable: 'false',
      'data-testid': 'lobby-logo', onError: () => on.logoFailed() });
  return view('div', { class: 'brand' }, content);
}

function info(ctx: ScreenContext, state: LobbyState): ViewNode {
  const campaign = state.campaign;
  return view('div', { class: 'info' },
    campaign ? view('p', { class: 'plate stars-plate', 'data-testid': 'lobby-stars', 'data-dynamic': '' },
      icon('star', 24),
      view('span', {}, ctx.t('screen.lobby.stars', { stars: formatNumber(campaign.stars), max: formatNumber(campaign.maxStars) })))
      : null,
    state.notice ? view('p', { class: 'plate notice', 'data-testid': 'lobby-notice', role: 'status' }, state.notice) : null);
}

function ctaContent(label: string, sub: string | null): ViewNode {
  return view('span', { class: 'cta' }, view('span', {}, label), sub === null ? null : view('small', { 'data-dynamic': '' }, sub));
}

function actions(ctx: ScreenContext, state: LobbyState, on: LobbyActions): ViewNode {
  const campaign = state.campaign;
  const siegeOpen = campaign?.siege.unlocked === true;
  const siegeSub = campaign && !siegeOpen ? ctx.t('screen.lobby.siege_locked', { n: campaign.siege.unlockAfter }) : null;
  const playSub = campaign ? ctx.t('screen.lobby.play_sub', { n: campaign.next }) : null;
  return view('div', { class: 'actions' },
    view('button', { type: 'button', class: 'mp-button mp-button--primary', 'data-testid': 'lobby-play',
      'data-cta': 'primary', disabled: state.busy ? true : undefined, onClick: () => on.play() },
    ctaContent(ctx.t('screen.lobby.play'), playSub)),
    view('button', { type: 'button', class: 'mp-button', 'data-testid': 'lobby-siege',
      'data-state': siegeOpen ? 'open' : 'locked', 'aria-disabled': siegeOpen ? undefined : 'true',
      disabled: state.busy ? true : undefined, onClick: () => on.siege() },
    picture(gameArt(siegeOpen ? 'icon_siege' : 'node_lock'), '', { class: 'btn-art', 'aria-hidden': 'true' }),
    ctaContent(ctx.t('screen.lobby.siege'), siegeSub)),
    view('button', { type: 'button', class: 'mp-button mp-button--small sound', 'data-testid': 'lobby-sound',
      onClick: () => on.sound() },
    picture(gameArt('icon_sfx'), '', { class: 'btn-art', 'aria-hidden': 'true' }),
    view('span', {}, ctx.t('screen.lobby.sound'))));
}

/** The whole Lobby; `app-ready` once the game API answered `ready()` (or failed). */
export function renderLobby(ctx: ScreenContext, state: LobbyState, on: LobbyActions): ViewNode {
  return view('section', { class: 'lobby', 'data-window': 'lobby', 'data-layout': state.layout,
    'data-testid': state.ready ? 'app-ready' : undefined, 'aria-busy': state.ready ? undefined : 'true' },
  brand(ctx, state, on), info(ctx, state), actions(ctx, state, on));
}
