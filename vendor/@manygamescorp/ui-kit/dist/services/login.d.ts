import type { LoginStep, LoginState, LoginProps } from './login-types.js';
import { type AccountLocal } from './account-window.js';
import { type KitComponent, type ViewContext, type ViewNode } from '../core.js';
export type { LoginProvider, LoginStep, LoginState, RememberedAccount, LoginProps, GameMetric } from './login-types.js';
interface Local extends AccountLocal {
    accountLoadingTimer?: number | undefined;
    accountLoadingVisible?: boolean;
    accountLoadingHooked?: boolean;
    email: string;
    code: string;
    composing: boolean;
    error: LoginState['error'];
    step: LoginStep | undefined;
    timer: number | undefined;
    hooked: boolean;
    focusHooked: boolean;
    opener: HTMLElement | undefined;
}
export declare const LOGIN_SCREENS: Readonly<{
    readonly start: "id-start";
    readonly email: "id-email";
    readonly code: "id-code";
    readonly confirm: "id-confirm";
    readonly 'email-required': "id-social-email";
    readonly accounts: "id-accounts";
    readonly 'switch-account': "id-accounts";
    readonly profile: "id-account";
    readonly done: "id-confirm";
    readonly 'loading-player': "id-loading";
    readonly 'signed-out': "id-start";
    readonly closed: "id-closed";
}>;
export declare function loginView(props: LoginProps, ctx: ViewContext<Local>): ViewNode;
export declare const login: KitComponent<LoginProps>;
export declare const idAccount: KitComponent<LoginProps>;
export { createPortalLogin } from './portal-login.js';
export type { PortalLoginAuth, PortalLoginOptions } from './portal-login.js';
//# sourceMappingURL=login.d.ts.map