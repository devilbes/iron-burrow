// Modal layers of the shell, measured in the page: the gallery imports it (gallery.js), the
// browser check adds it to the game page (tests/browser-startup.mjs). Sets
// `globalThis.modalLayers = { measure(), problems(), gameWindow(title) }`.
//
// The dim of a window is what paints its color over the screen: the `::before` of the window's
// wrapper (`[data-part=popup]`, `position: fixed; inset: 0` of the shell sheet, `--mp-overlay`)
// and/or the `.dialog-backdrop` a kit dialog draws, when it paints; the dim of a screen's overlay
// is `[data-part=game-overlay]` (src/shell/windows/game.ts). A pseudo-element has no box of its
// own to read: a fixed one is laid out against the viewport unless an ancestor (through shadow
// hosts) makes a box for fixed descendants (transform, filter, perspective, contain paint/layout,
// container size…) — then against that ancestor. Every dim must equal the viewport (±1 px), and
// the top bar must lie under it (the element at the middle of each top bar group is the layer's).
(() => {
  const rect = (el) => el.getBoundingClientRect();
  const parentOf = (node) => node.parentElement ?? node.getRootNode?.().host ?? null;
  /** Elements under `node` matching `selector`, through open shadow roots. */
  const inside = (node, selector) => {
    const out = [];
    const visit = (at) => {
      for (const child of at.children) {
        if (child.matches(selector)) out.push(child);
        if (child.shadowRoot) visit(child.shadowRoot);
        visit(child);
      }
    };
    visit(node);
    return out;
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const paint = canvas.getContext('2d', { willReadFrequently: true });
  const alpha = (color) => {
    paint.clearRect(0, 0, 1, 1); paint.fillStyle = 'rgba(0,0,0,0)'; paint.fillStyle = color; paint.fillRect(0, 0, 1, 1);
    return paint.getImageData(0, 0, 1, 1).data[3];
  };
  const painted = (style) => alpha(style.backgroundColor) > 0 || style.backgroundImage !== 'none';
  /** The box a `position: fixed` descendant of `el` is laid out against. */
  const fixedBox = (el) => {
    for (let at = parentOf(el); at && at.nodeType === 1; at = parentOf(at)) {
      const s = getComputedStyle(at);
      if (s.transform !== 'none' || s.perspective !== 'none' || s.filter !== 'none'
        || (s.backdropFilter && s.backdropFilter !== 'none') || /paint|layout|strict|content/.test(s.contain)
        || /transform|filter|perspective/.test(s.willChange) || /size/.test(s.containerType ?? '')) {
        const r = rect(at);
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, by: at.dataset?.slot ?? at.localName };
      }
    }
    return { left: 0, top: 0, right: innerWidth, bottom: innerHeight, by: 'viewport' };
  };
  /** Box of the `::before` of `el` (fixed or absolute, with its insets). */
  const pseudoBox = (el, s) => {
    const base = s.position === 'fixed' ? fixedBox({ parentElement: el })
      : (() => { const r = rect(el); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, by: 'wrapper' }; })();
    const px = (value) => (value.endsWith('px') ? parseFloat(value) : 0);
    return { left: base.left + px(s.left), top: base.top + px(s.top), right: base.right - px(s.right),
      bottom: base.bottom - px(s.bottom), by: base.by };
  };
  const round = (box) => `${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.right - box.left)}x${Math.round(box.bottom - box.top)}`;

  function measure() {
    const layers = [];
    const owners = [];
    for (const wrap of document.querySelectorAll('.mpg-shell [data-part=popup]:not([data-closing])')) {
      owners.push(wrap);
      const name = wrap.dataset.popup;
      const before = getComputedStyle(wrap, '::before');
      if (before.content !== 'none' && before.display !== 'none' && painted(before)) {
        layers.push({ owner: name, kind: '::before', box: pseudoBox(wrap, before) });
      }
      for (const backdrop of inside(wrap, '.dialog-backdrop')) {
        if (painted(getComputedStyle(backdrop))) layers.push({ owner: name, kind: '.dialog-backdrop', box: rect(backdrop) });
      }
    }
    for (const veil of document.querySelectorAll('.mpg-shell>[data-part=game-overlay]')) {
      owners.push(veil);
      if (painted(getComputedStyle(veil))) layers.push({ owner: 'overlay', kind: 'game-overlay', box: rect(veil) });
    }
    // The top bar under the layer: what is hit at the middle of each top bar group.
    const uncovered = [];
    for (const group of document.querySelectorAll('.mpg-shell [data-slot^="topBar"]')) {
      const r = rect(group);
      if (r.width < 2 || r.height < 2 || !group.children.length) continue;
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!owners.some((owner) => owner.contains(hit))) uncovered.push(group.dataset.slot);
    }
    return { viewport: { width: innerWidth, height: innerHeight }, open: owners.length, layers, uncovered };
  }

  /** What is wrong with the modal layers on screen now; `[]` when nothing is open or all is right. */
  function problems() {
    const m = measure();
    if (!m.open) return [];
    const out = [];
    if (!m.layers.length) out.push('a window or overlay is open, but no dim layer paints');
    for (const layer of m.layers) {
      const b = layer.box;
      if (Math.abs(b.left) > 1 || Math.abs(b.top) > 1 || Math.abs(b.right - innerWidth) > 1 || Math.abs(b.bottom - innerHeight) > 1) {
        out.push(`dim ${layer.owner} ${layer.kind}: ${round(b)}${b.by ? ` (against ${b.by})` : ''} instead of the viewport 0,0 ${innerWidth}x${innerHeight}`);
      }
    }
    for (const slot of m.uncovered) out.push(`top bar ${slot} not under the dim`);
    return out;
  }

  /**
   * A game window (`ctx.window.open`) on screen is the kit dialog: `.dialog[role=dialog]` of the
   * kit popup in the window host's shadow root, its title in the head, the kit buttons, the game's
   * body shown in the dialog's slot. Returns problems, `[]` when it is right.
   */
  function gameWindow(title, { actions = 0, body = true, close = true } = {}) {
    const host = [...document.querySelectorAll('.mpg-shell [data-element^="game.window"]')].at(-1);
    if (!host) return ['no game window host [data-element^=game.window]'];
    const dialog = host.shadowRoot?.querySelector('.dialog-backdrop>.dialog[role=dialog]');
    if (!dialog) return ['the game window is not the kit dialog (.dialog-backdrop>.dialog[role=dialog])'];
    const out = [];
    const head = dialog.querySelector('.dialog-head [data-skin-slot=title]');
    if (!head || head.textContent.trim() !== title) out.push(`title ${head?.textContent.trim() ?? 'none'} instead of ${title}`);
    if (close !== Boolean(dialog.querySelector('.dialog-close'))) out.push(close ? 'no close button' : 'a close button on a window that is not dismissible');
    const buttons = dialog.querySelectorAll('.std-actions button');
    if (buttons.length !== actions) out.push(`${buttons.length} kit buttons instead of ${actions}`);
    if (body) {
      const slot = dialog.querySelector('slot[name=body]');
      const shown = slot?.assignedElements() ?? [];
      if (shown.length !== 1) out.push('the game body is not in the window');
      else {
        const b = rect(shown[0]); const d = rect(dialog);
        if (b.height < 1 || b.left < d.left - 1 || b.right > d.right + 1 || b.top < d.top - 1 || b.bottom > d.bottom + 1) {
          out.push(`the game body is not inside the window frame (${round(b)} in ${round(d)})`);
        }
      }
    }
    return out;
  }

  globalThis.modalLayers = { measure, problems, gameWindow };
})();
