// Fetch and parse the UNO's web UI to discover zone names and states.
// The UNO uses HTTP basic auth: username "user", password = TPI password.
// Zone info lives in SPAN TITLE attributes like:
//   "CLOSED:  Front Door"
//   "CLOSED: 30 Minutes Ago Back Door"
//   "OPEN:  Garage Door"
export async function discoverSystem(host, password) {
    const url = `http://${host}/`;
    const credentials = Buffer.from(`user:${password}`).toString('base64');
    const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
        if (response.status === 401)
            throw new Error('Authentication failed — check your password');
        throw new Error(`HTTP ${response.status} from UNO at ${host}`);
    }
    const html = await response.text();
    return parseHtml(html);
}
function parseHtml(html) {
    const zones = [];
    // Match all SPAN TITLE attributes containing zone state
    // Format: TITLE="CLOSED:  Zone Name" or TITLE="OPEN: 30 Minutes Ago Zone Name"
    const spanRegex = /TITLE="((?:OPEN|CLOSED):[^"]+)">(\d+)</gi;
    let match;
    while ((match = spanRegex.exec(html)) !== null) {
        const title = match[1].trim();
        const zoneNumber = parseInt(match[2], 10);
        if (isNaN(zoneNumber))
            continue;
        const parsed = parseZoneTitle(title, zoneNumber);
        if (parsed)
            zones.push(parsed);
    }
    const partitionName = parsePartitionName(html);
    return { partitionName, zones };
}
function parseZoneTitle(title, zoneNumber) {
    // Title format: "<STATE>: [<time-ago> ]<zone name>"
    const colonIdx = title.indexOf(':');
    if (colonIdx === -1)
        return null;
    const state = title.slice(0, colonIdx).trim().toUpperCase();
    if (state !== 'OPEN' && state !== 'CLOSED')
        return null;
    let rest = title.slice(colonIdx + 1).trim();
    // Strip optional time-ago prefix: "30 Minutes Ago", "2 Hours Ago", "40 Hours Ago"
    rest = rest.replace(/^\d+\s+(Minutes?|Hours?|Days?)\s+Ago\s*/i, '').trim();
    const name = rest || `Zone ${zoneNumber}`;
    return {
        zoneNumber,
        name,
        state,
        sensorType: inferSensorType(name),
    };
}
function inferSensorType(name) {
    const lower = name.toLowerCase();
    if (/motion|pir/.test(lower))
        return 'motion';
    if (/smoke|fire/.test(lower))
        return 'smoke';
    if (/co\b|carbon/.test(lower))
        return 'co';
    return 'contact';
}
function parsePartitionName(html) {
    // The UNO web UI shows system status in a table cell near a "System" label:
    //   <TD>System</TD><TD BGCOLOR="LIME">Ready </TD>
    // The partition name itself may not be in the raw HTML — default to "Home"
    const nameMatch = html.match(/BGCOLOR="(?:LIME|RED|YELLOW)"[^>]*>\s*([^<]+)</i);
    if (nameMatch) {
        const text = nameMatch[1].trim();
        if (text && !/ready|not ready|armed/i.test(text))
            return text;
    }
    return 'Home';
}
//# sourceMappingURL=unoHttp.js.map