export type AnalyticsPayload = Readonly<Record<string, unknown>>;
export interface AnalyticsProvider {
    sendEvent(name: string, payload?: AnalyticsPayload): void | Promise<void>;
}
export interface Analytics {
    sendEvent(name: string, payload?: AnalyticsPayload): void;
    registerProvider(provider: AnalyticsProvider): () => void;
}
//# sourceMappingURL=analytics.d.ts.map