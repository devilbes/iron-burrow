# Iron Burrow core gameplay v2

Модель: opus

You implement the CORE GAMEPLAY part of Iron Burrow v2 (a tank-defence game: player tank defends the «Ядро» core from «ржавожуки» enemy tanks on a 13×13 grid). Repo: ~/agents-studio/ib (GitHub devilbes/iron-burrow), base branch `v2`. Read first: docs/game/DESIGN-V2.md (the contract — sections 2, 3, 4, 7, 9), AGENTS.md (project rules), src/modules/game/core/*.ts (config.ts, stage.ts, field.ts, tanks.ts, tick.ts, combat.ts, state.ts), configs/remote/game.balance, game.enemies, tests/game/.

Setup: `cd ~/agents-studio/ib && git fetch -q && git worktree add ../ib-core -b v2-core origin/v2 && cp -R vendor ../ib-core/ && cd ../ib-core && npm install --no-audit --no-fund`. Work ONLY in ~/agents-studio/ib-core. Never edit package.json, platform.json, vendor/.

Do (only your files per DESIGN §9: src/modules/game/core/**, tests/game/**, configs/remote/game.enemies, configs/remote/game.balance, plus the minimal additive hooks elsewhere that are strictly needed, e.g. new EnemyType in the game module index):
1. Enemy AI without dithering: flow field (BFS over cells from the core; brick passable with cost 3, steel/lava/edge impassable; recomputed only when the field changes) and direction changes only on quarter lines when the next flow step differs. Roles per DESIGN §3 (grunt, scout flank, gunner hunts player on line of sight else core, brute straight, sapper). Random noise from `game.enemies` record (`ai.noise`, default 0.1). Keep the RNG streams deterministic (state.rngAI) — the server verifies level ends.
2. New cell `M` mud (slows tanks ×0.5, configurable) in the stage grid regex and field; new enemy type `sapper` (breaks bricks near the core) with tunables in game.enemies.
3. Boss: `boss:<id>` entry in a stage's enemies list (last). A 2×2-cell tank, HP/speed/phases from a new `bosses` map in game.enemies (10 bosses per DESIGN §2 table: ids taran, buravchik, korneed, zhnec, skolzen, bronenosec, molot, miner, magma, queen). Phases by HP: phase 1 fan shot; phase 2 summons 2 grunts and speeds up; queen has an extra phase. Expose boss HP/phase on the run state for the HUD; emit events the screens can use (boss_spawn, boss_phase, boss_dead). Stage won only when the boss is dead (and the normal win rule otherwise).
4. Difficulty: `game.balance.difficulty` array per block (10 entries: maxAlive, spawnInterval, stageEnemies, fireMult, aiAggro) consumed by tunables; keep old by-chapter fields working as fallback.
5. Analytics: add boss_phase and keep existing events working; add new event names to docs/analytics/EVENTS.json.
6. Tests in tests/game/ for: flow field path, no back-and-forth over N ticks (an enemy reaches the core on an open map within a bound), mud slowdown, sapper, boss phases and win rule, determinism (same seed → same outcome).
Use github.com/vgrichina/battlecity only as a reference for AI/spawn logic ideas (read via `gh api repos/vgrichina/battlecity/contents/...`); copy no levels, art or names.

Done = `npm run check:fast` passes types+bundle and your tests (two pre-existing failures may remain: tests/records.test.mjs «the SDK reads what it ships» and tests/skin-readiness «sheets: no literal colors» — not yours), commits on v2-core with message trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git push -u origin v2-core`. Do not merge, do not open PRs, do not publish configs or builds. Final report (≤15 lines): what changed, the grid/enemy/boss contract as implemented (exact names, record fields), test results, open issues.
