import { localizedText } from './localization.js';
import { adoptSkinInto } from '../skin-layer.js';
const CSS = `
.mpg-fake-store-sheet{position:fixed;inset:0;display:flex;align-items:center;
  justify-content:center;z-index:2147483647}
.mpg-fake-store-card{padding:20px;
  min-width:260px;text-align:center}
.mpg-fake-store-card>button{margin:4px}
`;
const sheets = new WeakMap();
function adoptStyles(doc) {
    let styles = sheets.get(doc);
    if (!styles) {
        const View = doc.defaultView;
        if (!View?.CSSStyleSheet || !('replaceSync' in View.CSSStyleSheet.prototype))
            return;
        styles = new View.CSSStyleSheet();
        styles.replaceSync(CSS);
        sheets.set(doc, styles);
    }
    if (!doc.adoptedStyleSheets.includes(styles)) {
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, styles];
    }
}
export function fakePaymentSheet(sheet, signal, localization) {
    const text = localizedText(localization);
    if (typeof document === 'undefined' || !document.body)
        return Promise.resolve('error');
    if (signal?.aborted)
        return Promise.resolve('cancel');
    adoptStyles(document);
    const releaseSkin = adoptSkinInto(document, 'fakePaymentSheet');
    return new Promise((resolve) => {
        const root = document.createElement('div');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', text('kit.fakePayment.dialog'));
        root.dataset['testid'] = 'fake-store-sheet';
        root.className = 'mpg-fake-store-sheet';
        const finish = (outcome) => {
            signal?.removeEventListener('abort', aborted);
            off?.();
            releaseSkin();
            root.remove();
            resolve(outcome);
        };
        const aborted = () => finish('cancel');
        signal?.addEventListener('abort', aborted, { once: true });
        const card = document.createElement('div');
        card.className = 'mpg-fake-store-card';
        const caption = document.createElement('p');
        caption.textContent = text('kit.fakePayment.caption');
        const title = document.createElement('h3');
        title.textContent = sheet.title;
        title.dataset['testid'] = 'fake-store-title';
        const price = document.createElement('p');
        price.textContent = sheet.priceText;
        price.dataset['testid'] = 'fake-store-price';
        card.append(caption, title, price);
        const buttons = [];
        for (const outcome of ['success', 'cancel', 'error', 'pending']) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = text(`kit.fakePayment.${outcome}`);
            buttons.push(button);
            button.dataset['testid'] = `fake-store-${outcome}`;
            button.addEventListener('click', () => finish(outcome), { once: true });
            card.append(button);
        }
        const off = localization?.subscribe?.(() => {
            root.setAttribute('aria-label', text('kit.fakePayment.dialog'));
            caption.textContent = text('kit.fakePayment.caption');
            for (const button of buttons)
                button.textContent = text(`kit.fakePayment.${button.dataset['testid'].replace('fake-store-', '')}`);
        });
        root.append(card);
        document.body.append(root);
    });
}
