import { SDKError } from './error.js';
export class ModuleContainer {
    #order;
    #modules;
    #providers = new Map();
    #services = new Map();
    constructor(registry) {
        const modules = registry.list();
        this.#modules = modules;
        this.#order = Object.freeze(resolveOrder(modules));
        for (const module of modules) {
            for (const capability of module.manifest.provides ?? []) {
                const previous = this.#providers.get(capability);
                if (previous !== undefined) {
                    throw dependencyError(module.manifest.id, 'ambiguous capability provider', {
                        capability,
                        providers: [previous.manifest.id, module.manifest.id],
                    });
                }
                this.#providers.set(capability, module);
            }
        }
    }
    order() {
        return this.#order;
    }
    add(module) {
        const { id } = module.manifest;
        if (this.#modules.some((other) => other.manifest.id === id)) {
            throw dependencyError(id, 'module is already in the graph', {});
        }
        for (const dependency of Object.keys(module.manifest.requires ?? {})) {
            if (!this.#modules.some((other) => other.manifest.id === dependency)) {
                throw dependencyError(id, `required module ${JSON.stringify(dependency)} is not installed`, {
                    dependency,
                });
            }
        }
        const provides = module.manifest.provides ?? [];
        for (const capability of provides) {
            const previous = this.#providers.get(capability);
            if (previous !== undefined) {
                throw dependencyError(id, 'ambiguous capability provider', {
                    capability, providers: [previous.manifest.id, id],
                });
            }
        }
        const modules = [...this.#modules, module];
        const order = Object.freeze(resolveOrder(prune(modules)));
        this.#modules = modules;
        this.#order = order;
        for (const capability of provides)
            this.#providers.set(capability, module);
    }
    remove(id) {
        const remaining = this.#modules.filter((module) => module.manifest.id !== id);
        for (const [capability, provider] of [...this.#providers]) {
            if (provider.manifest.id !== id)
                continue;
            this.#providers.delete(capability);
            this.#services.delete(capability);
        }
        this.#modules = remaining;
        this.#order = Object.freeze(resolveOrder(prune(remaining)));
    }
    provider(capability) {
        return this.#providers.get(capability);
    }
    provide(moduleId, capability, service) {
        const provider = this.#providers.get(capability);
        if (provider === undefined || provider.manifest.id !== moduleId) {
            throw dependencyError(moduleId, 'module does not provide capability', { capability });
        }
        if (service === undefined || this.#services.has(capability)) {
            throw dependencyError(moduleId, 'capability service is undefined or already registered', {
                capability,
            });
        }
        this.#services.set(capability, service);
    }
    get(capability) {
        return this.#services.get(capability);
    }
    require(capability) {
        if (!this.#services.has(capability)) {
            throw new SDKError('MODULE_DEPENDENCY_FAILED', {
                message: `capability ${JSON.stringify(capability)} is unavailable`,
                details: { capability },
            });
        }
        return this.#services.get(capability);
    }
}
function dependencyError(module, reason, details) {
    return new SDKError('MODULE_DEPENDENCY_FAILED', {
        message: `module ${JSON.stringify(module)}: ${reason}`,
        module,
        details,
    });
}
function prune(modules) {
    let kept = modules;
    for (;;) {
        const ids = new Set(kept.map((module) => module.manifest.id));
        const next = kept.filter((module) => Object.keys(module.manifest.requires ?? {}).every((dependency) => ids.has(dependency)));
        if (next.length === kept.length)
            return kept;
        kept = next;
    }
}
function resolveOrder(modules) {
    sortOrder(modules);
    const dependencies = new Map(modules.map((module) => [module.manifest.id,
        new Set(Object.keys(module.manifest.requires ?? {}))]));
    for (const module of [...modules].sort((a, b) => a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0)) {
        const id = module.manifest.id;
        for (const dependency of Object.keys(module.manifest.optional ?? {}).sort()) {
            if (!dependencies.has(dependency) || reaches(dependencies, dependency, id))
                continue;
            dependencies.get(id)?.add(dependency);
        }
    }
    return sortOrder(modules, dependencies);
}
function reaches(graph, from, to) {
    const pending = [from];
    const seen = new Set();
    while (pending.length) {
        const id = pending.pop();
        if (id === to)
            return true;
        if (seen.has(id))
            continue;
        seen.add(id);
        pending.push(...graph.get(id) ?? []);
    }
    return false;
}
function sortOrder(modules, graph) {
    const byId = new Map(modules.map((module) => [module.manifest.id, module]));
    const rank = new Map(modules.map((module, index) => [module.manifest.id, index]));
    const remaining = new Map();
    const dependents = new Map();
    for (const module of modules) {
        const { id, requires = {} } = module.manifest;
        const dependencies = graph ? [...graph.get(id) ?? []] : Object.keys(requires);
        remaining.set(id, dependencies.length);
        for (const dependency of dependencies) {
            if (!byId.has(dependency)) {
                throw dependencyError(id, `required module ${JSON.stringify(dependency)} is not installed`, {
                    dependency,
                });
            }
            const list = dependents.get(dependency) ?? [];
            list.push(id);
            dependents.set(dependency, list);
        }
    }
    const order = [];
    let ready = modules.filter((module) => remaining.get(module.manifest.id) === 0);
    while (ready.length > 0) {
        const next = [];
        for (const module of ready) {
            order.push(module);
            const id = module.manifest.id;
            remaining.delete(id);
            for (const dependent of dependents.get(id) ?? []) {
                const count = remaining.get(dependent) - 1;
                remaining.set(dependent, count);
                if (count === 0)
                    next.push(byId.get(dependent));
            }
        }
        ready = next.sort((a, b) => rank.get(a.manifest.id) - rank.get(b.manifest.id));
    }
    if (remaining.size > 0) {
        const cycle = findCycle(byId, remaining);
        throw dependencyError(cycle[0], `dependency cycle: ${cycle.join(' -> ')}`, { cycle });
    }
    return order;
}
function findCycle(modules, remaining) {
    const visited = new Set();
    for (const root of remaining.keys()) {
        if (visited.has(root))
            continue;
        const path = [root];
        const active = new Map([[root, 0]]);
        const stack = [Object.keys(modules.get(root)?.manifest.requires ?? {})[Symbol.iterator]()];
        visited.add(root);
        while (stack.length > 0) {
            const step = stack[stack.length - 1]?.next();
            if (step === undefined || step.done) {
                stack.pop();
                active.delete(path.pop());
                continue;
            }
            const id = step.value;
            if (!remaining.has(id))
                continue;
            const start = active.get(id);
            if (start !== undefined)
                return [...path.slice(start), id];
            if (visited.has(id))
                continue;
            visited.add(id);
            active.set(id, path.length);
            path.push(id);
            stack.push(Object.keys(modules.get(id)?.manifest.requires ?? {})[Symbol.iterator]());
        }
    }
    throw new Error('invalid dependency graph');
}
