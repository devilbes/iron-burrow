import { BROADCAST_TYPES, isBroadcastCommand, needsBroadcastUpdate, } from '@manygamescorp/contracts-client/broadcast';
export function handleBroadcasts(view, signal, effects, now, random = Math.random) {
    let reloadTimer;
    let noticeTimer;
    let refresh;
    let reloadAt = Infinity;
    let required = false;
    const notice = (value, until) => {
        if ((required && !value.required) || (until !== undefined && until <= now()))
            return;
        if (value.required)
            required = true;
        clearTimeout(noticeTimer);
        effects.notice(value);
        if (until !== undefined) {
            const expire = () => {
                if (signal.aborted)
                    return;
                const remaining = until - now();
                if (remaining > 0)
                    noticeTimer = setTimeout(expire, Math.min(2147483647, remaining));
                else
                    effects.notice(undefined);
            };
            noticeTimer = setTimeout(expire, Math.min(2147483647, until - now()));
        }
    };
    const announcement = (message, p) => {
        const locale = effects.locale.toLowerCase();
        const [baseLocale] = locale.split('-');
        const translation = p.translations?.find((t) => t.locale.toLowerCase() === locale) ??
            p.translations?.find((t) => t.locale.toLowerCase() === baseLocale);
        notice({
            id: message.id,
            kind: 'announcement',
            title: translation?.title ?? p.title,
            text: translation?.text ?? p.text,
            ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
            ...(p.linkUrl ? { linkUrl: p.linkUrl } : {}),
        }, Date.parse(message.sentAt) + p.displaySeconds * 1000);
    };
    const receive = (message) => {
        if (signal.aborted ||
            Date.parse(message.expiresAt) <= now() ||
            !isBroadcastCommand(message))
            return;
        switch (message.type) {
            case 'configs.reload':
                if (!refresh)
                    refresh = Promise.resolve()
                        .then(() => signal.aborted ? undefined : effects.refresh())
                        .catch(() => undefined)
                        .finally(() => {
                        refresh = undefined;
                    });
                break;
            case 'app.reload': {
                const due = now() +
                    message.payload.delayMs +
                    Math.floor(random() * (message.payload.jitterMs + 1));
                if (due >= reloadAt)
                    break;
                reloadAt = due;
                clearTimeout(reloadTimer);
                reloadTimer = setTimeout(() => {
                    reloadAt = Infinity;
                    if (!signal.aborted)
                        void Promise.resolve().then(() => {
                            if (!signal.aborted)
                                return effects.reload();
                        }).catch(() => undefined);
                }, due - now());
                break;
            }
            case 'panel.announcement':
                announcement(message, message.payload);
                break;
            case 'app.maintenance':
                notice({
                    id: message.id,
                    kind: 'maintenance',
                    title: '',
                    text: message.payload.message,
                    startsAt: message.payload.startsAt,
                    endsAt: message.payload.endsAt,
                }, Date.parse(message.payload.endsAt));
                break;
            case 'app.update.required':
                if (needsBroadcastUpdate(effects.appVersion, message.payload.minVersion))
                    notice({
                        id: message.id,
                        kind: 'update',
                        title: message.payload.minVersion,
                        text: message.payload.message,
                        required: true,
                        ...(message.payload.linkUrl ? { linkUrl: message.payload.linkUrl } : {}),
                    });
                break;
        }
    };
    const off = BROADCAST_TYPES.map((type) => view.on(type, receive));
    const dispose = () => {
        for (const unsubscribe of off.splice(0))
            unsubscribe();
        clearTimeout(reloadTimer);
        clearTimeout(noticeTimer);
        signal.removeEventListener('abort', dispose);
        effects.notice(undefined);
    };
    signal.addEventListener('abort', dispose, { once: true });
    if (signal.aborted)
        dispose();
    return dispose;
}
