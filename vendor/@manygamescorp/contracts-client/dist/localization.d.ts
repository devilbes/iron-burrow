/** Формы плюрала: узел, у которого все ключи начинаются с `@`; `@other` обязателен. */
export type PluralForms = {
    /** Fallback plural form, used when no more specific category matches. */
    readonly '@other': string;
} & {
    readonly [form: `@${string}`]: string;
};
/** Дерево строк по сегментам ключа (`{ shop: { title: '…' } }`), глубина ключа ≤ 8. */
export interface StringTree {
    readonly [segment: string]: string | PluralForms | StringTree;
}
//# sourceMappingURL=localization.d.ts.map