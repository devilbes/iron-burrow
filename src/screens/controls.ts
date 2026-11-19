// Input of S05: keys (arrows / WASD drive, Space / J fire, 1/2/3 boosters, Esc / P pause) and the
// touch stick and FIRE button (`pointer: coarse` only, D-20-01). The held input goes to the match
// on every change; the last kind of input sets the hint mode (`setInputMode`, CONTRACT §11).
import type { Dir, InputMode } from '../modules/game/index.js';

export interface InputSink {
  /** False while a window is over the stage: keys are left to the window. */
  active(): boolean;
  input(move: Dir | null, fire: boolean): void;
  mode(mode: InputMode): void;
  pause(event: Event): void;
  booster(index: number): void;
}

const KEY_DIR: Readonly<Record<string, Dir>> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const FIRE_KEYS = new Set(['Space', 'KeyJ']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const BOOSTER_KEYS: Readonly<Record<string, number>> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2,
};
/** Part of the stick radius where the knob drives nothing (touch feel, not a game number). */
const DEAD_ZONE = 0.25;

/** Whether the main pointer is a finger (touch scheme: stick and FIRE). */
export function coarsePointer(win: Window): boolean {
  try { return win.matchMedia('(pointer: coarse)').matches; } catch { return false; }
}

type Handlers = Readonly<Record<string, (event: Event) => void>>;

export class Controls {
  private keysHeld: Dir[] = [];
  private keyFire = false;
  private stickDir: Dir | null = null;
  private touchFire = false;
  private sent = '';
  private stickPointer: number | null = null;
  private readonly offs: (() => void)[] = [];

  constructor(private readonly doc: Document, private readonly sink: InputSink) {
    const down = (event: KeyboardEvent): void => this.keyDown(event);
    const up = (event: KeyboardEvent): void => this.keyUp(event);
    const blur = (): void => this.release();
    doc.addEventListener('keydown', down);
    doc.addEventListener('keyup', up);
    doc.defaultView?.addEventListener('blur', blur);
    this.offs.push(() => doc.removeEventListener('keydown', down), () => doc.removeEventListener('keyup', up),
      () => doc.defaultView?.removeEventListener('blur', blur));
  }

  /** Direction the player holds now (keys first, then the stick). */
  get move(): Dir | null { return this.keysHeld[this.keysHeld.length - 1] ?? this.stickDir; }
  get fire(): boolean { return this.keyFire || this.touchFire; }

  private push(): void {
    const key = `${this.move ?? '-'}:${this.fire ? 1 : 0}`;
    if (key === this.sent) return;
    this.sent = key;
    this.sink.input(this.move, this.fire);
  }

  /** Lets go of everything held (pause, window, blur). */
  release(): void {
    this.keysHeld = [];
    this.keyFire = false;
    this.touchFire = false;
    this.stickDir = null;
    this.stickPointer = null;
    this.push();
  }

  private keyDown(event: KeyboardEvent): void {
    if (!this.sink.active() || event.altKey || event.ctrlKey || event.metaKey) return;
    const dir = KEY_DIR[event.code];
    if (PAUSE_KEYS.has(event.code)) { if (!event.repeat) this.sink.pause(event); event.preventDefault(); return; }
    const booster = BOOSTER_KEYS[event.code];
    if (booster !== undefined) { if (!event.repeat) { this.sink.mode('keys'); this.sink.booster(booster); } return; }
    if (dir) {
      event.preventDefault();
      if (!this.keysHeld.includes(dir)) this.keysHeld.push(dir);
    } else if (FIRE_KEYS.has(event.code)) {
      event.preventDefault();
      this.keyFire = true;
    } else return;
    this.sink.mode('keys');
    this.push();
  }

  private keyUp(event: KeyboardEvent): void {
    const dir = KEY_DIR[event.code];
    if (dir) this.keysHeld = this.keysHeld.filter((held) => held !== dir);
    else if (FIRE_KEYS.has(event.code)) this.keyFire = false;
    else return;
    this.push();
  }

  /** Listeners of the stick element (`data-testid=stick`, the knob is its `[data-part=knob]`). */
  stick(): Handlers {
    const moveTo = (event: Event): void => {
      const e = event as PointerEvent;
      if (this.stickPointer !== e.pointerId) return;
      const base = e.currentTarget as HTMLElement;
      const rect = base.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(dx, dy);
      if (length > radius) { dx = (dx / length) * radius; dy = (dy / length) * radius; }
      knob(base, dx, dy);
      this.stickDir = length < radius * DEAD_ZONE ? null
        : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      this.push();
    };
    const end = (event: Event): void => {
      const e = event as PointerEvent;
      if (this.stickPointer !== e.pointerId) return;
      this.stickPointer = null;
      this.stickDir = null;
      knob(e.currentTarget as HTMLElement, 0, 0);
      this.push();
    };
    return {
      onPointerdown: (event) => {
        const e = event as PointerEvent;
        e.preventDefault();
        this.stickPointer = e.pointerId;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* old browser */ }
        this.sink.mode('touch');
        moveTo(e);
      },
      onPointermove: moveTo, onPointerup: end, onPointercancel: end,
    };
  }

  /** Listeners of the FIRE button (`data-testid=fire`): held while pressed. */
  fireButton(): Handlers {
    const set = (on: boolean) => (event: Event): void => {
      const target = event.currentTarget as HTMLElement;
      if (on) {
        event.preventDefault();
        try { target.setPointerCapture((event as PointerEvent).pointerId); } catch { /* old browser */ }
        this.sink.mode('touch');
      }
      target.dataset['pressed'] = on ? 'true' : 'false';
      this.touchFire = on;
      this.push();
    };
    return { onPointerdown: set(true), onPointerup: set(false), onPointercancel: set(false) };
  }

  off(): void {
    for (const off of this.offs.splice(0)) off();
  }
}

function knob(base: HTMLElement, dx: number, dy: number): void {
  const part = base.querySelector<HTMLElement>('[data-part=knob]');
  if (part) part.style.transform = `translate(${dx}px, ${dy}px)`;
}
