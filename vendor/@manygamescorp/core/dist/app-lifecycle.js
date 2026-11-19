export const APP_LIFECYCLE_CHANGED = 'app:lifecycle:changed';
export function createAppLifecycle(platform, network, bus) {
    const unsubscribes = [];
    let started = false;
    let disposed = false;
    let hidden = false;
    let portalHidden = false;
    let localHidden = false;
    let online = true;
    const publish = () => {
        bus.emit(APP_LIFECYCLE_CHANGED, { hidden, online });
    };
    const change = (next) => {
        const nextHidden = (next.hidden ?? localHidden) || portalHidden;
        const nextOnline = next.online ?? online;
        if (disposed || (nextHidden === hidden && nextOnline === online))
            return;
        hidden = nextHidden;
        online = nextOnline;
        publish();
    };
    return {
        visibility(value) { portalHidden = value; change({}); },
        start() {
            if (started || disposed)
                return;
            started = true;
            localHidden = platform.lifecycle.hidden === true;
            hidden = localHidden || portalHidden;
            const on = platform.lifecycle.on.bind(platform.lifecycle);
            unsubscribes.push(on('pause', () => { localHidden = true; change({}); }));
            unsubscribes.push(on('resume', () => { localHidden = false; change({}); }));
            if (network.isSupported()) {
                try {
                    online = network.status()?.online !== false;
                }
                catch {
                    online = true;
                }
                unsubscribes.push(network.onChange((state) => change({ online: state.online !== false })));
            }
            else {
                online = platform.device.info().online !== false;
                unsubscribes.push(on('online', () => change({ online: true })));
                unsubscribes.push(on('offline', () => change({ online: false })));
            }
            publish();
        },
        dispose() {
            disposed = true;
            for (const off of unsubscribes.splice(0))
                off();
        },
    };
}
