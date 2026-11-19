export const DISPLAY_TITLE_CSS = `
:host{--kit-title-size:28px;--kit-title-weight:800;
--kit-title-top:#FFFFFF;--kit-title-bottom:var(--mp-text-2,#C3C5F0);
--kit-title-stroke:var(--mp-night,#11132E);--kit-title-stroke-width:0px;
--kit-title-extrude:var(--mp-night,#11132E);--kit-title-depth:0px}
.kit-display-title{position:relative;display:inline-grid;max-width:100%;
font-family:var(--mp-font-display);font-size:var(--kit-title-size);font-weight:var(--kit-title-weight);
line-height:1.1;text-align:center;overflow-wrap:anywhere}
.kit-display-title>span{grid-area:1/1}
.kit-display-title .kdt-back{color:var(--kit-title-stroke);
-webkit-text-stroke:calc(var(--kit-title-stroke-width) * 2) var(--kit-title-stroke);
text-shadow:0 var(--kit-title-depth) 0 var(--kit-title-extrude)}
.kit-display-title .kdt-face{color:var(--kit-title-top);
background:linear-gradient(180deg,var(--kit-title-top),var(--kit-title-bottom));
-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.kit-display-title .kdt-arc{display:block;width:100%;height:auto;overflow:visible;
filter:drop-shadow(0 var(--kit-title-depth) 0 var(--kit-title-extrude))}
.kit-display-title .kdt-arc text{font:inherit;stroke:var(--kit-title-stroke);
stroke-width:calc(var(--kit-title-stroke-width) * 2);stroke-linejoin:round;paint-order:stroke}
.kit-display-title .kdt-top{stop-color:var(--kit-title-top)}
.kit-display-title .kdt-bottom{stop-color:var(--kit-title-bottom)}
`;
