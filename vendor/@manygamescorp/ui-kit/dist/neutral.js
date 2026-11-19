import { REWARD_GRID_LAYOUT } from './features/reward-grid-layout.js';
export const NEUTRAL_CSS = `
:host{display:block}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
:where(button){appearance:none;background:var(--kit-button-bg,transparent);color:inherit;
 border:0;border-radius:0;box-shadow:none;font:inherit;cursor:pointer}
:where(button:disabled){cursor:default}
:where(button[data-part]:hover:not(:disabled)){background:var(--kit-menu-hover-bg,transparent);
 filter:var(--kit-menu-hover-filter,none)}
:where(button[data-part]:focus-visible){background:var(--kit-menu-focus-bg,transparent);
 outline:2px solid var(--kit-menu-focus-color,currentColor);outline-offset:2px}
:where(button[data-part]:active:not(:disabled)){background:var(--kit-menu-active-bg,transparent);
 filter:var(--kit-menu-active-filter,none)}
` + REWARD_GRID_LAYOUT;
