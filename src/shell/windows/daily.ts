import type { DailyRewards } from '@manygamescorp/mod-daily-rewards/daily-rewards';
import type { ProgressState } from '@manygamescorp/mod-progress/progress';
import { dailyReward, type DailyRewardDay } from '@manygamescorp/ui-kit/services/progress';
import { CONFIG, MODULES, PROGRESS } from '../../boot/ids.js';
import type { ProgressStore } from '../../boot/progress-state.js';
import type { ItemCatalog } from '../item-catalog.js';
import { kitText, windowContribution, type PresenterPart, type PresenterRuntime } from './presenter.js';

const DAILY = 'starter.window.daily';

/**
 * Daily reward: the stock `dailyReward` window. Days and their rewards come from the module plan
 * (`sdk['daily-rewards'].plan()`), their state from the session's one progress read
 * (`ProgressStore`): opening the window makes no request once progress is read; «Retry» after a
 * failed read reads it again. «Claim» (a `manual` track) posts the claim to progress: rc.30 has
 * no claim method in mod-progress or mod-daily-rewards, so this presenter calls the progress
 * endpoint through the module's scoped http (permission `http:progress`) and marks the reward
 * issued in the read state. The coins arrive as an inventory grant and the stock reward window
 * shows them. A day shows the picture of its reward item (`ITEMS` of src/skin/art.ts), else a gift.
 */
export function dailyPresenter(run: PresenterRuntime, progress: ProgressStore,
  items: ItemCatalog): PresenterPart {
  let loading = false;
  let error: string | undefined;
  const claiming = new Set<string>();
  let offs: (() => void)[] = [];
  let open = false;
  const daily = (): ProgressState | undefined => progress.get(PROGRESS.daily);
  const load = async (): Promise<void> => {
    if (daily()) return;
    loading = true; error = undefined; run.refresh(DAILY);
    try { await progress.read(); } catch { error = 'LOAD_FAILED'; }
    finally { loading = false; run.refresh(DAILY); }
  };
  type Step = { key?: unknown; reward?: readonly { id?: unknown; amount?: unknown }[] };
  /** Steps of the track record (keys and rewards); the module plan gives the day count. */
  const steps = (): Step[] => run.sdk().configs?.get<{ steps?: Step[] }>(CONFIG.progress.scope,
    PROGRESS.daily)?.steps ?? [];
  const dayStatus = (key: string): DailyRewardDay['status'] => {
    const state = daily();
    const current = (state?.rewards ?? []).filter((r) => !state?.attemptId || r.attemptId === state.attemptId);
    const reward = current.find((item) => item.targetKey === key);
    if (reward && claiming.has(reward.operationId)) return 'pending';
    if (reward?.status === 'failed') return 'failed';
    if (reward?.status === 'issued') return 'claimed';
    if (reward?.status === 'available') return reward.claimMode === 'manual' ? 'available' : 'pending';
    return state?.steps[key]?.status === 'completed' ? 'claimed' : 'locked';
  };
  const days = (): DailyRewardDay[] => {
    const plan = run.module<DailyRewards>(MODULES.daily)?.plan();
    const list = steps();
    const count = Math.min(7, plan?.days.length || list.length);
    return Array.from({ length: count }, (_, index) => {
      const step = list[index];
      const key = typeof step?.key === 'string' ? step.key : Object.keys(daily()?.steps ?? {})[index] ?? String(index);
      const amount = step?.reward?.[0]?.amount ?? plan?.days[index]?.reward[0]?.amount;
      const item = step?.reward?.[0]?.id ?? plan?.days[index]?.reward[0]?.id;
      const status = dayStatus(key);
      const reward = daily()?.rewards.find((item) => item.targetKey === key && item.status === 'available');
      return { key, title: run.sdk().l10n.t('shell.daily.day', { n: index + 1 }),
        amount: typeof amount === 'number' ? amount : '—',
        icon: (typeof item === 'string' ? items.icon(item) : undefined) ?? 'gift', status,
        wide: count === 7 && index === 6,
        ...(status === 'available' && reward ? { operationId: reward.operationId } : {}) };
    });
  };
  const claim = async (operationId: string): Promise<void> => {
    const http = run.ctx()?.http;
    const state = daily();
    if (!http || !state?.periodKey || claiming.has(operationId)) return;
    claiming.add(operationId); run.refresh(DAILY);
    try {
      await http.request({ method: 'POST', path: `/me/rewards/${encodeURIComponent(operationId)}/claim`,
        body: { key: PROGRESS.daily, periodKey: state.periodKey }, idempotent: true,
        idempotencyKey: operationId });
      progress.change(PROGRESS.daily, (current) => ({ ...current, rewards: current.rewards.map((reward) =>
        reward.operationId === operationId ? { ...reward, status: 'issued' as const } : reward) }));
    } catch (failure) { run.fail(failure); } finally {
      claiming.delete(operationId);
      run.refresh(DAILY);
    }
  };
  return {
    contributes: [windowContribution(DAILY, 'daily', MODULES.daily)],
    components: { daily: dailyReward },
    uses: [MODULES.daily, MODULES.progress],
    permissions: ['http:progress'],
    emits: ['daily-rewards:window:closed'],
    listens: ['daily-rewards:calendar:open', 'daily-rewards:window:close'],
    props(elementId) {
      if (elementId !== DAILY) return undefined;
      return { ...run.common(), loading: loading || (!daily() && !error), ...(error ? { error } : {}),
        trackKey: PROGRESS.daily, days: days(), l10n: kitText(run.sdk()) };
    },
    intent(_elementId, intent, payload) {
      if (intent === 'refresh') void load();
      if (intent === 'claim' && typeof payload?.['operationId'] === 'string') void claim(payload['operationId']);
    },
    start(ctx) {
      offs = [
        progress.onChange(() => { if (open) run.refresh(DAILY); }),
        ctx.bus.on('daily-rewards:calendar:open', () => {
          if (open) return;
          open = true;
          run.open(DAILY, () => {
            open = false;
            if (!ctx.signal.aborted) ctx.bus.emit('daily-rewards:window:closed', { name: 'main' });
          });
          void load();
        }),
        ctx.bus.on<{ name: string }>('daily-rewards:window:close', ({ name }) => {
          if (name === 'main') run.host()?.close(DAILY);
        }),
      ];
    },
    stop() { for (const off of offs) off(); offs = []; open = false; claiming.clear(); },
  };
}
