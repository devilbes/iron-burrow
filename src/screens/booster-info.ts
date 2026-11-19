// S16 Booster info game window: the booster's picture, name, description, how many the player has,
// how long it lasts and the per-stage (per-run in Siege) limit. The caller has paused the match.
// «Get more» opens the offer window (placement `prestage`, the hull/booster offer) before resolving.
import { gameOf, type BoosterId, type Mode } from '../modules/game/index.js';
import type { ScreenContext } from './index.js';
import { itemArt, picture } from './media.js';
import { openOffer } from './shop.js';
import { attempt, WINDOW_CSS } from './stage-ui.js';
import { mountView, view, type ViewNode } from './ui.js';

const SEEN = 'booster_info.seen';

interface BoosterFacts {
  owned: number;
  limits: { readonly stage: number; readonly siege: number; readonly durationS: number | null } | null;
}

/** Card of a booster; «Get more» opens the offer / shop itself before resolving 'shop'. */
export async function openBoosterInfo(ctx: ScreenContext, id: BoosterId, mode: Mode): Promise<'ok' | 'shop'> {
  const game = gameOf(ctx.game);
  const owned = await attempt(() => game.balances()[id] ?? 0, 0);
  const limits = await attempt<BoosterFacts['limits']>(() => game.boosterLimits(id), null);
  if (!(await attempt(() => game.flag(SEEN), true))) void attempt(() => game.setFlag(SEEN), undefined);

  const ticket = ctx.window.open({
    title: ctx.t(`item.${id}.title`),
    body: (root) => mountView(root, 'booster-info', () => renderCard(ctx, id, mode, { owned, limits }), { styles: WINDOW_CSS }),
    actions: [
      { id: 'booster-info-ok', label: ctx.t('screen.common.ok'), variant: 'primary' },
      { id: 'booster-info-shop', label: ctx.t('screen.booster.more'), variant: 'secondary' },
    ],
  });
  if ((await ticket.result) !== 'booster-info-shop') return 'ok';
  await attempt(() => openOffer(ctx, 'prestage'), undefined);
  return 'shop';
}

function renderCard(ctx: ScreenContext, id: BoosterId, mode: Mode, facts: BoosterFacts): ViewNode {
  const name = ctx.t(`item.${id}.title`);
  const limits = facts.limits;
  const limit = limits === null ? null
    : mode === 'siege' ? ctx.t('screen.booster.limit_siege', { count: limits.siege })
      : ctx.t('screen.booster.limit', { count: limits.stage });
  return view('div', { class: 'win', 'data-window': 'booster-info', 'data-state': facts.owned > 0 ? 'owned' : 'empty',
    'data-mode': mode },
  view('div', { class: 'col', 'data-testid': 'booster-info-card', 'data-item': id },
    picture(itemArt(id), name, { class: 'card-art' }),
    view('p', { class: 'accent' }, name),
    view('p', { class: 'plate window-text' }, ctx.t(`item.${id}.description`)),
    view('ul', { class: 'rows' },
      view('li', { 'data-testid': 'booster-info-owned', 'data-dynamic': '' }, ctx.t('screen.booster.owned', { count: facts.owned })),
      limits?.durationS != null
        ? view('li', { 'data-testid': 'booster-info-duration', 'data-dynamic': '' },
          ctx.t('screen.booster.duration', { seconds: limits.durationS }))
        : null,
      limit !== null ? view('li', { 'data-testid': 'booster-info-limit', 'data-dynamic': '' }, limit) : null)));
}
