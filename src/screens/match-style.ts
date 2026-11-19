// Styles of the S05 screen (theme tokens `--mp-*` / `--game-*` only, kit class names). One grid,
// three layouts (CONTRACT §4): P — stats strip, the hint banner slot (fixed height: the field never
// jumps when a hint comes or goes), field full width, booster row, stick / FIRE at the bottom;
// L — field centred by height, left panel stats + stick, right panel score, pause, boosters, FIRE,
// the hint banner over the top edge of the field; D — the same with 16 px margins, stat labels and
// key captions. `--field` (the field's CSS side) is set by the screen from the measured size; the
// page never scrolls. Plates are the forged steel of the skin: cut corners, no light 1px borders.
const CUT = 'polygon(var(--cut) 0,calc(100% - var(--cut)) 0,100% var(--cut),100% calc(100% - var(--cut)),'
  + 'calc(100% - var(--cut)) 100%,var(--cut) 100%,0 calc(100% - var(--cut)),0 var(--cut))';
const STEEL = 'linear-gradient(180deg,var(--mp-card-raised),var(--mp-card-surface) 45%,var(--mp-card-background))';

export const MATCH_CSS = `
:host{height:100%;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none}
.game{--cut:var(--game-cut,8px);--hint-h:84px;display:grid;height:100%;min-height:0;gap:8px;padding:4px 8px 8px;overflow:hidden;
 grid-template-columns:minmax(0,1fr) auto;
 grid-template-rows:auto var(--hint-h) minmax(0,1fr) auto auto;
 grid-template-areas:"a b" "t t" "f f" "k k" "s r"}
.game[data-layout=landscape],.game[data-layout=desktop]{
 grid-template-columns:minmax(0,1fr) var(--field,0px) minmax(0,1fr);
 grid-template-rows:auto minmax(0,1fr) auto;
 grid-template-areas:"a f b" "x f k" "s f r";align-content:center}
.game[data-layout=landscape]{padding:4px 8px;gap:6px}
.game[data-layout=desktop]{padding:16px;gap:16px}
.panel{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;align-content:flex-start}
.pa{grid-area:a}.pb{grid-area:b;justify-content:flex-end}
[data-layout=portrait] .pa{flex-wrap:nowrap;gap:5px}
[data-layout=portrait] .chip{flex:1 1 auto;justify-content:center;min-width:0;padding:2px 6px;gap:3px}
[data-layout=portrait] .chip img{width:22px;height:22px}
[data-layout=portrait] .pips{font-size:.8rem;gap:1px}
[data-layout=portrait] .boosters{align-items:center}
[data-layout=portrait] .boosters>.chip{flex:none;min-height:48px}
[data-layout=landscape] .zone-t{grid-area:x;align-content:center}
[data-layout=landscape] .tut{grid-template-columns:auto minmax(0,1fr);padding:8px}
[data-layout=landscape] .tut-actions{grid-row:auto;grid-column:1 / -1;justify-content:flex-end}
[data-layout=landscape] .pa{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
[data-layout=desktop] .pa,[data-layout=desktop] .pb{flex-direction:column;align-items:stretch}
.field-box{grid-area:f;position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}
[data-layout=landscape] .field-box,[data-layout=desktop] .field-box{grid-row:1 / -1;height:var(--field,0px)}
.field{display:block;border-radius:var(--mp-radius-field);touch-action:none;
 box-shadow:0 0 0 2px var(--mp-card-line-strong),0 0 0 4px var(--mp-window-background),var(--game-shadow-floating)}
.chip{display:flex;align-items:center;gap:6px;min-height:40px;padding:2px 10px 2px 6px;border:0;
 background:${STEEL};box-shadow:var(--game-shadow-raised);clip-path:${CUT};color:var(--mp-text);
 font-family:var(--mp-font-ui);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.chip img{flex:none;width:28px;height:28px;object-fit:contain}
.chip .long,.chip[data-art=missing] .short,.chip[data-art=missing] img{display:none}
.chip[data-art=missing] .long{display:inline}
[data-layout=desktop] .chip{min-height:48px;font-size:1.05rem}
[data-layout=desktop] .chip .long{display:inline;font-weight:600}
[data-layout=desktop] .chip .short{display:none}
.chip .label{font-weight:500;color:var(--mp-text-2)}
.pips{display:inline-flex;gap:2px;color:var(--mp-card-subtle);font-size:1rem;line-height:1}
.pips>[data-on]{color:var(--mp-card-gold);text-shadow:0 0 4px var(--game-magma-glow)}
[data-layout=desktop] .chip[data-testid=hud-gun] .pips{margin-left:auto}
.pause{display:flex;align-items:center;justify-content:center;gap:6px;min-width:48px;min-height:48px;padding:4px 8px;
 border:0;background:${STEEL};box-shadow:var(--game-shadow-raised);clip-path:${CUT}}
.pause img{width:32px;height:32px}
.pause .long,.pause[data-art=missing] img{display:none}
.pause[data-art=missing] .long{display:inline}
.boosters{grid-area:k;display:flex;justify-content:center;flex-wrap:wrap;gap:8px;min-width:0;align-content:flex-start}
[data-layout=landscape] .boosters{justify-content:flex-end}
[data-layout=desktop] .boosters{flex-direction:column;align-items:stretch}
.booster{position:relative;display:block;width:64px;height:64px;padding:3px;border:0;
 --ring:var(--mp-card-accent);background:conic-gradient(var(--ring) calc(var(--p,0) * 1turn),var(--mp-card-line-strong) 0);
 clip-path:${CUT};touch-action:none}
.booster[data-state=active]{--ring:var(--mp-card-success)}
.booster .face{display:grid;place-items:center;width:100%;height:100%;background:${STEEL};
 clip-path:polygon(calc(var(--cut) - 2px) 0,calc(100% - var(--cut) + 2px) 0,100% calc(var(--cut) - 2px),100% calc(100% - var(--cut) + 2px),
 calc(100% - var(--cut) + 2px) 100%,calc(var(--cut) - 2px) 100%,0 calc(100% - var(--cut) + 2px),0 calc(var(--cut) - 2px))}
[data-layout=landscape] .booster{width:56px;height:56px}
[data-layout=desktop] .booster{width:100%;height:60px}
[data-layout=desktop] .booster .face{grid-template-columns:44px 1fr auto;justify-items:start;gap:8px;padding:0 10px 0 26px}
.booster img{width:44px;height:44px;object-fit:contain}
[data-layout=landscape] .booster img{width:38px;height:38px}
.booster .bname{display:none;font-size:.85rem;font-weight:600;line-height:1.1;text-align:left;overflow-wrap:anywhere}
[data-layout=desktop] .booster .bname{display:block}
.booster[data-art=missing] img{display:none}.booster[data-art=missing] .bname{display:block}
.booster[data-state=empty],.booster[data-state=limit],.booster[data-state=blocked]{filter:grayscale(.8) brightness(.75)}
.booster .count{position:absolute;right:4px;bottom:4px;min-width:1.5em;padding:0 .3em;
 background:var(--mp-window-background);color:var(--mp-card-fg);font-family:var(--mp-font-ui);font-weight:700;
 font-size:.78rem;line-height:1.35;text-align:center;
 clip-path:polygon(var(--game-cut-badge,4px) 0,100% 0,100% calc(100% - var(--game-cut-badge,4px)),
 calc(100% - var(--game-cut-badge,4px)) 100%,0 100%,0 var(--game-cut-badge,4px))}
[data-layout=desktop] .booster .count{position:static;grid-column:3;font-size:.9rem}
.key{display:inline-block;min-width:1.6em;padding:0 .35em;border-radius:var(--mp-radius-field);
 background:var(--mp-window-background);box-shadow:inset 0 -2px 0 var(--mp-card-line-strong);color:var(--mp-text);
 font-family:var(--mp-font-ui);font-size:.75rem;line-height:1.5;text-align:center}
.booster .key{position:absolute;left:5px;top:4px;min-width:1.3em;padding:0 .25em;font-size:.7rem;line-height:1.3}
[data-layout=desktop] .booster .key{top:50%;transform:translateY(-50%)}
.zone-s{grid-area:s;display:flex;align-items:flex-end;justify-content:flex-start;min-height:0}
.zone-r{grid-area:r;display:flex;align-items:flex-end;justify-content:flex-end;min-height:0}
.stick{position:relative;flex:none;width:clamp(112px,32vmin,160px);aspect-ratio:1;border-radius:50%;
 background:var(--mp-card-surface);touch-action:none}
[data-layout=landscape] .stick{width:clamp(104px,30vmin,140px)}
.stick>img{width:100%;height:100%}
.knob{position:absolute;left:30%;top:30%;width:40%;height:40%;border-radius:50%;background:var(--mp-card-raised);
 pointer-events:none}
.knob img{width:100%;height:100%}
.fire{position:relative;flex:none;display:grid;place-items:center;width:clamp(96px,28vmin,140px);aspect-ratio:1;
 border-radius:50%;border:0;background:var(--mp-violet-deep);color:var(--mp-on-accent);
 font-family:var(--mp-font-display);font-size:1.1rem;touch-action:none}
[data-layout=landscape] .fire{width:clamp(92px,26vmin,120px)}
.fire img{position:absolute;left:0;top:0;width:100%;height:100%}
.fire span{position:relative}
.fire[data-pressed=true]{transform:scale(.94)}
.captions{display:flex;flex-direction:column;gap:6px;margin:0;padding:.5em .8em;border:0;background:${STEEL};
 box-shadow:var(--game-shadow-raised);clip-path:${CUT}}
.captions .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.zone-t{grid-area:t;display:grid;gap:6px;min-width:0;min-height:0;align-content:center;overflow:hidden}
.field-box>.zone-t{position:absolute;left:50%;top:6px;width:min(94%,560px);transform:translateX(-50%);z-index:1;overflow:visible}
.tut{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:4px 10px;margin:0;
 padding:8px 10px;border:0;background:color-mix(in srgb,var(--mp-window-background) 88%,transparent);
 box-shadow:inset 0 0 0 2px var(--mp-card-accent),var(--game-shadow-floating);clip-path:${CUT}}
.tut-arrow{grid-row:1 / span 2;display:grid;place-items:center;width:30px;height:30px;color:var(--mp-window-background);
 background:var(--mp-card-accent);font-family:var(--mp-font-display);font-size:1.05rem;line-height:1;
 clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
.tut-copy{display:grid;gap:2px;min-width:0}
.tut-text{margin:0;font-weight:700;font-size:.95rem;line-height:1.2;color:var(--mp-card-fg)}
.tut-text.muted{font-weight:500;font-size:.85rem;color:var(--mp-card-muted)}
.tut-actions{grid-row:1 / span 2;grid-column:3;display:flex;gap:6px;align-items:center}
.tut-actions .mp-button{min-height:40px;padding:.2em .8em;font-size:.9rem}
[data-layout=portrait] .tut-actions{flex-direction:column;gap:4px}
[data-layout=portrait] .tut-actions .mp-button{min-height:32px;font-size:.8rem}
.hint{margin:0;padding:.45em .9em;border:0;background:color-mix(in srgb,var(--mp-window-background) 88%,transparent);
 box-shadow:inset 0 0 0 2px var(--mp-card-accent);clip-path:${CUT};font-weight:600;text-align:center}
.hint.muted{box-shadow:inset 0 0 0 2px var(--mp-card-line-strong)}
.toast{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);max-width:90%;margin:0;padding:.4em 1.1em;
 border:0;background:color-mix(in srgb,var(--mp-window-background) 82%,transparent);clip-path:${CUT};
 text-align:center;font-family:var(--mp-font-display);font-size:1.15rem;color:var(--mp-card-fg);
 text-shadow:0 2px 0 var(--mp-window-background);pointer-events:none;transition:opacity .2s}
.toast[data-state=idle]{opacity:0}
.qa{display:flex;gap:6px}
.qa .mp-button{min-height:36px;padding:.1em .6em;font-size:.8rem}
[data-pulse=true]{animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:inset 0 0 0 3px var(--mp-card-accent),inset 0 0 14px var(--game-magma-glow)}}
.stick[data-pulse=true],.fire[data-pulse=true],.boosters[data-pulse=true]{animation:ring 1s ease-in-out infinite;
 outline:3px solid var(--mp-card-accent);outline-offset:4px}
@keyframes ring{50%{outline-offset:9px;outline-color:var(--mp-card-accent-hover)}}
@media (prefers-reduced-motion: reduce){[data-pulse=true]{animation:none;box-shadow:inset 0 0 0 3px var(--mp-card-accent)}
 .stick[data-pulse=true],.fire[data-pulse=true],.boosters[data-pulse=true]{animation:none}}
`;
