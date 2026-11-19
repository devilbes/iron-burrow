# HUD facade (`sdk.hud`)

The registry implementation belongs to UI Kit `services/hud-registry`, with exactly
`left` and `right` columns. `mod-hud` is only the game facade `sdk.hud` and event bridge,
with no registry, DOM, timer or layout handling of its own. HUD has no bottom slot: the
bottom row is the separate bottom menu (`core/bottommenu`). The same handle is used by HUD,
the top bar (`core/topbar`) and the bottom menu.

Install UI explicitly with `modules: [uiKitModule(), hudModule()]`. UI Kit owns the shared
registries; the shell receives those same registries. HUD requires UI Kit and `hud.registry@1`;
a missing or incompatible provider prevents activation. Other data modules may consume UI
capabilities optionally. Contexts default to main; the shell switches main/core or a custom
context through `topBarContext`. See [package boundaries](../../docs/presentation-packages.md).

```ts
const item = sdk.hud.register({ id: 'daily', icon: 'gift', label: 'game.daily',
  slot: 'right', onClick: () => openDailyWindow() });
item.setValue(3);
item.setBadge({ kind: 'dot' });
item.setTimer(serverDeadlineMs); // epoch milliseconds from the server
item.setProgress(0.5);
item.setState('locked'); // still clickable: the owner can explain the lock
item.setBadge(null);
item.dispose();
```

Registration returns a retained handle (`active`, `setValue`, `setBadge`, `setTimer`,
`setProgress`, `setState`, `dispose`). A disabled zone returns a no-op handle. Invalid specs and collisions throw; revoked module capabilities make handle
updates harmless. Notifications and countdowns are independent. Count 0 clears a badge;
count is bounded to 999999, shown as 99+ above 99. Timer/progress null clears the field.
Only the injected core.time.now measures countdowns. Timers stop on disable, reset,
removal or expiry; there are no server polls.

Module code registering several items uses `hudItems(ctx.services, specs)` of core/hud:
`specs` is a strict `readonly HudItemSpec[]`, and a failed registration disposes the items
already registered. Badge kinds are `dot` and `count` only; the countdown is `setTimer`.

`hud:items:changed` carries `{ids, reason}` (register/unregister/value/badge/timer/state/
layout/tick/reset). `hud:item:opened` carries `{id}`. The mod-hud facade emits these
from its declared event scope. `items()` and `slot('left'|'right')` read the active
context; label is always a localization key, translated by the shell.

Studio edits HUD ordering/visibility through the existing configs MCP methods:
`configs.get_schema`, `configs.write`, `configs.publish`, scope `ui.hud`, key `layout`.
The record is `{unlisted: 'show'|'hide', items: {id: {slot, order, visible, filters}}}`;
slot accepts only left/right. Invalid layout fields are ignored, as before. A published
change of scope `ui.hud` (`configs:snapshot:updated`) is re-applied by the UI Kit provider
`hud-ui` (`hudRegistryModule`), not by mod-hud, so it works without the facade. No new MCP
method, permission or scope is introduced. Registry limit: 64 active items.

## Gameplay HUD (client-sdk#699, Many Play Skin)

The gameplay HUD (HUD, B_HUD, B_HUD2, D_GameHUD) is part of UI Kit, not a module window:
`@manygamescorp/ui-kit/services/game-hud` draws it and reads its content from the HUD registry
(context `game`). A module only registers items through this facade and never creates the
element, the window or the DOM itself (owner rules, client-sdk#695): `level` (value, progress),
`coins`, `score`, `combo`, `skip`, and `booster.<id>` (value = count, `'ad'` = for a video,
`locked` = disabled), all with `contexts: ['game']`. A press on a booster or skip calls
`onClick` of the item and `hud:item:opened`. Windows are not opened here: any window a module
shows goes through the SDK window queue (`ui.windows`). No new event, permission or MCP method.

Mechanic packages remain owned by the separate Mechanics migration session; their
old registration call fields are outside #504's scope and have no alias in the contract.
