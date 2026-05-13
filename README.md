# homebridge-envisalink-uno

A Homebridge plugin for the **EnvisaLink UNO** security system module. Auto-discovers your zones and exposes your alarm system to HomeKit — arm, disarm, stay, and night modes all work natively.

---

## Requirements

- EnvisaLink UNO module (not compatible with EVL-2DS, EVL-3, or EVL-4)
- Homebridge v1.8.0 or v2.0.0+
- Node.js v22.10.0+

---

## Installation

Search for **`homebridge-envisalink-uno`** in the Homebridge plugin search and install it. Then open the plugin settings to configure.

---

## Setup

### 1. Find your UNO's IP address

Your EnvisaLink UNO is accessible via a web browser on your local network. Log in at `http://<uno-ip>/` with:
- **Username:** `user`
- **Password:** your TPI password. On newer UNO devices the default is the **last 6 characters of the device's MAC address** (printed on the label). On older devices it may be `user`.

> **Forgot your password?** Log into the [Eyezon Portal](https://www.eyezon.com), select your device, and choose **Manage Device → Reset Device Password**. This resets it back to the MAC address default.

### 2. Configure the plugin

Open the plugin settings in Homebridge and enter:

| Field | Description |
|-------|-------------|
| **IP Address** | Local IP address of your EnvisaLink UNO |
| **Password** | TPI password (same one you use to log into the UNO web interface) |
| **Alarm PIN** | A valid user code programmed on your alarm panel — used to disarm from HomeKit. Do not use the installer code. |

Then click **Discover System** to automatically find all your zones. Review the zone types (contact, motion, smoke, CO), then click **Save Configuration** followed by **Save**.

### 3. Network accessibility

This plugin runs as a Homebridge child bridge on a dedicated port. For HomeKit to discover it, **that port must be reachable from your iOS device on your local network**.

- The port is shown in Homebridge under the plugin's child bridge settings (the QR code screen)
- If Homebridge runs in **Docker with bridge networking**, you must explicitly expose this port in your container configuration
- If Homebridge runs with **macvlan/host networking or natively**, the port is accessible automatically
- Set the port to a **fixed value** in the child bridge settings — if it changes on every restart, HomeKit will lose the device

### 4. HomeKit

After Homebridge restarts, your alarm system will appear in HomeKit as:
- A **Security System** accessory for arm/disarm/stay/night
- A **sensor accessory** for each discovered zone

---

## HomeKit arm modes

| HomeKit mode | UNO command | Behaviour | Notes |
|---|---|---|---|
| **Home** | `^08` Stay Arm | Perimeter armed, motion sensors off, entry delay active | — |
| **Away** | `^09` Away Arm | Fully armed, all sensors active, entry delay active | — |
| **Night** | `^08` Stay Arm | Same as Home/Stay | See limitation below |
| **Off** | `^12` Disarm | Disarmed | Requires alarm PIN |

### Night arm limitation

HomeKit's **Night** mode is intended to mean "Stay with no entry delay" (alarm triggers instantly). The UNO TPI has no command for this — `^08` (Stay) and `^09` (Away) are the only arm commands available locally. The Eyezon app achieves "Arm No Entry (`*9`)" via their cloud service, which is not accessible to local integrations.

Until EyezOn exposes a native TPI command for instant/no-entry-delay arm (e.g. `^0A`), **Night and Home map to the same behaviour**. A feature request has been filed with EyezOn to add this.

The UNO correctly reports `ARMED_ZERO_ENTRY_DELAY` status when the panel is in this mode (e.g. set from the physical keypad), and HomeKit will show Night when that state is detected.

## Supported zone types

| Type | HomeKit accessory |
|------|-------------------|
| `contact` | Contact Sensor (default) |
| `motion` | Motion Sensor |
| `smoke` | Smoke Sensor |
| `co` | Carbon Monoxide Sensor |

Zone types are inferred from zone names during discovery and can be changed manually in the plugin settings.

---

## Relationship to the upstream plugin

This plugin is forked from [homebridge-envisalink-ademco](https://github.com/haywirecoder/homebridge-envisalink-ademco) by [@haywirecoder](https://github.com/haywirecoder), which supports Honeywell/Ademco Vista panels via the EnvisaLink 2DS/3/4. That plugin is excellent — if you have an Ademco panel and a standard EnvisaLink, use it instead.

This fork exists because the UNO uses a different TPI protocol, different status codes, and a built-in HTTP interface that enables auto-discovery. Those differences are significant enough to warrant a separate plugin.

---

## Development

```bash
npm install
npm run build
```

See [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md) for design notes and UNO protocol details.

---

## Security — no credentials in source

**Never commit real credentials.** The pre-commit hook will block you if you try.

- Real values (IP, password, PIN) go in `.env` — which is gitignored
- Use `.env.example` as a template with placeholder values only

---

## License

MIT
