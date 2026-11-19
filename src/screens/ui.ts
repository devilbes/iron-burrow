// Building blocks of the screens, drawn with the UI Kit view layer: `createViewComponent` gives
// each screen its own shadow root (the active skin is adopted there), `icon` takes pictures from
// the skin's icon set. Styles use only theme tokens (`--mp-*`) and kit class names, so the skin
// restyles them. The scene (src/skin/art.ts `scene`, `scene-<route>`) is the shell's full-bleed
// background: screens draw no card of their own around it and put no bare text on it — text sits
// on a plate (`.plate`) or in a button.
import { createViewComponent, view, type ViewChild, type ViewNode } from '@manygamescorp/ui-kit/core';
import { icon } from '@manygamescorp/ui-kit/icon';
import { layoutOf, type Layout } from '../modules/game/index.js';

export { view, icon };
export type { ViewChild, ViewNode };

const CSS = `
:host{display:block;height:100%;min-height:0;color:var(--mp-text);font-family:var(--mp-font-body);
 font-weight:500;line-height:1.35}
*,*::before,*::after{box-sizing:border-box}
button{font:inherit;font-family:var(--mp-font-ui);color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
button:focus-visible{outline:2px solid var(--mp-violet);outline-offset:2px}
button:disabled{cursor:default;opacity:.55}
img{display:block;max-width:100%}
.mp-button{display:flex;align-items:center;justify-content:center;gap:.5em;width:100%;
 min-height:var(--mp-button-h);padding:.25em 1em;border:1px solid var(--mp-line);
 border-radius:var(--mp-radius-button);font-weight:600;font-size:1rem;text-align:center;
 background:var(--mp-card-raised);color:var(--mp-text);white-space:normal;overflow-wrap:anywhere}
.mp-button--primary{background:var(--mp-violet-deep);border-color:transparent;color:var(--mp-on-accent);
 min-height:var(--mp-cta-h);font-size:1.125rem}
.mp-button--primary:hover{background:var(--mp-violet-hover)}
.mp-button--small{width:auto;min-height:48px;font-size:.95rem}
.mp-button [data-part=icon]{flex:none;width:var(--mp-icon-m);height:var(--mp-icon-m)}
.plate{margin:0;padding:.35em .8em;background:var(--mp-night);border:1px solid var(--mp-line);
 border-radius:var(--mp-radius-card);color:var(--mp-text)}
.muted{color:var(--mp-text-2)}
.title-plate{font-family:var(--mp-font-display);font-weight:800;line-height:1.1;
 font-size:clamp(1.5rem,3.5vw,2.5rem);text-align:center;overflow-wrap:anywhere}
.window-text{margin:0;text-align:center;color:var(--mp-text-2);overflow-wrap:anywhere}
.rows{display:grid;gap:.35em;margin:0;padding:0;list-style:none}
.rows li{display:flex;justify-content:space-between;gap:1em}
.rows b{font-family:var(--mp-font-ui);font-variant-numeric:tabular-nums}
.toggle{display:flex;align-items:center;justify-content:space-between;gap:.75em;width:100%;min-height:48px;
 padding:.3em .5em .3em .9em;border:0;border-radius:0;text-align:left;
 background:linear-gradient(180deg,var(--mp-card-raised),var(--mp-card-surface) 45%,var(--mp-card-background));
 box-shadow:inset 0 1px 0 var(--game-plate-light),inset 0 -1px 0 var(--game-plate-dark);color:var(--mp-card-fg);
 clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)}
.toggle b{flex:none;min-width:3.5em;padding:.2em .6em;border-radius:0;text-align:center;
 font-family:var(--mp-font-ui);font-weight:700;background:var(--mp-window-background);color:var(--mp-card-subtle);
 box-shadow:inset 0 2px 3px var(--game-shade-strong),inset 0 0 0 1px var(--mp-card-raised);
 clip-path:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px)}
.toggle[data-state=on] b{background:var(--mp-card-success);color:var(--mp-card-on-accent);
 box-shadow:inset 0 1px 0 var(--game-plate-shine),0 0 8px var(--game-slit-glow)}
.rewards{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--mp-gap);margin:0;padding:0;list-style:none}
.reward{position:relative;display:grid;justify-items:center;gap:.25em;width:var(--reward-size,96px)}
.reward img,.reward .reward-art{width:var(--reward-size,96px);height:var(--reward-size,96px);object-fit:contain}
.reward-count{position:absolute;right:0;top:calc(var(--reward-size,96px) - 1.6em);padding:.05em .4em;
 border-radius:var(--mp-radius-button);background:var(--mp-night);color:var(--mp-text);
 font-family:var(--mp-font-ui);font-weight:700}
.reward-name{font-size:.85rem;text-align:center;color:var(--mp-text-2)}
:host([data-layout=landscape]) .reward,[data-layout=landscape] .reward{--reward-size:80px}
[data-layout=desktop] .reward{--reward-size:128px}
`;

/** Shared rules (theme tokens only), for a view that builds its own component. */
export const BASE_CSS = CSS;

/**
 * Mounts a static view into a fresh host element in `root`; returns the function that removes it.
 * The same for the content of a game window (`body` of `ctx.window.open`) and of an overlay
 * (`draw` of `ctx.overlay`): the content only — the frame, dim and buttons are the kit's.
 * `styles`: the view's own rules after the common ones (theme tokens only, as everywhere here).
 */
export function mountView(root: HTMLElement, name: string, render: () => ViewNode,
  options: { styles?: string } = {}): () => void {
  return mountLive(root, name, render, options).off;
}

export interface LiveView {
  /** Renders again (the view reads its state anew). */
  refresh(): void;
  /** The view's shadow root, for direct updates of fast-changing parts (the match HUD). */
  readonly shadow: () => ShadowRoot | null;
  readonly host: HTMLElement;
  off(): void;
}

/** `mountView` that can render again: `refresh()` after the state the render reads changed. */
export function mountLive(root: HTMLElement, name: string, render: () => ViewNode,
  options: { styles?: string } = {}): LiveView {
  let again: (() => void) | null = null;
  let shadow: ShadowRoot | null = null;
  const component = createViewComponent<Record<string, never>, null>({
    styles: CSS + (options.styles ?? ''), local: () => null,
    render: (_props, vctx) => { again = () => vctx.refresh(); shadow = vctx.root; return render(); },
  });
  const host = root.ownerDocument.createElement('div');
  host.dataset['screen'] = name;
  host.style.height = '100%';
  root.append(host);
  component.mount(host, {});
  let gone = false;
  return {
    refresh: () => { if (!gone) again?.(); },
    shadow: () => shadow,
    host,
    off: () => { if (gone) return; gone = true; component.unmount(host); host.remove(); },
  };
}

/** A button in the kit button look; `primary` is the one main action (`data-cta=primary`). */
export function button(label: string, onClick: () => void, options: {
  testid: string; primary?: boolean; small?: boolean; iconKey?: string; disabled?: boolean;
  attrs?: Readonly<Record<string, string | number | boolean | undefined>>;
}): ViewNode {
  const cls = ['mp-button', options.primary ? 'mp-button--primary' : '', options.small ? 'mp-button--small' : '']
    .filter(Boolean).join(' ');
  return view('button', { type: 'button', class: cls, 'data-testid': options.testid,
    'data-cta': options.primary ? 'primary' : undefined, disabled: options.disabled === true ? true : undefined,
    ...(options.attrs ?? {}), onClick: () => onClick() },
  options.iconKey ? icon(options.iconKey, 24) : null, view('span', {}, label));
}

/** A switch row (`data-state=on|off`) that stays in its window (a button of `body`, not of the kit). */
export function toggle(label: string, on: boolean, onFlip: () => void, testid: string,
  words: { on: string; off: string }): ViewNode {
  return view('button', { type: 'button', class: 'toggle', role: 'switch', 'aria-checked': on ? 'true' : 'false',
    'data-testid': testid, 'data-state': on ? 'on' : 'off', onClick: () => onFlip() },
  view('span', {}, label), view('b', {}, on ? words.on : words.off));
}

/** `data-layout` of the viewport (GDD 20: portrait / landscape / desktop). */
export function currentLayout(win: Window = window): Layout {
  return layoutOf(win.innerWidth, win.innerHeight);
}

/** Calls `fn` with the new layout whenever it changes; returns what stops it. */
export function watchLayout(fn: (layout: Layout) => void, win: Window = window): () => void {
  let last = currentLayout(win);
  const onResize = (): void => {
    const next = currentLayout(win);
    if (next !== last) { last = next; fn(next); }
  };
  win.addEventListener('resize', onResize);
  return () => win.removeEventListener('resize', onResize);
}

/** Integer with the locale's thousands separators (GDD 20: numbers through Intl). */
export function formatNumber(value: number, locale?: string): string {
  try { return new Intl.NumberFormat(locale).format(value); } catch { return String(value); }
}
