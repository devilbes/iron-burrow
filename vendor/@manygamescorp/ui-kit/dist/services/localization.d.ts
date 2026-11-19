import { type KitText } from './login-strings.js';
export interface KitLocalization {
    locale(): string;
    t: KitText;
    subscribe?(refresh: () => void): () => void;
}
export declare function localizedText(context?: KitLocalization): KitText;
//# sourceMappingURL=localization.d.ts.map