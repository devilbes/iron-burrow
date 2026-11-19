import { SDKError } from './error.js';
import { listen } from './web-device-events.js';
export function webKeyboard({ window: win, document: doc }) {
    const viewport = win?.visualViewport;
    const show = new Set();
    const hide = new Set();
    let visible = false;
    let previousHeight = 0;
    let off = () => { };
    let baseline = win?.innerHeight ?? viewport?.height ?? 0;
    const editable = () => {
        const element = doc?.activeElement;
        return element?.isContentEditable === true || element?.tagName === 'TEXTAREA'
            || (element?.tagName === 'INPUT' && !['button', 'submit', 'reset', 'checkbox', 'radio',
                'file', 'range', 'color', 'hidden'].includes(element.type ?? 'text'));
    };
    const update = () => {
        if (!viewport)
            return;
        const layoutHeight = doc?.documentElement?.clientHeight ?? win?.innerHeight ?? baseline;
        const height = Math.max(0, Math.max(layoutHeight, baseline)
            - viewport.height - viewport.offsetTop);
        const next = viewport.scale === 1 && editable() && height > 100;
        if (next && (!visible || height !== previousHeight)) {
            visible = true;
            previousHeight = height;
            for (const handler of [...show])
                handler(Object.freeze({ height }));
        }
        else if (!next && visible) {
            visible = false;
            previousHeight = 0;
            for (const handler of [...hide])
                handler();
        }
        if (!next && !editable())
            baseline = win?.innerHeight ?? viewport.height;
    };
    const subscribe = (set, handler) => {
        if (!viewport)
            return () => { };
        if (show.size + hide.size === 0) {
            visible = false;
            previousHeight = 0;
            const reset = () => { baseline = win?.innerHeight ?? viewport.height; update(); };
            const offs = [listen(viewport, ['resize', 'scroll'], update),
                listen(doc, ['focusin', 'focusout'], update), listen(win, ['orientationchange'], reset)];
            off = () => offs.forEach((release) => release());
        }
        const subscription = typeof handler === 'function'
            ? ((...args) => Reflect.apply(handler, undefined, args)) : handler;
        set.add(subscription);
        return () => {
            set.delete(subscription);
            if (show.size + hide.size === 0)
                off();
        };
    };
    return {
        isSupported: () => viewport != null,
        onShow: (handler) => subscribe(show, handler), onHide: (handler) => subscribe(hide, handler),
        async hide() {
            if (!viewport)
                throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
            doc?.activeElement?.blur?.();
        },
    };
}
