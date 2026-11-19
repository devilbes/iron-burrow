// Run the emitted browser entry in an isolated Node process: SDK kernel and the boot module are
// supplied by a loader, browser globals are minimal fakes. No network, no vendor install.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const [entry, input] = process.argv.slice(2);
const options = JSON.parse(input);
const result = { calls: [], errors: [] };
let finish;
const done = new Promise((resolve) => { finish = resolve; });
const node = () => ({ textContent: '', firstChild: null, replaceChildren(...children) {
  this.firstChild = children[0] ?? null;
  result.text = children.map(child => child.textContent).join(' ');
} });
const root = node();
globalThis.document = {
  title: 'ManyPlay Game', getElementById: () => root, createElement: node,
  body: { dataset: new Proxy({}, { set(target, key, value) {
    target[key] = value; result.state = value; finish(); return true; } }) },
};
globalThis.window = { addEventListener() {} };
globalThis.fetch = async () => {
  if (options.fetchFailure) throw new Error('network unavailable');
  return { ok: options.httpOk !== false, async json() {
    if (options.invalidJson) throw new SyntaxError('invalid JSON');
    return options.platform;
  } };
};
console.error = (...args) => result.errors.push(args);
globalThis.fixtureStart = async (_root, _loader, platform) => {
  result.calls.push('start');
  result.platform = platform;
  if (options.startFailure) throw { code: 'AUTH_UNAVAILABLE', httpStatus: 503, rid: 'test-rid', secret: 'do-not-log' };
  return { sdk: { state: 'ready' }, dispose() {} };
};
const sources = {
  '@manygamescorp/core/kernel': 'export const createSdk = () => ({});',
  './start.js': 'export const start = globalThis.fixtureStart;',
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!(specifier in sources)) return nextResolve(specifier, context);
    if (options.coreImportFailure && specifier === '@manygamescorp/core/kernel') throw new Error('core unavailable');
    return { url: `fixture:${specifier}`, shortCircuit: true };
  },
  load(url, context, nextLoad) {
    if (!url.startsWith('fixture:')) return nextLoad(url, context);
    return { format: 'module', source: sources[url.slice('fixture:'.length)], shortCircuit: true };
  },
});
await import(pathToFileURL(entry).href);
await done;
process.stdout.write(JSON.stringify(result));
