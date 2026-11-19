import domains from './core-events.json' with { type: 'json' };
/**
 * Event domains published only by the trusted core: no module (local or remote) may emit or
 * handle `<domain>:*`. One list for the runtime (core isCoreEvent) and the gates
 * (core-events.json).
 */
export const CORE_EVENT_DOMAINS = Object.freeze([...domains]);
//# sourceMappingURL=events.js.map