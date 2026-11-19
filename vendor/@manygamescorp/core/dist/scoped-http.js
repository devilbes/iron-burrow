import { SDKError } from './error.js';
import { createEndpoints, servicePrefix } from './endpoints.js';
import { CORE_HTTP_SERVICES } from './module.js';
import { createHttpTransport, } from './transport.js';
export function createHttpContext(platformConfig, options = {}) {
    const endpoints = createEndpoints(platformConfig);
    const transport = createHttpTransport({ ...options, endpoints });
    return (manifest) => {
        const http = createScopedHttp(transport, endpoints, manifest);
        return Object.freeze(http === undefined ? {} : { http });
    };
}
export function createScopedHttp(transport, endpoints, manifest, service) {
    if (manifest.kind === 'ui' || manifest.id === 'ui' || manifest.id.startsWith('ui.')) {
        if (service !== undefined)
            denied(manifest.id);
        return undefined;
    }
    const permissions = manifest.permissions.filter((permission) => permission.startsWith('http:'));
    if (permissions.length === 0 && service === undefined)
        return undefined;
    const selected = service ?? (permissions.length === 1 ? permissions[0]?.slice(5) : undefined);
    const module = manifest.id;
    if (!selected || !permissions.includes(`http:${selected}`)
        || CORE_HTTP_SERVICES.includes(selected))
        denied(module);
    const prefix = servicePrefix(selected);
    return Object.freeze({
        service: selected,
        baseUrl: endpoints.service(selected),
        async request(spec) {
            const path = spec.path;
            if (typeof path !== 'string' || path.length > 8192
                || !path.startsWith('/') || path.startsWith('//')
                || /[?#\\\s]/.test(path))
                denied(module);
            if (path !== '/') {
                for (const segment of path.slice(1).split('/')) {
                    let decoded;
                    try {
                        decoded = decodeURIComponent(segment);
                    }
                    catch {
                        return denied(module);
                    }
                    if (!decoded || decoded === '.' || decoded === '..' || /[%/\\?#\s]/.test(decoded)
                        || Array.from(decoded).some((char) => char.charCodeAt(0) < 32
                            || char.charCodeAt(0) === 127)) {
                        denied(module);
                    }
                }
            }
            return transport.request({
                ...spec, module, path: path === '/' ? prefix : `${prefix}${path}`,
            });
        },
    });
}
function denied(module) {
    throw new SDKError('SDK_PERMISSION_DENIED', {
        module, message: 'HTTP service scope denied', retryable: false,
    });
}
