import { createViewComponent, nameComponents, view as h, type ViewNode } from '@manygamescorp/ui-kit/core';
import { PROFILE_WINDOW_OWNER, PROGRESS } from '../../boot/ids.js';
import type { ProgressStore } from '../../boot/progress-state.js';
import { PROFILE_STATS } from '../../screens/index.js';
import { type PresenterPart, type PresenterRuntime } from './presenter.js';

const PROFILE = 'starter.window.profile';

/** One line of the window: label and value, both ready to show. */
interface StatLine { readonly field: string; readonly label: string; readonly value: string }

interface PlayerCardProps {
  readonly name: string;
  readonly avatar?: string;
  readonly stats: readonly StatLine[];
}

/**
 * The profile card of a casual game: avatar, name and the game's own short list of lines
 * (`PROFILE_STATS`, src/screens/index.ts), label left and value right. The kit's `profile` window
 * is a developer view (every system field with a dash, referral code, locale, country, a player id
 * field, «Refresh profile», a JSON dump), so the shell draws this card in its place with the same
 * name: the skin's `profile` sheet (avatar, card) applies to it.
 */
export const playerCard = createViewComponent<PlayerCardProps, Record<string, never>>({
  styles: ':host{display:block}section{display:grid;gap:16px;padding:4px 0}'
    + '.card{display:flex;align-items:center;gap:16px}h3{margin:0;min-width:0;overflow-wrap:anywhere}'
    + '.avatar{flex:none}',
  local: () => ({}),
  render: (p): ViewNode => h('section', { 'data-part': 'player-card', 'data-testid': 'player-card' },
    h('div', { class: 'card row' },
      p.avatar ? h('img', { class: 'avatar', src: p.avatar, alt: '' })
        : h('div', { class: 'avatar', 'aria-hidden': 'true' }, p.name.slice(0, 1)),
      h('h3', { 'data-part': 'player-name' }, p.name)),
    p.stats.length ? h('dl', { 'data-part': 'system-profile' }, ...p.stats.map((line) =>
      h('div', { class: 'row' }, h('dt', {}, line.label), h('dd', { 'data-field': line.field }, line.value))))
      : null),
});
nameComponents({ profile: playerCard });

/** A value worth a line: a finite number or a short non-empty text that is not a dash. */
function shown(value: unknown, lang: string): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? new Intl.NumberFormat(lang).format(value) : undefined;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text && text !== '—' && text !== '-' && text.length <= 32 ? text : undefined;
}

/**
 * Profile. The published trigger of the top bar profile button (`hud:profile`) opens the `main`
 * window of `profile-ui`, but in rc.30 `profile-ui` registers no queue window (it only shows the
 * level in the top bar), so the trigger would fail with TRIGGER_ACTION_UNKNOWN. This part
 * registers that window for `profile-ui` through the public `sdk.modules.register` and shows the
 * player card with `sdk.profile.get()` and the session's level progress (no extra progress read).
 * Settings need no presenter: `hud:settings` opens the stock `ui.settings` window (`standard.ts`).
 */
export function playerPresenter(run: PresenterRuntime, progress: ProgressStore): PresenterPart {
  let summary: Readonly<Record<string, unknown>> | undefined;
  let offWindows: (() => void) | undefined;
  const loadProfile = async (): Promise<void> => {
    try {
      summary = (await run.sdk().profile?.get()) as Readonly<Record<string, unknown>> | undefined;
    } catch (error) { run.fail(error); }
    run.refresh(PROFILE);
  };
  const levelsCompleted = (): number | undefined => {
    const steps = progress.get(PROGRESS.levels)?.steps;
    return steps ? Object.values(steps).filter((step) => step.status === 'completed').length : undefined;
  };
  const card = (): PlayerCardProps => {
    const sdk = run.sdk();
    const lang = sdk.l10n.locale();
    const name = typeof summary?.['name'] === 'string' && summary['name'].trim() ? summary['name'].trim()
      : sdk.l10n.t('shell.profile.player', { gid: String(sdk.auth?.session?.gid ?? '') }).trim();
    const avatar = typeof summary?.['avatar'] === 'string' && /^https:\/\//.test(summary['avatar'])
      ? summary['avatar'] : undefined;
    const stats = PROFILE_STATS.flatMap((stat) => {
      const value = shown(stat.value === 'levelsCompleted' ? levelsCompleted() : summary?.[stat.value], lang);
      return value === undefined ? [] : [{ field: stat.value, label: sdk.l10n.t(stat.label), value }];
    });
    return { name, stats, ...(avatar ? { avatar } : {}) };
  };
  return {
    contributes: [{ id: PROFILE, kind: 'window', slot: 'overlay', component: 'profile', popupKind: 'content',
      title: 'shell.profile.title' }],
    components: { profile: playerCard },
    props(elementId) {
      if (elementId !== PROFILE) return undefined;
      return { ...run.common(), ...card() };
    },
    intent() {},
    start() {
      offWindows?.();
      offWindows = run.sdk().modules.register(PROFILE_WINDOW_OWNER, { windows: { main: {
        canShow: () => run.host() !== undefined,
        open: () => {
          void loadProfile();
          const ticket = run.host()?.open(PROFILE);
          return { closed: ticket?.closed ?? Promise.resolve(), close: () => ticket?.close() };
        },
      } } });
    },
    stop() { offWindows?.(); offWindows = undefined; summary = undefined; },
  };
}
