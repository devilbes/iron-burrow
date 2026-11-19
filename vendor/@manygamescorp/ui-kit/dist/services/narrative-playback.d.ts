export type NarrativeTextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export declare function narrativeTextFrame(text: string, elapsedMs: number, speed: NarrativeTextSpeed, reducedMotion?: boolean): string;
export interface NarrativeSubtitleCue {
    readonly start: number;
    readonly end: number;
    readonly textKey: string;
}
export interface NarrativeMediaState {
    readonly status: 'idle' | 'playing' | 'paused' | 'blocked' | 'ended' | 'fallback';
    readonly currentTime: number;
    readonly duration: number;
    readonly progress: number;
    readonly muted: boolean;
    readonly subtitles: readonly string[];
}
export type NarrativeVideo = Pick<HTMLVideoElement, 'addEventListener' | 'removeEventListener' | 'play' | 'pause' | 'currentTime' | 'duration' | 'muted' | 'playsInline' | 'preload' | 'autoplay' | 'paused'>;
export interface NarrativeMediaOptions {
    readonly document: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
    readonly cues: readonly NarrativeSubtitleCue[];
    readonly text: (key: string) => string;
    readonly onState: (state: NarrativeMediaState) => void;
}
export interface NarrativeMediaBinding {
    play(userGesture?: boolean): Promise<void>;
    pause(): void;
    refreshText(): void;
    dispose(): void;
}
export declare function bindNarrativeMedia(video: NarrativeVideo, options: NarrativeMediaOptions): NarrativeMediaBinding;
//# sourceMappingURL=narrative-playback.d.ts.map