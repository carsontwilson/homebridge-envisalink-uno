# Changelog

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
