import type { Sdk } from '@manygamescorp/core/kernel';
import { defineModule, type ModuleContext, type ModuleDefinition, type Permission } from
  '@manygamescorp/core/module';
import { SDKError } from '@manygamescorp/core/error';
import type { KitComponent } from '@manygamescorp/ui-kit/core';
import type { ShellContribution, ShellHost, ShellModule, ShellProps } from '@manygamescorp/ui-kit/shell';
import { standardWindowsApi } from '@manygamescorp/ui-kit/services/standard-windows';

/**
 * Why presenters exist at all. In SDK rc.30 a module window (`iap.main`, `leaderboards.main`,
 * `daily-rewards.main`) opened by a `ui.windows` trigger only announces itself
 * on the bus (`<module>:window:open`); nothing in the SDK or UI Kit mounts the stock window or
 * fills it with the module's data, and the queue waits for `<module>:window:closed`. A presenter
 * is that missing glue: it mounts the stock UI Kit component with the module's data, forwards
 * the window's intents to the module API and reports the close. It draws nothing itself.
 */
export interface PresenterRuntime {
  readonly sdk: () => Sdk;
  readonly ctx: () => ModuleContext | undefined;
  /** API of a module this host uses; `undefined` while it is not started (or failed). */
  readonly module: <T>(id: string) => T | undefined;
  readonly host: () => ShellHost | undefined;
  /** Re-renders an open window of this host. */
  readonly refresh: (elementId?: string) => void;
  /** Standard `ui.error` window by SDK error code (texts `kit.error.*` through l10n). */
  readonly fail: (error: unknown) => void;
  /** Common window props: readiness and the player key (drafts reset on a player change). */
  readonly common: () => ShellProps;
  /** Opens a window and calls `done` once when it is gone (any close path). */
  readonly open: (elementId: string, done?: () => void) => boolean;
}

export interface PresenterPart {
  readonly contributes: readonly ShellContribution[];
  readonly components: Readonly<Record<string, KitComponent<never>>>;
  readonly permissions?: readonly Permission[];
  /** SDK modules this part calls through `ctx.sdk`. */
  readonly uses?: readonly string[];
  readonly emits?: readonly string[];
  readonly listens?: readonly string[];
  /** Props of one of this part's elements; `undefined` for an element it does not own. */
  props(elementId: string): ShellProps | undefined;
  intent(elementId: string, intent: string, payload?: ShellProps): void;
  start(ctx: ModuleContext): void | Promise<void>;
  stop(): void;
}

export interface WindowsHost {
  readonly module: ModuleDefinition;
  readonly shell: ShellModule;
}

/**
 * One SDK module (bus, http, window queue access) plus one shell module (components, props,
 * intents) for all presenter parts.
 */
export function createWindowsHost(sdk: () => Sdk,
  build: (runtime: PresenterRuntime) => readonly PresenterPart[]): WindowsHost {
  let context: ModuleContext | undefined;
  let shellHost: ShellHost | undefined;
  const runtime: PresenterRuntime = {
    sdk, ctx: () => context, host: () => shellHost,
    module: <T>(id: string): T | undefined => {
      try { return context?.sdk[id] as T | undefined; } catch { return undefined; }
    },
    refresh: (elementId) => shellHost?.update(elementId),
    fail: (error) => {
      const raw = (error as { code?: unknown } | null)?.code;
      const code = error instanceof SDKError ? error.code : typeof raw === 'string' ? raw : 'ERROR';
      try { void standardWindowsApi(sdk().ui).showError({ code }).catch(() => undefined); } catch {
        /* the queue refuses while the SDK reloads for another player */
      }
    },
    common: () => ({ ready: context !== undefined, busy: false,
      playerKey: String(sdk().auth?.session?.gid ?? '') }),
    open: (elementId, done) => {
      const ticket = shellHost?.open(elementId);
      if (!ticket) { done?.(); return false; }
      const finish = (): void => done?.();
      void ticket.closed.then(finish, finish);
      return true;
    },
  };
  const parts = build(runtime);
  const unique = <T>(list: readonly (readonly T[] | undefined)[]): T[] =>
    [...new Set(list.flatMap((items) => items ?? []))];
  const module = defineModule<object>({
    manifest: { id: 'starter.windows', version: '1.0.0', kind: 'game', engines: { core: '^1.0.0' },
      targets: ['web'], load: 'eager', entry: 'shell/windows/presenter.js',
      permissions: unique([['windows'], ...parts.map((part) => part.permissions)]),
      sdk: { uses: unique(parts.map((part) => part.uses)) },
      // Start after the modules it presents (all optional: a missing one hides its window).
      optional: Object.fromEntries(unique(parts.map((part) => part.uses)).map((id) => [id, '^1.0.0'])),
      events: { emits: unique(parts.map((part) => part.emits)),
        listens: unique(parts.map((part) => part.listens)) } },
    init() {},
    async start(ctx) {
      context = ctx;
      for (const part of parts) await part.start(ctx);
    },
    async stop() { context = undefined; for (const part of parts) part.stop(); },
    async dispose() { context = undefined; for (const part of parts) part.stop(); },
    api: () => ({}),
  });
  const owner = (elementId: string): PresenterPart | undefined =>
    parts.find((part) => part.contributes.some((item) => item.id === elementId));
  const shell: ShellModule = {
    manifest: { id: module.manifest.id, ui: { contributes: parts.flatMap((part) => part.contributes) } },
    components: Object.assign({}, ...parts.map((part) => part.components)) as ShellModule['components'],
    props: (elementId) => owner(elementId)?.props(elementId) ?? runtime.common(),
    intent: (elementId, intent, payload) => {
      // Kit windows that draw their own frame close with `close-<window>` (e.g. `close-shop`).
      if (intent === 'close' || intent.startsWith('close-')) { shellHost?.close(elementId); return; }
      owner(elementId)?.intent(elementId, intent, payload);
    },
    attach: (host) => { shellHost = host; return () => { shellHost = undefined; }; },
  };
  return { module, shell };
}

/** A window element of the overlay layer, sized as a content window. */
export function windowContribution(id: string, component: string,
  service: string): ShellContribution {
  return { id, kind: 'window', slot: 'overlay', component, requiredServices: [service],
    popupKind: 'content' };
}

/** `l10n` for kit windows: the game strings over the kit defaults. */
export function kitText(sdk: Sdk): (key: string) => string {
  return (key) => (sdk.l10n.has(key) ? sdk.l10n.t(key) : key);
}
