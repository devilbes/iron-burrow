import type { UiWindowTicket, UiZones } from './zones.js';
export interface WindowPort {
    register(windows: Readonly<Record<string, {
        canShow(context: Readonly<Record<string, unknown>>): boolean | Promise<boolean>;
        open(params?: Readonly<Record<string, unknown>>, context?: Readonly<Record<string, unknown>>): UiWindowTicket;
    }>>): () => void;
    show(name: string, params?: Readonly<Record<string, unknown>>, options?: {
        readonly priority?: number;
        readonly source?: 'trigger' | 'user';
    }): UiWindowTicket;
}
export declare function attachWindowQueue(zones: UiZones, windows: WindowPort): () => void;
//# sourceMappingURL=window-port.d.ts.map