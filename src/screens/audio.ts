// Web Audio of the screens (CONTRACT §7.4): one Sound per game API, shared by home, map and game.
// The AudioContext is made and resumed on the first user gesture (browsers keep audio locked until
// then); files come from assets/audio/ (manifest.json: paths, mix, loop points, per-cue limits),
// OGG where the browser plays it, M4A otherwise. Two buses — music and sfx — under one master;
// at most MAX_VOICES one-shots at a time. A missing file or a browser without Web Audio is silent:
// nothing here throws. The hidden `audio-state` node reports locked|unlocked and the music/sfx
// switches of `settings()` for the scenarios.
import { assetUrl } from '../assets.js';
import type { IronBurrow, Settings } from '../modules/game/index.js';

export interface Sound {
  /** Music loop by cue id (`mus_lobby`, `mus_stage_clay|iron|magma`, `mus_siege`); null stops it. */
  music(id: string | null): void;
  /** One-shot by cue id (`sfx_*`, `jgl_*`). */
  sfx(id: string): void;
  /** Pause state: music quieter / filtered. */
  duck(on: boolean): void;
  /** Stop everything (onSuspend, screen left). */
  stop(): void;
  /** Hidden `data-testid=audio-state` node in `root`, kept up to date; returns what removes it. */
  attach(root: HTMLElement): () => void;
}

// Audio mix of the screens (not game numbers): bus gains, the duck level of the pause, fades.
/** Gain of the music bus (the manifest masters music and sfx to their LUFS targets). */
const MUSIC_GAIN = 0.7;
/** Gain of the sfx bus. */
const SFX_GAIN = 1;
/** Music gain factor while ducked (pause and windows over a stage). */
const DUCK_FACTOR = 0.3;
/** Time constant of gain changes, s. */
const RAMP_S = 0.08;
/** Fade of a music change, s. */
const FADE_S = 0.6;
/** One-shot voices at once (CONTRACT §7.4). */
const MAX_VOICES = 12;

interface Cue {
  readonly files: Readonly<Record<string, string>>;
  readonly mixDb: number;
  readonly loopStart: number | null;
  readonly loopEnd: number | null;
  /** Minimal gap between two starts, ms, and how many may sound at once (manifest `cooldownLimit`). */
  readonly gapMs: number;
  readonly most: number;
}

interface Voice { readonly id: string; readonly source: AudioBufferSourceNode; readonly at: number }

type AudioCtor = new () => AudioContext;

/** Cues of manifest.json by id (null: no manifest — default paths, no mix). */
async function readManifest(): Promise<Map<string, Cue> | null> {
  try {
    const response = await fetch(assetUrl('audio/manifest.json'));
    if (!response.ok) return null;
    const json = await response.json() as { music?: unknown[]; sfx?: unknown[] };
    const cues = new Map<string, Cue>();
    for (const raw of [...(json.music ?? []), ...(json.sfx ?? [])]) {
      const entry = raw as Record<string, unknown>;
      if (typeof entry['id'] !== 'string') continue;
      const limit = /(\d+)\s*\S*\s*\/\s*(\d+)/.exec(String(entry['cooldownLimit'] ?? ''));
      cues.set(entry['id'], {
        files: (entry['files'] ?? {}) as Record<string, string>,
        mixDb: Number.parseFloat(String(entry['mixDb'] ?? '0')) || 0,
        loopStart: typeof entry['loopStart'] === 'number' ? entry['loopStart'] : null,
        loopEnd: typeof entry['loopEnd'] === 'number' ? entry['loopEnd'] : null,
        gapMs: limit ? Number(limit[1]) : 0,
        most: limit ? Math.max(1, Number(limit[2])) : MAX_VOICES,
      });
    }
    return cues;
  } catch { return null; }
}

/** `ogg` when the browser plays Vorbis, else `m4a`. */
function format(): string {
  try {
    const probe = document.createElement('audio');
    return probe.canPlayType('audio/ogg; codecs="vorbis"') !== '' ? 'ogg' : 'm4a';
  } catch { return 'm4a'; }
}

const dbToGain = (db: number): number => 10 ** (db / 20);

class WebSound implements Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private unlocked = false;
  private ducked = false;
  private settings: Settings;
  private wanted: string | null = null;
  private current: { id: string; source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private voices: Voice[] = [];
  private readonly loops = new Map<string, AudioBufferSourceNode | null>();
  private readonly held = new Set<string>();
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly lastStart = new Map<string, number>();
  private readonly nodes = new Set<HTMLElement>();
  private manifest: Promise<Map<string, Cue> | null> | null = null;
  private readonly ext = format();

  constructor(game: IronBurrow) {
    this.settings = WebSound.read(game);
    try { game.onSettings((next) => this.onSettings(next)); } catch { /* stub API */ }
    this.listen();
  }

  private static read(game: IronBurrow): Settings {
    try { return game.settings(); } catch { return { music: true, sfx: true, motion: false, haptics: true }; }
  }

  /** First pointer or key press anywhere unlocks the audio. */
  private listen(): void {
    if (typeof document === 'undefined') return;
    const types = ['pointerdown', 'keydown', 'touchend'] as const;
    const once = (): void => {
      this.unlock();
      if (this.unlocked) for (const type of types) document.removeEventListener(type, once, true);
    };
    for (const type of types) document.addEventListener(type, once, true);
  }

  private unlock(): void {
    try {
      if (!this.ctx) {
        const scope = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
        const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicLevel();
        this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = SFX_GAIN;
        this.sfxBus.connect(this.master);
        this.manifest = readManifest();
      }
      const ctx = this.ctx;
      const done = (): void => {
        if (ctx.state !== 'running' || this.unlocked) return;
        this.unlocked = true;
        this.report();
        this.applyMusic();
      };
      if (ctx.state === 'running') done();
      else void ctx.resume().then(done, () => undefined);
    } catch { /* no audio on this device */ }
  }

  private musicLevel(): number { return this.ducked ? MUSIC_GAIN * DUCK_FACTOR : MUSIC_GAIN; }

  private onSettings(next: Settings): void {
    this.settings = next;
    if (!next.sfx) this.stopVoices();
    this.applyMusic();
    this.report();
  }

  private async cue(id: string): Promise<Cue | null> {
    const cues = await (this.manifest ?? Promise.resolve(null));
    return cues?.get(id) ?? null;
  }

  /** URL of the cue file: the manifest path, else `audio/<music|sfx>/<id>.<ext>`. */
  private url(id: string, cue: Cue | null): string {
    const path = cue?.files[this.ext] ?? cue?.files['ogg'];
    if (path) return assetUrl(path.replace(/^assets\//, ''));
    return assetUrl(`audio/${id.startsWith('mus_') ? 'music' : 'sfx'}/${id}.${this.ext}`);
  }

  private buffer(id: string): Promise<AudioBuffer | null> {
    const known = this.buffers.get(id);
    if (known) return known;
    const loading = (async (): Promise<AudioBuffer | null> => {
      const ctx = this.ctx;
      if (!ctx) return null;
      try {
        const response = await fetch(this.url(id, await this.cue(id)));
        if (!response.ok) return null;
        const data = await response.arrayBuffer();
        return await new Promise<AudioBuffer | null>((resolve) => {
          try {
            const decoding = ctx.decodeAudioData(data, (buffer) => resolve(buffer), () => resolve(null));
            void decoding?.catch?.(() => resolve(null));
          } catch { resolve(null); }
        });
      } catch { return null; }
    })();
    this.buffers.set(id, loading);
    return loading;
  }

  music(id: string | null): void {
    this.wanted = id;
    this.applyMusic();
  }

  private applyMusic(): void {
    const want = this.settings.music && this.unlocked ? this.wanted : null;
    if (this.current && this.current.id === want) return;
    this.fadeOut();
    if (!want) return;
    void this.startMusic(want);
  }

  private async startMusic(id: string): Promise<void> {
    const [buffer, cue] = await Promise.all([this.buffer(id), this.cue(id)]);
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!buffer || !ctx || !bus || this.current || id !== this.wanted || !this.settings.music) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      if (cue?.loopEnd != null && cue.loopEnd > (cue.loopStart ?? 0)) {
        source.loopStart = cue.loopStart ?? 0;
        source.loopEnd = Math.min(cue.loopEnd, buffer.duration);
      }
      const gain = ctx.createGain();
      const level = dbToGain(cue?.mixDb ?? 0);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(level, ctx.currentTime + FADE_S);
      source.connect(gain).connect(bus);
      source.start();
      this.current = { id, source, gain };
    } catch { /* silent */ }
  }

  private fadeOut(): void {
    const current = this.current;
    this.current = null;
    if (!current || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setValueAtTime(current.gain.gain.value, now);
      current.gain.gain.linearRampToValueAtTime(0, now + FADE_S);
      current.source.stop(now + FADE_S);
    } catch { /* already stopped */ }
  }

  sfx(id: string): void {
    if (!this.settings.sfx || !this.unlocked || !this.ctx) return;
    void this.play(id, false);
  }

  /** Starts (`on`) or stops a looping effect such as `sfx_engine_loop`. */
  hold(id: string, on: boolean): void {
    if (on) this.held.add(id); else this.held.delete(id);
    if (!on || !this.settings.sfx || !this.unlocked) {
      const playing = this.loops.get(id);
      this.loops.delete(id);
      try { playing?.stop(); } catch { /* stopped */ }
      return;
    }
    if (!this.loops.has(id)) void this.play(id, true);
  }

  private async play(id: string, loop: boolean): Promise<void> {
    const ctx = this.ctx;
    const cue = await this.cue(id);
    if (!ctx || !this.sfxBus) return;
    const now = performance.now();
    if (!loop && cue) {
      const last = this.lastStart.get(id) ?? -Infinity;
      if (now - last < cue.gapMs) return;
      if (this.voices.filter((voice) => voice.id === id).length >= cue.most) return;
      this.lastStart.set(id, now);
    }
    if (loop) this.loops.set(id, null);
    const buffer = await this.buffer(id);
    if (loop && (!this.loops.has(id) || !this.held.has(id))) return;
    if (!buffer || !this.settings.sfx) { if (loop) this.loops.delete(id); return; }
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      const gain = ctx.createGain();
      gain.gain.value = dbToGain(cue?.mixDb ?? 0);
      source.connect(gain).connect(this.sfxBus);
      source.start();
      if (loop) { this.loops.set(id, source); return; }
      while (this.voices.length >= MAX_VOICES) { const old = this.voices.shift(); try { old?.source.stop(); } catch { /* done */ } }
      const voice: Voice = { id, source, at: now };
      this.voices.push(voice);
      source.onended = () => { this.voices = this.voices.filter((item) => item !== voice); };
    } catch { if (loop) this.loops.delete(id); }
  }

  duck(on: boolean): void {
    this.ducked = on;
    if (!this.ctx || !this.musicBus) return;
    try { this.musicBus.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, RAMP_S); } catch { /* closed */ }
  }

  private stopVoices(): void {
    for (const voice of this.voices) { try { voice.source.stop(); } catch { /* done */ } }
    this.voices = [];
    for (const [id, source] of this.loops) { try { source?.stop(); } catch { /* done */ } this.loops.delete(id); }
    this.held.clear();
  }

  stop(): void {
    this.stopVoices();
    const current = this.current;
    this.current = null;
    try { current?.source.stop(); } catch { /* done */ }
  }

  attach(root: HTMLElement): () => void {
    const node = root.ownerDocument.createElement('div');
    node.hidden = true;
    node.dataset['testid'] = 'audio-state';
    node.setAttribute('data-testid', 'audio-state');
    root.append(node);
    this.nodes.add(node);
    this.report();
    return () => { this.nodes.delete(node); node.remove(); };
  }

  private report(): void {
    for (const node of this.nodes) {
      node.dataset['state'] = this.unlocked ? 'unlocked' : 'locked';
      node.dataset['music'] = this.settings.music ? 'on' : 'off';
      node.dataset['sfx'] = this.settings.sfx ? 'on' : 'off';
    }
  }
}

const sounds = new WeakMap<IronBurrow, WebSound>();

function soundOf(game: IronBurrow): WebSound {
  let made = sounds.get(game);
  if (!made) { made = new WebSound(game); sounds.set(game, made); }
  return made;
}

/** The one Sound of the page for this game API (reads `settings()`, follows `onSettings`). */
export function sound(game: IronBurrow): Sound {
  return soundOf(game);
}

/** A looping effect held while `on` (the engine while the tank drives, CONTRACT §7.4). */
export function holdLoop(game: IronBurrow, id: string, on: boolean): void {
  soundOf(game).hold(id, on);
}
