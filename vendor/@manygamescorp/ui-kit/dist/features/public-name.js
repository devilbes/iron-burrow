export function publicName(gid, name, nickname, lang = 'ru') {
    for (const value of [name, nickname])
        if (typeof value === 'string' && value.trim())
            return value.trim();
    const player = lang.toLowerCase().startsWith('ru') ? 'Игрок' : 'Player';
    return Number.isSafeInteger(gid) && gid > 0 ? `${player} ${gid}` : player;
}
