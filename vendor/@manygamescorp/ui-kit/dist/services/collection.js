import { icon } from '../icon.js';
import { icon as registryIcon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, titledDialog, assetImage, windowDialog, windowSlots } from '../features/shared.js';
import { skinIcon } from '../icon.js';
const star = (filled) => registryIcon(filled ? 'collection-star-on' : 'collection-star-off', 12, { attributes: { class: 'col-star' } });
const stars = (n, max = 4) => Array.from({ length: max }, (_, i) => star(i < n));
const square = (p, key, label, size) => assetImage(p, key, { width: size, height: size })
    ?? h('span', { class: 'col-letter', 'aria-hidden': 'true' }, [...label][0]?.toUpperCase() ?? '');
const iconBtn = (p, intent, label, glyph, className = 'col-icon') => h('button', { type: 'button', class: className, 'data-variant': 'ghost', 'aria-label': label,
    'data-testid': `${p.elementId}.${intent}`, disabled: p.busy,
    onClick: () => { if (!p.busy)
        p.emitIntent(intent); } }, glyph);
const percent = (done, total) => total > 0 ? Math.round(Math.min(1, Math.max(0, done / total)) * 100) : 0;
const bar = (pct, className, valueText) => h('div', { class: className,
    role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': valueText }, h('svg', { viewBox: '0 0 100 1', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, h('rect', { width: pct, height: 1 })));
const meterLabel = (label, pct) => h('svg', { class: 'col-meter-label', 'aria-hidden': 'true' }, h('text', { x: '50%', y: '50%' }, label), pct > 0 ? h('svg', { width: `${pct}%`, height: '100%' }, h('text', { x: `${Math.round(5_000_000 / pct) / 1000}%`, y: '50%' }, label)) : null);
export const cardCollectionView = (p) => {
    const set = p.set;
    const pct = percent(set.owned, set.total);
    const page = (dir, label) => iconBtn(p, dir, label, registryIcon(dir === 'prev-set' ? 'back' : 'right', 20), 'col-nav');
    const starCount = (card) => Math.max(0, Math.min(5, Math.trunc(card.stars)));
    return h('section', { class: 'col-page', role: 'dialog', 'aria-modal': 'true', tabindex: -1,
        'aria-label': text(p, 'kit.collection.card-album'), 'data-testid': `${p.elementId}.collection` }, h('header', { class: 'col-head' }, iconBtn(p, 'info', text(p, 'kit.collection.how-it-works'), registryIcon('collection-card-collection-view-2', 20)), h('span', { class: 'col-spacer' }), p.balance ? h('span', { class: 'col-pill', 'data-buy': '' }, registryIcon('coins', 24), h('span', {}, p.balance), iconBtn(p, 'buy-coins', text(p, 'kit.collection.buy-currency', { currency: p.currencyLabel ?? text(p, 'kit.shared.currency') }), registryIcon('collection-card-collection-view-3', 16), 'col-plus')) : null, p.stars ? h('span', { class: 'col-pill' }, h('span', { width: 24, height: 24, viewBox: '0 0 24 24',
        'aria-hidden': 'true' }, registryIcon('collection-card-collection-view-4', 24)), h('span', {}, p.stars)) : null, iconBtn(p, 'close', text(p, 'kit.collection.close'), registryIcon('collection-card-collection-view-5', 20), 'col-icon col-close'), h('div', { class: 'col-titlebox' }, h('h2', {}, text(p, 'kit.collection.card-album')), h('small', {}, text(p, 'kit.collection.set-of', { setIndex: p.setIndex, setTotal: p.setTotal })))), h('div', { class: 'col-main' }, h('div', { class: 'col-set' }, h('div', { class: 'col-cover' }, h('div', { class: 'col-cover-art' }, assetImage(p, set.cover) ?? null), h('strong', {}, set.name)), h('span', { class: 'col-goal' }, text(p, 'kit.collection.complete-the-set-and-get')), h('div', { class: 'col-rewards' }, ...set.rewards.slice(0, 3).map((reward) => h('span', { class: 'col-reward', 'data-highlight': reward.highlight ? 'true' : undefined }, (reward.icon ? skinIcon(reward.icon, 24) : null)
        ?? assetImage(p, reward.art, { width: 24, height: 24 }), reward.label))), h('div', { class: 'col-progress' }, registryIcon('collection-card-collection-view-6', 24), h('div', { class: 'col-meter' }, bar(pct, 'col-fill', `${set.owned} / ${set.total}`), meterLabel(`${set.owned} / ${set.total}`, pct)))), h('div', { class: 'col-cards' }, ...p.cards.slice(0, 30).map((card) => h('button', { type: 'button',
        class: 'col-card', 'data-state': card.state, 'data-testid': `${p.elementId}.card.${card.id}`,
        disabled: p.busy || card.state === 'locked',
        'aria-label': card.state === 'locked' ? text(p, 'kit.collection.not-collected', { name: card.name })
            : card.name,
        onClick: () => { if (!p.busy && card.state !== 'locked')
            p.emitIntent('card', { cardId: card.id }); } }, h('span', { class: 'col-card-art' }, card.state === 'locked'
        ? registryIcon('collection-card-collection-view-7', 40)
        : assetImage(p, card.art) ?? null), h('span', { class: 'col-card-name', 'data-long': [...card.name].length > 12 ? '' : undefined }, card.name), starCount(card) > 0 ? h('span', { class: 'col-card-stars', 'aria-hidden': 'true' }, ...Array.from({ length: starCount(card) }, () => star(true))) : null, card.extra && card.extra > 0 && card.state !== 'locked'
        ? h('span', { class: 'col-card-extra' }, `+${card.extra}`) : null, card.state === 'new' ? h('span', { class: 'col-card-new' }, text(p, 'kit.collection.new')) : null))), h('div', { class: 'col-foot' }, h('div', { class: 'col-pager' }, page('prev-set', text(p, 'kit.collection.previous-set')), h('span', { class: 'col-page-no' }, h('span', {}, `${p.setIndex} / ${p.setTotal}`)), page('next-set', text(p, 'kit.collection.next-set'))), h('div', { class: 'col-buttons' }, button(text(p, 'kit.collection.open-card-pack', { packs: p.packs }), 'open-pack', p, {
        disabled: !p.ready || p.busy || p.packs < 1, testid: `${p.elementId}.open-pack`,
        prefix: registryIcon('collection-card-collection-view-8', 20)
    }), iconBtn(p, 'exchange', text(p, 'kit.collection.trade-duplicates'), registryIcon('collection-card-collection-view-9', 24), 'col-icon col-exchange')))));
};
export const cardCollection = component(cardCollectionView, { presentation: 'fullscreen', popupKind: 'content' });
export const cardDetailView = (p) => {
    const last = p.packIndex >= p.packTotal;
    return titledDialog(p, p.isNew ? text(p, 'kit.collection.new-card') : p.name, undefined, () => p.emitIntent('close'), p.issueLine ? h('p', { class: 'col-detail-issue', 'data-part': 'issue-line' }, p.issueLine) : null, h('div', { class: 'col-detail' }, h('div', { class: 'col-detail-card', 'data-testid': `${p.elementId}.card` }, p.isNew ? h('span', { class: 'col-badge' }, text(p, 'kit.collection.new')) : null, h('div', { class: 'col-detail-art', role: 'img', 'aria-label': p.name }, h('span', { class: 'col-rarity' }, p.rarity), assetImage(p, p.art) ?? null), h('h3', {}, p.name), h('div', { class: 'col-detail-stars', role: 'img',
        'aria-label': text(p, 'kit.collection.stars', { stars: p.stars }) }, ...stars(p.stars, 3)), h('span', { class: 'col-detail-meta' }, [p.rarity, text(p, 'kit.collection.set', { setName: p.setName }),
        p.number].filter(Boolean).join(' · ')))), h('div', { class: 'col-dots', role: 'img', 'aria-label': text(p, 'kit.collection.of', { packIndex: p.packIndex, packTotal: p.packTotal }) }, ...Array.from({ length: Math.min(p.packTotal, 12) }, (_, i) => h('span', { class: 'col-dot',
        'data-on': i < p.packIndex ? 'true' : undefined, 'data-current': i + 1 === p.packIndex ? 'true' : undefined })), h('span', {}, text(p, 'kit.collection.of', { packIndex: p.packIndex, packTotal: p.packTotal }))), h('div', { class: 'col-setbox' }, h('div', {}, h('div', { class: 'col-setbox-line' }, h('span', {}, text(p, 'kit.collection.set', { setName: p.setName })), h('b', {}, `${p.setProgress.done} / ${p.setProgress.total}`)), bar(percent(p.setProgress.done, p.setProgress.total), 'col-bar')), h('span', { class: 'col-gift' }, registryIcon('gift', 24))), h('div', { class: 'window-actions' }, button(last ? text(p, 'kit.collection.done') : text(p, 'kit.collection.next'), 'next', p, { disabled: !p.ready || p.busy, testid: `${p.elementId}.next` }), last ? null : button(text(p, 'kit.collection.skip-all'), 'skip-all', p, { ghost: true,
        className: 'col-skip', testid: `${p.elementId}.skip-all` })));
};
export const cardDetail = component(cardDetailView, {});
function setTitle(p, name) {
    if (p.setPrefix === false)
        return name;
    if (typeof p.setPrefix === 'string')
        return p.setPrefix ? `${p.setPrefix} ${name}` : name;
    return text(p, 'kit.collection.set-2', { name: name });
}
export const cardAlbumView = (p) => {
    const pct = percent(p.prize.done, p.prize.total);
    if (p.event)
        return albumEventView(p, p.event);
    return titledDialog(p, text(p, 'kit.collection.manyplay-album'), undefined, () => p.emitIntent('close'), h('p', { class: 'album-lead' }, text(p, 'kit.collection.cards-drop-in-different-games-collect-every-set-to-win-the-g')), h('div', { class: 'album-prize', 'data-testid': `${p.elementId}.prize` }, h('span', { class: 'album-prize-icon' }, registryIcon('gift', 24)), h('strong', {}, p.prize.label ?? text(p, 'kit.collection.grand-prize-of-the-season')), h('span', { class: 'album-pct' }, `${pct}%`), h('small', {}, text(p, 'kit.collection.collected-of-cards', { done: p.prize.done, total: p.prize.total })), bar(pct, 'col-bar')), h('ul', { class: 'album-sets' }, ...p.sets.slice(0, 20).map((set) => h('li', { class: 'album-set',
        'data-tone': set.tone, 'data-testid': `${p.elementId}.set.${set.id}` }, h('span', { class: 'album-set-icon' }, square(p, set.icon, set.name, 32)), h('span', { class: 'album-set-name' }, h('strong', { 'data-part': 'set-name' }, setTitle(p, set.name)), set.otherGame ? h('button', { type: 'button', 'data-testid': `${p.elementId}.open-game.${set.id}`,
        disabled: p.busy, onClick: () => { if (!p.busy)
            p.emitIntent('open-game', { setId: set.id }); } }, text(p, 'kit.collection.open-in', { otherGame: set.otherGame })) : null), h('span', { class: 'album-set-count', 'data-done': set.owned >= set.total ? 'true' : undefined }, set.owned >= set.total ? icon('check') : null, `${set.owned} / ${set.total}`), h('span', { class: 'album-slots', 'aria-hidden': 'true' }, ...Array.from({ length: Math.min(set.total, 12) }, (_, i) => h('span', { class: 'album-slot', 'data-on': i < set.owned ? 'true' : undefined })))))));
};
function albumEventView(p, event) {
    const action = (intent, label, className, child) => h('button', { type: 'button', class: className, 'data-variant': 'ghost',
        'aria-label': label, disabled: p.busy, onClick: () => { if (!p.busy)
            p.emitIntent(intent); } }, child ?? label);
    const meter = (done, total, className) => h('div', { class: `al-bar ${className}`, role: 'progressbar', 'aria-valuemin': 0,
        'aria-valuemax': total, 'aria-valuenow': done }, h('progress', { class: 'al-bar__fill', max: Math.max(1, total), value: done }), h('b', { class: 'al-bar__label' }, `${done} / ${total}`));
    const a = event.activity;
    return windowDialog(p, { title: event.title, template: 'cardAlbum' }, () => p.emitIntent('close'), h('div', { class: 'album-event' }, ...windowSlots(p, 'cardAlbum', {
        'event-header': h('header', { class: 'al-head' }, h('div', { class: 'al-sheet album-sheet' }), h('div', { class: 'al-dateline album-dateline' }, ...event.dateline.map(label => h('span', {}, label))), h('hr', { class: 'album-rule' }), h('h1', { class: 'al-title album-h1' }, event.title), h('p', { class: 'al-sub album-grotesk' }, event.subtitle), h('div', { class: 'al-prizes' }, ...event.rewards.slice(0, 3).map((reward, i) => h('figure', { class: `al-prize al-prize--${i === 1 ? 'main' : 'side'}` }, assetImage(p, reward.art), reward.label ? h('figcaption', { class: `al-amount${i === 2 ? ' al-amount--cash' : ''}` }, reward.label) : null, reward.badge ? h('span', { class: 'album-seal album-seal--l al-prize-seal' }, reward.badge) : null))), assetImage(p, event.hostArt, { class: 'al-host' })),
        status: h('div', { class: 'al-status' }, h('span', { class: 'album-timer album-timer--tag al-timer' }, event.remaining), meter(p.prize.done, p.prize.total, 'al-total'), action('info', text(p, 'kit.collection.rules'), 'album-btn album-btn-token album-btn-token--info', 'i')),
        activity: h('section', { class: 'al-mini' }, assetImage(p, a.art, { class: 'al-mini-hero' }), h('div', { class: 'al-mini-body' }, h('div', { class: 'al-mini-top' }, h('h2', { class: 'al-mini-title' }, a.title), h('span', { class: 'al-mini-timer' }, a.remaining)), meter(a.done, a.total, 'al-mini-bar')), assetImage(p, a.rewardArt, { class: 'al-mini-safe' })),
        sets: h('ul', { class: 'album-sets al-grid' }, ...p.sets.slice(0, 20).map(set => h('li', { class: 'album-set', 'data-tone': set.tone }, h('button', { class: 'album-set-open', type: 'button', 'data-variant': 'ghost', disabled: p.busy,
            'aria-label': set.name, onClick: () => { if (!p.busy)
                p.emitIntent('open-set', { setId: set.id }); } }, h('span', { class: 'album-set-icon' }, square(p, set.icon, set.name, 32)), h('span', { class: 'album-set-name' }, h('strong', {}, set.name)), h('span', { class: 'album-set-count', 'data-done': set.owned >= set.total ? 'true' : undefined }, set.owned >= set.total ? h('i', { class: 'album-check', 'aria-hidden': 'true' }, icon('check', 19)) : null, `${set.owned} / ${set.total}`))))),
        exchange: h('footer', { class: 'al-foot' }, h('div', { class: 'al-foot-sheet album-sheet' }), h('div', { class: 'al-foot-text' }, h('h2', { class: 'al-foot-title' }, event.exchange.title), h('p', { class: 'al-foot-sub' }, event.exchange.subtitle)), action('exchange', event.exchange.label, 'album-btn album-btn-tag al-swap'), action('gift', event.exchange.giftLabel, 'album-btn al-gift', h('span', { class: 'album-seal al-gift-seal' }, String(event.exchange.gifts)))),
    })));
}
export const cardAlbum = component(cardAlbumView, {});
export const gamesShelfView = (p) => h('section', { class: 'shelf', role: 'dialog', 'aria-modal': 'true',
    'aria-label': text(p, 'kit.collection.more-manyplay-games'), 'data-testid': `${p.elementId}.shelf` }, h('div', { class: 'shelf-head' }, h('h3', {}, text(p, 'kit.collection.more-manyplay-games')), h('span', { class: 'shelf-net' }, text(p, 'kit.collection.manyplay-games')), iconBtn(p, 'close', text(p, 'kit.collection.close'), registryIcon('collection-games-shelf-view-10', 20), 'col-icon')), h('ul', { class: 'shelf-list' }, ...p.games.slice(0, 6).map((game) => h('li', { class: 'shelf-game',
    'data-tone': game.tone }, game.isNew ? h('span', { class: 'shelf-new' }, 'NEW') : null, h('button', { type: 'button', class: 'shelf-open', 'data-testid': `${p.elementId}.game.${game.id}`,
    disabled: p.busy, onClick: () => { if (!p.busy)
        p.emitIntent('open-game', { gameId: game.id }); } }, h('span', { class: 'shelf-icon' }, square(p, game.icon, game.name, 56)), h('span', { class: 'shelf-name' }, game.name), h('span', { class: 'shelf-chip', 'data-kind': game.chip.kind }, game.chip.label), h('span', { class: 'shelf-chev' }, registryIcon('collection-games-shelf-view-11', 16)))))));
export const gamesShelf = component(gamesShelfView, {});
export const easterGuestView = (p) => h('section', { class: 'easter', role: 'dialog',
    'aria-modal': 'true', 'aria-label': text(p, 'kit.collection.oops-i-m-from', { game: p.game }),
    'data-testid': `${p.elementId}.easter` }, h('div', { class: 'easter-head' }, h('h3', {}, text(p, 'kit.collection.oops-i-m-from-i-got-lost-here', { game: p.game })), iconBtn(p, 'close', text(p, 'kit.collection.close'), registryIcon('collection-easter-guest-view-12', 20), 'col-icon')), h('div', { class: 'easter-card' }, h('span', { class: 'easter-chest', viewBox: '0 0 40 40', 'aria-hidden': 'true' }, registryIcon('collection-easter-guest-view-13', 24)), h('p', {}, text(p, 'kit.collection.see-me-home-and-get-a'), h('em', {}, text(p, 'kit.collection.chest-in-both-games')), '.')), button(text(p, 'kit.collection.take-me-to', { game: p.game }), 'escort', p, { className: 'easter-go',
    disabled: !p.ready || p.busy, testid: `${p.elementId}.escort`,
    suffix: registryIcon('collection-easter-guest-view-14', 16) }), h('span', { class: 'easter-net' }, text(p, 'kit.collection.manyplay-games')));
export const easterGuest = component(easterGuestView, {});
nameComponents({ cardCollection, cardDetail, cardAlbum, gamesShelf, easterGuest });
