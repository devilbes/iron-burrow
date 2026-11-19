import { createStorage } from './scoped.js';
export function createAccountHistory(options) {
    const storage = createStorage(options).device();
    const clean = (input) => {
        const value = input;
        if (!value || !Number.isSafeInteger(value.uid) || value.uid < 1
            || !Number.isSafeInteger(value.gid) || value.gid < 1
            || typeof value.name !== 'string' || !value.name || value.name.length > 128
            || typeof value.maskedEmail !== 'string' || value.maskedEmail.length > 254
            || !/^[^@]\*\*\*@[^@\s]+$/.test(value.maskedEmail))
            return;
        let avatar;
        if (typeof value.avatar === 'string' && value.avatar.length <= 2048) {
            try {
                const url = new URL(value.avatar);
                if (url.protocol === 'https:' && !url.username && !url.password
                    && !url.search && !url.hash)
                    avatar = url.href;
            }
            catch { }
        }
        return { uid: value.uid, gid: value.gid, name: value.name, maskedEmail: value.maskedEmail,
            ...(avatar ? { avatar } : {}) };
    };
    const list = () => {
        try {
            const raw = storage.getItem('account-cards');
            if (!raw || raw.length > 24_000)
                return [];
            const value = JSON.parse(raw);
            return Array.isArray(value) ? value.slice(0, 8).flatMap((input) => {
                const item = clean(input);
                return item ? [item] : [];
            }) : [];
        }
        catch {
            return [];
        }
    };
    return { list, clear() { storage.removeItem('account-cards'); }, remember(input) {
            const card = clean(input);
            if (!card)
                return;
            const next = [card, ...list().filter((item) => item.uid !== card.uid)].slice(0, 8);
            try {
                storage.setItem('account-cards', JSON.stringify(next));
            }
            catch { }
        } };
}
