# @manygamescorp/mod-realtime

Select this optional package when the game needs realtime. Public `realtime()` /
`realtimeModule()` at `./realtime` keeps the existing status, metrics and reconnect API.
The package owns transport policy, WS handshake/framing, SSE parser, poll loop,
retry/upgrade/heartbeat, cursor/ack handling and broadcast orchestration.

## Host session ABI (#1464)

`SessionChannel.signal` exposes cancellation only. It aborts on host session revoke,
before asynchronous module stop hooks; I/O, retries and broadcast handling use that
lifetime together with the module signal. A revoked channel never triggers reconnect.

The module declares `consumes: ['session.transport@1', 'realtime.delivery@1']` and
`http:realtime`. It obtains the public `SessionTransport` from
`@manygamescorp/core/session-transport` through `ctx.services.require`, then opens
`channel('realtime')`. There is no module-id privilege or fallback to a hidden port on
`ctx.realtime`; that property remains a manifest-scoped subscription view.

Core owns generic authenticated HTTP/native socket primitives, credentials, device identity,
endpoint permission checks and cancellation. It contains no realtime protocol parser,
transport selection or poll loop. `SessionChannel` exposes baseUrl, deviceId, request,
socket and renew. HTTP injects Authorization/app identity internally; authenticated
socket hello/auth frames inject the token internally. The module never receives a token
getter, authenticated RequestInit, or native WebSocket. HTTP credentialPath injects a token
into a cloned JSON body; it cannot mutate the caller's object. Socket authentication clones
frames before injection so caller hooks never receive credentials.

Paths remain under the declared service endpoint: no full URL, query, dot/encoded traversal
or authority override. Credential/authority headers are host-owned; redirects are refused.
Each channel/socket belongs to one module run and identity generation. Switch gid, stop,
abort or destroy revokes retained methods, closes sockets and aborts HTTP/stream readers;
late responses cannot publish. A 401 is attributed to the credential actually used.

`realtime.delivery@1` retains the host's checked bus/handler boundary: only a declared
consumer with `http:realtime` can get it. Missing host/auth/configuration is undefined for
get and `MODULE_DEPENDENCY_FAILED` for require, rather than a no-op connection. Requests
for undeclared capabilities/services fail `SDK_PERMISSION_DENIED`.

Core is an explicit peer pinned to the source snapshot version set in `peerDependencies`; contracts-client is a direct
technical dependency. Offline pack/vendor consumers run fixture package `2.4.1` with
core built from this PR at rc.21; they verify public ABI, hashes/import maps, absent realtime package
in the base closure, no realtime protocol I/O in core's packed JS, and zero base connections.
Fixture numbers are not published releases. The core fixture is built from this PR, not
the main/release rc.21 core: that artifact lacks the new ABI. Version prep
and publication must ship the new core ABI and module together; no compatibility with
existing rc.20/rc.21 artifacts is claimed. Shared independent release producer/version
stamping is #1457; immutable release artifacts are unchanged.

The default eager acknowledgement and manual acknowledgement from main (#1011 /
PR #1428) are both preserved by this extraction. There are no new settings, endpoints,
MCP methods, service workloads or UI.

`SessionChannel.supports('socket' | 'stream')` probes host environment eligibility
without exposing globals or constructors. The host checks socket/stream support and
observed HTTP/1 resource timing; unknown timing permits a streaming attempt.
The optional module maps those generic features to WS/SSE and retains transport
selection, framing and fallback policy. Probes are revoked with the session.

## Realtime acknowledgement

`realtime({ autoAck: false })` leaves guaranteed messages unconfirmed until the host calls
`await sdk.realtime.ack(message)` after successful processing. Pass the received envelope
or `{ id, epoch, seq }`. Only identities delivered during the active player run and current
server epoch are accepted. Fire-and-forget/broadcast messages cannot be acknowledged.

The default `autoAck: true` retains confirmation on bus delivery, before critical handler
invocation. Manual mode invokes handlers without automatically confirming their messages;
handlers must tolerate redelivery and be idempotent. No handler payload is queued by this API.

An unconfirmed duplicate is delivered again. Once explicitly confirmed, duplicates are
suppressed and their acknowledgement can be resent. The stored reconnect cursor advances
only when all currently received guaranteed messages have been confirmed; acknowledging a
later message cannot skip an earlier pending one. This is a conservative replay cursor,
not an in-browser durable processing queue. After restart the server may redeliver earlier
messages; application processing must be idempotent.

Only transport-send success in the same connection generation confirms local state.
`ack` resolves when that send completes; it does not promise a separate server receipt.
Disconnected/failed sends reject `UPSTREAM_UNAVAILABLE` and can be retried after reconnect.
Stop or player change rejects `MODULE_NOT_ACTIVE`; malformed, unknown, evicted or stale-epoch
identities reject `VALIDATION_FAILED`. Already confirmed identities return without another
send while retained. Tracking is limited to 1000 identities, evicting confirmed entries first;
if all are pending the connection reconnects from the confirmed cursor, without acknowledging
the overflowing message. No payloads, credentials or cross-player state are retained.

```ts
import { realtime } from '@manygamescorp/mod-realtime/realtime';

const realtimeModule = realtime({ autoAck: false });
// From the game's registered realtime handler, after processing a guaranteed envelope:
await sdk.realtime.ack(message);
```

The existing protocol frame `{ t: 'ack', seqs: [...] }` remains unchanged. WS/SSE/poll
protocol I/O is owned by this module through the host session capabilities described above.
Manual acknowledgement introduces no queue, server endpoint, storage namespace, permission
or MCP setting. Live server delivery/Service Bus acceptance is not claimed by unit tests.
