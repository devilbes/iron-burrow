# Iron Burrow Pixi WebGPU renderer

Модель: opus

You port the battlefield RENDERER of Iron Burrow v2 to Pixi v8 with WebGPU (fallback WebGL2). Repo: ~/agents-studio/ib (GitHub devilbes/iron-burrow), base branch `v2`. Read first: docs/game/DESIGN-V2.md (sections 8, 9), AGENTS.md (rules; package.json is NOT editable — check how the template brings pixi.js: see ~/agents-studio/game-template (origin/main) src/render/field.ts and how it imports/bundles pixi; if pixi must be a dependency and package.json can't change, find the template's mechanism (vendor/CDN import map or bundled copy) and follow it; if impossible, stop and report), src/screens/{field-draw,field-units,game,match-style,match-hud}.ts, src/modules/game/core/state.ts (what is drawn), assets/game/.

Setup: `cd ~/agents-studio/ib && git fetch -q && git worktree add ../ib-render -b v2-render origin/v2 && cp -R vendor ../ib-render/ && cd ../ib-render && npm install --no-audit --no-fund`. Work ONLY in ~/agents-studio/ib-render. Stay in your files (src/screens/field-*.ts, match-style.ts, new src/render/**; src/screens/game.ts only minimal wiring).

Do:
1. Replace the Canvas2D field drawing with Pixi v8: `Application.init({ preference: 'webgpu', ... })` with automatic WebGL2 fallback; autoDensity with CSS-only sizing (never overwrite canvas.style.cssText — known retina bug: set display/position via Object.assign on canvas.style). Same look as now (use the existing art), crisp at DPR 2.
2. Performance: textures from atlases (build them from existing assets at load), sprite pools (no create/destroy per frame), particles in ParticleContainer, zero allocations in the per-frame path, dirty-rect for the static tile layer (render tiles to a RenderTexture/cached container and update only changed quarters). Target 60 fps at 1440×900 and 844×390 DPR 2 with max enemies + a 2×2 boss.
3. Draw hooks for upcoming core features (another agent adds them; code defensively against optional state): mud cell `M` (CELL.mud), sapper enemy, a 2×2 boss with HP bar and phase flash.
4. Fast first screen: field assets load in the background after the home screen; no blocking on all assets.
5. Report renderer actually used and an FPS probe: expose `window.__ibPerf = {renderer, avg, min}` sampled over the last 5 s in dev/test builds, and an analytics event `fps_sample{avg,min,renderer}` once per level (add to docs/analytics/EVENTS.json).
6. Tests: a unit test that the renderer chooses webgpu when available and falls back otherwise (mock), and that pools don't grow over N frames.

Done = `npm run check:fast` passes types+bundle and tests (pre-existing failures tests/records.test.mjs and tests/skin-readiness may remain), commits on v2-render with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git push -u origin v2-render`. Do not merge, no PRs, no builds/publishing. Final report (≤15 lines): how pixi is brought in, what changed, how to measure FPS, open issues.
