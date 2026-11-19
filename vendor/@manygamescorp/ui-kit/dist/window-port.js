export function attachWindowQueue(zones, windows) {
    let serial = 0;
    return zones.useWindowQueue({ enqueue(request) {
            const controller = new AbortController();
            const name = `slot-${++serial}`;
            let active = true;
            let ticket;
            let settle = () => { };
            let unregister = () => { };
            const closed = new Promise(resolve => { settle = resolve; });
            const done = () => {
                if (!active)
                    return;
                active = false;
                controller.abort();
                unregister();
                settle();
            };
            unregister = windows.register({ [name]: { canShow: () => active, open() {
                        void Promise.resolve().then(() => {
                            if (!active)
                                return;
                            return request.open(controller.signal);
                        }).then(opened => {
                            if (!opened)
                                return;
                            ticket = opened;
                            if (!active)
                                opened.close();
                            return opened.closed;
                        }).then(done, done);
                        return { closed, close() {
                                try {
                                    ticket?.close();
                                }
                                finally {
                                    done();
                                }
                            } };
                    } } });
            let queued;
            try {
                queued = windows.show(name, {}, { priority: request.priority ?? 0,
                    source: request.automatic ? 'trigger' : 'user' });
            }
            catch (error) {
                done();
                throw error;
            }
            void queued.closed.then(done, done);
            return Object.freeze({ get active() { return active; }, update() { }, dispose() {
                    if (!active)
                        return;
                    try {
                        queued.close();
                    }
                    catch { }
                    finally {
                        done();
                    }
                } });
        } });
}
