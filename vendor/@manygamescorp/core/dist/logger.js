import {} from './context.js';
import { redact } from './redact.js';
const RANK = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 100,
};
export function createLogger(options = {}) {
    return new SdkLogger(options.level ?? 'warn', options.sink ?? consoleSink, options.now ?? Date.now, pickContext(options.context ?? {}));
}
export const consoleSink = (record) => {
    const prefix = record.moduleId === undefined ? '[sdk]' : `[${record.moduleId}]`;
    const line = record.rid === undefined ? `${prefix} ${record.msg}` : `${prefix} ${record.msg} rid=${record.rid}`;
    const args = record.data === undefined ? [line] : [line, record.data];
    console[record.level](...args);
};
class SdkLogger {
    level;
    sink;
    now;
    context;
    constructor(level, sink, now, context) {
        this.level = level;
        this.sink = sink;
        this.now = now;
        this.context = context;
    }
    isEnabled(level) {
        return RANK[level] >= RANK[this.level];
    }
    debug(msg, data) {
        this.write('debug', msg, data);
    }
    info(msg, data) {
        this.write('info', msg, data);
    }
    warn(msg, data) {
        this.write('warn', msg, data);
    }
    error(msg, data) {
        this.write('error', msg, data);
    }
    with(context) {
        return new SdkLogger(this.level, this.sink, this.now, {
            ...this.context,
            ...pickContext(context),
        });
    }
    child(moduleId) {
        return this.with({ moduleId });
    }
    write(level, msg, data) {
        if (!this.isEnabled(level))
            return;
        const time = this.now();
        const redacted = redact({
            level,
            msg: String(msg),
            time,
            ...this.context,
            ...(data === undefined ? {} : { data }),
        });
        const record = typeof redacted === 'object' && redacted !== null
            ? redacted
            : { level, time, msg: String(redacted) };
        try {
            this.sink(record);
        }
        catch {
        }
    }
}
function pickContext(ctx) {
    const out = {};
    for (const key of ['moduleId', 'rid', 'operation', 'parentRid']) {
        const v = ctx[key];
        if (typeof v === 'string')
            out[key] = v;
    }
    return out;
}
