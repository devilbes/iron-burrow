// S03 Stage Map (route `map`): chapter tabs, the stage nodes of the selected chapter, «Play Stage N»
// and Back (CONTRACT §4, §6). A node that is open or cleared, and Play, open S04; Start there
// selects the stage and the map goes to the game. The campaign is read through the game API; when
// it rejects (stub) the map still draws its title, Back and a disabled Play.
import { gameOf, type CampaignInfo, type IronBurrow, type StageInfo } from '../modules/game/index.js';
import { sound } from './audio.js';
import type { ScreenMount } from './index.js';
import { mapCss, renderMap, type MapActions, type MapState } from './map-view.js';
import { openPrestage } from './prestage.js';
import { attempt } from './stage-ui.js';
import { currentLayout, mountLive, watchLayout } from './ui.js';

function sfx(game: IronBurrow, id: string): void {
  try { sound(game).sfx(id); } catch { /* sound is optional */ }
}

export const mount: ScreenMount = (root, ctx) => {
  const game = gameOf(ctx.game);
  const state: MapState = { campaign: null, chapter: 1, layout: currentLayout(), busy: false };
  let gone = false;
  let refresh = (): void => undefined;

  const stage = async (n: number): Promise<void> => {
    if (state.busy) return;
    state.busy = true;
    refresh();
    const go = await attempt(() => openPrestage(ctx, 'campaign', n, { from: 'map' }), false);
    state.busy = false;
    if (gone) return;
    if (go) ctx.go('game');
    else refresh();
  };
  const actions: MapActions = {
    back: () => { sfx(game, 'sfx_ui_back'); ctx.go('home'); },
    play: () => {
      const next = state.campaign?.next;
      if (next === undefined) return;
      sfx(game, 'sfx_ui_click');
      void stage(next);
    },
    chapter: (n, open) => {
      if (!open) { sfx(game, 'sfx_ui_locked'); return; }
      if (n === state.chapter) return;
      sfx(game, 'sfx_ui_click');
      state.chapter = n;
      refresh();
    },
    node: (info: StageInfo) => {
      if (info.state === 'locked') { sfx(game, 'sfx_ui_locked'); return; }
      sfx(game, 'sfx_ui_click');
      void stage(info.n);
    },
  };

  const live = mountLive(root, 'map', () => renderMap(ctx, state, actions), { styles: mapCss() });
  refresh = () => { if (!gone) live.refresh(); };

  let stopAudio: () => void = () => undefined;
  try {
    const audio = sound(game);
    stopAudio = audio.attach(root);
    audio.music('mus_lobby');
  } catch { /* sound is optional */ }
  const stopLayout = watchLayout((layout) => { state.layout = layout; refresh(); });

  void (async () => {
    const campaign = await attempt<CampaignInfo | null>(() => game.campaign(), null);
    if (!campaign || gone) return;
    state.campaign = campaign;
    state.chapter = campaign.chapter;
    refresh();
  })();

  return () => { gone = true; stopLayout(); stopAudio(); live.off(); };
};
