# Original Plugin Bugs (haywirecoder/homebridge-envisalink-ademco v2.2.0)

These are the bugs identified by comparing logs from a UNO device against the
plugin source and the HA `pyenvisalink` UNO implementation.

## Symptoms

1. **When system was armed, plugin showed it as ALARM_TRIGGERED**
2. **When a door was opened, zone still showed as closed**

Both are explained by the bugs below.

---

## Bug 1: `%02` status bytes parsed as decimal instead of hex

**File:** `envisalink.js`, `updatePartition()` function

```js
// WRONG — base 10
var byte = parseInt(partition_string.substr(i, 2), 10);

// CORRECT — base 16
var byte = parseInt(partition_string.substr(i, 2), 16);
```

The UNO's `%02` data field contains hex-encoded status codes.
Parsing as decimal causes:
- `08` (UNO EXIT_DELAY) → decimal 8 → looked up as `ALARM` → **symptom #1**
- `09` (UNO ARMED_ZERO_ENTRY_DELAY) → decimal 9 → looked up as `ALARM_MEMORY`
- `0C` (UNO ENTRY_DELAY) → `NaN` → undefined
- `11` (UNO IN_ALARM) → decimal 11 → undefined

---

## Bug 2: Wrong status code table

**File:** `envisalink.js`, `modeToHumanReadable()` function

The plugin's code table is for EVL-3/4. The UNO uses different codes for several
states (changed in UNO firmware 1.0.124+). See `doc/UNO-PROTOCOL.md` for the
full correct table.

Key mismatches (assuming correct hex parsing):
- `00` → plugin maps to `ARMED_AWAY`, UNO means `NOT_USED`
- `08` → plugin maps to `ALARM`, UNO means `EXIT_DELAY`
- `09` → plugin maps to `ALARM_MEMORY`, UNO means `ARMED_ZERO_ENTRY_DELAY`

---

## Bug 3: Wrong arming commands

**File:** `index.js`, arm/disarm handlers

The original plugin sends virtual keypad keypresses (e.g. `code + "3"` for away arm).
The UNO does not support virtual keypad input. It requires direct TPI commands:

| Action      | Wrong (EVL)           | Correct (UNO)      |
|-------------|-----------------------|--------------------|
| Stay arm    | keypad: `code + 2`    | `^08,partition`    |
| Away arm    | keypad: `code + 3`    | `^09,partition`    |
| Night arm   | (not supported)       | `^0A,partition` (TBC) |
| Disarm      | keypad: `code + 1`    | `^12,partition,code` |

---

## Bug 4: Partition state relies on `%00` keypad updates

**File:** `index.js`, `systemUpdate()` handler

The plugin uses `%00` virtual keypad LED updates as a secondary source of partition
state. On the UNO, `%00` messages arrive but carry no useful state — the UNO's
keypad update handler returns `null`. All partition state must come from `%02`.

---

## Bug 5: Post-login `^0D`/`^0C` messages not handled

After login the UNO sends `^0D` (HostInfo) and `^0C` (InitialStateDump). The
plugin doesn't parse `^`-prefixed messages at all, so these are silently ignored.
This means on a fresh connection the plugin has to wait for the panel to push state
changes rather than getting an immediate full state dump.

---

## Bug 6: `%01` zone state parsing (suspected — symptom #2)

The UNO sends zone state as a packed bitfield in `%01` messages. The original
plugin may be misreading the bitfield (the EVL-3 version had an endianness swap
that was later found to be wrong and removed in pyenvisalink). Needs verification
once the partition bugs are fixed.
