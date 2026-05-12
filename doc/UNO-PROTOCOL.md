# EnvisaLink UNO TPI Protocol Reference

Compiled from: pyenvisalink/ufodone source, HA integration, homebridge logs, eyezon forum research.

## UNO vs EVL-3/EVL-4 Differences

### Post-login sequence
After successful login the UNO automatically sends:
- `^0D` — HostInfo (MAC, device type, firmware version)
- `^0C` — InitialStateDump (pushes current zone/partition state)

EVL-3/4 uses DumpZoneTimers instead.

### Partition state source
- **EVL-3/4:** `%00` virtual keypad updates are the primary state mechanism
- **UNO:** `%00` keypad updates return nothing. All partition state comes from `%02` and `%06` only.

### `%02` Partition State Change — status code table

Each `%02` message contains 16 hex characters = 8 bytes, one per partition slot.
The bytes are **hex encoded** (parse with `parseInt(x, 16)`, NOT base 10).

| Hex code | UNO meaning             | EVL-3/4 meaning (for reference) |
|----------|-------------------------|----------------------------------|
| `00`     | NOT_USED                | NOT_USED                         |
| `01`     | READY                   | READY                            |
| `02`     | READY_BYPASS            | READY_BYPASS                     |
| `03`     | NOT_READY               | NOT_READY                        |
| `04`     | ARMED_STAY              | ARMED_STAY                       |
| `05`     | ARMED_AWAY              | ARMED_AWAY                       |
| `06`     | ARMED_MAX               | ARMED_MAX                        |
| `07`     | (unused on UNO)         | EXIT_ENTRY_DELAY                 |
| `08`     | EXIT_DELAY              | IN_ALARM ← **key difference**    |
| `09`     | ARMED_ZERO_ENTRY_DELAY  | ALARM_IN_MEMORY ← **key diff**   |
| `0C`     | ENTRY_DELAY             | (unused)                         |
| `11`     | IN_ALARM                | (unused)                         |

Example `%02` on connect when partition is disarmed but not ready: `%02,0300000000000000$`
- Partition 1 = `03` = NOT_READY (disarmed, a zone is open)
- Partitions 2–8 = `00` = not used

Note: Pre-firmware 1.0.124 UNO used EVL-3/4 codes. 1.0.124+ uses the table above.

### New UNO-only message types
| Code | Name                        | Format                              |
|------|-----------------------------|-------------------------------------|
| `%04`| Zone Bypass State Change    | Bitfield, one bit per zone          |
| `%05`| Host Information Report     | MAC, device type, firmware version  |
| `%06`| Partition Trouble State     | 8 bytes, one per partition (bitmask)|

`%06` trouble byte bitmask (per partition):
- bit 0: service_required
- bit 1: ac_failure
- bit 2: wireless_device_low_battery
- bit 3: server_offline
- bit 4: zone_trouble
- bit 5: system_battery_overcurrent
- bit 6: system_bell_fault
- bit 7: wireless_device_faulted

### Arming commands
UNO uses direct TPI commands, NOT virtual keypad keypresses.

| Command | Action                                    | Format               |
|---------|-------------------------------------------|----------------------|
| `^08`   | Stay Arm                                  | `partition`          |
| `^09`   | Away Arm                                  | `partition`          |
| `^0A`   | Night Arm (zero entry delay)              | `partition` (TBC)    |
| `^12`   | Disarm                                    | `partition,code`     |
| `^04`   | Bypass Zone                               | `zone`               |
| `^05`   | Unbypass Zone                             | `zone`               |
| `^0C`   | InitialStateDump (request current state)  | (none)               |
| `^0D`   | HostInfo (request device info)            | (none)               |
| `^11`   | Panic Alarm                               | `partition,type`     |

Panic types: Fire=0, Ambulance=1, Police=2

### Zone state (`%01`)
Packed bitfield format — one bit per zone. Iterate bytes directly, do NOT swap endianness.
UNO supports up to 128 zones.

## HTTP Interface

The UNO exposes a web UI at `http://<ip>/` (basic auth: `user` / `<password>`).

The HTML contains zone names, states, and last-activity in `SPAN TITLE` attributes:
```html
<SPAN TITLE="CLOSED:  Front Door">1</SPAN>
<SPAN TITLE="CLOSED: 67 Minutes Ago Back Door">2</SPAN>
<SPAN TITLE="OPEN:  Garage Door">3</SPAN>
```

Format: `"<STATE>: <time-ago?> <zone name>"`
- State: `CLOSED` or `OPEN`
- Time-ago: optional, e.g. `67 Minutes Ago`, `2 Hours Ago`, `40 Hours Ago`
- Zone name: the name configured on the panel itself
- Note: names are truncated to ~16 characters in the HTML

Partition name and status ("Ready") also appear on this page.

This page is used during plugin setup to auto-discover all zones and the partition — the user never has to enter zone names manually. If a user wants to rename a zone, they do it on the UNO device itself; the plugin re-discovers on next setup.

## Reference Sources
- `ufodone/pyenvisalink` — `uno_client.py`, `uno_envisalinkdefs.py` (most complete UNO TPI implementation)
- `haywirecoder/homebridge-envisalink-ademco` — the plugin we forked
- `homeassistant/core` — `homeassistant/components/envisalink/`
- Eyezon forum: https://forum.eyezon.com/viewtopic.php?t=5479 (UNO TPI docs, requires login)
- Original EVL TPI spec: `doc/EnvisaLinkTPI-ADEMCO-1-03.pdf` (does not cover UNO)
