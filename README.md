# homebridge-envisalink-uno

> **Status: In Development — not yet published or verified**

A Homebridge plugin for the **EnvisaLink UNO** module, built from the ground up for the UNO's specific TPI protocol and HTTP interface.

---

## Relationship to the upstream plugin

This plugin is forked from [homebridge-envisalink-ademco](https://github.com/haywirecoder/homebridge-envisalink-ademco) by [@haywirecoder](https://github.com/haywirecoder), which supports Honeywell/Ademco Vista panels via the EnvisaLink 2DS/3/4. That plugin is excellent — if you have an Ademco panel and a standard EnvisaLink, use it instead.

This fork exists because the **UNO** device is a different product with a different TPI protocol, different status codes, and a built-in HTTP interface that enables auto-discovery. Those differences are significant enough that a separate plugin makes more sense than attempting backwards-compatible support in the original.

---

## What this plugin does (planned)

- Connects to an EnvisaLink UNO via TPI (TCP port 4025)
- Auto-discovers zones and partition names from the UNO's HTTP interface — no manual zone configuration required
- Exposes a SecuritySystem accessory (arm/disarm/stay/night) and zone sensors (contact, motion, smoke, CO) in HomeKit
- Minimal configuration: IP address and password only
- Custom Homebridge UI with a "Discover System" button

## What it does not do

- Does not support Ademco/Vista panels or older EnvisaLink models (2DS, 3, 4)
- Does not support DSC panels
- Not yet published to npm
- Not yet verified by Homebridge

---

## Configuration

> Configuration schema and full docs will be added once the plugin reaches a stable state.

The only required fields are `host` (the UNO's IP address) and `password`. Zone configuration is populated automatically via the custom UI discovery flow.

---

## Development

```bash
npm install
npm run build
```

See [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md) for the plugin's design, file structure, and UNO-specific protocol notes.

---

## License

MIT
