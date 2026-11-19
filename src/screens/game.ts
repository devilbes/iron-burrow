// STUB (worker A implements). S05 Gameplay.
import type { ScreenMount } from './index.js';
import { mountView, view } from './ui.js';

export const mount: ScreenMount = (root) => mountView(root, 'game', () => view('section', { 'data-window': 'game' }));
