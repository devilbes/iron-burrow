import { createPreviewEngine } from './engine.js';
import { isPanelOrigin, parsePreviewMessage, PROTOCOL_VERSION } from './protocol.js';
export function mount(container, options = {}) {
    const origins = [...(options.panelOrigins ?? [])];
    const engine = createPreviewEngine(container, new URL(import.meta.url).origin);
    const send = (message) => { window.parent.postMessage(message, '*'); };
    const onMessage = (event) => {
        if (event.source !== window.parent || !isPanelOrigin(event.origin, origins))
            return;
        const parsed = parsePreviewMessage(event.data);
        if (!parsed.ok) {
            send({ type: 'error', v: PROTOCOL_VERSION, seq: parsed.seq, code: 'invalid_message' });
            return;
        }
        const { seq } = parsed.message;
        for (const issue of engine.apply(parsed.message)) {
            send({ type: 'error', v: PROTOCOL_VERSION, seq, code: issue.code,
                ...(issue.moduleId === undefined ? {} : { moduleId: issue.moduleId }) });
        }
        send({ type: 'rendered', v: PROTOCOL_VERSION, seq });
    };
    window.addEventListener('message', onMessage);
    send({ type: 'ready', v: PROTOCOL_VERSION });
    return { dispose() {
            window.removeEventListener('message', onMessage);
            engine.dispose();
        } };
}
