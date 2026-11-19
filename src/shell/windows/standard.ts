import type { Sdk } from '@manygamescorp/core/kernel';
import { defineModule, type ModuleDefinition } from '@manygamescorp/core/module';
import type { ShellHost, ShellProps, ShellTicket } from '@manygamescorp/ui-kit/shell';
import { registerStandardWindows, standardWindowsModule, STANDARD_WINDOWS,
  type StandardWindowsModule } from '@manygamescorp/ui-kit/services/standard-windows';
import { registerRewardWindow, rewardWindowModule, REWARD_WINDOW, type RewardDescribe } from
  '@manygamescorp/ui-kit/services/reward-window';
import { kitText } from './presenter.js';
import type { AccountWindow } from './account.js';
import type { WindowOrder } from './order.js';

interface Opener { open(elementId: string, props?: ShellProps): ShellTicket }

const SETTINGS = 'settings';

/** A locale published without a display name is named by the browser in its own language. */
function languageName(tag: string, name: string): string {
  if (name && name !== tag) return name;
  try {
    const own = new Intl.DisplayNames([tag], { type: 'language' }).of(tag);
    return own ? own.charAt(0).toLocaleUpperCase(tag) + own.slice(1) : tag;
  } catch { return tag; }
}

/**
 * The stock `ui.settings` window with the game's languages and the player's account: the list is
 * the locales published for the app (`sdk.l10n.available()`, limited to the game's `LOCALES`),
 * the current one is marked, and a choice goes to `sdk.l10n.setLocale` — core l10n keeps the
 * player's choice itself (no KV needed). The account row («Sign in» / ManyPlay ID) opens the
 * ManyPlay ID window (`account.ts`). The window has no sound/music toggles: the game passes no
 * `values` because it has no audio.
 */
function withSettings(module: StandardWindowsModule, sdk: () => Sdk,
  account: AccountWindow): StandardWindowsModule {
  let host: ShellHost | undefined;
  return {
    ...module,
    attach(value) {
      host = value;
      const off = module.attach?.(value);
      return () => { host = undefined; off?.(); };
    },
    props(elementId, extra) {
      const base = module.props?.(elementId, extra) ?? {};
      if (elementId !== module.elementId(SETTINGS)) return base;
      const l10n = sdk().l10n;
      const languages = l10n.available().filter((item) => item.status === 'published')
        .map((item) => ({ id: item.tag, label: languageName(item.tag, item.name) }));
      const signedIn = account.account();
      return { ...base, lang: l10n.locale(), ...(languages.length ? { languages } : {}),
        ...(signedIn ? { account: signedIn } : {}) };
    },
    intent(elementId, intent, payload) {
      const tag = payload?.['id'];
      if (elementId === module.elementId(SETTINGS) && intent === 'language' && typeof tag === 'string') {
        void sdk().l10n.setLocale(tag).catch(() => undefined);
        return;
      }
      // The account row of the kit settings: `open` with `{ id: 'account' }`.
      if (elementId === module.elementId(SETTINGS) && intent === 'open' && tag === 'account') {
        host?.close(elementId);
        account.open();
        return;
      }
      module.intent?.(elementId, intent, payload);
    },
  };
}

/** A queue owner module that only registers a kit window on every start (no drawing). */
function windowOwner(id: string, register: (windows: NonNullable<Parameters<
  NonNullable<ModuleDefinition['start']>>[0]['windows']>) => () => void): ModuleDefinition {
  let off: (() => void) | undefined;
  const release = (): void => { off?.(); off = undefined; };
  return defineModule({
    manifest: { id, version: '1.0.0', kind: 'game', engines: { core: '^1.0.0' }, targets: ['web'],
      permissions: ['windows'], load: 'eager', entry: 'shell/windows/standard.js', events: { emits: [] } },
    init() {},
    async start(ctx) { release(); if (ctx.windows) off = register(ctx.windows); },
    async stop() { release(); },
    async dispose() { release(); },
    api: () => ({}),
  });
}

/**
 * Stock windows of the kit in the SDK window queue: `ui.error`, `ui.popup`, `ui.confirm`,
 * `ui.settings` and `ui.reward`. The queue knows a window by its owner module, so the game
 * installs one tiny owner per window name; the kit draws, triggers (`ui.windows/main`) decide
 * when. `ui.reward` is opened only by the `inventory:items:granted` trigger; it never stands
 * over a game window (`ctx.window`) nor under one — `order` (order.ts) opens it after them.
 */
export interface StandardWindows {
  readonly shellModules: readonly [StandardWindowsModule, ReturnType<typeof rewardWindowModule>];
  readonly sdkModules: readonly ModuleDefinition[];
}

export function createStandardWindows(sdk: () => Sdk, shell: () => Opener | undefined,
  describe: RewardDescribe, account: AccountWindow, order: WindowOrder): StandardWindows {
  const standard = withSettings(standardWindowsModule({ text: (key) => kitText(sdk())(key) }), sdk,
    account);
  const opener: Opener = { open: (elementId, props) => {
    const target = shell();
    if (!target) throw new Error('UI shell is not mounted');
    return target.open(elementId, props);
  } };
  const owners = STANDARD_WINDOWS.map((name) => windowOwner(`ui.${name}`, (windows) =>
    registerStandardWindows({ register: (module, entries) =>
      module === `ui.${name}` ? windows.register(entries) : () => undefined }, opener, standard)));
  const rewardOpener: Opener = { open: (elementId, props) => order.open('reward', () => opener.open(elementId, props)) };
  const reward = windowOwner(REWARD_WINDOW, (windows) => registerRewardWindow({
    register: (module, entries) => module === REWARD_WINDOW ? windows.register(entries) : () => undefined,
  }, rewardOpener, { describe }));
  return { shellModules: [standard, rewardWindowModule()], sdkModules: [...owners, reward] };
}
