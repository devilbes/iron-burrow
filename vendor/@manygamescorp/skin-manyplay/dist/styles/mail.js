export const MAIL_CSS = `
.dialog:has(.mail-body){width:min(350px,100%);gap:16px}
.dialog:has(.mail-body)>.dialog-head{margin:0;gap:8px}
.mail-count{flex:none;padding:2px 8px;border-radius:12px;background:var(--mp-coral);
 color:var(--mp-on-accent);font-size:13px;font-weight:700}
.mail-body{display:flex;flex-direction:column;gap:16px;min-height:0;overflow:auto}
.mail-side{display:flex;flex-direction:column;gap:8px;order:1}
.mail-side:empty{display:none}
.mail-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;min-width:0}
.mail-list:empty{display:none}
.mail-entry{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:12px;
 border:1px solid var(--mp-line);border-radius:12px;background:var(--mp-surface)}
.mail-entry[data-state=unread]{border-color:var(--mp-line-strong)}
.mail-entry[data-state=unread]::before{content:'';position:absolute;top:6px;left:6px;
 width:8px;height:8px;border-radius:4px;background:var(--mp-coral)}
.mail-icon{flex:none;width:40px;height:40px;display:grid;place-items:center;
 border-radius:8px;background:var(--mp-raised);color:var(--mp-violet-text)}
.mail-copy{flex:1;min-width:0;overflow-wrap:anywhere}
.mail-copy strong{font-size:15px}.mail-copy p{margin:0;color:var(--mp-text-2);font-size:13px}
.mail-copy time{color:var(--mp-text-3);font-size:12px}
.mail-entry[data-state=read] .mail-copy{color:var(--mp-text-2)}
.mail-empty{padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center;
 gap:8px;border-radius:12px;border:1px solid var(--mp-line);background:var(--mp-surface)}
.mail-empty h4,.mail-empty p{margin:0}.mail-empty p{font-size:13px;color:var(--mp-text-2)}
@media(orientation:landscape) and (max-height:520px){
 .dialog:has(.mail-body){width:min(760px,100%);padding:16px 20px;gap:8px}
 .mail-body:has(.mail-side:not(:empty)){display:grid;grid-template-columns:200px minmax(0,1fr);
  gap:16px;overflow:hidden}
 .mail-side{order:0;min-height:0;overflow:auto;justify-content:flex-end}
 .mail-list{overflow:auto;min-height:0;gap:4px;overscroll-behavior:contain}
 .mail-entry{padding:6px 12px;gap:10px;flex-wrap:nowrap}
 .mail-icon{width:32px;height:32px}.mail-entry button{font-size:13px;padding:0 12px}
}
`;
