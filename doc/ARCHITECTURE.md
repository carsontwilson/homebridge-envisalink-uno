# Plugin Architecture

## Goals
- First-class verified Homebridge plugin (checkmark in the Homebridge UI)
- Supports EnvisaLink UNO only (not a multi-device plugin)
- Minimum user configuration: IP address + password only
- Auto-discovery: zones, partition name, and initial states pulled from UNO on setup
- Night mode support (HomeKit NIGHT_ARM via UNO ARMED_ZERO_ENTRY_DELAY)
- Zone names are managed on the UNO device itself, not in the plugin config

## Homebridge Requirements (for verified status)
- Dynamic platform (mandatory for verified plugins)
- ESM module (`"type": "module"` in package.json)
- TypeScript, compiled to `dist/`
- `engines.homebridge`: `"^1.8.0 || ^2.0.0"`
- `engines.node`: `"^22.10.0 || ^24.0.0"`
- `keywords`: `["homebridge-plugin"]` in package.json
- `config.schema.json` with `"customUi": true`
- No analytics, no unhandled exceptions
- Files written to disk go in `api.user.storagePath()`
- GitHub release for every published version
- Submit via https://github.com/homebridge/plugins/issues/new/choose

## File Structure

```
homebridge-envisalink-uno/
├── src/
│   ├── index.ts              # Platform registration entry point
│   ├── platform.ts           # DynamicPlatformPlugin — discovers accessories
│   ├── partitionAccessory.ts # SecuritySystem accessory (arm/disarm/night)
│   ├── zoneAccessory.ts      # ContactSensor / MotionSensor / SmokeSensor
│   ├── unoClient.ts          # TPI TCP connection, UNO protocol parsing
│   ├── unoHttp.ts            # HTTP scraper for auto-discovery
│   └── unoProtocol.ts        # UNO status code tables and command constants
├── homebridge-ui/
│   ├── public/
│   │   └── index.html        # Custom UI: IP + password + Discover button
│   └── server.ts             # UI server: /discover endpoint → scrapes HTTP
├── doc/
│   ├── UNO-PROTOCOL.md       # TPI protocol reference (this session's research)
│   ├── ARCHITECTURE.md       # This file
│   ├── BUGS.md               # Original plugin bugs and fixes
│   └── *.pdf                 # Original manufacturer docs
├── config.schema.json
├── package.json
└── tsconfig.json
```

## Setup Flow (Custom UI)

1. User installs plugin, opens Homebridge UI settings
2. Custom UI shows: **IP Address** field + **Password** field + **"Discover System"** button
3. On click, frontend calls `homebridge.request('/discover', { host, password })`
4. `homebridge-ui/server.js` scrapes `http://<host>/` with credentials
5. Parses zone names + states from SPAN TITLE attributes, partition name + status
6. Returns discovered config to frontend
7. Frontend shows preview: partition name, zone list with names
8. `homebridge.updatePluginConfig()` + `homebridge.savePluginConfig()` writes config
9. Plugin restarts, `discoverDevices()` creates all accessories in HomeKit

## Dynamic Platform Pattern

```
didFinishLaunching
  → discoverDevices()
      → read config.zones[] (populated by setup UI)
      → for each zone: create/restore PlatformAccessory
      → connect TPI client
      → subscribe to zone/partition events
      → update accessory characteristics on each event
```

Cached accessories are restored by UUID. UUIDs are generated from zone number
(stable across restarts). Stale accessories (zones removed from config) are
unregistered automatically.

## TPI Client Design

Single persistent TCP connection to `<host>:4025`.
- On connect: handle `Login:` prompt → send password
- After login: UNO auto-sends `^0D` (HostInfo) + `^0C` (InitialStateDump)
- Parse incoming lines: dispatch `%01` (zones), `%02` (partition), `%05` (host info), `%06` (trouble)
- Emit events: `zoneUpdate`, `partitionUpdate`, `troubleUpdate`
- Heartbeat check every 120s (same as original plugin)
- Reconnect on disconnect

## Accessory Types

| Zone type config | HomeKit accessory        |
|-----------------|--------------------------|
| `contact`       | ContactSensor (default)  |
| `motion`        | MotionSensor             |
| `smoke`         | SmokeSensor              |
| `co`            | CarbonMonoxideSensor     |

Partition → SecuritySystem with targets: STAY_ARM, AWAY_ARM, NIGHT_ARM, DISARM

## HomeKit State Mapping

| UNO code | UNO name                | HK CurrentState  | HK TargetState  |
|----------|-------------------------|------------------|-----------------|
| `01`     | READY                   | DISARMED         | DISARM          |
| `02`     | READY_BYPASS            | DISARMED         | DISARM          |
| `03`     | NOT_READY               | DISARMED         | DISARM          |
| `04`     | ARMED_STAY              | STAY_ARM         | STAY_ARM        |
| `05`     | ARMED_AWAY              | AWAY_ARM         | AWAY_ARM        |
| `06`     | ARMED_MAX               | AWAY_ARM         | AWAY_ARM        |
| `08`     | EXIT_DELAY              | DISARMED         | (last target)   |
| `09`     | ARMED_ZERO_ENTRY_DELAY  | NIGHT_ARM        | NIGHT_ARM       |
| `0C`     | ENTRY_DELAY             | (last current)   | (last target)   |
| `11`     | IN_ALARM                | ALARM_TRIGGERED  | (last target)   |
