import { prepareSkin } from './skin-spec.js';
export function createSkinSlot(options) {
    let current;
    let disposed = false;
    return {
        async prepare(selection, signal) {
            signal.throwIfAborted();
            if (disposed)
                throw new Error('UI_SKIN_SLOT_DISPOSED');
            const commit = selection === null ? undefined
                : await prepareSkin(await options.load(selection, signal), { ...options, signal });
            signal.throwIfAborted();
            return () => {
                signal.throwIfAborted();
                if (disposed)
                    throw new Error('UI_SKIN_SLOT_DISPOSED');
                if (commit)
                    current = commit();
                else {
                    current?.remove();
                    current = undefined;
                }
            };
        },
        dispose() {
            disposed = true;
            current?.remove();
            current = undefined;
        },
    };
}
