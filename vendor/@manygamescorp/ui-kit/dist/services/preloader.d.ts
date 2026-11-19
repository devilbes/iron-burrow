import { type KitComponent, type ViewNode } from '../core.js';
import { type FeatureProps } from '../features/shared.js';
export interface PreloaderProps extends FeatureProps {
    readonly game: string;
    readonly progress?: number;
    readonly status?: string;
    readonly caption?: string;
    readonly error?: string;
    readonly loading?: boolean;
}
export declare function preloaderView(p: PreloaderProps): ViewNode;
export declare const preloader: KitComponent<PreloaderProps>;
//# sourceMappingURL=preloader.d.ts.map