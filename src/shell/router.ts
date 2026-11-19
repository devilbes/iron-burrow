import type { Sdk } from '@manygamescorp/core/kernel';
import type { KitComponent } from '@manygamescorp/ui-kit/core';
import type { ShellModule, UiShell } from '@manygamescorp/ui-kit/shell';
import type { GamePorts } from '../modules/game/index.js';
import { GAMEPLAY, screens, type Route, type ScreenContext } from '../screens/index.js';

export const HOME: Route = 'home';
/** Gameplay routes (`GAMEPLAY` of the screens) use the `core` context, the others `main`. */
export const routeContext = (route: string): string => (GAMEPLAY.has(route as Route) ? 'core' : 'main');

/** ScreenContext of the screens on the real SDK and shell; `layers`: game windows and overlays (windows/game.ts), the pause signal (suspend.ts). */
export function createScreenContext(sdk: () => Sdk, shell: () => UiShell | undefined,
  game: GamePorts, layers: Pick<ScreenContext, 'window' | 'overlay' | 'onSuspend'>): ScreenContext {
  return { t: (key, params) => sdk().l10n.t(key, params), go: (route) => shell()?.navigate(route), game,
    window: layers.window, overlay: (options) => layers.overlay(options),
    onSuspend: (handler) => layers.onSuspend(handler) };
}

/**
 * A screen as a kit component: mount/unmount of the screen in the shell screen slot; `left` runs
 * after a screen is removed (its windows and overlays go with it).
 */
function screenComponent(route: Route, ctx: () => ScreenContext, shown: () => void,
  left: () => void): KitComponent<never> {
  const mounted = new WeakMap<HTMLElement, () => void>();
  return {
    mount(container) {
      container.dataset['route'] = route;
      mounted.set(container, screens[route](container, ctx()));
      shown();
    },
    update() { /* screens redraw themselves */ },
    unmount(container) { mounted.get(container)?.(); mounted.delete(container); left(); },
  };
}

/**
 * Shell module with the routes of the screens; `shown` runs after every screen is drawn, `left`
 * after every screen is removed.
 */
export function screensModule(ctx: () => ScreenContext, shown: () => void,
  left: () => void = () => undefined): ShellModule {
  const routes = Object.keys(screens) as Route[];
  return {
    manifest: { id: 'starter.screens', ui: { contributes: routes.map((route) => ({
      id: route, kind: 'route' as const, slot: 'screen' as const, component: route })) } },
    components: Object.fromEntries(routes.map((route) => [route, screenComponent(route, ctx, shown, left)])),
  };
}
