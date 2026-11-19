import { windowTemplateOf } from './skin-layer.js';
export function skinWindowView(tree, target, scope, orientation) {
    const template = target ? windowTemplateOf(target, scope, orientation) : undefined;
    if (!template)
        return tree;
    const transform = (node) => {
        if (!node || typeof node !== 'object')
            return node;
        if (node.attrs['role'] !== 'dialog')
            return { ...node, children: node.children.map(transform) };
        const slots = new Map();
        const collect = (child) => {
            if (!child || typeof child !== 'object')
                return;
            const key = child.attrs['data-skin-slot'];
            if (typeof key === 'string') {
                slots.set(key, child);
                return;
            }
            child.children.forEach(collect);
        };
        node.children.forEach(collect);
        const used = new Set();
        const layout = (spec) => {
            if ('slot' in spec) {
                used.add(spec.slot);
                return slots.get(spec.slot);
            }
            return { tag: spec.tag, attrs: spec.class ? { class: spec.class } : {}, on: {},
                children: spec.children.map(layout) };
        };
        const arranged = template.layout ? [layout(template.layout)] : [];
        const remaining = (child) => {
            if (!child || typeof child !== 'object')
                return child;
            if (used.has(String(child.attrs['data-skin-slot'])))
                return null;
            return { ...child, children: child.children.map(remaining) };
        };
        return { ...node, attrs: { ...node.attrs,
                ...(tree.attrs['data-window-mode'] === undefined ? { 'data-window-mode': template.mode } : {}) },
            children: [...arranged, ...node.children.map(remaining)] };
    };
    return transform(tree);
}
export function windowFocus(root) {
    const active = root.activeElement;
    if (!active)
        return () => { };
    const testid = active.getAttribute('data-testid');
    const slot = active.closest('[data-skin-slot]');
    const key = slot?.getAttribute('data-skin-slot');
    const path = [];
    for (let node = active; node && node !== slot; node = node.parentElement) {
        if (!node.parentElement)
            break;
        path.unshift(Array.from(node.parentElement.children).indexOf(node));
    }
    const input = active;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const direction = input.selectionDirection;
    return () => {
        let target = testid === null ? undefined : Array.from(root.querySelectorAll('[data-testid]'))
            .find(node => node.getAttribute('data-testid') === testid);
        if (!target && key) {
            let node = Array.from(root.querySelectorAll('[data-skin-slot]'))
                .find(node => node.getAttribute('data-skin-slot') === key);
            for (const index of path)
                node = node?.children[index];
            target = node;
        }
        if (!target || target.tagName !== active.tagName)
            return;
        if (root.activeElement !== target)
            target.focus({ preventScroll: true });
        if (typeof start === 'number' && typeof end === 'number') {
            target.setSelectionRange(start, end, direction ?? undefined);
        }
    };
}
