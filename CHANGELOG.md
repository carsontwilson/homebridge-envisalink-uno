# Changelog

## 1.0.7 (2026-05-14)

### Bug Fixes
- Revert Night arm to Stay arm — ^0A is acknowledged by UNO firmware but has no effect on the panel

## 1.0.0 (2026-05-13)

### First stable release 🎉
- Auto-discovery of zones via UNO HTTP interface
- Arm, Away, Stay, Disarm all working via TPI
- Night arm mapped to Stay (see README for limitation and EyezOn feature request)
- Custom Homebridge UI with Discover System button
- Zone sensors: Contact, Motion, Smoke, CO
- mDNS advertising fixed for Docker/macvlan setups
- Note EyezOn feature request for Night arm TPI command

## 0.1.25 (2026-05-13)

### Documentation
- Note EyezOn feature request for Night arm TPI command in README

## 0.1.25 (2026-05-13)

### Documentation
- Document HomeKit arm mode mapping and Night arm limitation in README
- Night arm maps to Stay arm until EyezOn exposes a native TPI command

## 0.1.24 (2026-05-13)

### Bug Fixes
- Fix arm commands not working — TPI commands require `$` frame terminator (e.g. `^09,1$` not `^09,1`)
- Fix Night Arm — UNO has no `^0A` command; map Night to Stay Arm (`^08`) instead
- Fix mDNS discovery — Homebridge requires explicit network interface binding on macvlan (documented in README)

## 0.1.23 (2026-05-12)

### Bug Fixes
- Verify config actually persisted after save by reading it back — surfaces real errors instead of silently assuming success

## 0.1.22 (2026-05-12)

### Bug Fixes
- Fix Save Configuration hanging forever — savePluginConfig() response never returns on child bridge, so we no longer await it

## 0.1.21 (2026-05-12)

### Bug Fixes
- Save Configuration button shows "Saving..." during operation
- SAVE only enabled on successful save, not on error
- Errors during save are clearly surfaced to the user

## 0.1.20 (2026-05-12)

### Bug Fixes
- Always enable SAVE button after Save Configuration, even if an error occurs

## 0.1.19 (2026-05-12)

### Bug Fixes
- Fix SAVE button gating — use correct `disableSaveButton()`/`enableSaveButton()` API
- SAVE disabled on load until existing config found, disabled again after discovery, enabled only after Save Configuration clicked

## 0.1.18 (2026-05-12)

### Bug Fixes
- Layout fix: fields now in two-column grid to prevent wrapping
- Type dropdown changes now correctly save when clicking Save Configuration
- PIN validation now properly blocks saving (no silent failures)
- SAVE interception prevents saving without completing Save Configuration first
- currentZones updated after save so subsequent saves remain consistent

## 0.1.17 (2026-05-12)

### Features
- README now explains how to reset the TPI password via the Eyezon Portal

## 0.1.16 (2026-05-12)

### Bug Fixes
- Remove unverified default password claim from README and UI — direct users to check their UNO settings instead

## 0.1.15 (2026-05-12)

### Features
- Alarm PIN field now shows help text explaining it must be a valid user code programmed on the panel

## 0.1.14 (2026-05-12)

### Features
- Re-opening plugin config now loads existing zones without requiring re-discovery
- PIN field added to config UI
- SAVE enabled on load if config already exists; disabled after fresh discovery until Save Configuration is clicked
- Validation warns if IP, password, or PIN are missing before saving

## 0.1.12 (2026-05-12)

### Bug Fixes
- Move Save Configuration button to right (primary action position)
- Homebridge SAVE button disabled until Save Configuration is clicked
- Motion and smoke sensor type inference handles truncated zone names (e.g. "Motio" → motion, "Smoke D" → smoke)

## 0.1.11 (2026-05-12)

### Bug Fixes
- Friendly error messages when discovery fails (bad IP, unreachable host, timeout)

## 0.1.10 (2026-05-12)

### Bug Fixes
- Add `repository` field to package.json so Homebridge can fetch release notes from GitHub

## 0.1.9 (2026-05-12)

### Bug Fixes
- Password and PIN no longer appear in debug logs
- MaxListenersExceededWarning resolved — supports systems with more than 10 zones
- Discovery correctly strips "Seconds Ago" time prefix from zone names

## 0.1.8 (2026-05-12)

### Bug Fixes
- UI server compiled as native ESM — fixes `require is not defined` error under Node with `"type":"module"`

## 0.1.7 (2026-05-12)

### Bug Fixes
- Include `CHANGELOG.md` in published npm package so Homebridge can display it

## 0.1.6 (2026-05-12)

### Bug Fixes
- UI server now uses `HomebridgePluginUiServer` and calls `this.ready()` — without this the settings modal spun indefinitely

## 0.1.5 (2026-05-12)

### Bug Fixes
- UI server loads correctly — added `homebridge-ui/package.json` to resolve ESM/CJS conflict

## 0.1.0 (2026-05-12)

### Features
- Initial release
- TPI client with correct UNO hex parsing and status code table (fixes all upstream bugs)
- Auto-discovery via HTTP scrape of UNO web interface — no manual zone configuration
- SecuritySystem accessory: stay, away, night, disarm via direct TPI commands
- Zone accessories: ContactSensor, MotionSensor, SmokeSensor, CarbonMonoxideSensor
- Custom Homebridge UI with Discover System button
