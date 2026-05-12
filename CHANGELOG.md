# Changelog

## [0.1.10] - 2026-05-12
### Fixed
- Add repository, bugs, and homepage fields to package.json so Homebridge can fetch release notes from GitHub

## [0.1.9] - 2026-05-12
### Fixed
- Password and PIN no longer appear in debug logs
- MaxListenersExceededWarning resolved — raised emitter limit to handle large zone counts
- Discovery: "Seconds Ago" time prefix now stripped from zone names correctly

## [0.1.8] - 2026-05-12
### Fixed
- UI server compiled as true ESM with native import statements — fixes `require is not defined` error when Homebridge forks server.js under Node with "type":"module"

## [0.1.7] - 2026-05-12
### Fixed
- Include CHANGELOG.md in published npm package so Homebridge can display it

## [0.1.6] - 2026-05-12
### Fixed
- UI server now uses `HomebridgePluginUiServer` from `@homebridge/plugin-ui-utils` and calls `this.ready()` — without this the modal spins indefinitely
- Dynamic `import()` wrapper allows CJS-compiled server.js to load the ESM-only plugin-ui-utils package

## [0.1.5] - 2026-05-12
### Fixed
- UI server now loads correctly — Homebridge requires `server.js` as CJS; added `homebridge-ui/package.json` with `"type":"commonjs"` to override root ESM setting

## [0.1.4] - 2026-05-12
### Fixed
- UI layout: smaller controls and proper column sizing to eliminate scrollbar in plugin config modal

## [0.1.3] - 2026-05-12
### Fixed
- UI server compiled as CJS to avoid `exports is not defined` error in ESM context

## [0.1.2] - 2026-05-12
### Fixed
- UI server inlined HTTP discovery logic to remove dependency on ESM `dist/` modules
- UI server compiled with separate `tsconfig.ui.json` targeting CommonJS

## [0.1.1] - 2026-05-12
### Changed
- Improved npm search discoverability: expanded keywords, better package description

## [0.1.0] - 2026-05-12
### Added
- Initial release
- TPI client with correct UNO hex parsing and status code table
- Auto-discovery via HTTP scrape of UNO web interface
- SecuritySystem accessory with stay/away/night/disarm via direct TPI commands
- Zone accessories: ContactSensor, MotionSensor, SmokeSensor, CarbonMonoxideSensor
- Custom Homebridge UI with Discover System button
