import { rewardGrid } from '../features/reward-grid.js';
import { icon as registryIcon } from '../icon.js';
import { icon } from '../icon.js';
import { nameComponents } from '../core.js';
import { component, h, text, button, windowDialog, windowSlots, assetImage, moduleImage } from '../features/shared.js';
import { skinIcon } from '../icon.js';
import { sparkle } from '../features/daily-parts.js';
import { TICK_UP_DELAY_MS } from './hud.js';
export const MAX_REWARD_LINES = 50;
const MAX_COINS = 8;
const COIN_FLIGHT_MS = 520;
const GLOW_MS = 1800;
const GLOW_REST = 'drop-shadow(0 0 4px var(--mp-gold)) drop-shadow(0 0 10px color-mix(in srgb,var(--mp-gold) 60%,transparent))';
const GLOW_PEAK = 'drop-shadow(0 0 6px var(--mp-gold)) drop-shadow(0 0 18px var(--mp-gold)) drop-shadow(0 0 34px color-mix(in srgb,var(--mp-gold) 70%,transparent)) brightness(1.25)';
const GLOW_FRAMES = [{ filter: GLOW_REST }, { filter: GLOW_PEAK, offset: 0.12 },
    { filter: GLOW_PEAK, offset: 0.8 }, { filter: GLOW_REST }];
const SPARKS = 8;
const ID = /^[a-z][a-z0-9_.-]{0,63}$/;
const KINDS = ['soft_currency', 'hard_currency', 'item', 'instance'];
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export function aggregateRewards(items) {
    return aggregateLines(items, 0, { remaining: 1000 });
}
function aggregateLines(items, depth, budget) {
    const lines = new Map();
    for (const raw of Array.isArray(items) ? items.slice(0, 1000) : []) {
        if (budget.remaining-- <= 0)
            break;
        if (!record(raw) || typeof raw['id'] !== 'string' || !ID.test(raw['id']))
            continue;
        const quantity = raw['quantity'];
        if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0)
            continue;
        const id = raw['id'];
        const known = lines.get(id);
        if (!known && lines.size >= MAX_REWARD_LINES)
            continue;
        const name = typeof raw['name'] === 'string' && raw['name'].trim()
            ? raw['name'].trim().slice(0, 64) : undefined;
        const icon = typeof raw['icon'] === 'string' && raw['icon'] ? raw['icon'] : undefined;
        const kind = KINDS.includes(raw['kind']) ? raw['kind'] : undefined;
        const chest = record(raw['chest']) && depth < MAX_CHEST_DEPTH
            && ['closed', 'opening', 'opened', 'claimed'].includes(String(raw['chest']['state']))
            ? { state: raw['chest']['state'],
                ...(Array.isArray(raw['chest']['contents'])
                    ? { contents: aggregateLines(raw['chest']['contents'], depth + 1, budget) } : {}),
                ...(Array.isArray(raw['chest']['result'])
                    ? { result: aggregateLines(raw['chest']['result'], depth + 1, budget) } : {}) } : undefined;
        const random = record(raw['random']) && depth < MAX_CHEST_DEPTH
            ? { ...(Array.isArray(raw['random']['contents'])
                    ? { contents: aggregateLines(raw['random']['contents'], depth + 1, budget) } : {}) } : undefined;
        const chance = typeof raw['chance'] === 'number' && Number.isFinite(raw['chance'])
            && raw['chance'] >= 0 && raw['chance'] <= 1 ? raw['chance'] : undefined;
        const range = record(raw['range']) && Number.isSafeInteger(raw['range']['min'])
            && Number.isSafeInteger(raw['range']['max']) && Number(raw['range']['min']) >= 0
            && Number(raw['range']['max']) >= Number(raw['range']['min'])
            ? { min: Number(raw['range']['min']), max: Number(raw['range']['max']) } : undefined;
        const tooltip = typeof raw['tooltip'] === 'string' ? raw['tooltip'].slice(0, 256) : undefined;
        const keep = known ?? { kind, name, icon, chest, random, chance, range, tooltip };
        lines.set(id, {
            id, quantity: Math.min(Number.MAX_SAFE_INTEGER, (known?.quantity ?? 0) + quantity),
            ...(keep.kind ? { kind: keep.kind } : {}), ...(keep.name ? { name: keep.name } : {}),
            ...(keep.icon ? { icon: keep.icon } : {}),
            ...(keep.chest ? { chest: keep.chest } : {}),
            ...(keep.random ? { random: keep.random } : {}),
            ...(keep.chance !== undefined ? { chance: keep.chance } : {}),
            ...(keep.range ? { range: keep.range } : {}),
            ...(keep.tooltip ? { tooltip: keep.tooltip } : {}),
        });
    }
    return [...lines.values()];
}
const currency = (line) => line.kind === 'soft_currency' || (!line.kind && line.id === 'coins') ? 'coins'
    : line.kind === 'hard_currency' || (!line.kind && line.id === 'gems') ? 'gems' : undefined;
export function rewardCategoryIcon(line) {
    return line.chest ? 'chest-bronze'
        : currency(line) ?? (line.kind === 'instance' ? 'star' : line.kind === 'item' ? 'bag' : 'gift');
}
export function rewardName(p, line) {
    if (line.name)
        return line.name;
    if (line.chest)
        return text(p, 'kit.reward-window.chest');
    if (line.random)
        return text(p, 'kit.reward-window.random-reward');
    return text(p, 'kit.reward-window.item');
}
function rewardArt(p, line, size) {
    const attrs = { width: size, height: size };
    return (line.icon ? skinIcon(line.icon, size, { scope: p.skinScope })
        ?? moduleImage(line.icon, attrs)
        ?? assetImage(p, line.icon, attrs) : null)
        ?? skinIcon(rewardCategoryIcon(line), size, { scope: p.skinScope })
        ?? h('span', { class: 'reward-glyph' }, icon('sparkle', size, { scope: p.skinScope }));
}
export function rewardChestArt(_p) { return registryIcon('reward-chest', 128); }
function rewardHeroIcons(p, items, options) {
    const shown = items.slice(0, 3);
    const size = shown.length === 1 ? 112 : shown.length === 2 ? 80 : 64;
    return h('span', { class: 'reward-hero-icons', 'data-part': 'reward-hero-icons',
        'data-count': shown.length }, ...shown.map((line) => h('span', { class: 'reward-hero-icon', 'data-reward-id': line.id }, options.art?.(line, size) ?? rewardArt(p, line, size))));
}
export const MAX_CHEST_DEPTH = 8;
const numberText = (p, value) => new Intl.NumberFormat(p.lang).format(value);
export function rewardItemsView(p, items, options = {}, path = []) {
    return rewardGrid(p, items.map(line => ({
        id: line.id, name: rewardName(p, line),
        amount: line.range ? `${numberText(p, line.range.min)}–${numberText(p, line.range.max)}`
            : `+${numberText(p, line.quantity)}`,
        gold: currency(line) === 'coins', testid: 'reward-item',
    })), {
        className: 'reward-items', label: options.info
            ? text(p, 'kit.reward-window.chest-contents') : text(p, 'kit.reward-window.you-received'),
        art: (_item, size, index) => {
            const line = items[index];
            const art = options.art?.(line, size) ?? rewardArt(p, line, size);
            return line.random ? h('span', { class: 'reward-random-art', 'data-part': 'reward-random' }, h('span', { class: 'reward-random-silhouette' }, art), h('strong', { class: 'reward-random-mark', 'aria-hidden': 'true' }, '?')) : art;
        },
        entry: (_item, index, entry) => {
            const line = items[index];
            if (!line.chest && !line.random)
                return { ...entry,
                    attrs: { ...entry.attrs, title: line.tooltip ?? entry.attrs['title'] } };
            const infoLabel = `${text(p, 'kit.reward-window.inside')}: ${rewardName(p, line)}`;
            return h('button', { ...entry.attrs, 'data-part': 'chest-info',
                'data-chest-state': line.chest?.state, class: 'reward-grid-entry reward-chest-info',
                'aria-label': infoLabel, title: line.tooltip ?? infoLabel,
                'aria-description': entry.attrs['aria-label'],
                onClick: event => {
                    event.currentTarget?.focus?.({ preventScroll: true });
                    p.emitIntent('chest-info', { id: line.id, path: [...path, index] });
                } }, ...entry.children, h('span', { class: 'reward-chest-badge', 'aria-hidden': 'true' }, 'i'));
        },
        details: (_item, index) => {
            const line = items[index];
            const state = line.chest?.state;
            const action = state === 'closed' ? 'chest-open' : 'chest-claim';
            const actionLabel = state === 'closed' ? text(p, 'kit.reward-window.open')
                : state === 'opening' ? text(p, 'kit.reward-window.opening')
                    : state === 'opened' ? text(p, 'kit.reward-window.claim') : text(p, 'kit.reward-window.claimed');
            let sent = false;
            const odds = line.chance === undefined ? null : h('small', { 'data-part': 'reward-chance' }, `${text(p, 'kit.reward-window.chance')}: ${new Intl.NumberFormat(p.lang, { style: 'percent', maximumFractionDigits: 2 }).format(line.chance)}`);
            if (!line.chest || options.info)
                return odds;
            return h('div', { class: 'reward-chest-result', 'aria-busy': state === 'opening',
                'aria-live': 'polite' }, odds, button(actionLabel, action, p, { disabled: p.busy || p.ready === false
                    || state === 'opening' || state === 'claimed' || options.pendingChestIds?.has(line.id),
                ariaLabel: `${actionLabel}: ${rewardName(p, line)}`, testid: `${p.elementId}.${line.id}.${action}`,
                click: () => { if (!sent) {
                    sent = true;
                    p.emitIntent(action, { id: line.id });
                } } }), (state === 'opened' || state === 'claimed') && path.length < MAX_CHEST_DEPTH
                ? line.chest.result === undefined
                    ? h('p', {}, text(p, 'kit.reward-window.result-unavailable'))
                    : rewardItemsView(p, line.chest.result, { ...options, info: true }, [...path, index])
                : null);
        },
    });
}
export function rewardLinesView(p, items, options = {}) {
    const title = p.title ?? (options.info ? text(p, 'kit.reward-window.inside')
        : text(p, 'kit.reward-window.reward-received'));
    const size = { width: 112, height: 112 };
    const hero = p.hero ? skinIcon(p.hero, 112) ?? moduleImage(p.hero, size)
        ?? assetImage(p, p.hero, size) : null;
    return h('div', { class: 'reward-window', 'data-part': 'reward-window',
        'data-testid': 'reward-window', 'data-info': options.info || undefined }, windowDialog(p, { title }, () => p.emitIntent('close'), options.info ? null : h('div', { class: 'reward-burst', 'data-part': 'reward-burst' }, h('span', { class: 'reward-flash', 'aria-hidden': 'true' }), ...Array.from({ length: SPARKS }, (_, i) => h('span', { class: 'reward-spark', 'data-i': i,
        'aria-hidden': 'true' })), h('span', { class: 'reward-hero' }, hero
        ?? (p.source === 'chest' ? rewardChestArt(p) : rewardHeroIcons(p, items, options))), sparkle(20, 'gold', 1), sparkle(14, 'violet', 2), sparkle(24, 'gold', 3), sparkle(12, 'white', 4), sparkle(12, 'white', 5)), h('div', { class: 'reward-box', 'data-part': 'reward-box' }, h('p', { class: 'reward-sub', role: options.info ? 'status' : undefined }, options.info ? p.contentsUnavailable
        ? text(p, 'kit.reward-window.contents-unavailable')
        : items.length ? text(p, 'kit.reward-window.chest-contents')
            : text(p, 'kit.reward-window.chest-empty') : text(p, 'kit.reward-window.you-received')), ...windowSlots(p, 'rewardWindow', { rewards: rewardItemsView(p, items, options) })), h('div', { class: 'window-actions reward-actions' }, button(options.info ? text(p, 'kit.reward-window.back') : text(p, 'kit.reward-window.great'), 'close', p, { testid: options.okTestid ?? `${p.elementId}.ok` }))), h('div', { class: 'reward-spot', 'data-part': 'reward-spot', 'aria-hidden': 'true' }), h('div', { class: 'reward-fly', 'data-part': 'reward-fly', 'aria-hidden': 'true' }));
}
export function rewardWindowView(p) {
    return rewardLinesView(p, aggregateRewards(p.items), { okTestid: `${REWARD_WINDOW}.ok`,
        ...(p.info ? { info: true } : {}) });
}
export function findHudCapsule(id, root = globalThis.document) {
    if (!root || !ID.test(id))
        return null;
    const roots = [root];
    for (let i = 0; i < roots.length && i < 64; i += 1) {
        for (const element of roots[i].querySelectorAll('*')) {
            if (element.shadowRoot)
                roots.push(element.shadowRoot);
        }
    }
    for (const selector of [`[data-testid="hud.currency.${id}"]`, `[data-testid="hud.${id}"]`]) {
        for (const current of roots) {
            const found = current.querySelector(selector);
            if (found)
                return found;
        }
    }
    return null;
}
const flying = (line, find) => find(line) ?? null;
const played = new WeakMap();
export function playRewardVfx(root, p) {
    const items = aggregateRewards(p.items);
    const key = items.map((line) => `${line.id}:${line.quantity}`).join(',');
    if (played.get(root) === key)
        return;
    played.set(root, key);
    const view = root.host.ownerDocument.defaultView;
    if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== false)
        return;
    const layer = root.querySelector('[data-part="reward-fly"]');
    if (!layer || typeof layer.animate !== 'function')
        return;
    const find = p.target ?? ((line) => findHudCapsule(line.id, root.host.ownerDocument));
    for (const line of items) {
        const art = root.querySelector(`[data-reward-id="${line.id}"] .reward-art > *`);
        const target = flying(line, find);
        if (!art || !target?.isConnected)
            continue;
        const from = art.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const count = Math.min(MAX_COINS, Math.max(3, line.quantity));
        let landed = false;
        for (let i = 0; i < count; i += 1) {
            const coin = art.cloneNode(true);
            coin.classList.add('reward-coin');
            layer.append(coin);
            const spread = (i - (count - 1) / 2) * 14;
            const lift = 36 + (i % 3) * 12;
            const x0 = from.left;
            const y0 = from.top;
            const x1 = to.left + to.width / 2 - from.width / 4;
            const y1 = to.top + to.height / 2 - from.height / 4;
            const flight = coin.animate([
                { transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 },
                { transform: `translate(${x0 + spread}px,${y0 - lift}px) scale(1)`, opacity: 1, offset: 0.3 },
                { transform: `translate(${x1}px,${y1}px) scale(.5)`, opacity: 0.9 },
            ], { duration: COIN_FLIGHT_MS, delay: TICK_UP_DELAY_MS - COIN_FLIGHT_MS + i * 50,
                easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'both' });
            const last = i === count - 1;
            void flight.finished.then(() => {
                coin.remove();
                if (!root.host.isConnected || !target.isConnected)
                    return;
                for (const capsule of last ? [target, litCopy(root, target)] : []) {
                    if (typeof capsule?.animate !== 'function')
                        continue;
                    capsule.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' },
                        { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
                }
                if (!landed) {
                    landed = true;
                    const CustomEvent = view.CustomEvent;
                    target.dispatchEvent(new CustomEvent('kit:reward:landed', {
                        bubbles: true, composed: true, detail: { id: line.id },
                    }));
                    glowLit(root, target);
                }
            }, () => { coin.remove(); });
        }
    }
}
export function wholeLinesHeight(visible, bottoms) {
    if (!bottoms.length || bottoms.at(-1) <= visible + 0.5)
        return undefined;
    let fit = bottoms[0];
    for (const bottom of bottoms)
        if (bottom <= visible + 0.5)
            fit = bottom;
    return fit;
}
export function listCapRule(cap, visible = Infinity) {
    if (cap === undefined)
        return '';
    const rule = `.reward-items{min-height:${cap}px;max-height:${cap}px}`;
    return cap <= visible + 0.5 ? rule : `${rule}
.reward-window .dialog>.reward-box{flex-shrink:0;min-height:auto;max-height:none}
.reward-window .dialog{grid-template-rows:auto auto auto}`;
}
export function litCapsuleRules(boxes) {
    const px = (value) => `${Math.round(value * 100) / 100}px`;
    return boxes.map((box, i) => `.reward-lit[data-i="${i}"]{left:${px(box.left)};top:${px(box.top)};`
        + `width:${px(box.width)};height:${px(box.height)}}`).join('\n');
}
const layoutSheets = new WeakMap();
function layoutRules(root, part, css) {
    let entry = layoutSheets.get(root);
    if (!entry) {
        const View = root.host.ownerDocument.defaultView;
        if (!View?.CSSStyleSheet || !('replaceSync' in View.CSSStyleSheet.prototype))
            return;
        entry = { sheet: new View.CSSStyleSheet(), parts: new Map() };
        layoutSheets.set(root, entry);
    }
    if (!root.adoptedStyleSheets.includes(entry.sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, entry.sheet];
    }
    if ((entry.parts.get(part) ?? '') === css)
        return;
    entry.parts.set(part, css);
    entry.sheet.replaceSync([...entry.parts.values()].join('\n'));
}
const watchers = new WeakMap();
function fitKey(root, list) {
    const zone = root.querySelector('.dialog-backdrop');
    return [zone?.clientWidth, zone?.clientHeight,
        ...[...list.children].map((line) => line.offsetHeight)].join(',');
}
export function fitRewardList(root) {
    const list = root.querySelector('.reward-items');
    if (!list)
        return;
    layoutRules(root, 'cap', '');
    if (list.matches?.('.reward-grid'))
        return;
    const lines = [...list.children];
    const cap = list.clientHeight > 0 ? wholeLinesHeight(list.clientHeight, lines.map((line) => line.offsetTop + line.offsetHeight)) : undefined;
    layoutRules(root, 'cap', listCapRule(cap, list.clientHeight));
    const view = root.host.ownerDocument.defaultView;
    if (!view?.ResizeObserver)
        return;
    let watch = watchers.get(root);
    if (!watch) {
        const created = {
            key: fitKey(root, list),
            observer: new view.ResizeObserver(() => {
                if (!root.host.isConnected) {
                    created.observer.disconnect();
                    return;
                }
                if (created.frame !== undefined)
                    return;
                created.frame = view.requestAnimationFrame(() => {
                    created.frame = undefined;
                    const current = root.querySelector('.reward-items');
                    if (!current)
                        return;
                    const key = fitKey(root, current);
                    if (key === created.key)
                        return;
                    created.key = key;
                    fitRewardList(root);
                    lit.get(root)?.draw();
                });
            })
        };
        watch = created;
        watchers.set(root, watch);
    }
    else
        watch.key = fitKey(root, list);
    const zone = root.querySelector('.dialog-backdrop');
    if (zone)
        watch.observer.observe(zone);
    for (const line of lines)
        watch.observer.observe(line);
}
const lit = new WeakMap();
function litCopy(root, target) {
    const index = lit.get(root)?.capsules.indexOf(target.closest('.hud-capsule') ?? target) ?? -1;
    return index < 0 ? null : root.querySelector(`.reward-lit[data-i="${index}"] .hud>*`);
}
const glows = new WeakMap();
function playGlow(box, start) {
    const elapsed = performance.now() - start;
    if (elapsed >= GLOW_MS || typeof box.animate !== 'function')
        return;
    box.animate(GLOW_FRAMES, { duration: GLOW_MS, delay: -elapsed, easing: 'ease-out' });
}
function glowLit(root, target) {
    const box = litCopy(root, target)?.closest('.reward-lit');
    if (!box)
        return;
    const index = Number(box.getAttribute('data-i'));
    const map = glows.get(root) ?? new Map();
    glows.set(root, map);
    const start = performance.now();
    map.set(index, start);
    playGlow(box, start);
}
export function lightRewardCapsules(root, p) {
    const spot = root.querySelector('[data-part="reward-spot"]');
    const view = root.host.ownerDocument.defaultView;
    if (!spot || !view)
        return;
    const find = p.target ?? ((line) => findHudCapsule(line.id, root.host.ownerDocument));
    const resolve = () => [...new Set(aggregateRewards(p.items)
            .map((line) => flying(line, find)).filter((el) => !!el?.isConnected)
            .map((el) => el.closest('.hud-capsule') ?? el))];
    let capsules = resolve();
    const sheets = [...new Set(capsules.map((capsule) => capsule.getRootNode()))]
        .filter((node) => node !== root && 'adoptedStyleSheets' in node
        && node instanceof view.ShadowRoot)
        .flatMap((node) => node.adoptedStyleSheets)
        .filter((sheet) => !root.adoptedStyleSheets.includes(sheet));
    if (sheets.length)
        root.adoptedStyleSheets = [...new Set(sheets), ...root.adoptedStyleSheets];
    const draw = () => {
        if (!root.host.isConnected) {
            lit.get(root)?.observer.disconnect();
            return;
        }
        if (capsules.some((capsule) => !capsule.isConnected)) {
            capsules = resolve();
            const entry = lit.get(root);
            if (entry) {
                entry.capsules = capsules;
                watch(entry.observer);
            }
        }
        spot.replaceChildren(...capsules.map((capsule, i) => {
            const copy = capsule.cloneNode(true);
            for (const el of [copy, ...copy.querySelectorAll('*')]) {
                const testid = el.getAttribute('data-testid');
                if (testid !== null) {
                    el.setAttribute('data-lit-of', testid);
                    el.removeAttribute('data-testid');
                }
                el.removeAttribute('id');
                el.removeAttribute('data-change');
            }
            const bar = root.host.ownerDocument.createElement('nav');
            bar.className = 'hud';
            bar.setAttribute('data-slot', capsule.closest('.hud')?.getAttribute('data-slot') ?? 'top');
            bar.append(copy);
            const box = root.host.ownerDocument.createElement('div');
            box.className = 'reward-lit';
            box.setAttribute('data-i', String(i));
            box.setAttribute('inert', '');
            box.append(bar);
            const start = glows.get(root)?.get(i);
            if (start !== undefined)
                playGlow(box, start);
            return box;
        }));
        layoutRules(root, 'lit', litCapsuleRules(capsules.map((capsule) => {
            const rect = capsule.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        })));
    };
    lit.get(root)?.observer.disconnect();
    if (!capsules.length || typeof view.MutationObserver !== 'function') {
        spot.replaceChildren();
        return;
    }
    const observer = new view.MutationObserver((records) => {
        if (!records.every((record) => record.type === 'characterData')) {
            draw();
            return;
        }
        capsules.forEach((capsule, i) => {
            const from = capsule.querySelectorAll('.hud-value');
            spot.querySelectorAll(`.reward-lit[data-i="${i}"] .hud-value`).forEach((value, n) => {
                value.textContent = from[n]?.textContent ?? value.textContent;
            });
        });
    });
    const watch = (target) => {
        target.disconnect();
        for (const capsule of capsules) {
            target.observe(capsule.parentNode ?? capsule, { subtree: true, childList: true, characterData: true, attributes: true });
        }
    };
    watch(observer);
    lit.set(root, { observer, draw, capsules });
    draw();
}
export const rewardWindow = component((p, drafts, ctx) => {
    const items = aggregateRewards(p.items);
    const current = new Set(items.filter(line => line.chest).map(line => `chest:${line.id}:${line.chest.state}`));
    for (const key of Object.keys(drafts)) {
        if (key.startsWith('chest:') && !current.has(key))
            delete drafts[key];
    }
    const guarded = { ...p, emitIntent: (intent, payload) => {
            if (intent === 'chest-open' || intent === 'chest-claim') {
                const line = items.find(item => item.id === payload?.['id']);
                if (!line?.chest)
                    return;
                const key = `chest:${line.id}:${line.chest.state}`;
                if (drafts[key])
                    return;
                drafts[key] = 'pending';
                p.emitIntent(intent, payload);
                ctx.refresh();
                return;
            }
            p.emitIntent(intent, payload);
        } };
    return rewardLinesView(guarded, items, { okTestid: `${REWARD_WINDOW}.ok`, info: p.info === true,
        pendingChestIds: new Set(items.filter(line => line.chest
            && drafts[`chest:${line.id}:${line.chest.state}`]).map(line => line.id)) });
}, {
    presentation: 'fullscreen',
    styles: `.reward-grid-item:has(>.reward-chest-result)>.reward-grid-entry{height:auto}
    .reward-chest-info{position:relative}
    .reward-chest-badge{position:absolute;right:2px;top:2px}
    .reward-chest-result{min-width:0}
    .reward-chest-result>button{width:100%;padding:4px 2px;overflow-wrap:anywhere}
    .reward-chest-result>.reward-items{min-height:0;max-height:160px}
    .reward-random-art{position:relative;display:grid;place-items:center}
    .reward-random-silhouette{display:grid;opacity:.4}
    .reward-random-mark{position:absolute;inset:0;display:grid;place-items:center}
    .reward-window[data-info] .reward-box{min-height:0}
    .reward-window[data-info] .dialog{grid-template-columns:minmax(0,1fr);
      grid-template-areas:"head" "box" "act"}`,
    rendered: (p, ctx) => {
        fitRewardList(ctx.root);
        if (!p.info) {
            lightRewardCapsules(ctx.root, p);
            playRewardVfx(ctx.root, p);
        }
    }
});
export const REWARD_WINDOW = 'ui.reward';
export const REWARD_ELEMENT = 'reward';
export const DEFAULT_REWARD_TRIGGER = Object.freeze({
    id: 'reward-on-grant', on: Object.freeze({ event: 'inventory:items:granted' }), priority: 20,
    do: Object.freeze([Object.freeze({ module: REWARD_WINDOW, action: 'main' })]),
});
export function rewardWindowModule(options = {}) {
    const latest = new Map();
    const tickets = new Map();
    let host;
    const ids = [REWARD_ELEMENT, ...Array.from({ length: MAX_CHEST_DEPTH }, (_, i) => `${REWARD_ELEMENT}.contents.${i + 1}`)];
    const assets = options.assetUrl ? { assetUrl: options.assetUrl } : {};
    return {
        manifest: { id: REWARD_WINDOW, ui: { contributes: ids.map(id => ({ id, kind: 'popup',
                    slot: 'reward', component: 'reward', order: 1000, popupKind: 'info' })) } },
        components: { reward: rewardWindow },
        elementId: REWARD_ELEMENT,
        attach(value) {
            host = value;
            return () => { host = undefined; latest.clear(); tickets.clear(); };
        },
        props(id, extra) {
            if (extra)
                latest.set(id, extra);
            return { ...assets, ...latest.get(id) };
        },
        intent(id, intent, payload) {
            const index = ids.indexOf(id);
            if (intent === 'close') {
                for (const child of ids.slice(index + 1))
                    tickets.get(child)?.close();
                latest.delete(id);
                tickets.delete(id);
                return;
            }
            if (intent === 'chest-open' || intent === 'chest-claim') {
                options.intent?.(intent, payload ?? {});
                return;
            }
            if (intent !== 'chest-info' || !host)
                return;
            let lines = aggregateRewards(latest.get(id)?.['items']);
            let line;
            const path = payload?.['path'];
            if (!Array.isArray(path) || path.length > MAX_CHEST_DEPTH)
                return;
            for (const at of path) {
                if (!Number.isSafeInteger(at) || at < 0)
                    return;
                line = lines[at];
                lines = [...(line?.chest?.result ?? [])];
            }
            const child = ids[index + 1];
            if ((!line?.chest && !line?.random) || line.id !== payload?.['id'] || !child)
                return;
            const items = line.chest?.contents ?? line.random?.contents;
            const childProps = { ...latest.get(id), items: items ?? [], info: true, busy: false,
                title: undefined, contentsUnavailable: items === undefined || items === null };
            tickets.set(child, host.open(child, childProps));
        },
    };
}
const linesOf = (value) => aggregateRewards(record(value) ? value['items'] : undefined);
export function registerRewardWindow(windows, shell, options = {}) {
    return windows.register(REWARD_WINDOW, { main: {
            canShow: (context) => !('payload' in context) || linesOf(context['payload']).length > 0,
            open: (params = {}, context = {}) => {
                const fromParams = linesOf(params);
                const lines = (fromParams.length ? fromParams : linesOf(context['payload'])).map((line) => {
                    const described = options.describe?.(line);
                    return { ...line, ...(described?.name ? { name: described.name } : {}),
                        ...(described?.icon ? { icon: described.icon } : {}) };
                });
                if (!lines.length)
                    return { closed: Promise.resolve(), close() { } };
                const payload = context['payload'];
                const source = typeof params['source'] === 'string' ? params['source']
                    : record(payload) && typeof payload['source'] === 'string' ? payload['source'] : undefined;
                const ticket = shell.open(REWARD_ELEMENT, { ...params, ...(source ? { source } : {}),
                    items: lines });
                return { closed: ticket.closed, close: () => ticket.close() };
            },
        } });
}
nameComponents({ rewardWindow });
