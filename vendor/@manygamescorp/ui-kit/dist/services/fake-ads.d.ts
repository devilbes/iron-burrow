import { type KitLocalization } from './localization.js';
export interface FakeAdShow {
    readonly format: 'rewarded' | 'rewarded_interstitial' | 'interstitial' | 'app_open' | 'banner';
    readonly unitKey: string;
    readonly customData: string | undefined;
    readonly durationSec: number;
    readonly closeAfterSec: number;
    rewarded(): void;
    closed(): void;
}
export interface FakeAdView {
    width?(): number;
    banner?(unitKey: string, options: {
        position: 'top' | 'bottom';
        background: string;
        size: string;
    }, height: number): () => void;
    present(show: FakeAdShow): () => void;
}
export declare function domFakeAdView(root?: () => HTMLElement, localization?: KitLocalization): FakeAdView;
//# sourceMappingURL=fake-ads.d.ts.map