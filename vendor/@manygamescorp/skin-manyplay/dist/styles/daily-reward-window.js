export const DAILY_CSS = `
.daily-reward{display:flex;flex-direction:column;gap:16px;max-width:none;margin:0}
.daily-reward header{margin:0;gap:8px}.daily-reward h2{font-size:22px}
.dialog .daily-reward>header{display:none}
.daily-streak{display:flex;flex-direction:column;gap:8px}
.daily-streak-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font:600 13px/1.4 var(--mp-font-ui)}
.daily-streak-row span{color:var(--mp-text-2)}.daily-streak-row b{font-weight:700;color:var(--mp-violet-text)}
.daily-bar{display:block;width:100%;height:8px;border:1px solid var(--mp-line);border-radius:4px;
 background:var(--mp-surface);overflow:hidden;appearance:none;-webkit-appearance:none}
.daily-bar::-webkit-progress-bar{background:var(--mp-surface)}
.daily-bar::-webkit-progress-value{background:var(--mp-violet)}
.daily-bar::-moz-progress-bar{background:var(--mp-violet)}
.daily-days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;list-style:none;margin:0;padding:0}
/* Title 18 + art 40 + amount 18 fit the 96px tile inside its frame (1px, today 2px) and padding. */
.daily-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:2px;
 min-width:0;height:96px;padding:6px 4px;border:1px solid var(--mp-line);border-radius:12px;background:var(--mp-surface)}
/* A one-day track («Ежедневный подарок» with one gift) has no artboard of its own: its only day is
   a tile across the whole strip, like the wide day 7 of D_Daily, not one cell of three. */
.daily-day:only-child{grid-column:1/-1}
.daily-day[data-wide]{grid-column:span 3;height:72px;flex-direction:row;padding:8px 16px;gap:12px;border-color:var(--mp-line-strong)}
.daily-day[data-state=available],.daily-day[data-state=pending],.daily-day[data-state=failed]{
 background:var(--mp-raised);border:2px solid var(--mp-violet);padding:5px 3px}
.daily-day[data-wide][data-state=available],.daily-day[data-wide][data-state=pending],
.daily-day[data-wide][data-state=failed]{padding:7px 15px}
/* Past and future days dim the art only: the amounts of the wide day stay readable (MPS D_Daily). */
.daily-day[data-state=claimed] .daily-art :is(.mp-art-icon,.mp-glyph),
.daily-day[data-state=locked] .daily-art :is(.mp-art-icon,.mp-glyph){opacity:.45}
.daily-day[data-state=claimed] .daily-amount{color:var(--mp-text-2)}
.daily-day-title{font:600 13px/1.4 var(--mp-font-ui);color:var(--mp-text-3);overflow-wrap:anywhere;text-align:center}
.daily-day[data-state=available] .daily-day-title,.daily-day[data-state=pending] .daily-day-title,
.daily-day[data-state=failed] .daily-day-title{font-weight:700;color:var(--mp-violet-text)}
.daily-short{display:none}
.daily-amount{font:700 15px/1.2 var(--mp-font-body);text-align:center;white-space:nowrap;color:var(--mp-text-2)}
.daily-day[data-state=available] .daily-amount{color:var(--mp-gold)}
.daily-art{display:flex;align-items:center;gap:4px}.daily-art .mp-art-icon{object-fit:contain;width:40px;height:40px}
.daily-art .mp-glyph{display:inline-grid;place-items:center;width:40px;height:40px;font-size:28px;line-height:1}
.daily-day-text{display:flex;flex:none;flex-direction:column;align-items:flex-start}
.daily-day[data-wide] .daily-art{flex:none}
.daily-day-text .daily-amount{text-align:left;color:var(--mp-gold)}
.daily-day[data-wide] .daily-art{gap:12px}.daily-art-item{display:flex;align-items:center;gap:4px}
.daily-check,.daily-lock{position:absolute;top:-6px;right:-6px;display:grid;place-items:center;
 box-shadow:0 0 0 2px var(--mp-night)}
.daily-check{width:22px;height:22px;border-radius:11px;background:var(--mp-mint);color:var(--mp-on-accent)}
.daily-lock{width:22px;height:22px;border-radius:6px;background:var(--mp-window-background);
 border:1px solid var(--mp-line-strong);color:var(--mp-text-2)}
.daily-hint{display:flex;align-items:center;gap:8px;padding:12px;border:1px solid var(--mp-line);
 border-radius:12px;background:var(--mp-surface);font:600 13px/1.4 var(--mp-font-ui);color:var(--mp-text-2)}
.daily-hint svg{flex:none;color:var(--mp-text-3)}.daily-hint b{font-weight:700;color:var(--mp-text)}
.daily-cta{width:100%;font-size:15px}.daily-cta b{font-weight:700}.daily-cta .mp-art-icon{width:20px;height:20px}
.daily-cta .mp-glyph{display:inline-grid;place-items:center;width:20px;height:20px;font-size:16px;line-height:1}
/* A popup under 900px of height (iPhone 390×844: content popup 80%, pinned «Забрать», #895) takes
   compact days so the whole window, the hint line «Новый подарок через …» included, ends above the
   pinned claim without a scroll: tiles 82 (title 18 + art 32 + amount 18 in the frame and padding),
   the wide day 60, gaps 12. Lower screens (375×667) scroll it, the pinned claim under the hint. The
   short landscape below lays the window out on its own (MPS_L_D_Daily). */
@media (orientation:portrait) and (max-height:900px),(min-height:521px) and (max-height:900px),
 (orientation:landscape) and (max-height:520px) and (max-width:699px){
 .dialog .daily-reward{gap:12px}.dialog .daily-streak{gap:6px}
 .dialog .daily-day{height:82px;gap:0}.dialog .daily-day[data-wide]{height:60px;padding-top:6px;padding-bottom:6px}
 .dialog .daily-day[data-wide]:is([data-state=available],[data-state=pending],[data-state=failed]){padding-top:5px;padding-bottom:5px}
 .dialog .daily-art .mp-art-icon,.dialog .daily-art .mp-glyph{width:32px;height:32px}.dialog .daily-art .mp-glyph{font-size:22px}
 .dialog .daily-hint{padding:10px 12px}
 /* Scrolled days pass under the pinned claim, not around it: the window colour above (the gap) and
    below it (the padding) hides them. */
 .dialog .daily-cta.window-footer{box-shadow:0 -12px 0 var(--mp-night),0 16px 0 var(--mp-night)}
}
/* A short landscape narrower than 700px (a phone frame beside the QA panel, 524×390) has no room
   for the 760px two-column window: its days would shrink to 47px and wrap their text letter by
   letter. It keeps the one-column window with the compact days above, scrolled under the claim. */
@media (orientation:landscape) and (max-height:520px) and (min-width:700px){
 /* MPS_L_D_Daily: the window 760×262 (padding 20/24, gap 12) over the bars of a short landscape
    screen (the shell lays it over them, #831); left column 216 (streak, hint, claim 48), days
    4 per row, two 80px rows (gap 8), art 32 (the wide day 40). The artboard lays the window
    between 60px and 68px of the screen edges (60…322 at 844×390), not in the middle: its
    bottom stays clear of the raised «Играть» circle of the bottom menu (the margin moves the
    centred window 4px up). */
 .dialog:has(.daily-reward){width:min(760px,100%);padding:20px 24px;gap:12px;margin-bottom:8px}
 .daily-streak{gap:6px}
 /* The left column is spread top to bottom over the two rows of days (MPS_L_D_Daily). */
 .daily-reward{display:grid;grid-template-columns:216px minmax(0,1fr);grid-template-rows:auto auto auto;
  column-gap:16px;row-gap:0;align-content:space-between}
 .daily-reward>.daily-streak{align-self:start}.daily-reward>.daily-hint{align-self:center}
 .daily-reward>.daily-cta{align-self:end}
 /* Without the claim (today received) the hint takes the rest of the column down to the last row
    of days, its text centred: no hole where the button was. */
 .daily-reward:not(:has(>.daily-cta))>.daily-hint{grid-row:2/4;align-self:stretch;align-items:center;
  margin-top:6px}
 .daily-reward>.daily-streak,.daily-reward>.daily-hint,.daily-reward>.daily-cta{grid-column:1}
 .daily-reward>.daily-days{grid-column:2;grid-row:1/4;grid-template-columns:repeat(4,minmax(0,1fr));
  grid-auto-rows:80px}
 .daily-reward>.daily-days:has(>.daily-day:only-child){grid-auto-rows:minmax(80px,1fr)}
 .daily-day,.daily-day[data-wide]{height:auto;padding:6px 4px;gap:0}
 /* Today's 2px frame (claimable, waiting for the grant, failed) takes 1px of the padding, so the
    amount keeps clear of the frame in every state of the day. */
 .daily-day[data-state=available],.daily-day[data-state=pending],.daily-day[data-state=failed],
 .daily-day[data-wide][data-state=available],.daily-day[data-wide][data-state=pending],
 .daily-day[data-wide][data-state=failed]{padding:5px 3px}
 .daily-day[data-wide]{padding:6px 8px}.daily-day[data-wide][data-state=available],
 .daily-day[data-wide][data-state=pending],.daily-day[data-wide][data-state=failed]{padding:5px 7px}
 .daily-day[data-wide]{grid-column:span 2;flex-direction:column;justify-content:space-between}
 .daily-day-text{flex-direction:row;align-items:baseline;gap:4px}
 .daily-day-text .daily-day-title::after{content:" ·"}
 .daily-day[data-wide] .daily-day-title{color:var(--mp-gold)}
 .daily-day-text .daily-amount{font:700 13px/1.4 var(--mp-font-body)}
 .daily-check,.daily-lock{top:6px;right:6px}.daily-check{width:20px;height:20px}
 .daily-art .mp-art-icon,.daily-art .mp-glyph{width:32px;height:32px}.daily-art .mp-glyph{font-size:22px}
 .daily-day[data-wide] .daily-art{gap:16px}
 .daily-day[data-wide] .daily-art .mp-art-icon,.daily-day[data-wide] .daily-art .mp-glyph{width:40px;height:40px}
 .daily-day[data-wide] .daily-art .mp-glyph{font-size:28px}
 .daily-long{display:none}.daily-short{display:inline}
 .daily-hint{align-items:flex-start;padding:10px 12px}.daily-hint svg{margin-top:2px}
 .daily-cta{height:48px;min-height:48px}
 .dialog:has(.daily-reward)>.dialog-head{align-items:center}
 .dialog:has(.daily-reward)>.dialog-head h3{padding-top:0}
 .dialog:has(.daily-reward)>.dialog-head .dialog-close{margin:0}
}`;
