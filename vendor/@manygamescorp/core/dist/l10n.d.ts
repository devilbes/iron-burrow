import type { StringTree } from '@manygamescorp/contracts-client/localization';
export type { StringTree, PluralForms } from '@manygamescorp/contracts-client/localization';
import type { EventBus } from './bus.js';
import { SDKError } from './error.js';
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export interface LocaleInfo {
    readonly tag: string;
    readonly name: string;
    readonly status: 'published' | 'draft';
}
export interface L10nIndex {
    readonly defaultLocale?: string;
    readonly locales: readonly LocaleInfo[];
}
export interface L10nCacheMeta {
    readonly etag?: string;
    readonly sha256: Readonly<Record<string, string>>;
    readonly version: Readonly<Record<string, number>>;
}
export interface L10nLoadRequest {
    readonly chain: readonly string[];
    readonly prev?: L10nCacheMeta;
    readonly signal: AbortSignal;
}
export interface L10nLoadResult {
    readonly status: 'updated' | 'not-modified';
    readonly index?: L10nIndex;
    readonly bundles?: Readonly<Record<string, StringTree>>;
    readonly blobs?: Readonly<Record<string, Uint8Array>>;
    readonly meta: L10nCacheMeta;
}
export interface L10nSource {
    readonly origin?: 'cache' | 'network';
    readCache?(request: L10nLoadRequest): Promise<L10nLoadResult | undefined>;
    load(request: L10nLoadRequest): Promise<L10nLoadResult>;
}
export declare const L10N_READY_EVENT = "l10n:core:ready", L10N_LOCALE_CHANGED_EVENT = "l10n:locale:changed", L10N_STRINGS_UPDATED_EVENT = "l10n:strings:updated", L10N_LOCALE_FACT = "l10n.locale", L10N_INVALID = "SDK_L10N_INVALID";
export interface L10nReadyPayload {
    readonly locale: string;
    readonly source: 'cache' | 'network' | 'builtin';
}
export interface L10nLocaleChangedPayload {
    readonly from: string;
    readonly to: string;
    readonly reason: 'explicit' | 'system' | 'default' | 'index';
}
export interface L10nStringsUpdatedPayload {
    readonly locales: readonly string[];
}
export interface L10nStats {
    readonly missing: number;
    readonly missingKeys: readonly string[];
    readonly fallbackHits: number;
}
export type L10nParams = Readonly<Record<string, string | number>>;
export interface L10nNamespace {
    t(key: string, params?: L10nParams): string;
    errorText(err: SDKError): string;
    has(key: string): boolean;
    locale(): string;
    chain(): readonly string[];
    available(): readonly LocaleInfo[];
    setLocale(tag: string | null): Promise<void>;
    registerDefaults(ns: string, bundles: Readonly<Record<string, StringTree>>): void;
    ready(): Promise<void>;
    stats(): L10nStats;
    plural(locale: string, n: number): PluralCategory;
}
export type L10nCaller = {
    readonly kind: 'core';
} | {
    readonly kind: 'game';
} | {
    readonly kind: 'module';
    readonly id: string;
};
export interface L10nOptions {
    readonly defaultLocale: string;
    readonly supported?: readonly string[];
    readonly readyTimeoutMs?: number;
    readonly applyUpdates?: 'immediate' | 'next-start';
}
export interface L10nStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface L10nDeps {
    readonly portalLocale?: () => {
        readonly locale: string;
        readonly fallback: readonly string[];
    } | undefined;
    readonly bus: EventBus;
    readonly appCode: string;
    readonly source?: L10nSource;
    readonly storage?: L10nStorage;
    readonly device?: {
        info(): {
            readonly languages?: readonly string[];
            readonly locale?: string;
        };
    };
    readonly facts?: {
        set(key: string, value: unknown): void;
    };
    readonly track?: (event: string, props: Readonly<Record<string, unknown>>, options: {
        readonly type: 'telemetry';
    }) => void;
    readonly debug?: boolean;
    readonly warn?: (message: string) => void;
    readonly moduleIds?: () => Iterable<string>;
}
export interface L10nEngine extends L10nNamespace {
    start(): Promise<void>;
    refresh(force?: boolean): Promise<void>;
    recompute(): Promise<void>;
    resetIdentity(): void;
    view(caller: L10nCaller): L10nNamespace;
    flush(): void;
    dispose(): void;
}
export declare const canonicalLocale: (tag: unknown) => string | undefined;
export declare const matchLocale: (candidate: string, available: readonly string[]) => string | undefined;
export declare function createL10n(options: L10nOptions, deps: L10nDeps): L10nEngine;
//# sourceMappingURL=l10n.d.ts.map