export const REWARD_GRID_LAYOUT = `
.reward-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;
 align-content:start;justify-content:center;list-style:none;margin:0;padding:4px;
 width:100%;min-width:0;min-height:0;max-height:min(360px,42dvh);overflow:auto}
.reward-grid[data-count="1"]{grid-template-columns:minmax(0,calc((100% - 16px)/3))}
.reward-grid[data-count="2"]{grid-template-columns:repeat(2,minmax(0,calc((100% - 16px)/3)))}
.reward-grid:is([data-count="7"],[data-count="8"]){grid-template-columns:repeat(4,minmax(0,1fr))}
.reward-grid:is([data-count="1"],[data-count="2"],[data-count="3"],[data-count="4"],
 [data-count="5"],[data-count="6"],[data-count="7"],[data-count="8"]){flex-shrink:0}
.reward-grid>.reward-grid-item{position:relative;min-width:0;scroll-snap-align:start}
.reward-grid .reward-grid-entry{position:relative;display:flex;flex-direction:column;align-items:center;
 justify-content:center;gap:6px;width:100%;height:100%;min-height:80px;padding:6px 2px;
 color:inherit;font:inherit;overflow-wrap:anywhere}
.reward-grid .reward-art{display:grid;place-items:center;width:40px;max-width:100%;height:40px;flex:none}
.reward-grid .reward-art>*{width:40px;max-width:100%;height:40px;object-fit:contain}
.reward-grid .reward-amount{max-width:100%;font-size:14px;line-height:18px;white-space:normal;overflow-wrap:anywhere}
.reward-grid .reward-name{display:none;position:absolute;inset:0;z-index:1;align-items:center;
 justify-content:center;padding:4px;text-align:center;font-size:12px;line-height:16px;overflow-wrap:anywhere;
 background:var(--kit-reward-tooltip-bg);color:var(--kit-reward-tooltip-color)}
.iap-offer[data-layout=list]>.reward-grid{grid-area:rows}
.reward-grid .reward-grid-entry:is(:hover,:focus) .reward-name{display:flex}
`;
