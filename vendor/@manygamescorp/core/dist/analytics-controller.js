export function createAnalytics() {
    const providers = new Map();
    let disposed = false;
    const api = Object.freeze({
        sendEvent: (name, payload) => {
            for (const [registration, provider] of [...providers]) {
                if (!providers.has(registration))
                    continue;
                try {
                    void Promise.resolve(provider.sendEvent(name, payload)).catch(() => undefined);
                }
                catch { }
            }
        },
        registerProvider: (provider) => {
            if (disposed)
                return () => { };
            const registration = {};
            providers.set(registration, provider);
            return () => { providers.delete(registration); };
        },
    });
    return { api, dispose: () => { disposed = true; providers.clear(); } };
}
