import { type StorageOptions } from './scoped.js';
export interface AccountCard {
    readonly uid: number;
    readonly gid: number;
    readonly name: string;
    readonly maskedEmail: string;
    readonly avatar?: string;
}
export declare function createAccountHistory(options: StorageOptions): {
    list: () => readonly AccountCard[];
    clear(): void;
    remember(input: AccountCard): void;
};
//# sourceMappingURL=account-history.d.ts.map