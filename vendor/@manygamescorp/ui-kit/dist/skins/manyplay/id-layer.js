import { MANYPLAY_ICON_ASSETS } from './assets.js';
import { MANYPLAY_ID_PRESENTATION } from './id-presentation.js';
export const MANYPLAY_ID_LAYER = Object.freeze({
    id: 'manyplay', level: 'game', assets: MANYPLAY_ICON_ASSETS,
    sheets: Object.entries(MANYPLAY_ID_PRESENTATION).flatMap(([target, text]) => target === 'login' ? [{ target, text }, { target: 'idAccount', text }] : [{ target, text }]),
});
