// STUB (worker C implements). S02 Lobby.
import type { ScreenMount } from './index.js';
import { mountView, view } from './ui.js';

export const mount: ScreenMount = (root) => mountView(root, 'home', () => view('section', { 'data-window': 'lobby' }));
