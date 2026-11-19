import type { ViewNode } from '../core.js';
import { type FeatureProps } from './shared.js';
export declare function spanText(p: Pick<FeatureProps, 'lang' | 'l10n'>, ms: number): string;
export declare function clockText(ms: number): string;
export declare function iconOr(name: string, size: number): ViewNode;
export declare function checkIcon(size: number): ViewNode;
export declare function lockIcon(size: number): ViewNode;
export declare function clockIcon(size: number): ViewNode;
export declare function stopwatchIcon(size: number, chip?: boolean): ViewNode;
export declare function videoIcon(size: number): ViewNode;
export declare function sparkle(size: number, tone: 'gold' | 'violet' | 'white', slot: number): ViewNode;
//# sourceMappingURL=daily-parts.d.ts.map