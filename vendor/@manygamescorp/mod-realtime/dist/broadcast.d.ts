import type { RealtimeView } from '@manygamescorp/core/realtime-port';
export interface BroadcastNotice {
    readonly id: string;
    readonly kind: 'announcement' | 'maintenance' | 'update';
    readonly title: string;
    readonly text: string;
    readonly imageUrl?: string;
    readonly linkUrl?: string;
    readonly required?: boolean;
    readonly startsAt?: string;
    readonly endsAt?: string;
}
export interface BroadcastOptions {
    readonly appVersion?: string | undefined;
    readonly reload?: () => void | Promise<void>;
}
interface Effects extends BroadcastOptions {
    readonly reload: () => void | Promise<void>;
    readonly refresh: () => Promise<unknown>;
    readonly locale: string;
    readonly notice: (value: BroadcastNotice | undefined) => void;
}
export declare function handleBroadcasts(view: RealtimeView, signal: AbortSignal, effects: Effects, now: () => number, random?: () => number): () => void;
export {};
//# sourceMappingURL=broadcast.d.ts.map