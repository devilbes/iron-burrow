import { kitText } from './login-strings.js';
export function localizedText(context) {
    return (key, params) => kitText(context?.t, context?.locale())(key, params);
}
