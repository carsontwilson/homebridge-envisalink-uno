import https from 'https';
import http from 'http';

// Inline discovery logic — server.js is loaded as CJS by Homebridge's UI loader,
// so it cannot import from the ESM dist/. We duplicate the HTTP scrape here.
function discoverSystem(host: string, password: string): Promise<object> {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`user:${password}`).toString('base64');
    const options = {
      hostname: host,
      port: 80,
      path: '/',
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 401) {
        reject(new Error('Authentication failed — check your password'));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from UNO at ${host}`));
        return;
      }
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(parseHtml(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
    req.end();
  });
}

function parseHtml(html: string): object {
  const zones: object[] = [];
  const spanRegex = /TITLE="((?:OPEN|CLOSED):[^"]+)">(\d+)</gi;
  let match: RegExpExecArray | null;

  while ((match = spanRegex.exec(html)) !== null) {
    const title = match[1].trim();
    const zoneNumber = parseInt(match[2], 10);
    if (isNaN(zoneNumber)) continue;

    const colonIdx = title.indexOf(':');
    if (colonIdx === -1) continue;

    const state = title.slice(0, colonIdx).trim().toUpperCase();
    if (state !== 'OPEN' && state !== 'CLOSED') continue;

    let name = title.slice(colonIdx + 1).trim();
    name = name.replace(/^\d+\s+(Minutes?|Hours?|Days?)\s+Ago\s*/i, '').trim();
    if (!name) name = `Zone ${zoneNumber}`;

    const lower = name.toLowerCase();
    let sensorType = 'contact';
    if (/motion|pir/.test(lower)) sensorType = 'motion';
    else if (/smoke|fire/.test(lower)) sensorType = 'smoke';
    else if (/co\b|carbon/.test(lower)) sensorType = 'co';

    zones.push({ zoneNumber, name, state, sensorType });
  }

  return { partitionName: 'Home', zones };
}

export default function (homebridge: { onRequest: Function }) {
  homebridge.onRequest('/discover', async (payload: { host: string; password: string }) => {
    const { host, password } = payload;
    if (!host || !password) throw new Error('host and password are required');
    return await discoverSystem(host, password);
  });
}
