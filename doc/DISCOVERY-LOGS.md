# Discovery Session Logs

Annotated TPI data captured during diagnosis, with sensitive values redacted.
Useful as a reference for understanding the UNO's login sequence and message format.

## TPI Login Sequence

```
→ (connect to <host>:4025)
← Login:,,
→ <password>
← OK,,%01,<zone-bitfield>$,,%02,<partition-status>$,,%04,<bypass-bitfield>$,,%05,<mac>,UNO,<firmware>,1,<timestamp>$,,%06,<trouble-status>$,,
```

The UNO bundles the full initial state dump into the login OK response as
comma-separated TPI messages concatenated together.

### Example OK response structure

| Message | Example data                       | Meaning                                    |
|---------|------------------------------------|--------------------------------------------|
| `%01`   | `08000000000000000000000000000000` | Zone state bitfield — bit set = zone faulted |
| `%02`   | `0300000000000000`                 | Partition 1 = `03` (NOT_READY), 2–8 unused |
| `%04`   | `00000000000000000000000000000000` | Zone bypass state — no zones bypassed      |
| `%05`   | `<mac>,UNO,<firmware>,1,<ts>`      | Host info (see below)                      |
| `%06`   | `0000000000000000`                 | Partition trouble state — no troubles      |

### `%05` Host Info field format
`<MAC>,UNO,<firmware-version>,<unknown-field>,<timestamp>`
- MAC: device MAC address (12 hex chars, no separators)
- Device type: `UNO`
- Firmware: e.g. `01.01.183`
- Unknown field: `1` (purpose unknown)
- Timestamp: `YYYYMMDDHHmmss` format

## HTTP Interface

The UNO exposes a web UI at `http://<host>/` (basic auth: `user` / `<password>`).
Zone names, states, and last-activity are in `SPAN TITLE` attributes:

```html
<SPAN TITLE="CLOSED:  Front Door">1</SPAN>
<SPAN TITLE="CLOSED: 30 Minutes Ago Back Door">2</SPAN>
<SPAN TITLE="CLOSED:  Basement Window">3</SPAN>
```

Format: `"<STATE>: <time-ago?> <zone name>"`
- State: `CLOSED` or `OPEN`
- Time-ago: optional, e.g. `30 Minutes Ago`, `2 Hours Ago`
- Zone name: as configured on the panel (truncated to ~16 chars in HTML)

System status:
```html
<TD>System</TD><TD BGCOLOR="LIME">Ready </TD>
```

Partition name appears in the web UI but may not be present in the raw page HTML —
may require a secondary request or JS rendering. Needs further investigation.

## Homebridge Log Pattern

Key log showing the partition dismissal issue (plugin v2.1.1 / v2.2.0):
```
[Envisalink-UNO] TPI Data stream: OK,,%01,...,%02,0300000000000000$,...
[Envisalink-UNO] Successful TPI session established.
[Envisalink-UNO] Partition Change | %02,0300000000000000$,... | detected.
[Envisalink-UNO] partitionUpdate: status change - { partition: 1, status: 'Partition State Change' }
[Envisalink-UNO] partitionUpdate: status change - { partition: 2, status: 'Partition State Change' }
[Envisalink-UNO] partitionUpdate: Partition not monitored, dismissing update.
... (same for partitions 3-8)
```

Partition 1 passes the "monitored" check but downstream state mapping fails
silently — `data.mode` is derived from the wrong (decimal) parse.

Reconnect pattern observed (heartbeat drift):
```
[Envisalink-UNO] Heartbeat time drift is: 240, connection is active: true. Trying to re-connect...
[Envisalink-UNO] TPI session disconnected.
```
240s drift on a 120s heartbeat interval — worth investigating.
