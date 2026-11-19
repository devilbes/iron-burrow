import type { ShellModule, ShellProps, ShellTicket } from '../shell.js';
import { type ErrorKind, type ErrorL10n } from './error.js';
export declare const STANDARD_WINDOWS: readonly ["error", "popup", "confirm", "settings"];
export type StandardWindowName = (typeof STANDARD_WINDOWS)[number];
export interface StandardWindowsModule extends ShellModule {
    readonly elementId: (name: StandardWindowName) => string;
}
export interface StandardWindowsOptions {
    readonly text?: ErrorL10n;
}
export declare function standardWindowsModule(options?: StandardWindowsOptions): StandardWindowsModule;
export interface WindowsPort {
    register(module: string, windows: Readonly<Record<string, {
        canShow(context: Readonly<Record<string, unknown>>): boolean | Promise<boolean>;
        open(params?: Readonly<Record<string, unknown>>): {
            readonly closed: Promise<unknown>;
            close(): void;
        };
    }>>): () => void;
}
export interface StandardWindowsShell {
    open(elementId: string, props?: ShellProps): ShellTicket;
}
export declare function registerStandardWindows(windows: WindowsPort, shell: StandardWindowsShell, module: Pick<StandardWindowsModule, 'elementId'>): () => void;
export interface WindowQueuePort {
    show(name: string, params?: Readonly<Record<string, unknown>>, options?: {
        readonly priority?: number;
    }): {
        readonly closed: Promise<void>;
    };
}
export declare const STANDARD_WINDOW_PRIORITY: Readonly<Record<StandardWindowName, number>>;
export interface ShowErrorParams extends Readonly<Record<string, unknown>> {
    readonly code?: string;
    readonly kind?: ErrorKind;
    readonly onRetry?: () => void;
}
export interface StandardWindowsApi {
    showError(params: ShowErrorParams): Promise<void>;
    showPopup(params: Readonly<Record<string, unknown>>): Promise<void>;
    showConfirm(params: Readonly<Record<string, unknown>>): Promise<void>;
    showSettings(params?: Readonly<Record<string, unknown>>): Promise<void>;
}
export declare function standardWindowsApi(queue: WindowQueuePort): StandardWindowsApi;
//# sourceMappingURL=standard-windows.d.ts.map