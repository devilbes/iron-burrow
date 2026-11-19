/**
 * Order of the game's own windows (`ctx.window`, src/shell/windows/game.ts) and the kit reward
 * window (`ui.reward`, opened by the `inventory:items:granted` trigger). The SDK window queue does
 * not hold the reward back — it opens at once, over anything (core `window-triggers`: `ui.reward`
 * is never queued) — so a level reward granted while the result window is up would stand over it.
 * The rule here: the two never stand one over the other. A window of one side asked for while a
 * window of the other side is on screen waits until that one is closed (its close animation
 * included), then opens. At the end of a level the game shows its result at once and the grant
 * comes later with the server's answer: the result first, the reward right after the result is
 * closed. Game windows over game windows (pause → confirm) and rewards over rewards stack as the
 * shell stacks windows. No timers: only the windows' own `closed`.
 */
export interface OrderTicket {
  readonly closed: Promise<void>;
  close(): void;
}

export type OrderSide = 'game' | 'reward';

export interface WindowOrder {
  /** Opens a window of `side` now, or once no window of the other side is on screen. */
  open(side: OrderSide, show: () => OrderTicket): OrderTicket;
  /** Windows of each side on screen now (tests, checks). */
  shown(): Readonly<Record<OrderSide, number>>;
}

const other = (side: OrderSide): OrderSide => (side === 'game' ? 'reward' : 'game');

export function createWindowOrder(): WindowOrder {
  const live: Record<OrderSide, number> = { game: 0, reward: 0 };
  const waiting: Record<OrderSide, (() => void)[]> = { game: [], reward: [] };

  const start = (side: OrderSide, show: () => OrderTicket): OrderTicket => {
    live[side] += 1;
    let ticket: OrderTicket;
    try { ticket = show(); } catch (error) { live[side] -= 1; release(side); throw error; }
    const done = (): void => { live[side] -= 1; release(side); };
    void ticket.closed.then(done, done);
    return ticket;
  };
  /** The last window of `side` is gone: what waited on the other side opens now. */
  const release = (side: OrderSide): void => {
    if (live[side] > 0) return;
    for (const run of waiting[other(side)].splice(0)) run();
  };

  return {
    open(side, show) {
      if (live[other(side)] === 0) return start(side, show);
      let real: OrderTicket | undefined;
      let cancelled = false;
      let finish!: () => void;
      const closed = new Promise<void>((resolve) => { finish = resolve; });
      const run = (): void => {
        if (cancelled) return;
        try {
          real = start(side, show);
          void real.closed.then(finish, finish);
        } catch { finish(); }
      };
      waiting[side].push(run);
      return {
        closed,
        close() {
          if (real) { real.close(); return; }
          cancelled = true;
          waiting[side] = waiting[side].filter((item) => item !== run);
          finish();
        },
      };
    },
    shown: () => ({ ...live }),
  };
}
