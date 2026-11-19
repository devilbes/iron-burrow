export type LoginStrings = Readonly<Record<string, string>>;
export declare const LOGIN_STRINGS: Readonly<Record<'ru' | 'en', LoginStrings>>;
export declare const groupDigits: (value: number | string) => string;
export type KitText = (key: string, params?: Readonly<Record<string, string | number>>) => string;
export declare function loginText(lang?: string): KitText;
export declare function kitText(game: KitText | undefined, lang?: string): KitText;
export declare const clock: (ms: number) => string;
export declare function loginErrorText(text: KitText, error: {
    readonly code: string;
    readonly retryAfterMs?: number;
    readonly attemptsLeft?: number;
} | undefined, provider?: string): string | undefined;
//# sourceMappingURL=login-strings.d.ts.map