export const MANYPLAY_TOKENS = Object.freeze({
    night: '#11132E',
    navy: '#1A1D45',
    surface: '#23275F',
    raised: '#2D3275',
    line: '#33386F',
    lineStrong: '#4A4F96',
    violet: '#7E80FF',
    violetHover: '#9597FF',
    violetText: '#A9AAFF',
    onViolet: '#11132E',
    points: '#FFC94D',
    mint: '#4CC98A',
    coral: '#FF7A70',
    text: '#FFFFFF',
    text2: '#C3C5F0',
    text3: '#9A9CD0',
});
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
    + 'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const WEIGHTS = [500, 600, 700];
const SCRIPTS = [['latin', LATIN], ['cyrillic', CYRILLIC]];
export function manyplayFontFaces(fonts = {}) {
    if (fonts.url === undefined)
        return '';
    const base = new URL(fonts.url.endsWith('/') ? fonts.url : `${fonts.url}/`, globalThis.location?.href ?? 'https://invalid.invalid/').href;
    if (/['"\\()\s]/.test(base))
        throw new TypeError('Invalid font URL');
    return SCRIPTS.flatMap(([script, range]) => [
        ...WEIGHTS.map((weight) => ['Onest', weight]), ['Unbounded', 800],
    ].map(([family, weight]) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};`
        + `font-display:swap;unicode-range:${range};`
        + `src:url('${base}${family}-${weight}-${script}.woff2') format('woff2')}`)).join('\n');
}
const FONT = "'Onest',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const BRAND_FONT = `'Unbounded',${FONT}`;
const t = MANYPLAY_TOKENS;
export const MANYPLAY_CSS = `
:host{
  --mp-night:${t.night};--mp-navy:${t.navy};--mp-surface:${t.surface};--mp-raised:${t.raised};
  --mp-line:${t.line};--mp-line-strong:${t.lineStrong};--mp-violet:${t.violet};
  --mp-violet-deep:${t.violet};--mp-violet-hover:${t.violetHover};--mp-violet-text:${t.violetText};
  --mp-on-accent:${t.onViolet};--mp-points:${t.points};--mp-mint:${t.mint};--mp-coral:${t.coral};
  --mp-text:${t.text};--mp-text-2:${t.text2};--mp-text-3:${t.text3};
  --mp-font-display:${FONT};--mp-font-ui:${FONT};--mp-font-body:${FONT};--mp-font-brand:${BRAND_FONT};
  --mp-radius-button:12px;--mp-radius-card:12px;--mp-radius-field:8px;--mp-radius-window:16px;
  --mp-button:48px;--mp-button-social:48px;
  --mp-r-s:8px;--mp-r-m:12px;--mp-r-l:16px;
  --mp-button-h:48px;--mp-cta-h:64px;--mp-close:40px;
  --mp-icon-s:16px;--mp-icon-m:24px;--mp-icon-l:40px;--mp-icon-xl:56px;
  --mp-window-w:358px;--mp-window-pad:24px;--mp-gap:16px;
  --mp-overlay:rgba(9,10,28,.82);--mp-shadow:0 24px 48px rgba(0,0,0,.4);
  --mp-window-background:#11132E;--mp-warning:#E3AE4A;--mp-info:#6FA8F0;
  --mp-gold:#FFC94D;--mp-violet-soft:rgba(126,128,255,.16);
  --mp-gold-edge:#C9922A;--mp-wood:#8A5A2B;--mp-wood-dark:#6B4320;--mp-wood-edge:#3A2410;
  --mp-success-soft:rgba(76,201,138,.16);--mp-error-soft:rgba(255,122,112,.14);
  --mp-warning-soft:rgba(227,174,74,.16);--mp-info-soft:rgba(111,168,240,.16);color-scheme:dark;
  --mp-points-soft:rgba(255,201,77,.08);--mp-points-line:rgba(255,201,77,.45);
  --mp-game-0:#22B573;--mp-game-1:#FF7A45;--mp-game-2:#A855F7;--mp-game-3:#3B82F6;--mp-game-4:#EC4899;
  --mp-game-5:#14B8A6;--mp-on-game:#FFFFFF;
  --mp-apple:#000000;--mp-on-apple:#FFFFFF;--mp-google:#FFFFFF;--mp-on-google:#1F1F1F;
  --mp-facebook:#1877F2;--mp-on-facebook:#FFFFFF;
  display:block;position:relative;color:var(--mp-text);
  font-family:var(--mp-font-body);font-weight:500;font-size:15px;line-height:1.45;
  -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
}
*,*::before,*::after{box-sizing:border-box}
button,input{font:inherit;font-family:var(--mp-font-ui);color:inherit}
.mp-caption{font-family:var(--mp-font-ui)}
button{cursor:pointer}
button:disabled{cursor:default}
:focus-visible{outline:none;box-shadow:var(--mp-focus,0 0 0 3px rgba(126,128,255,.35))}
[hidden]{display:none!important}
.mp-title{font-family:var(--mp-font-display);font-weight:600;font-size:22px;line-height:1.3;
  margin:0;letter-spacing:-.01em}
.mp-text{margin:0;color:var(--mp-text-2)}
.mp-caption{margin:0;color:var(--mp-text-3);font-weight:600;font-size:13px}
.mp-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
  min-height:var(--mp-button);padding:0 16px;border:1px solid transparent;
  border-radius:var(--mp-radius-button);font-weight:600;font-size:15px;
  transition:background .12s,border-color .12s,color .12s,opacity .12s}
.mp-button--primary{background:var(--mp-violet-deep);color:var(--mp-on-accent)}
.mp-button--primary:not(:disabled):hover{background:var(--mp-violet-hover)}
.mp-button--primary:disabled{opacity:.45}
.mp-button--secondary{background:transparent;color:var(--mp-text);border-color:var(--mp-line-strong)}
.mp-button--secondary:not(:disabled):hover{background:var(--mp-raised)}
.mp-button--ghost{background:transparent;color:var(--mp-text-2);min-height:44px}
.mp-button--ghost:not(:disabled):hover{color:var(--mp-text)}
.mp-button--danger{background:transparent;color:var(--mp-coral);min-height:44px}
.mp-button--social{min-height:var(--mp-button-social);font-weight:600;font-size:15px}
.mp-button--google{background:var(--mp-google);color:var(--mp-on-google)}
.mp-button--apple{background:var(--mp-apple);color:var(--mp-on-apple)}
.mp-button--facebook{background:var(--mp-facebook);color:var(--mp-on-facebook)}
.mp-button[aria-busy=true]{opacity:.7}
a.mp-button{text-decoration:none}
.mp-button--sm{width:auto;flex:none;min-height:44px;padding:0 16px}
.mp-button--text{width:auto;flex:none;min-height:44px;padding:0 4px;background:none;border:0;color:var(--mp-text)}
.mp-button--text.mp-button--ghost{color:var(--mp-text-2)}
.mp-button--critical{background:var(--mp-coral);color:var(--mp-on-accent)}
.mp-button--critical:not(:disabled):hover{filter:brightness(1.06)}
.mp-icon-button{flex:none;display:grid;place-items:center;width:var(--mp-close-box,44px);height:var(--mp-close-box,44px);
  padding:0;border:1px solid var(--mp-line);border-radius:var(--mp-radius-field);background:var(--mp-navy);
  color:var(--mp-text)}
.mp-icon-button:not(:disabled):hover{background:var(--mp-raised)}
.mp-icon-button:disabled{opacity:.5}
.mp-link{background:none;border:0;padding:0;color:var(--mp-violet-text);font-weight:600}
.mp-link:disabled{color:var(--mp-text-3)}
.mp-field{display:flex;flex-direction:column;gap:6px}
.mp-input{width:100%;height:var(--mp-button);padding:0 12px;border-radius:var(--mp-radius-field);
  border:1px solid var(--mp-line-strong);background:var(--mp-night);font-weight:500;font-size:16px;
  outline:none;transition:border-color .12s,box-shadow .12s}
.mp-input:focus{border-color:var(--mp-violet);box-shadow:var(--mp-focus,0 0 0 3px rgba(126,128,255,.35))}
.mp-input::placeholder{color:var(--mp-text-3)}
.mp-input--error{border-color:var(--mp-coral)}
.mp-error{margin:0;color:var(--mp-coral);font-weight:600;font-size:13px}
.mp-status{margin:0;color:var(--mp-mint);font-weight:600;font-size:13px}
.mp-chip{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;min-height:28px;
  padding:0 10px;border-radius:999px;border:0;background:var(--mp-violet-soft,rgba(126,128,255,.16));
  color:var(--mp-violet-text);font-weight:600;font-size:13px}
.mp-chip--ok{background:var(--mp-success-soft,rgba(76,201,138,.16));color:var(--mp-mint)}
.mp-card{background:var(--mp-navy);border:1px solid var(--mp-line);border-radius:var(--mp-radius-card);
  padding:16px}
.mp-logo{display:flex;align-items:center;gap:10px}
.mp-logo__name{font-family:var(--mp-font-display);font-weight:700;font-size:17px;letter-spacing:-.02em}
.mp-logo__id{padding:2px 7px;border-radius:6px;background:var(--mp-violet);color:var(--mp-on-accent);
  font-family:var(--mp-font-display);font-weight:700;font-size:13px}
`;
export const MANYPLAY_CARD_TOKENS = Object.freeze({
    background: '#1A1D45', surface: '#23275F', raised: '#2D3275', line: '#33386F',
    'line-strong': '#4A4F96', fg: '#FFFFFF', muted: '#C3C5F0', subtle: '#9A9CD0',
    accent: '#7E80FF', 'accent-hover': '#9597FF', 'accent-soft': 'rgba(126,128,255,.16)',
    'accent-text': '#A9AAFF', 'on-accent': '#11132E',
    success: '#4CC98A', 'success-soft': 'rgba(76,201,138,.16)',
    error: '#FF7A70', 'error-soft': 'rgba(255,122,112,.14)', warning: '#E3AE4A',
    'warning-soft': 'rgba(227,174,74,.16)', info: '#6FA8F0', 'info-soft': 'rgba(111,168,240,.16)',
    gold: '#FFC94D', focus: '0 0 0 3px rgba(126,128,255,.35)',
    shadow: '0 24px 48px rgba(0,0,0,.4)', overlay: 'rgba(9,10,28,.82)',
});
const card = (key) => `var(--mp-card-${key},${MANYPLAY_CARD_TOKENS[key]})`;
export const MANYPLAY_CHEST_TOKENS = Object.freeze({
    bronze: '#C7843F', 'bronze-deep': '#A86A2E', 'bronze-rim': '#8F5A27',
    'green-deep': '#2F9A66', 'violet-deep': '#5A5CD6',
});
const chest = Object.entries(MANYPLAY_CHEST_TOKENS).map(([key, value]) => `--mp-chest-${key}:${value};`).join('');
export const MANYPLAY_WINDOW_TOKENS_CSS = `
:host,.mp-login,.mp-account-window,.mpg-shell{
  --mp-font-display:${FONT};--mp-font-ui:${FONT};--mp-font-body:${FONT};--mp-font-brand:${BRAND_FONT};
  --mp-radius-button:12px;--mp-radius-card:12px;--mp-radius-field:8px;--mp-radius-window:16px;
  --mp-window-background:var(--mp-page-background,${t.night});
  --mp-bg-edge-top:#0E0F2A;--mp-bg-edge-bottom:#0C0D24;
  --mp-bg-base:linear-gradient(180deg,var(--mp-bg-edge-top) 0%,#14164A 50%,var(--mp-bg-edge-bottom) 100%);
  --mp-bg-glow-center:rgba(124,124,255,.42);--mp-bg-glow-left:rgba(91,91,230,.38);
  --mp-bg-glow-right:rgba(58,110,230,.32);--mp-bg-glow-gold:rgba(255,201,77,.14);
  --mp-bg-aurora:radial-gradient(ellipse 60% 38% at 50% 50%,var(--mp-bg-glow-center),transparent 70%),
    radial-gradient(ellipse 55% 45% at 28% 36%,var(--mp-bg-glow-left),transparent 70%),
    radial-gradient(ellipse 50% 40% at 76% 64%,var(--mp-bg-glow-right),transparent 70%),
    radial-gradient(ellipse 70% 30% at 50% 104%,var(--mp-bg-glow-gold),transparent 70%),var(--mp-bg-base);
  --mp-shell-background:var(--mp-page-background,var(--mp-bg-aurora));
  --mp-r-s:8px;--mp-r-m:12px;--mp-r-l:16px;
  --mp-button-h:48px;--mp-cta-h:64px;--mp-close:40px;
  --mp-icon-s:16px;--mp-icon-m:24px;--mp-icon-l:40px;--mp-icon-xl:56px;
  --mp-window-w:358px;--mp-window-pad:24px;--mp-gap:16px;--mp-art-s:72px;--mp-art-l:112px;
  --mp-night:${card('background')};--mp-navy:${card('surface')};
  --mp-surface:${card('surface')};--mp-raised:${card('raised')};--mp-line:${card('line')};
  --mp-line-strong:${card('line-strong')};
  --mp-text:${card('fg')};--mp-text-2:${card('muted')};--mp-text-3:${card('subtle')};
  --mp-violet:${card('accent')};--mp-violet-deep:${card('accent')};--mp-violet-hover:${card('accent-hover')};
  --mp-violet-soft:${card('accent-soft')};--mp-violet-text:${card('accent-text')};
  --mp-on-accent:${card('on-accent')};
  --mp-mint:${card('success')};--mp-success-soft:${card('success-soft')};
  --mp-coral:${card('error')};--mp-error-soft:${card('error-soft')};
  --mp-warning:${card('warning')};--mp-warning-soft:${card('warning-soft')};
  --mp-info:${card('info')};--mp-info-soft:${card('info-soft')};--mp-gold:${card('gold')};
  --mp-focus:${card('focus')};--mp-shadow:${card('shadow')};--mp-overlay:${card('overlay')};
  ${chest}
  color:var(--mp-text);color-scheme:dark;
}
.mp-login,.mp-account-window{
  background:var(--mp-window-background);
}
`;
export const MANYPLAY_WINDOW_CSS = `${MANYPLAY_CSS}\n${MANYPLAY_WINDOW_TOKENS_CSS}`;
export const MANYPLAY_ID_CSS = `${MANYPLAY_CSS}
.mp-login,.mp-account-window{
  --mp-night:${t.navy};--mp-navy:${t.navy};--mp-surface:${t.surface};
  --mp-overlay:rgba(9,10,28,.82);--mp-window-background:${t.night};
  --mp-focus:0 0 0 3px rgba(126,128,255,.35);
}
`;
