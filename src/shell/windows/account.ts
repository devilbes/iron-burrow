import { AUTH_PLAYER_CHANGED, SDK_RELOAD_REQUIRED, type Sdk } from '@manygamescorp/core/kernel';
import { AUTH_FLOW_INTENTS, createAuthFlow, type AuthFlowController } from '@manygamescorp/core/auth-flow';
import { login } from '@manygamescorp/ui-kit/services/login';
import type { ShellHost, ShellModule, ShellProps } from '@manygamescorp/ui-kit/shell';

const ID_WINDOW = 'starter.window.id';

/**
 * ManyPlay ID of the player: the kit's `login` window over the core sign-in flow
 * (`createAuthFlow`). The settings button «Sign in» (`settings.account`) opens it: a guest gets
 * sign-in (e-mail and code; other providers as the platform enables them), a signed-in player
 * the account window (nickname, sign out). A player change goes through the SDK as always
 * (`sdk:reload:required` → `auth:playerChanged`, `src/boot/start.ts`): the window waits for the
 * game to be ready for the new player (`playerReady`) and then closes itself.
 * It is a shell module, not an SDK module: the SDK stops its modules while the player changes,
 * the sign-in flow must outlive that.
 */
export interface AccountWindow {
  readonly shell: ShellModule;
  /** Guest: sign-in; signed in: the account window. */
  open(): void;
  /** `account` of the kit settings window: `undefined` for a guest (the button reads «Sign in»). */
  account(): { readonly name: string } | undefined;
}

export function createAccountWindow(sdk: () => Sdk,
  playerReady: (gid: number) => Promise<void>): AccountWindow {
  let flow: AuthFlowController | undefined;
  let host: ShellHost | undefined;
  let shown = false;
  const ensure = (): AuthFlowController => {
    if (flow) return flow;
    const auth = sdk().auth;
    if (!auth) throw new Error('auth is not available');
    const created = createAuthFlow({ auth, platform: 'web', now: () => sdk().time.now(),
      subscribePlayerChanged: (listener) => sdk().bus.on(AUTH_PLAYER_CHANGED, () => listener()),
      subscribeSessionEnded: (listener) => sdk().bus.on<{ reason?: string }>(SDK_RELOAD_REQUIRED,
        (event) => { if (event?.reason === 'revoked') listener(); }),
      waitForPlayerReady: playerReady,
      writeClipboard: (value) => navigator.clipboard.writeText(value),
      readClipboard: () => navigator.clipboard.readText() });
    created.subscribe((state) => {
      if (state.step === 'done' || state.step === 'closed') host?.close(ID_WINDOW);
      else host?.update(ID_WINDOW);
    });
    flow = created;
    return created;
  };
  const signedIn = (): boolean => {
    const session = sdk().auth?.session;
    return !!session && !session.anonymous;
  };
  const open = (): void => {
    if (!host) return;
    const controller = ensure();
    void controller.open(signedIn() ? 'profile' : 'start').catch(() => undefined);
    if (shown) return;
    shown = true;
    void host.open(ID_WINDOW).closed.then(() => {
      shown = false;
      if (controller.state.step !== 'closed' && controller.state.step !== 'done') {
        void controller.intent('cancel').catch(() => undefined);
      }
    });
  };
  const shell: ShellModule = {
    manifest: { id: 'starter.id', ui: { contributes: [{ id: ID_WINDOW, kind: 'window',
      slot: 'overlay', component: 'login', popupKind: 'fullscreen' }] } },
    components: { login } as unknown as ShellModule['components'],
    props: (id): ShellProps => (id !== ID_WINDOW ? {} : { state: ensure().state, platform: 'web',
      game: sdk().l10n.t('shell.title'), lang: sdk().l10n.locale(), orientation: 'auto',
      now: () => sdk().time.now() }),
    intent: (id, intent, payload) => {
      if (id !== ID_WINDOW) return;
      if (intent === 'close') { host?.close(ID_WINDOW); return; }
      if (intent === 'account-switch') { void ensure().open('start').catch(() => undefined); return; }
      if (AUTH_FLOW_INTENTS.includes(intent)) void ensure().intent(intent, payload).catch(() => undefined);
    },
    attach: (value) => {
      host = value;
      return () => { host = undefined; flow?.dispose(); flow = undefined; shown = false; };
    },
  };
  return { shell, open,
    account: () => (signedIn() ? { name: flow?.state.accountDetails?.nickname
      ?? sdk().l10n.t('shell.account.signedIn') } : undefined) };
}
