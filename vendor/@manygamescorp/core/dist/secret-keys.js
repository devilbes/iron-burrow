const SECRET_KEYS = new Set([
    'xrtsession', 'sessionid', 'attemptid', 'nonce', 'state', 'linkticket', 'et', 'authorizationurl',
    'authorization', 'proxyauthorization', 'cookie', 'setcookie',
    'ticket', 'tk', 'jwt', 'token', 'bearer', 'devicekey', 'password', 'passwd', 'secret',
    'apikey', 'xapikey', 'receipt', 'signature', 'otp', 'credential', 'credentials',
    'signedrequest', 'idtoken', 'authorizationcode', 'authcode', 'serverauthcode', 'code',
]);
const SECRET_SUFFIXES = ['token', 'secret', 'password', 'apikey', 'devicekey', 'receipt'];
export function normKey(key) {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function isSecretKey(key) {
    const k = normKey(key);
    return SECRET_KEYS.has(k) || SECRET_SUFFIXES.some((s) => k.endsWith(s));
}
