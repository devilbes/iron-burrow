// Home: the app title and Play. Service windows are opened from the HUD and the top bar.
import type { ScreenMount } from './index.js';
import { heroLayout, mountView, textButton, view } from './ui.js';

export const mount: ScreenMount = (root, ctx) => mountView(root, 'home', () => heroLayout('home', [
  view('h1', { class: 'hero-title' }, ctx.t('shell.title')),
], [
  textButton(ctx.t('screen.home.play'), () => ctx.go('game'), { iconKey: 'play', testid: 'home-play' }),
]));
