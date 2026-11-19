import { view, type KitComponent, type ViewNode } from '@manygamescorp/ui-kit/core';
import type { ShellModule, ShellProps, ShellTicket } from '@manygamescorp/ui-kit/shell';
import { popup, type PopupBlock, type PopupProps } from '@manygamescorp/ui-kit/services/popup';
import type { GameOverlay, GameWindowSpec, GameWindowTicket, GameWindows, OverlayOptions } from
  '../../screens/index.js';
import type { WindowOrder } from './order.js';

/**
 * The game's own windows (`ctx.window.open`) and screen layers (`ctx.overlay`).
 *
 * A game window is the kit `popup` (`ui-kit/services/popup`, the window of `ui.popup`): the kit
 * draws the dialog — backdrop over the whole screen, frame, head with the title plate and the close
 * button, the header picture (icon, rating stars) and the buttons — and the skin dresses it as it
 * dresses `ui.popup`, because the component the shell mounts IS the kit's `popup` (its skin name
 * stays `popup`: the `popup` sheet of the skin, `*` with theme.css and `COMMON`). The game's
 * content comes in through a `<slot>`: the kit popup takes only data blocks, so one text block of
 * it carries a `<slot name=body>` and the game's `body(root)` draws into a light-DOM child of the
 * window host, which the browser shows in that slot. The kit has no slot of its own for this
 * (rc.30): the text block is typed `string`, the slot is a view node passed in its place.
 *
 * Windows open in the shell's `overlay` layer (`[data-part=popup]`), whose dim (`::before`,
 * `position:fixed;inset:0`, `--mp-overlay` = `--mp-card-overlay` of theme.css) covers the viewport
 * edge to edge, top bar and HUD under it; the rest of the shell is inert while a window is up.
 * Up to `DEPTH` game windows stand one over another (pause → confirm); each has its own element.
 * `popupKind: 'alert'`: the window is as high as its content (the kit's `info` default is a fixed
 * share of the screen, so a result with rows scrolled under its sticky buttons).
 */
const DEPTH = 3;
export const GAME_WINDOW_IDS: readonly string[] = Array.from({ length: DEPTH }, (_, i) => `game.window.${i + 1}`);
const COMPONENT = 'gameWindow';
const BODY_SLOT = 'body';
/** `data-popup-variant` of a game window: a skin may single game windows out (`[data-popup-variant=game]`). */
const VARIANT = 'game';

interface GameWindowProps extends PopupProps {
  readonly text?: string;
  readonly body?: (root: HTMLElement) => void | (() => void);
}

/** The game's content as a block of the kit popup: a `<slot>` in the kit's text block. */
const bodySlot = (): PopupBlock => ({ kind: 'text',
  text: view('slot', { name: BODY_SLOT, 'data-part': 'game-body' }) as ViewNode as unknown as string });

function popupProps(props: GameWindowProps): PopupProps {
  const { text, body, ...rest } = props;
  const content: PopupBlock[] = [...(text ? [{ kind: 'text' as const, text }] : []), ...(body ? [bodySlot()] : [])];
  return { ...rest, content };
}

const bodies = new WeakMap<HTMLElement, { root: HTMLElement; off?: () => void }>();

/** The kit popup with the game's body in its slot. */
export const gameWindow: KitComponent<GameWindowProps> = Object.freeze({
  presentation: 'fullscreen' as const,
  mount(container: HTMLElement, props: GameWindowProps): void {
    popup.mount(container, popupProps(props));
    if (!props.body) return;
    const root = container.ownerDocument.createElement('div');
    root.slot = BODY_SLOT;
    root.dataset['part'] = 'game-window-body';
    container.append(root);
    let off: void | (() => void) = undefined;
    try { off = props.body(root); } catch (error) { console.warn('game window body failed', error); }
    bodies.set(container, { root, ...(typeof off === 'function' ? { off } : {}) });
  },
  update(container: HTMLElement, props: GameWindowProps): void {
    popup.update(container, popupProps(props));
  },
  unmount(container: HTMLElement): void {
    const body = bodies.get(container);
    bodies.delete(container);
    try { body?.off?.(); } catch (error) { console.warn('game window body cleanup failed', error); }
    body?.root.remove();
    popup.unmount(container);
  },
});

interface Opener { open(elementId: string, props?: ShellProps): ShellTicket }

interface Open { picked?: string }

export interface GameWindowsHost {
  /** Shell module with the game window elements (add it to the shell). */
  readonly module: ShellModule;
  readonly windows: GameWindows;
  /** Closes every game window (the screen that opened them is left). */
  release(): void;
}

export function createGameWindows(shell: () => Opener | undefined, order: WindowOrder): GameWindowsHost {
  const open = new Map<string, Open>();
  const tickets = new Map<string, { close(): void }>();
  let host: { close(elementId: string): void } | undefined;
  const module: ShellModule = {
    manifest: { id: 'starter.game-windows', ui: { contributes: GAME_WINDOW_IDS.map((id) => ({
      id, kind: 'popup' as const, slot: 'overlay' as const, component: COMPONENT, order: 900,
      popupKind: 'alert' as const })) } },
    components: { [COMPONENT]: gameWindow as KitComponent<never> },
    intent(id, intent, payload) {
      const state = open.get(id);
      if (!state || intent !== 'action') return;
      // A button: its id is the result; every button closes the window.
      const picked = payload?.['id'];
      state.picked = typeof picked === 'string' && picked ? picked : 'close';
      host?.close(id);
    },
    attach(value) { host = value; return () => { host = undefined; }; },
  };
  const windows: GameWindows = {
    open(spec: GameWindowSpec): GameWindowTicket {
      const id = GAME_WINDOW_IDS.find((item) => !open.has(item));
      if (!id) throw new Error(`GAME_WINDOW_DEPTH: more than ${DEPTH} game windows at once`);
      const target = shell();
      if (!target) throw new Error('UI shell is not mounted');
      const dismissible = spec.dismissible !== false;
      // Props of the window (`elementId`, `lang`, `emitIntent` are added by the shell). `closable`
      // is the kit popup's close button and Esc; `dismissible` the shell's Esc and tap on the dim.
      const extra: Omit<GameWindowProps, 'elementId' | 'lang' | 'emitIntent'> & { dismissible: boolean } = {
        title: spec.title, variant: VARIANT, closable: dismissible, dismissible,
        // A landscape phone: the header picture left, the content and the buttons right (kit popup).
        layout: 'landscape',
        ...(spec.header ? { header: spec.header } : {}),
        ...(spec.actions ? { actions: spec.actions.map((action) => ({ ...action })) } : {}),
        ...(spec.text ? { text: spec.text } : {}), ...(spec.body ? { body: spec.body } : {}) };
      const state: Open = {};
      open.set(id, state);
      let resolve!: (value: string) => void;
      const result = new Promise<string>((done) => { resolve = done; });
      let ticket: { closed: Promise<void>; close(): void };
      try {
        ticket = order.open('game', () => target.open(id, extra));
      } catch (error) { open.delete(id); throw error; }
      tickets.set(id, ticket);
      const done = (): void => { open.delete(id); tickets.delete(id); resolve(state.picked ?? 'close'); };
      void ticket.closed.then(done, done);
      return { result, close: () => ticket.close() };
    },
  };
  return { module, windows, release: () => { for (const ticket of [...tickets.values()]) ticket.close(); } };
}

/**
 * Layers over the whole screen (`ctx.overlay`): a child of the shell root (`.mpg-shell`), fixed
 * to the viewport (`[data-part=game-overlay]` in SHELL_LAYOUT of src/shell/skin.ts) — over the top
 * bar, the HUD and the screen, under the windows. Not inside the screen slot: the shell paints the
 * screen slot with `contain: paint`, which makes it the box of every `position: fixed` element in
 * it — a veil drawn by a screen would stop at the slot's edges.
 */
export interface Overlays {
  open(options?: OverlayOptions): GameOverlay;
  /** Removes every layer (the screen that made them is left). */
  clear(): void;
}

export function createOverlays(shellRoot: () => HTMLElement | undefined): Overlays {
  const live = new Set<GameOverlay>();
  return {
    open(options = {}) {
      const parent = shellRoot();
      if (!parent) throw new Error('UI shell is not mounted');
      const root = parent.ownerDocument.createElement('div');
      root.dataset['part'] = 'game-overlay';
      if (options.dim !== false) root.dataset['dim'] = '';
      parent.append(root);
      let off: void | (() => void) = undefined;
      try { off = options.draw?.(root); } catch (error) { console.warn('overlay draw failed', error); }
      const layer: GameOverlay = { root, remove() {
        if (!live.delete(layer)) return;
        try { if (typeof off === 'function') off(); } catch (error) { console.warn('overlay cleanup failed', error); }
        root.remove();
      } };
      live.add(layer);
      return layer;
    },
    clear() { for (const layer of [...live]) layer.remove(); },
  };
}
