const routeWords = new Set(('auth profile inventory progress leaderboards configs iap ads realtime '
    + 'telemetry qa enrollment batches guest session refresh logout me state items grant consume '
    + 'resolve bootstrap oauth attempts complete code email send verify providers scores submit '
    + 'leaderboard achievements tasks rewards claim tracks snapshot catalog products purchase').split(' '));
export function diagnosticPath(path) {
    return path.split(/[?#]/, 1)[0].split('/').map((part, i) => i === 0 ? '' : i === 1 && part === 'v1' ? 'v1' : routeWords.has(part) ? part : ':segment').join('/');
}
