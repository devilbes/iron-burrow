import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, button, dialog } from '../features/shared.js';
const MAX_ACTIONS = 3;
export const ERROR_STRINGS = Object.freeze({
    ru: Object.freeze({
        'kit.error.title': 'Не получилось',
        'kit.error.text': 'Действие не выполнено. Попробуйте ещё раз.',
        'kit.error.retry': 'Повторить',
        'kit.error.window': 'Не получилось',
        'kit.error.ok': 'Понятно',
        'kit.error.continue': 'Продолжить',
        'kit.error.rid': 'Код обращения',
        'kit.error.iap.title': 'Покупка не завершена',
        'kit.error.iap.text': 'Покупка не прошла. Попробуйте ещё раз.',
        'kit.error.ads.title': 'Видео недоступно',
        'kit.error.ads.text': 'Сейчас нет доступной рекламы. Попробуйте чуть позже — награда никуда не денется.',
        'kit.error.network.title': 'Нет соединения',
        'kit.error.network.text': 'Проверьте интернет и попробуйте ещё раз.',
        'kit.error.SDK_IAP_NETWORK_ERROR.title': 'Нет соединения',
        'kit.error.SDK_IAP_NETWORK_ERROR.text': 'Проверьте интернет и повторите — покупка не прошла.',
        'kit.error.SDK_IAP_STORE_ERROR.title': 'Покупки временно недоступны',
        'kit.error.SDK_IAP_STORE_ERROR.text': 'Магазин не отвечает. Деньги не списаны — повторите позже.',
        'kit.error.SDK_IAP_VALIDATION_FAILED.text': 'Не удалось подтвердить платёж.',
        'kit.error.SDK_IAP_NOT_AVAILABLE.text': 'Это предложение сейчас недоступно.',
        'kit.error.REWARD_GRANT_DELAYED.title': 'Награда ещё не пришла',
        'kit.error.REWARD_GRANT_DELAYED.text': 'Получение принято, но награда пока не дошла до инвентаря. Проверьте ещё раз чуть позже.',
        'kit.error.SDK_IAP_ALREADY_OWNED.title': 'Это уже куплено',
        'kit.error.SDK_IAP_ALREADY_OWNED.text': 'Покупка уже есть на вашем аккаунте — повторять не нужно.',
        'kit.error.IAP_ORDER_ALREADY_PROCESSED.title': 'Заказ уже обработан',
        'kit.error.IAP_ORDER_ALREADY_PROCESSED.text': 'Этот заказ уже выполнен — повторять покупку не нужно.',
        'kit.error.IAP_OFFER_NOT_FOUND.title': 'Предложение больше не доступно',
        'kit.error.IAP_OFFER_NOT_FOUND.text': 'Оно закончилось или снято. Загляните в магазин — там есть другие.',
        'kit.error.iap.NOT_FOUND.title': 'Предложение больше не доступно',
        'kit.error.iap.NOT_FOUND.text': 'Оно закончилось или снято. Загляните в магазин — там есть другие.',
        'kit.error.limit_offer.title': 'Лимит покупок исчерпан',
        'kit.error.limit_offer.text': 'Больше купить это предложение сейчас нельзя.',
        'kit.error.cooldown.title': 'Предложение станет доступно позже',
        'kit.error.cooldown.text': 'Загляните чуть позже — оно вернётся.',
        'kit.error.IAP_STORE_NOT_SUPPORTED.title': 'Оплата недоступна',
        'kit.error.IAP_STORE_NOT_SUPPORTED.text': 'В этом магазине приложений оплата не поддерживается.',
        'kit.error.SDK_PERMISSION_DENIED.title': 'Недоступно для аккаунта',
        'kit.error.SDK_PERMISSION_DENIED.text': 'Это действие недоступно для вашего аккаунта.',
        'kit.error.MODULE_NOT_ACTIVE.title': 'Ещё загружается',
        'kit.error.MODULE_NOT_ACTIVE.text': 'Подождите пару секунд и повторите.',
    }),
    en: Object.freeze({
        'kit.error.title': 'Something went wrong',
        'kit.error.text': 'The action failed. Please try again.',
        'kit.error.retry': 'Retry',
        'kit.error.window': 'Something went wrong',
        'kit.error.ok': 'OK',
        'kit.error.continue': 'Continue',
        'kit.error.rid': 'Support code',
        'kit.error.iap.title': 'Purchase not completed',
        'kit.error.iap.text': 'The purchase did not go through. Please try again.',
        'kit.error.ads.title': 'Video unavailable',
        'kit.error.ads.text': 'No ads are available right now. Try again a bit later — your reward will wait.',
        'kit.error.network.title': 'No connection',
        'kit.error.network.text': 'Check your internet connection and try again.',
        'kit.error.SDK_IAP_NETWORK_ERROR.title': 'No connection',
        'kit.error.SDK_IAP_NETWORK_ERROR.text': 'Check your internet connection and retry — the purchase did not go through.',
        'kit.error.SDK_IAP_STORE_ERROR.title': 'Purchases are temporarily unavailable',
        'kit.error.SDK_IAP_STORE_ERROR.text': 'The store is not responding. You were not charged — try again later.',
        'kit.error.SDK_IAP_VALIDATION_FAILED.text': 'The payment could not be confirmed.',
        'kit.error.SDK_IAP_NOT_AVAILABLE.text': 'This offer is not available now.',
        'kit.error.REWARD_GRANT_DELAYED.title': 'The reward has not arrived yet',
        'kit.error.REWARD_GRANT_DELAYED.text': 'The claim was accepted, but the reward has not reached the inventory yet. Check again a bit later.',
        'kit.error.SDK_IAP_ALREADY_OWNED.title': 'Already purchased',
        'kit.error.SDK_IAP_ALREADY_OWNED.text': 'You already own this — no need to buy it again.',
        'kit.error.IAP_ORDER_ALREADY_PROCESSED.title': 'Order already processed',
        'kit.error.IAP_ORDER_ALREADY_PROCESSED.text': 'This order is already done — no need to buy again.',
        'kit.error.IAP_OFFER_NOT_FOUND.title': 'This offer is no longer available',
        'kit.error.IAP_OFFER_NOT_FOUND.text': 'It has ended or was removed. Check the shop for others.',
        'kit.error.iap.NOT_FOUND.title': 'This offer is no longer available',
        'kit.error.iap.NOT_FOUND.text': 'It has ended or was removed. Check the shop for others.',
        'kit.error.limit_offer.title': 'Purchase limit reached',
        'kit.error.limit_offer.text': 'This offer cannot be bought again right now.',
        'kit.error.cooldown.title': 'This offer will be available later',
        'kit.error.cooldown.text': 'Come back a bit later — it will return.',
        'kit.error.IAP_STORE_NOT_SUPPORTED.title': 'Payment unavailable',
        'kit.error.IAP_STORE_NOT_SUPPORTED.text': 'Payments are not supported in this app store.',
        'kit.error.SDK_PERMISSION_DENIED.title': 'Not available for this account',
        'kit.error.SDK_PERMISSION_DENIED.text': 'This action is not available for your account.',
        'kit.error.MODULE_NOT_ACTIVE.title': 'Still loading',
        'kit.error.MODULE_NOT_ACTIVE.text': 'Wait a couple of seconds and try again.',
    }),
});
const NETWORK = /NETWORK|OFFLINE|TIMEOUT|CIRCUIT_OPEN|UPSTREAM_UNAVAILABLE|^HTTP_(5\d\d|429)$/;
const ADS = /^(SDK_)?(IAP_)?ADS?_/;
export function errorKind(code, area) {
    if (code && ADS.test(code))
        return 'ads';
    if (code && /^(SDK_)?IAP_/.test(code))
        return 'iap';
    if (code && NETWORK.test(code))
        return 'network';
    return area ?? 'generic';
}
export const ERROR_ALIASES = Object.freeze({
    already_owned: 'SDK_IAP_ALREADY_OWNED',
    IAP_PROVIDER_UNAVAILABLE: 'SDK_IAP_NOT_AVAILABLE', store_unavailable: 'SDK_IAP_NOT_AVAILABLE',
    no_product: 'SDK_IAP_NOT_AVAILABLE',
    schedule: 'IAP_OFFER_NOT_FOUND', limit_placement: 'limit_offer',
    IAP_STORE_VALIDATION_FAILED: 'SDK_IAP_VALIDATION_FAILED',
    IAP_RECEIPT_PRODUCT_MISMATCH: 'SDK_IAP_VALIDATION_FAILED',
    IAP_PURCHASE_ACCOUNT_MISMATCH: 'SDK_IAP_VALIDATION_FAILED',
});
const FINAL = new Set(['SDK_IAP_ALREADY_OWNED', 'IAP_ORDER_ALREADY_PROCESSED', 'IAP_OFFER_NOT_FOUND',
    'NOT_FOUND', 'limit_offer', 'cooldown', 'IAP_STORE_NOT_SUPPORTED', 'SDK_PERMISSION_DENIED']);
export function errorRetry(code) {
    return !code || !(FINAL.has(code) || FINAL.has(ERROR_ALIASES[code] ?? ''));
}
export function errorTexts(lang, code, l10n, area) {
    const defaults = ERROR_STRINGS[lang.split('-')[0] ?? 'en'] ?? ERROR_STRINGS.en;
    const one = (key) => {
        const own = l10n?.(key);
        return own && own !== key ? own : defaults[key];
    };
    const kind = errorKind(code, area);
    const alias = code ? ERROR_ALIASES[code] : undefined;
    const pick = (part) => [
        ...(code && kind !== 'generic' ? [`kit.error.${kind}.${code}.${part}`] : []),
        ...(code ? [`kit.error.${code}.${part}`] : []),
        ...(alias ? [`kit.error.${alias}.${part}`] : []),
        ...(kind === 'generic' ? [] : [`kit.error.${kind}.${part}`]),
        `kit.error.${part}`,
    ].map(one).find((value) => value !== undefined) ?? '';
    return {
        title: pick('title'), text: pick('text'), window: one('kit.error.window') ?? '',
        retry: one('kit.error.retry') ?? '', ok: one('kit.error.ok') ?? '',
        continue: one('kit.error.continue') ?? '', rid: one('kit.error.rid') ?? '',
    };
}
export function standardActions(p, actions, fallbackClose) {
    const list = actions.length ? actions.slice(0, MAX_ACTIONS)
        : [{ id: 'close', label: fallbackClose, variant: 'primary' }];
    return h('div', { class: 'window-actions std-actions', 'data-part': 'actions' }, ...list.map((action, index) => {
        const variant = action.variant ?? (index === 0 ? 'primary' : 'secondary');
        return button(action.label, 'action', p, { testid: `${p.elementId}.action.${action.id}`,
            ghost: variant !== 'primary', className: `std-action std-action--${variant}`,
            disabled: p.busy || action.disabled, payload: () => ({ id: action.id }),
            ...(action.glyph ? { prefix: action.glyph } : {}) });
    }));
}
const WARNING = () => registryIcon('warning', 24);
const NO_SIGNAL = () => registryIcon('no-signal', 24);
const NO_VIDEO = () => registryIcon('no-video', 40);
const RETRY = () => registryIcon('retry', 18);
export function errorAlert(p, alert) {
    const kind = errorKind(alert.code, alert.kind);
    const strings = errorTexts(p.lang, alert.code, alert.l10n, alert.kind);
    const cause = alert.title ?? strings.title;
    const art = alert.icon ? registryIcon(alert.icon, 24) : null;
    const retry = errorRetry(alert.code) ? alert.retry : undefined;
    return h('div', { class: 'std-alert', role: 'alert', 'data-part': 'error-alert', 'data-kind': kind,
        ...(alert.code ? { 'data-code': alert.code } : {}) }, h('div', { class: 'std-alert-main' }, h('span', { class: 'std-alert-icon', 'data-part': 'icon' }, art ?? (kind === 'network' || NETWORK.test(alert.code ?? '') ? NO_SIGNAL() : WARNING())), h('div', { class: 'std-alert-copy' }, cause && cause !== alert.head
        ? h('strong', { class: 'std-alert-title', 'data-part': 'cause' }, cause) : null, h('p', { class: 'std-alert-text', 'data-testid': `${p.elementId}.text` }, alert.text ?? strings.text), alert.rid ? h('small', { class: 'std-alert-rid', 'data-part': 'rid',
        'data-testid': `${p.elementId}.rid` }, `${strings.rid}: ${alert.rid}`) : null)), retry ? button(strings.retry, retry.intent, p, { testid: `${p.elementId}.action.retry`,
        className: 'std-action std-action--primary std-alert-retry', prefix: RETRY(),
        payload: () => retry.payload }) : null);
}
export function errorView(p) {
    const kind = errorKind(p.code, p.kind);
    const strings = errorTexts(p.lang, p.code, p.l10n, p.kind);
    const notice = kind === 'ads';
    const own = p.actions?.length ? p.actions : undefined;
    if (notice) {
        const art = p.icon ? registryIcon(p.icon, 40) : null;
        return dialog(p, p.title ?? strings.title, () => p.emitIntent('close'), h('div', { class: 'std-error', role: 'alert', 'data-part': 'error', 'data-kind': kind,
            ...(p.code ? { 'data-code': p.code } : {}) }, h('div', { class: 'std-tile', 'data-part': 'icon' }, art ?? NO_VIDEO()), h('p', { class: 'std-note', 'data-testid': `${p.elementId}.text` }, p.text ?? strings.text)), standardActions(p, own ?? [{ id: 'close', label: strings.continue, variant: 'primary' }], strings.ok));
    }
    const retry = p.retry && !own && errorRetry(p.code);
    return dialog(p, strings.window, () => p.emitIntent('close'), h('div', { class: 'std-error', 'data-part': 'error', 'data-kind': kind }, errorAlert(p, { code: p.code, kind: p.kind, title: p.title, text: p.text, icon: p.icon,
        l10n: p.l10n, head: strings.window, rid: p.rid, retry: retry ? { intent: 'action', payload: { id: 'retry' } } : undefined })), retry ? null : standardActions(p, own ?? [], strings.ok));
}
export const error = component(errorView, { presentation: 'fullscreen', popupKind: 'alert' });
nameComponents({ error });
