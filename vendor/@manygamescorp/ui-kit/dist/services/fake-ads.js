import { localizedText } from './localization.js';
const REWARDED = ['rewarded', 'rewarded_interstitial'];
function element(tag, text, testId) {
    const node = document.createElement(tag);
    if (text !== undefined)
        node.textContent = text;
    if (testId !== undefined)
        node.dataset.testid = testId;
    return node;
}
function styled(node, styles) {
    for (const [name, value] of Object.entries(styles))
        node.style.setProperty(name, value);
    return node;
}
export function domFakeAdView(root = () => document.body, localization) {
    const text = localizedText(localization);
    return {
        width: () => root().ownerDocument.documentElement.clientWidth || 320,
        banner(_unitKey, options, height) {
            const plate = styled(element('div', undefined, 'fake-ad-banner'), {
                position: 'fixed', left: '0', right: '0', [options.position]: '0',
                height: `${height}px`, display: 'flex', 'align-items': 'center',
                'justify-content': 'center', background: options.background, color: '#fff',
                'z-index': '2', font: '14px sans-serif', 'box-sizing': 'content-box',
                [`padding-${options.position}`]: `env(safe-area-inset-${options.position}, 0px)`,
            });
            plate.dataset.sdkAdBanner = '';
            const available = root().ownerDocument.documentElement.clientWidth || 320;
            const width = options.size === 'leader' && available >= 728 ? 728
                : options.size === 'adaptive' ? available : 320;
            const ad = styled(element('div', text('kit.fakeAds.banner', { width, height })), {
                width: options.size === 'adaptive' ? '100%' : `${width}px`, height: `${height}px`,
                'max-width': '100%', display: 'flex', 'align-items': 'center',
                'justify-content': 'center', border: '2px dashed currentColor', 'box-sizing': 'border-box',
            });
            const refresh = () => { ad.textContent = text('kit.fakeAds.banner', { width, height }); };
            const off = localization?.subscribe?.(refresh);
            plate.append(ad);
            root().append(plate);
            return () => { off?.(); plate.remove(); };
        },
        present(show) {
            const timers = [];
            if (show.format === 'banner') {
                const plate = styled(element('div', undefined, 'fake-ad-banner'), {
                    position: 'fixed', left: '0', right: '0', bottom: '0', height: '50px',
                    display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '12px',
                    background: '#ffd54f', color: '#000', 'z-index': '2147483646', font: '14px sans-serif',
                });
                const close = element('button', '×', 'fake-ad-banner-close');
                const title = element('span');
                const refresh = () => {
                    close.setAttribute('aria-label', text('kit.fakeAds.closeAria'));
                    title.textContent = text('kit.fakeAds.bannerTitle', { unitKey: show.unitKey });
                };
                refresh();
                const off = localization?.subscribe?.(refresh);
                close.addEventListener('click', () => show.closed());
                plate.append(title, close);
                root().append(plate);
                return () => { off?.(); plate.remove(); };
            }
            const rewarded = REWARDED.includes(show.format);
            const overlay = styled(element('div', undefined, 'fake-ad'), {
                position: 'fixed', inset: '0', display: 'flex', 'flex-direction': 'column',
                'align-items': 'center', 'justify-content': 'center', gap: '16px',
                background: 'rgba(0, 0, 0, 0.92)', color: '#fff', 'z-index': '2147483647',
                font: '18px sans-serif',
            });
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.dataset.format = show.format;
            if (show.customData !== undefined)
                overlay.dataset.customData = show.customData;
            const title = element('div', '', 'fake-ad-title');
            const timer = element('div', '', 'fake-ad-timer');
            const close = element('button', '', 'fake-ad-close');
            overlay.append(title, element('div', `${show.format} · ${show.unitKey}`), timer, close);
            let left = rewarded ? show.durationSec : show.closeAfterSec;
            close.disabled = !rewarded && left > 0;
            let displayed = left;
            let complete = false;
            const refresh = () => {
                title.textContent = text('kit.fakeAds.ad');
                overlay.setAttribute('aria-label', text('kit.fakeAds.ad'));
                close.textContent = text('kit.fakeAds.close');
                timer.textContent = complete ? (rewarded ? text('kit.fakeAds.rewarded') : '')
                    : text(rewarded ? 'kit.fakeAds.rewardIn' : 'kit.fakeAds.closeIn', { count: displayed });
            };
            const off = localization?.subscribe?.(refresh);
            const tick = () => {
                if (left > 0) {
                    displayed = left;
                    refresh();
                    left -= 1;
                    timers.push(setTimeout(tick, 1000));
                    return;
                }
                complete = true;
                refresh();
                close.disabled = false;
                if (rewarded)
                    show.rewarded();
            };
            tick();
            close.addEventListener('click', () => show.closed());
            root().append(overlay);
            return () => {
                off?.();
                for (const id of timers)
                    clearTimeout(id);
                overlay.remove();
            };
        },
    };
}
