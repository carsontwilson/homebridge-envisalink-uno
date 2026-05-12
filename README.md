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
- **Password:** your TPI password. On newer UNO devices the default is the **last 6 characters of the device's MAC address** (printed on the label). On older devices it may be `user`. You can reset or change it via the [Eyezon Portal](https://www.eyezon.com) under Manage Device.

### 2. Configure the plugin

Open the plugin settings in Homebridge and enter:

| Field | Description |
|-------|-------------|
| **IP Address** | Local IP address of your EnvisaLink UNO |
| **Password** | TPI password (same one you use to log into the UNO web interface) |
| **Alarm PIN** | A valid user code programmed on your alarm panel — used to disarm from HomeKit. Do not use the installer code. |

Then click **Discover System** to automatically find all your zones. Review the zone types (contact, motion, smoke, CO), then click **Save Configuration** followed by **Save**.

### 3. HomeKit

After Homebridge restarts, your alarm system will appear in HomeKit as:
- A **Security System** accessory for arm/disarm/stay/night
- A **sensor accessory** for each discovered zone

---

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
