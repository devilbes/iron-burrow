const sessions = new WeakMap();
export function bindPortalSession(auth, token) {
    sessions.set(auth, token);
}
export function readPortalSession(auth) {
    return sessions.get(auth)?.() ?? Promise.resolve(undefined);
}
