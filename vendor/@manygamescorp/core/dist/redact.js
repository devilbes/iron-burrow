import { isSecretKey, normKey } from './secret-keys.js';
export { isSecretKey } from './secret-keys.js';
export const REDACTED = '[redacted]';
const MAX_DEPTH = 6;
const MAX_KEYS = 50;
const MAX_ITEMS = 50;
const MAX_STRING = 1024;
const MASK_KEYS = new Set([
    'email', 'phone', 'phonenumber', 'msisdn', 'idfa', 'gaid', 'idfv', 'ssaid', 'adid',
    'advertisingid',
]);
const TAIL_KEYS = new Set(['gid', 'uid', 'userid']);
const ERROR_LIKE_CODE_RE = /^[A-Z][A-Z0-9_]{0,63}$/;
function isSecretCode(value) {
    if (typeof value === 'number')
        return false;
    return !(typeof value === 'string' && ERROR_LIKE_CODE_RE.test(value));
}
const BODY_KEYS = new Set([
    'body', 'req', 'res', 'request', 'response', 'requestbody', 'responsebody', 'payload', 'data',
]);
const JWT_RE = /\beyJ[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*/g;
const TOKEN_LIKE_RE = /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{40,}={0,2}/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[^\s,;"']+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+/g;
const QUERY_PAIR_RE = /([?&#])([^?&#=\s]+)=([^&#\s]*)/g;
const JSON_PAIR_RE = /"((?:[A-Za-z0-9_$-]|\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])){1,128})"(\s{0,8}:\s{0,8})"((?:[^"\\]|\\.)*)"/g;
const JSON_OPEN_PAIR_RE = /"((?:[A-Za-z0-9_$-]|\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])){1,128})"(\s{0,8}:\s{0,8})"((?:[^"\\]|\\.)*\\?)$/;
const JSON_UNQUOTED_PAIR_RE = /"((?:[A-Za-z0-9_$-]|\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])){1,128})"(\s{0,8}:\s{0,8})(?!")([^,}\]\s]+)/g;
const AUTH_PATH_RE = /^\/v1\/auth(?:\/|$)/i;
const AUTH_TEXT_RE = /\/+v1\/+auth(?=\/|[?"'\s}\]]|$)/gi;
function decodeJsonKey(raw) {
    if (!raw.includes('\\'))
        return raw;
    try {
        return JSON.parse(`"${raw}"`);
    }
    catch {
        return raw;
    }
}
export function isAuthPath(pathOrUrl) {
    if (pathOrUrl.length > MAX_JSON_PARSE)
        return true;
    let path = pathOrUrl.split(/[?#]/, 1)[0] ?? '';
    try {
        path = decodeURIComponent(path);
    }
    catch {
        return true;
    }
    path = path.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
    path = path.split(/[?#]/, 1)[0] ?? '';
    return AUTH_PATH_RE.test(path.replace(/\/+/g, '/'));
}
export function maskEmail(email) {
    const at = email.lastIndexOf('@');
    if (at <= 0)
        return '***';
    return `${email[0] ?? ''}***${email.slice(at)}`;
}
export function maskTail(value, keep = 4) {
    return value.length <= keep ? '••' : `••${value.slice(-keep)}`;
}
const TRAILING_RUN_RE = /[A-Za-z0-9_\-.+/=@%~]+$/;
function truncate(input) {
    if (input.length <= MAX_STRING)
        return [input, ''];
    let head = input.slice(0, MAX_STRING);
    if (TRAILING_RUN_RE.test(input.slice(MAX_STRING, MAX_STRING + 1))) {
        head = head.replace(TRAILING_RUN_RE, '');
    }
    return [head, `…[+${input.length - head.length}]`];
}
function redactJsonValue(key, value) {
    const k = normKey(key);
    if (isSecretKey(key) && (k !== 'code' || isSecretCode(value)))
        return REDACTED;
    if (MASK_KEYS.has(k))
        return k === 'email' ? maskEmail(value) : maskTail(value, 2);
    if (TAIL_KEYS.has(k))
        return maskTail(value);
    return undefined;
}
const MAX_JSON_PARSE = 64 * 1024;
const MAX_JSON_NESTING = 4;
const MAX_JSON_WORK = MAX_JSON_PARSE * 2;
const MAX_JSON_BRACKETS = 64;
const UNPARSEABLE = '[REDACTED:unparseable]';
const WORK_EXHAUSTED = Symbol('redaction work exhausted');
function spend(ctx, amount) {
    ctx.work += amount;
    if (ctx.work > MAX_JSON_WORK)
        throw WORK_EXHAUSTED;
}
function nested(ctx, fn) {
    ctx.nesting += 1;
    try {
        return fn();
    }
    finally {
        ctx.nesting -= 1;
    }
}
function jsonSpans(input) {
    const roots = [];
    const stack = [];
    let quoted = false;
    let escaped = false;
    let stringStart = -1;
    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];
        if (quoted) {
            if (escaped)
                escaped = false;
            else if (ch === '\\')
                escaped = true;
            else if (ch === '"') {
                quoted = false;
                if (stack.length === 0)
                    roots.push({ start: stringStart, end: i + 1, children: [] });
            }
            continue;
        }
        if (ch === '"') {
            quoted = true;
            stringStart = i;
            continue;
        }
        if (ch === '{' || ch === '[') {
            if (stack.length >= MAX_JSON_BRACKETS)
                return undefined;
            stack.push({ start: i, open: ch, children: [] });
        }
        else if (ch === '}' || ch === ']') {
            const frame = stack.pop();
            if (!frame)
                continue;
            if ((frame.open === '{') !== (ch === '}')) {
                roots.push(...frame.children);
                continue;
            }
            const span = { start: frame.start, end: i + 1, children: frame.children };
            const parent = stack[stack.length - 1];
            if (parent)
                parent.children.push(span);
            else
                roots.push(span);
        }
    }
    for (const frame of stack)
        roots.push(...frame.children);
    return roots.sort((a, b) => a.start - b.start);
}
function redactJsonText(input, ctx) {
    if (!/[[{"]/.test(input))
        return undefined;
    if (input.length > MAX_JSON_PARSE) {
        throw WORK_EXHAUSTED;
    }
    const roots = jsonSpans(input);
    if (!roots)
        throw WORK_EXHAUSTED;
    let changed = false;
    const parsedRanges = [];
    const render = (span, level) => {
        const raw = input.slice(span.start, span.end);
        spend(ctx, raw.length);
        if (level >= MAX_JSON_NESTING)
            throw WORK_EXHAUSTED;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch { }
        if ((typeof parsed === 'object' && parsed !== null)
            || typeof parsed === 'string') {
            changed = true;
            parsedRanges.push([span.start, span.end]);
            if (ctx.nesting >= MAX_JSON_NESTING)
                throw WORK_EXHAUSTED;
            return nested(ctx, () => JSON.stringify(walk(parsed, 0, new WeakSet(), ctx)));
        }
        if (span.children.length === 0)
            return raw;
        let out = '';
        let pos = span.start;
        for (const child of span.children) {
            out += input.slice(pos, child.start) + render(child, level + 1);
            pos = child.end;
        }
        return out + input.slice(pos, span.end);
    };
    let out = '';
    let pos = 0;
    for (const root of roots) {
        if (root.start < pos)
            continue;
        out += input.slice(pos, root.start) + render(root, 0);
        pos = root.end;
    }
    out += input.slice(pos);
    const covered = (index) => {
        let lo = 0;
        let hi = parsedRanges.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if ((parsedRanges[mid]?.[0] ?? 0) <= index)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo > 0 && index < (parsedRanges[lo - 1]?.[1] ?? 0);
    };
    AUTH_TEXT_RE.lastIndex = 0;
    for (const match of input.matchAll(AUTH_TEXT_RE)) {
        if (!covered(match.index))
            return REDACTED;
    }
    AUTH_TEXT_RE.lastIndex = 0;
    const authMarker = AUTH_TEXT_RE.test(input);
    let rawBody = false;
    let rawPath = false;
    const keyRe = /"((?:[A-Za-z0-9_$-]|\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])){1,128})"\s{0,8}:/g;
    for (const match of input.matchAll(keyRe)) {
        if (covered(match.index))
            continue;
        const key = normKey(decodeJsonKey(match[1] ?? ''));
        if (BODY_KEYS.has(key))
            rawBody = true;
        if (key === 'path' || key === 'url')
            rawPath = true;
    }
    if (rawBody && (authMarker || rawPath))
        return REDACTED;
    return changed ? out : undefined;
}
function redactEscaped(escaped, ctx) {
    if (!escaped.includes('\\"'))
        return undefined;
    if (ctx.nesting >= MAX_JSON_NESTING)
        throw WORK_EXHAUSTED;
    let inner;
    try {
        inner = JSON.parse(`"${escaped.replace(/\\$/, '')}"`);
    }
    catch {
        throw WORK_EXHAUSTED;
    }
    if (typeof inner !== 'string')
        return REDACTED;
    const out = nested(ctx, () => redactText(inner, ctx));
    return JSON.stringify(out).slice(1, -1);
}
export function redactString(input) {
    try {
        return redactText(input, { work: 0, nesting: 0 });
    }
    catch {
        return UNPARSEABLE;
    }
}
function redactText(input, ctx) {
    spend(ctx, input.length);
    const json = redactJsonText(input, ctx);
    const [head, suffix] = truncate(json ?? input);
    let s = head.replace(JSON_PAIR_RE, (m, key, colon, value) => {
        const masked = redactJsonValue(decodeJsonKey(key), value) ?? redactEscaped(value, ctx);
        return masked === undefined ? m : `"${key}"${colon}"${masked}"`;
    });
    s = s.replace(JSON_OPEN_PAIR_RE, (m, key, colon, value) => {
        if (redactJsonValue(decodeJsonKey(key), value) !== undefined)
            return `"${key}"${colon}"${REDACTED}`;
        const inner = redactEscaped(value, ctx);
        return inner === undefined ? m : `"${key}"${colon}"${inner}`;
    });
    s = s.replace(JSON_UNQUOTED_PAIR_RE, (m, key, colon) => {
        const decoded = decodeJsonKey(key);
        const k = normKey(decoded);
        if (TAIL_KEYS.has(k) || MASK_KEYS.has(k) || (isSecretKey(decoded) && k !== 'code')) {
            return `"${key}"${colon}"${REDACTED}"`;
        }
        return m;
    });
    s = s.replace(JWT_RE, REDACTED);
    s = s.replace(TOKEN_LIKE_RE, (m) => (/[0-9]/.test(m) && /[A-Za-z]/.test(m) ? REDACTED : m));
    s = s.replace(BEARER_RE, (_m, scheme) => `${scheme} ${REDACTED}`);
    s = s.replace(QUERY_PAIR_RE, (m, prefix, key) => {
        let decoded;
        try {
            decoded = decodeURIComponent(key);
        }
        catch {
            return `${prefix}${REDACTED}`;
        }
        return isSecretKey(decoded) ? `${prefix}${key}=${REDACTED}` : m;
    });
    s = s.replace(EMAIL_RE, (m) => maskEmail(m));
    if (unsafePair(s))
        throw WORK_EXHAUSTED;
    return s + suffix;
}
export function redact(value) {
    try {
        return walk(value, 0, new WeakSet(), { work: 0, nesting: 0 });
    }
    catch (error) {
        if (error === WORK_EXHAUSTED)
            return UNPARSEABLE;
        return '[unserializable]';
    }
}
function walk(value, depth, seen, ctx) {
    spend(ctx, 1);
    switch (typeof value) {
        case 'string':
            return redactText(value, ctx);
        case 'number':
        case 'boolean':
        case 'undefined':
            return value;
        case 'bigint':
            return value.toString();
        case 'symbol':
            return redactText(value.toString(), ctx);
        case 'function':
            return '[function]';
    }
    if (value === null)
        return null;
    const obj = value;
    if (seen.has(obj))
        return '[circular]';
    if (depth >= MAX_DEPTH)
        return '[depth]';
    seen.add(obj);
    try {
        if (obj instanceof Date)
            return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
        if (obj instanceof Error)
            return walkError(obj, depth, seen, ctx);
        if (typeof URL !== 'undefined' && obj instanceof URL)
            return redactText(obj.href, ctx);
        if (Array.isArray(obj))
            return walkArray(obj, depth, seen, ctx);
        if (typeof Headers !== 'undefined' && obj instanceof Headers) {
            return walkEntries(obj.entries(), depth, seen, ctx);
        }
        if (obj instanceof Map)
            return walkEntries(obj.entries(), depth, seen, ctx);
        if (obj instanceof Set) {
            const items = [];
            let truncated = false;
            for (const item of obj) {
                if (items.length >= MAX_ITEMS) {
                    truncated = true;
                    break;
                }
                items.push(item);
            }
            const out = walkArray(items, depth, seen, ctx);
            if (truncated)
                out.push(`[+${Math.max(1, obj.size - MAX_ITEMS)} items]`);
            return out;
        }
        if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer)
            return '[binary]';
        return walkEntries(objectEntries(obj, ctx), depth, seen, ctx);
    }
    finally {
        seen.delete(obj);
    }
}
function walkArray(arr, depth, seen, ctx) {
    const out = arr.slice(0, MAX_ITEMS).map((v) => walk(v, depth + 1, seen, ctx));
    if (arr.length > MAX_ITEMS)
        out.push(`[+${arr.length - MAX_ITEMS} items]`);
    return out;
}
function walkEntries(entries, depth, seen, ctx) {
    const kept = [];
    let skipped = 0;
    let authBodies = false;
    for (const [rawKey, v] of entries) {
        const key = typeof rawKey === 'string' ? rawKey : String(rawKey);
        spend(ctx, key.length + 1);
        const k = normKey(key);
        if (k === 'path' || k === 'url') {
            const path = urlText(v) ?? '';
            spend(ctx, path.length);
            if (isAuthPath(path))
                authBodies = true;
        }
        if (kept.length >= MAX_KEYS)
            skipped += 1;
        else
            kept.push([key, v]);
    }
    const out = Object.create(null);
    for (const [key, v] of kept) {
        out[redactText(key, ctx)] = redactField(key, v, depth, seen, authBodies, ctx);
    }
    if (skipped > 0)
        out['…'] = `[+${skipped} keys]`;
    return out;
}
function urlText(value) {
    if (typeof value === 'string')
        return value;
    if (typeof URL !== 'undefined' && value instanceof URL)
        return value.href;
    return undefined;
}
function redactField(key, value, depth, seen, authBodies, ctx) {
    if (value === undefined || value === null)
        return value;
    const k = normKey(key);
    if (typeof value === 'string' && (isSecretKey(key) || MASK_KEYS.has(k) || TAIL_KEYS.has(k))) {
        spend(ctx, value.length);
    }
    if (isSecretKey(key) && (k !== 'code' || isSecretCode(value)))
        return REDACTED;
    if (authBodies && BODY_KEYS.has(k))
        return REDACTED;
    if (MASK_KEYS.has(k)) {
        if (typeof value !== 'string')
            return REDACTED;
        return k === 'email' ? maskEmail(value) : maskTail(value, 2);
    }
    if (TAIL_KEYS.has(k) && (typeof value === 'string' || typeof value === 'number')) {
        return maskTail(String(value));
    }
    return walk(value, depth + 1, seen, ctx);
}
function walkError(err, depth, seen, ctx) {
    const own = err;
    if (typeof own.toJSON === 'function') {
        const out = walk(own.toJSON.call(err), depth, seen, ctx);
        if (typeof out === 'object' && out !== null && !Array.isArray(out)) {
            return out;
        }
    }
    const out = {
        name: redactText(String(err.name), ctx),
        message: redactText(String(err.message), ctx),
    };
    if (typeof own.code === 'string')
        spend(ctx, own.code.length);
    if (typeof own.code === 'string')
        out.code = isSecretCode(own.code) ? REDACTED : redactText(own.code, ctx);
    else if (typeof own.code === 'number')
        out.code = own.code;
    if (err.cause !== undefined)
        out.cause = walk(err.cause, depth + 1, seen, ctx);
    return out;
}
function* objectEntries(obj, ctx) {
    for (const key in obj) {
        spend(ctx, key.length + 1);
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            yield [key, obj[key]];
        }
    }
}
function unsafePair(input) {
    let view = input;
    for (let layer = 0; layer < MAX_JSON_NESTING; layer += 1) {
        const decoded = view.replace(/\\+(?:u([0-9a-fA-F]{4})|(["\\/]))/g, (_m, hex, ch) => hex === undefined ? ch : String.fromCharCode(Number.parseInt(hex, 16)));
        if (decoded === view)
            break;
        view = decoded;
    }
    if (/\\+(?:u[0-9a-fA-F]{4}|["\\/])/.test(view))
        throw WORK_EXHAUSTED;
    const safe = (key, start) => {
        const k = normKey(key);
        if (!isSecretKey(key) && !MASK_KEYS.has(k) && !TAIL_KEYS.has(k))
            return true;
        let pos = start;
        const quote = view[pos] === '"' || view[pos] === "'" ? view[pos++] : undefined;
        if (quote !== undefined) {
            const close = view.indexOf(quote, pos);
            const next = close < 0 ? undefined : view[close + 1];
            if (next !== undefined && !/[\s,;}\]&#]/.test(next))
                return false;
        }
        if (k === 'authorization' || k === 'proxyauthorization') {
            const authEnd = quote === undefined
                ? view.slice(pos).search(/[,;}&#\r\n]/)
                : view.indexOf(quote, pos) - pos;
            const authValue = authEnd < 0 ? view.slice(pos) : view.slice(pos, pos + authEnd);
            if (/^(?:Bearer|Basic) \[redacted\]$/i.test(authValue.trim()))
                return true;
        }
        const end = quote === undefined
            ? view.slice(pos).search(/[\s,;}\]&#]/)
            : view.indexOf(quote, pos) - pos;
        const value = end < 0 ? view.slice(pos) : view.slice(pos, pos + end);
        if (quote === undefined) {
            for (const marker of [REDACTED, UNPARSEABLE]) {
                if (view.startsWith(marker, pos)) {
                    const next = view[pos + marker.length];
                    if (next === undefined || /[\s,;}\]&#]/.test(next))
                        return true;
                }
            }
        }
        if (value === REDACTED || value === UNPARSEABLE)
            return true;
        if (k === 'code' && (ERROR_LIKE_CODE_RE.test(value) || /^-?\d+(?:\.\d+)?$/.test(value)))
            return true;
        if (MASK_KEYS.has(k)) {
            if (k === 'email')
                return value === '***' || /^.[*]{3}@[A-Za-z0-9.-]+$/.test(value);
            return /^••[^"'\\\s]{0,2}$/.test(value);
        }
        return TAIL_KEYS.has(k) && /^••[^"'\\\s]{0,4}$/.test(value);
    };
    const inspect = (key, end) => {
        let pos = end;
        while (view[pos] === '"' || view[pos] === "'")
            pos += 1;
        const hadQuote = pos > end;
        while (pos < view.length && /\s/.test(view[pos] ?? ''))
            pos += 1;
        if (view[pos] === ':' || view[pos] === '=')
            pos += 1;
        else if (!hadQuote || pos >= view.length || /[,;}\]]/.test(view[pos] ?? ''))
            return false;
        while (pos < view.length && /\s/.test(view[pos] ?? ''))
            pos += 1;
        return !safe(key, pos);
    };
    for (const match of view.matchAll(/[A-Za-z0-9_$.-]+/g)) {
        if (inspect(match[0], match.index + match[0].length))
            return true;
    }
    for (const match of view.matchAll(/(["'])([^"'\n]{1,128})\1/g)) {
        if (inspect(match[2] ?? '', match.index + match[0].length))
            return true;
    }
    return false;
}
