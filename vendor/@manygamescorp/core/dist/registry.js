import { SDKError } from './error.js';
import { defineModule } from './module.js';
function quote(id) {
    return JSON.stringify(id.length > 64 ? `${id.slice(0, 64)}…` : id);
}
export class ModuleRegistry {
    #modules = new Map();
    #handlers = new Map();
    register(definition) {
        const module = defineModule(definition);
        const { id } = module.manifest;
        if (this.#modules.has(id)) {
            throw new SDKError('SDK_MODULE_DUPLICATE', {
                message: `module ${quote(id)} is already registered`,
                details: { module: id },
                module: id,
            });
        }
        const handles = module.manifest.events.handles ?? [];
        for (const handle of handles) {
            const owner = this.#handlers.get(handle);
            if (owner !== undefined) {
                throw new SDKError('SDK_MODULE_DUPLICATE', {
                    message: `module ${quote(id)}: request ${quote(handle)} is already handled by ${quote(owner)}`,
                    details: { module: id, handle, owner },
                    module: id,
                });
            }
        }
        this.#modules.set(id, module);
        for (const handle of handles)
            this.#handlers.set(handle, id);
        return module;
    }
    unregister(id) {
        if (!this.#modules.delete(id))
            return;
        for (const [handle, owner] of [...this.#handlers]) {
            if (owner === id)
                this.#handlers.delete(handle);
        }
    }
    has(id) {
        return this.#modules.has(id);
    }
    get(id) {
        const module = this.#modules.get(id);
        if (module === undefined) {
            const name = typeof id === 'string' ? id : String(id);
            throw new SDKError('SDK_MODULE_NOT_INSTALLED', {
                message: `module ${quote(name)} is not installed`,
                details: { module: name },
                module: name,
            });
        }
        return module;
    }
    list() {
        return [...this.#modules.values()];
    }
}
