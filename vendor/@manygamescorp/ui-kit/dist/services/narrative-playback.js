export function narrativeTextFrame(text, elapsedMs, speed, reducedMotion = false) {
    if (speed === 'instant' || reducedMotion)
        return text;
    const rate = { slow: 20, normal: 40, fast: 80 }[speed];
    const count = Math.floor(Math.max(0, Number.isNaN(elapsedMs) ? 0 : elapsedMs) * rate / 1000);
    const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
    let result = '', length = 0;
    for (const { segment } of segments) {
        if (length++ >= count)
            break;
        result += segment;
    }
    return result;
}
const bindings = new WeakMap();
export function bindNarrativeMedia(video, options) {
    const cues = options.cues.map((cue) => {
        if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) ||
            cue.start < 0 || cue.end <= cue.start || typeof cue.textKey !== 'string' || !cue.textKey.trim()) {
            throw new RangeError('Invalid narrative subtitle cue');
        }
        return { ...cue };
    });
    bindings.get(video)?.();
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    video.autoplay = false;
    let disposed = false, requested = false, generation = 0;
    let status = 'idle';
    const publish = () => {
        if (disposed)
            return;
        const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
        const duration = Number.isFinite(video.duration) ? Math.max(0, video.duration) : 0;
        options.onState({ status, currentTime, duration, muted: video.muted,
            progress: duration > 0 ? Math.min(1, currentTime / duration) : 0,
            subtitles: cues.filter((cue) => cue.start <= currentTime && currentTime < cue.end)
                .map((cue) => options.text(cue.textKey)),
        });
    };
    const cancel = () => { generation++; requested = false; video.pause(); };
    const pause = () => {
        if (disposed || status === 'fallback')
            return;
        cancel();
        status = 'paused';
        publish();
    };
    const visibility = () => { if (options.document.hidden)
        pause(); };
    const playing = () => {
        if (!requested || options.document.hidden || status === 'fallback') {
            video.pause();
            return;
        }
        status = 'playing';
        publish();
    };
    const paused = () => {
        if (!video.paused)
            return;
        if (status === 'fallback' || status === 'ended' || status === 'blocked')
            return;
        generation++;
        requested = false;
        status = 'paused';
        publish();
    };
    const ended = () => {
        if (status === 'fallback')
            return;
        cancel();
        status = 'ended';
        publish();
    };
    const error = () => { cancel(); status = 'fallback'; publish(); };
    const listeners = [
        ['playing', playing], ['pause', paused], ['ended', ended], ['error', error],
        ['timeupdate', publish], ['durationchange', publish], ['loadedmetadata', publish],
    ];
    const dispose = () => {
        if (disposed)
            return;
        disposed = true;
        for (const [event, listener] of listeners)
            video.removeEventListener(event, listener);
        options.document.removeEventListener('visibilitychange', visibility);
        cancel();
        if (bindings.get(video) === dispose)
            bindings.delete(video);
    };
    bindings.set(video, dispose);
    for (const [event, listener] of listeners)
        video.addEventListener(event, listener);
    options.document.addEventListener('visibilitychange', visibility);
    publish();
    return {
        async play(userGesture = false) {
            if (disposed || status === 'fallback')
                return;
            if (options.document.hidden) {
                pause();
                return;
            }
            const request = ++generation;
            requested = true;
            if (userGesture)
                video.muted = false;
            try {
                await video.play();
                if (request !== generation || disposed) {
                    if (!requested && (!bindings.has(video) || bindings.get(video) === dispose)) {
                        video.pause();
                    }
                    return;
                }
                status = 'playing';
                publish();
            }
            catch {
                if (request !== generation || disposed)
                    return;
                requested = false;
                video.pause();
                status = 'blocked';
                publish();
            }
        },
        pause, refreshText: publish, dispose,
    };
}
