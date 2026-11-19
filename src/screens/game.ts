// Placeholder of the game: a text and Close back to home. Close asks first, in a game window
// (`ctx.window`: the kit window of the game skin, the game's own content inside) — the way a real
// game shows its result, pause or failure. It calls no platform service; the level services are
// ready in `ctx.game` (src/boot/game-ports.ts) for the real game.
import type { ScreenMount } from './index.js';
import { heroLayout, mountView, textButton, view } from './ui.js';

export const mount: ScreenMount = (root, ctx) => {
  const leave = (): void => {
    const asked = ctx.window.open({
      title: ctx.t('screen.game.leave.title'),
      body: (body) => mountView(body, 'leave', () => view('p', { class: 'window-text' }, ctx.t('screen.game.leave.text'))),
      actions: [{ id: 'leave', label: ctx.t('screen.game.leave.confirm') },
        { id: 'stay', label: ctx.t('screen.game.leave.stay') }],
    });
    void asked.result.then((picked) => { if (picked === 'leave') ctx.go('home'); });
  };
  return mountView(root, 'game', () => heroLayout('game', [
    view('h1', { class: 'hero-title', 'data-testid': 'game-placeholder' }, ctx.t('screen.game.placeholder')),
  ], [
    textButton(ctx.t('screen.game.close'), leave, { testid: 'game-close' }),
  ], { hud: false }));
};
