# Multiplayer plan research

Модель: sonnet

Goal: write a plan (in Russian, concise, markdown) for a 2-player game on the ManyPlay platform: finding a partner (matchmaking: quick match + invite a friend by code/link) and synchronous play (both players in one live session, state sync, disconnect/reconnect, cheating protection, result to leaderboards). The plan answers: what we already have in platform services and client SDK, what is missing, and what each service must add (concrete endpoints/events/SDK API), in what order, and which pieces a game (game-template) needs.

Read the code, do not guess. Local clones (fetch origin first; read origin/main via `git show`/`git grep`, do not modify working trees):
- ~/agents-studio/client-sdk — packages/mod-realtime, packages/core/src/realtime-port.ts, realtime-bus.ts, session-transport.ts, packages/contracts-client/src/realtime.ts, broadcast.ts.
- Platform services repos on GitHub org manygamescorp (use `gh api repos/manygamescorp/<repo>/contents/...` or `gh repo clone` into the scratchpad dir /private/tmp/claude-502/-Users-bes-Documents-AI-Agent/c8baa6be-ef7b-4600-9a67-8f899fad1ea9/scratchpad): realtime, profile, leaderboards, progress, notifications, scheduling, id. Also architecture docs: manygamescorp/architecture docs/architecture/services/ (look for realtime, multiplayer, matchmaking, rooms, lobby).
- ~/agents-studio/game-template — how games boot the SDK (src/boot).
Deployed in test and prod: ads, billing, configs, iap, id, inventory, leaderboards, notifications, profile, progress, realtime, scheduling, webhooks (card-collection is built but not deployed).

Find out for realtime specifically: transport (WebSocket/SSE?), channels/rooms model, who can publish (player vs server only), message size/rate limits, presence, ordering, latency path, whether server-authoritative logic is possible anywhere.

Constraints: read-only; never print secrets or tokens; do not push, open PRs or comment anywhere. Write the plan to /Users/bes/Documents/AI Agent/MULTIPLAYER-PLAN.md with sections: «Что уже есть» (with file/endpoint references), «Чего не хватает», «Что нужно от каждого сервиса» (table: service → change → why), «Клиент SDK и шаблон», «Порядок работ» (phases, minimal first version: асинхронный/пошаговый vs реальное время — recommend one with reasons), «Риски». Keep it under ~250 lines. Final report to me: 10 lines max with the key findings and the file path.
