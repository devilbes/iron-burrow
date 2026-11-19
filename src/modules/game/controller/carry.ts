// Gun carry of the campaign (GDD 10 D-10-06, 15 meta.save): after a verified win the gun level
// goes with the next stage; it is written once to the cloud save after the level end answer
// (campaign.gun_level, campaign.last_stage), never on moves or ticks, never in Siege. The save
// is read at most once per session, lazily at the first campaign start.
import type { GameState } from '../index.js';
import type { Ctx } from './context.js';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** The carry a save describes: gun_level for the stage after last_stage. */
export function carryFromSave(data: GameState | null): { stage: number; gun: number } | null {
  const campaign = data?.campaign;
  if (!isRecord(campaign) || !isCount(campaign.gun_level) || !isCount(campaign.last_stage)) return null;
  return { stage: campaign.last_stage + 1, gun: campaign.gun_level };
}

/** Reads the save once per session; a failed read leaves nothing to write over (no save then). */
export function readSave(ctx: Ctx): Promise<void> {
  ctx.save.read ??= (async () => {
    try {
      const data = await ctx.deps.campaign.loadSave();
      ctx.save.loaded = data;
      ctx.save.ok = true;
      ctx.carry ??= carryFromSave(data);
    } catch {
      ctx.save.ok = false;
    }
  })();
  return ctx.save.read;
}

/** Gun level a campaign start of `stage` takes (the carry is used once). */
export function takeCarry(ctx: Ctx, stage: number): number {
  const gun = ctx.carry?.stage === stage ? ctx.carry.gun : 0;
  ctx.carry = null;
  return gun;
}

/** Writes the carry after a verified win of stage `n` when it differs from the save. */
export function writeCarry(ctx: Ctx, n: number, gun: number): void {
  if (!ctx.save.ok) return;
  const loaded: Json = { ...(ctx.save.loaded ?? {}) };
  const campaign: Json = isRecord(loaded.campaign) ? loaded.campaign : {};
  if (campaign.gun_level === gun && campaign.last_stage === n) return;
  const next: GameState = { ...loaded, campaign: { ...campaign, gun_level: gun, last_stage: n } };
  ctx.deps.campaign.save(next).then(() => { ctx.save.loaded = next; }, () => { /* written again at the next win */ });
}
