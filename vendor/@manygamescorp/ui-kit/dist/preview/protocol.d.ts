export declare const PROTOCOL_VERSION = 1;
export declare const MAX_MESSAGE_BYTES: number;
export declare const MAX_MODULES = 64;
export declare const MODULE_ID: RegExp;
export type PreviewScreen = 'main' | 'core' | `window:${string}`;
export type PreviewOrientation = 'portrait' | 'landscape';
export type PreviewErrorCode = 'invalid_message' | 'unknown_module' | 'settings_invalid' | 'render_failed';
export interface PreviewModuleInput {
    readonly id: string;
    readonly version?: string;
    readonly settings: Readonly<Record<string, unknown>>;
}
export interface PreviewMessage {
    readonly type: 'preview';
    readonly v: 1;
    readonly seq: number;
    readonly settings: Readonly<Record<string, unknown>>;
    readonly modules: readonly PreviewModuleInput[];
    readonly screen: PreviewScreen;
    readonly orientation: PreviewOrientation;
    readonly locale?: string;
}
export type FrameMessage = {
    readonly type: 'ready';
    readonly v: 1;
} | {
    readonly type: 'rendered';
    readonly v: 1;
    readonly seq: number;
} | {
    readonly type: 'error';
    readonly v: 1;
    readonly seq: number;
    readonly code: PreviewErrorCode;
    readonly moduleId?: string;
};
export type Parsed = {
    readonly ok: true;
    readonly message: PreviewMessage;
} | {
    readonly ok: false;
    readonly seq: number;
};
export declare const isPanelOrigin: (origin: string, origins?: readonly string[]) => boolean;
export declare function parsePreviewMessage(data: unknown): Parsed;
export declare const langOf: (locale: string | undefined) => "ru" | "en";
export declare function isAllowedImage(value: unknown, pageOrigin: string): value is string;
//# sourceMappingURL=protocol.d.ts.map