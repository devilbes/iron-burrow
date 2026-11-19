// Building blocks of the screens, drawn with the UI Kit view layer: `createViewComponent` gives
// each screen its own shadow root (the active skin is adopted there), `icon` takes pictures from
// the skin's icon set. Styles use only theme tokens (`--mp-*`) and kit class names, so the skin
// restyles them.
import { createViewComponent, view, type ViewChild, type ViewNode } from '@manygamescorp/ui-kit/core';
import { icon } from '@manygamescorp/ui-kit/icon';

export { view };

// The content stands right on the scene (the shell's full-bleed background, src/shell/skin.ts):
// no card or frame of its own. Centered between the HUD columns: the kit draws the HUD tiles over
// the screen at both sides (`--mp-icon-xl` tile + gap), so the content keeps that room. The scene
// can be any picture, so no bare text on it: text sits on a plate (the look of the top bar
// capsules) or in a button.
const CSS = `
:host{display:block;height:100%;min-height:0;color:var(--mp-text);font-family:var(--mp-font-body);
 font-weight:500;line-height:1.4}
*,*::before,*::after{box-sizing:border-box}
button{font:inherit;font-family:var(--mp-font-ui);color:inherit;cursor:pointer}
button:focus-visible{outline:2px solid var(--mp-violet);outline-offset:2px}
.mp-button{display:flex;align-items:center;justify-content:center;gap:.5em;width:100%;
 min-height:var(--mp-button-h);padding:.25em 1em;border:1px solid transparent;
 border-radius:var(--mp-radius-button);font-weight:600;font-size:1rem;text-align:center;
 white-space:normal;overflow-wrap:anywhere}
.mp-button--primary{background:var(--mp-violet-deep);color:var(--mp-on-accent);min-height:var(--mp-cta-h);
 font-size:1.125rem}
.mp-button--primary:hover{background:var(--mp-violet-hover)}
.mp-button [data-part=icon]{flex:none;width:var(--mp-icon-m);height:var(--mp-icon-m)}
.hero{display:flex;align-items:center;justify-content:center;min-height:100%;
 padding-inline:calc(var(--mp-icon-xl) + var(--mp-gap))}
.hero--no-hud{padding-inline:0}
.hero-stack{display:flex;flex-direction:column;align-items:center;gap:calc(var(--mp-gap) * 1.5);
 width:min(100%,32rem);text-align:center}
.window-text{margin:0;text-align:center;color:var(--mp-text-2);overflow-wrap:anywhere}
.hero-title{margin:0;padding:.3em .75em;font-family:var(--mp-font-display);font-weight:800;line-height:1.1;
 font-size:clamp(1.625rem,3.5vw,2.75rem);overflow-wrap:anywhere;
 background:var(--mp-night);border:1px solid var(--mp-line);border-radius:var(--mp-radius-card)}
`;

/**
 * Mounts a static view into a fresh host element in `root`; returns the function that removes it.
 * The same for the content of a game window (`body` of `ctx.window.open`) and of an overlay
 * (`draw` of `ctx.overlay`): the content only — the frame, dim and buttons are the kit's.
 * `styles`: the view's own rules after the common ones (theme tokens only, as everywhere here).
 */
export function mountView(root: HTMLElement, name: string, render: () => ViewNode,
  options: { styles?: string } = {}): () => void {
  const component = createViewComponent<Record<string, never>, null>({
    styles: CSS + (options.styles ?? ''), local: () => null, render: () => render() });
  const host = root.ownerDocument.createElement('div');
  host.dataset['screen'] = name;
  root.append(host);
  component.mount(host, {});
  return () => { component.unmount(host); host.remove(); };
}

/** Main button in the kit button look. */
export function textButton(label: string, onClick: () => void,
  options: { iconKey?: string; testid: string }): ViewNode {
  return view('button', { type: 'button', class: 'mp-button mp-button--primary',
    'data-testid': options.testid, onClick: () => onClick() },
  options.iconKey ? icon(options.iconKey, 24) : null, view('span', {}, label));
}

/** Content centered on the scene; `hud: false` on a gameplay route, where the shell shows no HUD. */
export function heroLayout(name: string, info: ViewChild[], actions: ViewChild[],
  options: { hud?: boolean } = {}): ViewNode {
  return view('section', { class: options.hud === false ? 'hero hero--no-hud' : 'hero', 'data-screen': name },
    view('div', { class: 'hero-stack' }, ...info, ...actions));
}
