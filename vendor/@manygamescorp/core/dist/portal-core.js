const cores = new WeakMap();
export const portalCore = (endpoint) => endpoint ? cores.get(endpoint) : undefined;
export function setPortalCore(endpoint, core) {
    cores.set(endpoint, core);
}
