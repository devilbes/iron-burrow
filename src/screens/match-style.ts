// Styles of the S05 screen (theme tokens `--mp-*` only, kit class names). One grid, three
// layouts (CONTRACT §4): P — stats strip, field full width, booster row, stick / FIRE at the
// bottom; L — field centred by height, left panel stats + stick, right panel score, pause,
// boosters, FIRE; D — the same with 16 px margins and key captions. `--field` (the field's CSS
// side) is set by the screen from the measured size; the page never scrolls.
export const MATCH_CSS = `
:host{height:100%;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none}
.game{display:grid;height:100%;min-height:0;gap:8px;padding:8px;overflow:hidden;
 grid-template-columns:minmax(0,1fr) minmax(0,1fr);
 grid-template-rows:auto minmax(0,1fr) auto auto auto;
 grid-template-areas:"a b" "f f" "k k" "t t" "s r"}
.game[data-layout=landscape],.game[data-layout=desktop]{
 grid-template-columns:minmax(0,1fr) var(--field,0px) minmax(0,1fr);
 grid-template-rows:auto auto minmax(0,1fr);
 grid-template-areas:"a f b" "t f k" "s f r";align-content:center}
.game[data-layout=desktop]{padding:16px;gap:16px}
.panel{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
.pa{grid-area:a}.pb{grid-area:b;justify-content:flex-end}
[data-layout=landscape] .pa,[data-layout=landscape] .pb{align-content:flex-start}
[data-layout=desktop] .pa,[data-layout=desktop] .pb{flex-direction:column;align-items:stretch}
.field-box{grid-area:f;position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}
[data-layout=landscape] .field-box,[data-layout=desktop] .field-box{grid-row:1 / -1;height:var(--field,0px)}
.field{display:block;border-radius:var(--mp-radius-field);touch-action:none}
.chip{display:flex;align-items:center;gap:4px;min-height:36px;padding:2px 8px;border:1px solid var(--mp-line);
 border-radius:var(--mp-radius-card);background:var(--mp-night);color:var(--mp-text);
 font-family:var(--mp-font-ui);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.chip img{width:24px;height:24px}
.chip .long,.chip[data-art=missing] .short,.chip[data-art=missing] img{display:none}
.chip[data-art=missing] .long{display:inline}
.chip .label{font-weight:500;color:var(--mp-text-2)}
.pause{display:flex;align-items:center;justify-content:center;gap:4px;min-width:48px;min-height:48px;padding:4px 8px;
 border:1px solid var(--mp-line);border-radius:var(--mp-radius-button);background:var(--mp-card-raised)}
.pause img{width:32px;height:32px}
.pause .long,.pause[data-art=missing] img{display:none}
.pause[data-art=missing] .long{display:inline}
.boosters{grid-area:k;display:flex;justify-content:center;flex-wrap:wrap;gap:8px;min-width:0}
[data-layout=landscape] .boosters{justify-content:flex-end}
[data-layout=desktop] .boosters{flex-direction:column;align-items:stretch}
.booster{position:relative;display:block;width:64px;height:64px;padding:3px;border:0;border-radius:var(--mp-radius-button);
 --ring:var(--mp-card-accent);background:conic-gradient(var(--ring) calc(var(--p,0) * 1turn),var(--mp-line) 0);touch-action:none}
.booster[data-state=active]{--ring:var(--mp-card-success)}
.booster .face{display:grid;place-items:center;width:100%;height:100%;border-radius:var(--mp-radius-button);
 background:var(--mp-card-surface)}
[data-layout=landscape] .booster{width:56px;height:56px}
[data-layout=desktop] .booster{width:100%;height:56px}
[data-layout=desktop] .booster .face{grid-template-columns:auto 1fr;gap:6px;padding:0 6px}
.booster img{width:44px;height:44px;object-fit:contain}
[data-layout=landscape] .booster img{width:36px;height:36px}
.booster .bname{display:none;font-size:.7rem;line-height:1.1;text-align:center;overflow-wrap:anywhere}
[data-layout=desktop] .booster .bname{display:block;text-align:left}
.booster[data-art=missing] img{display:none}.booster[data-art=missing] .bname{display:block}
.booster[data-state=empty],.booster[data-state=limit],.booster[data-state=blocked]{opacity:.55}
.booster .count{position:absolute;right:-4px;bottom:-4px;min-width:1.6em;padding:0 .3em;border-radius:var(--mp-radius-button);
 background:var(--mp-night);border:1px solid var(--mp-line);font-family:var(--mp-font-ui);font-weight:700;font-size:.8rem;text-align:center}
.key{display:inline-block;min-width:1.6em;padding:0 .35em;border:1px solid var(--mp-line);border-radius:var(--mp-radius-field);
 background:var(--mp-card-raised);color:var(--mp-text);font-family:var(--mp-font-ui);font-size:.75rem;text-align:center}
.booster .key{position:absolute;left:-4px;top:-4px}
.zone-s{grid-area:s;display:flex;align-items:flex-end;justify-content:flex-start;min-height:0}
.zone-r{grid-area:r;display:flex;align-items:flex-end;justify-content:flex-end;min-height:0}
.stick{position:relative;flex:none;width:clamp(112px,34vmin,168px);aspect-ratio:1;border-radius:50%;
 border:2px solid var(--mp-line);background:var(--mp-card-surface);touch-action:none}
.stick>img{width:100%;height:100%}
.knob{position:absolute;left:30%;top:30%;width:40%;height:40%;border-radius:50%;background:var(--mp-card-raised);
 border:2px solid var(--mp-card-line-strong);pointer-events:none}
.knob img{width:100%;height:100%}
.fire{position:relative;flex:none;display:grid;place-items:center;width:clamp(96px,28vmin,140px);aspect-ratio:1;
 border-radius:50%;border:2px solid var(--mp-line);background:var(--mp-violet-deep);color:var(--mp-on-accent);
 font-family:var(--mp-font-display);font-size:1.1rem;touch-action:none}
.fire img{position:absolute;left:0;top:0;width:100%;height:100%}
.fire span{position:relative}
.fire[data-pressed=true]{transform:scale(.94)}
.captions{display:flex;flex-direction:column;gap:6px;margin:0}
.captions .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.zone-t{grid-area:t;display:grid;gap:6px;min-width:0;align-content:start}
.tut{display:grid;gap:6px;box-shadow:0 0 0 2px var(--mp-card-accent)}
.tut-text{margin:0;font-weight:600}
.tut-actions{display:flex;gap:6px;flex-wrap:wrap}
.hint{margin:0}
.toast{position:absolute;left:50%;top:8px;transform:translateX(-50%);max-width:90%;text-align:center;
 font-family:var(--mp-font-display);pointer-events:none;transition:opacity .2s}
.toast[data-state=idle]{opacity:0}
.qa{display:flex;gap:6px}
[data-pulse=true]{animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 4px var(--mp-card-accent)}}
@media (prefers-reduced-motion: reduce){[data-pulse=true]{animation:none;box-shadow:0 0 0 3px var(--mp-card-accent)}}
`;
