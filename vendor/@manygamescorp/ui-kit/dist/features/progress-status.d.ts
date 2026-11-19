import { type FeatureProps } from './shared.js';
import type { ViewNode } from '../core.js';
export interface ProgressReadProps {
    readonly loading?: boolean;
    readonly error?: string;
}
export declare const readNotice: (p: FeatureProps & ProgressReadProps) => ViewNode | null;
//# sourceMappingURL=progress-status.d.ts.map