import type { EventBus } from './bus-types.js';
import type { Poller } from './poller.js';
export interface PollerController extends Poller {
    start(): void;
    dispose(): void;
}
export declare function createPoller(bus: Pick<EventBus, 'on'>, now: () => number): PollerController;
//# sourceMappingURL=poller-controller.d.ts.map