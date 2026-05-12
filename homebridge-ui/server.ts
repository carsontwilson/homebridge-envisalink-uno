import { discoverSystem } from '../src/unoHttp.js';

// Homebridge custom UI server — runs inside the Homebridge process
// Receives requests from the frontend via homebridge.request()
export default function (homebridge: { onRequest: Function }) {
  homebridge.onRequest('/discover', async (payload: { host: string; password: string }) => {
    const { host, password } = payload;

    if (!host || !password) {
      throw new Error('host and password are required');
    }

    return await discoverSystem(host, password);
  });
}
