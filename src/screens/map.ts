// STUB (worker C implements). S03 Stage Map.
import type { ScreenMount } from './index.js';
import { mountView, view } from './ui.js';

export const mount: ScreenMount = (root) => mountView(root, 'map', () => view('section', { 'data-window': 'stage-map' }));
