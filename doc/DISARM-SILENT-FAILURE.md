# Silent disarm failure — 2026-07-22

## What happened

The house alarm went off (false alarm) and disarming from HomeKit did nothing.
Arming worked. The alarm was eventually cleared at the physical keypad.

## Root cause

The plugin was writing to a **half-open TCP socket**. Writes "succeeded" and were
logged, but nothing reached the panel.

Evidence from the Homebridge log that morning:

- `^12,1,****` (disarm) sent at 11:19, 11:22, 11:23 — **zero response traffic** of
  any kind, no `%01`/`%02`, for hours.
- `TPI socket error: read ETIMEDOUT` at 11:36 — the kernel's retransmit timer
  finally gave up. Only then did the plugin reconnect.
- After reconnect: `Login:` → `OK`, `%02,01` (READY), `%06,0000...` (no troubles),
  live zone events. Everything healthy again.

Why the socket died: the UNO is **push-only** and sends nothing when idle. On a
quiet armed house the connection goes completely silent, and a stateful firewall
between theBrain and the panel (different subnets, so it crosses a router with
conntrack) drops the idle entry. Our side still believes the socket is
ESTABLISHED — `socket.destroyed` stays `false` — so writes are accepted and
discarded.

### Things ruled out along the way

- **Not credentials.** Arming worked, and the reconnect logged `TPI recv: OK`.
- **Not the command mapping.** `DISARM: '^12'` matches `doc/UNO-PROTOCOL.md`.
  (The log lines `Arm command: 0` → `^08` are HomeKit's *stay arm*, not disarm —
  HomeKit `SecuritySystemTargetState` is `0=STAY 1=AWAY 2=NIGHT 3=DISARM`.)
- **Not the firmware update.** It happened to force the reconnect that fixed
  things, but the stale socket predates it. Current firmware is `01.01.188`
  (was written against `1.0.124`+ codes — table still appears correct).
- **Unrelated:** Home Assistant's `envisalink_new` integration has been failing
  auth (`401`, "Password is incorrect") since at least 2026-07-17. Separate
  problem, still outstanding — HA currently has no alarm visibility.

## Fixes applied

In `src/unoClient.ts`:

1. **Active heartbeat.** The old one was a passive watcher — it only checked how
   long since data last *arrived* and never sent anything, so it couldn't keep
   conntrack alive. (It also never fired: no `Heartbeat timeout` line appears in
   the logs.) Now polls `^0D` (HostInfo, read-only) every 60s.
2. **`socket.setKeepAlive(true, 30_000)`** on connect — TCP-level defence in depth.
3. **Disarm confirmation.** `sendDisarm` was the only command bypassing `send()`,
   with a copy of the connected-check that had *no* warning branch — so it failed
   silently. It now routes through `send()` (which returns `false` and warns if it
   can't write) and waits 5s for a `%02` partition update. If none arrives it logs
   an error, emits `commandUnconfirmed`, and destroys the socket to force a
   rebuild.

## Still to do

- [ ] **Verify an arm/disarm cycle actually works on firmware `01.01.188`.** The
      read path is confirmed healthy; the *write* path has not been tested since
      the firmware update. Do this while home and able to reach the keypad.
- [ ] Surface `commandUnconfirmed` to HomeKit as a fault on the partition
      accessory, so a failed disarm is visible in the UI rather than log-only.
- [ ] Fix the Home Assistant Envisalink credentials (separate from the above).
- [ ] Consider whether any automation *arms* on a schedule — an automation that
      can arm but not disarm is how this repeats at a bad hour.

## Testing note

The panel was `READY` with `%06,0000000000000000` (zero trouble bits) after the
firmware update, so any future failure is unlikely to be a panel-side latch.
