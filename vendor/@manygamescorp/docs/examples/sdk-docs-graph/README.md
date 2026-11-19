# Next-LTS documentation schema fixture

These are **API excerpts and synthetic package versions**, not published SDK packages,
release promises or MCP responses. A and B pin the same base and different IAP versions.
B changes the return type, error and event payload. Hashes are real fixture hashes;
`vendorSha256` comes from an offline vendor artifact with one synthetic JS entry.
The complete-current-artifact test is `test/sdk-docs-graph.test.mjs`.

Regenerate after build with `node docs/examples/sdk-docs-graph/generate.mjs`.
`graph-a.json` and `graph-b.json` use the [graph schema](../../schemas/sdk-docs-graph.schema.json).
Snapshots are `core-1.0.0.json`, `iap-1.2.3.json`, `iap-2.0.0.json`;
expected locks are `methods-a.json` and `methods-b.json`.

```js
import { readFileSync } from 'node:fs';
import { composeReference } from '../../../scripts/sdk-docs-graph.mjs';
const load = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const graph = JSON.parse(load('graph-a.json'));
const artifacts = new Map([
  ['@manygamescorp/core@1.0.0', load('core-1.0.0.json')],
  ['@manygamescorp/mod-iap@1.2.3', load('iap-1.2.3.json')],
]);
const { reference, methodsLock } = composeReference(graph, artifacts);
```

The consumer must verify package bytes against the selected vendor inventory separately.
The docs composer verifies snapshot bytes and dependency closure; it performs no installation
and makes no readiness claim. Observe successful deps for the intended project commit SHA
through the existing project status workflow. Presence of `platform.json` is insufficient.
