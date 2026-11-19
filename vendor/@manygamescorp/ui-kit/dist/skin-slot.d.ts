import { type Skin, type UseSkinOptions } from './skin-spec.js';
interface SkinPackage {
    readonly package: string;
    readonly version: string;
}
export declare function createSkinSlot(options: {
    readonly load: (selection: SkinPackage, signal: AbortSignal) => Promise<Skin>;
} & Pick<UseSkinOptions, 'document' | 'dev' | 'fetch'>): {
    prepare(selection: SkinPackage | null, signal: AbortSignal): Promise<() => void>;
    dispose(): void;
};
export {};
//# sourceMappingURL=skin-slot.d.ts.map