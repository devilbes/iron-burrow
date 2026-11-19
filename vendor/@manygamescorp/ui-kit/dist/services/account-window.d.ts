import { type ViewContext, type ViewNode } from '../core.js';
import type { LoginProps } from './login-types.js';
export interface AccountLocal {
    accountLoadingVisible?: boolean;
    nickname: string;
    suggestion: string | undefined;
    accountPage: string | undefined;
    gameCount: number;
}
export declare function accountWindow<L extends AccountLocal>(props: LoginProps, ctx: ViewContext<L>): ViewNode;
//# sourceMappingURL=account-window.d.ts.map