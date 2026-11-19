import { defineSkin } from '@manygamescorp/ui-kit/skin';
import { CSS as SHELL_CSS } from './styles/shell.js';
import { MANYPLAY_ICON_ASSETS } from './assets.js';
import { MANYPLAY_PRESENTATION } from './presentation.js';
import { DISPLAY_TITLE_CSS } from './styles/display-title.js';
import {} from './theme.js';
export function manyplaySkin(fonts = {}) {
    const base = fonts.url ? new URL(fonts.url.endsWith('/') ? fonts.url : `${fonts.url}/`, globalThis.location?.href ?? import.meta.url) : undefined;
    const ranges = {
        latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
            + 'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
        cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
    };
    const faces = base ? [
        ...[500, 600, 700].map(weight => ({ family: 'Onest', weight })),
        { family: 'Unbounded', weight: 800 },
    ].flatMap(({ family, weight }) => Object.entries(ranges).map(([script, unicodeRange]) => ({
        family, weight, unicodeRange, url: new URL(`${family}-${weight}-${script}.woff2`, base).href,
    }))) : [];
    return defineSkin({ id: 'manyplay', extends: 'neutral', assets: MANYPLAY_ICON_ASSETS,
        css: { ...MANYPLAY_PRESENTATION, displayTitle: DISPLAY_TITLE_CSS, shell: SHELL_CSS },
        fonts: faces });
}
