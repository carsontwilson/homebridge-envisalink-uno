import net from 'net';
import { EventEmitter } from 'events';
import type { Logger } from 'homebridge';
import { CMD, MSG, PARTITION_STATUS } from './unoProtocol.js';

export interface ZoneUpdate {
  zoneNumber: number;
  faulted: boolean;
}

export interface PartitionUpdate {
  partition: number;
  status: string;
  statusCode: number;
}

export interface TroubleUpdate {
  partition: number;
  troubles: string[];
}

export interface HostInfo {
  mac: string;
  firmware: string;
}

export declare interface UnoClient {
  on(event: 'zoneUpdate', listener: (update: ZoneUpdate) => void): this;
  on(event: 'partitionUpdate', listener: (update: PartitionUpdate) => void): this;
  on(event: 'troubleUpdate', listener: (update: TroubleUpdate) => void): this;
  on(event: 'hostInfo', listener: (info: HostInfo) => void): this;
  on(event: 'connected', listener: () => void): this;
  on(event: 'disconnected', listener: () => void): this;
}

export class UnoClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = '';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastMessageAt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  // Track last known zone states so we can diff on each %01
  private zoneStates: boolean[] = new Array(128).fill(false);

  constructor(
    private readonly host: string,
    private readonly port: number = 4025,
    private readonly password: string,
    private readonly log: Logger,
  ) {
    super();
    this.setMaxListeners(150); // one listener per zone/partition accessory
  }

  connect(): void {
    if (this.destroyed) return;
    this.log.debug(`Connecting to ${this.host}:${this.port}`);

    this.socket = new net.Socket();
    this.socket.setEncoding('utf8');

    this.socket.on('data', (data: string) => {
      this.lastMessageAt = Date.now();
      this.buffer += data;
      this.processBuffer();
    });

    this.socket.on('close', () => {
      this.log.warn('TPI connection closed');
      this.stopHeartbeat();
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    this.socket.on('error', (err) => {
      this.log.error(`TPI socket error: ${err.message}`);
    });

    this.socket.connect(this.port, this.host);
  }

  destroy(): void {
    this.destroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.destroy();
  }

  sendStayArm(partition = 1): void {
    this.send(`${CMD.STAY_ARM},${partition}`);
  }

  sendAwayArm(partition = 1): void {
    this.send(`${CMD.AWAY_ARM},${partition}`);
  }

  sendNightArm(partition = 1): void {
    // UNO has no native night arm command — map to stay arm (zero entry delay)
    this.send(`${CMD.STAY_ARM},${partition}`);
  }

  sendDisarm(pin: string, partition = 1): void {
    const cmd = `${CMD.DISARM},${partition},${pin}`;
    this.log.debug(`TPI send: ${CMD.DISARM},${partition},****`);
    if (this.socket && !this.socket.destroyed) this.socket.write(cmd + '$\n');
  }

  private send(cmd: string): void {
    if (!this.socket || this.socket.destroyed) {
      this.log.warn(`Cannot send command — not connected: ${cmd}`);
      return;
    }
    this.log.debug(`TPI send: ${cmd}`);
    this.socket.write(cmd + '$\n');
  }

  private processBuffer(): void {
    // The UNO sends multiple messages on a single line separated by ",,"
    // e.g. "OK,,%01,<data>$,,%02,<data>$,,..."
    // We also get standalone lines like "Login:,,"
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      this.handleLine(line.trim());
    }
  }

  private handleLine(line: string): void {
    if (!line) return;
    this.log.debug(`TPI recv: ${line}`);

    if (line.startsWith('Login:')) {
      this.log.debug('Sending password');
      // Send password directly without going through send() to avoid logging it
      if (this.socket && !this.socket.destroyed) {
        this.socket.write(this.password + '\n');
      }
      return;
    }

    // Split on ",," to get individual messages from bundled responses
    const segments = line.split(',,');
    for (const segment of segments) {
      this.handleSegment(segment.trim());
    }
  }

  private handleSegment(segment: string): void {
    if (!segment || segment === 'OK') return;

    // Strip trailing "$"
    const clean = segment.endsWith('$') ? segment.slice(0, -1) : segment;

    if (clean.startsWith('%01,')) {
      this.parseZoneState(clean.slice(4));
    } else if (clean.startsWith('%02,')) {
      this.parsePartitionState(clean.slice(4));
    } else if (clean.startsWith('%05,')) {
      this.parseHostInfo(clean.slice(4));
    } else if (clean.startsWith('%06,')) {
      this.parseTroubleState(clean.slice(4));
    } else if (clean.startsWith('^0C') || clean.startsWith('^0D')) {
      // UNO acknowledges its own push messages — ignore
    } else if (clean.startsWith('FAILED')) {
      this.log.error('TPI login failed — check password');
    } else if (clean.startsWith('OK')) {
      this.log.debug('TPI login OK');
      this.startHeartbeat();
      this.emit('connected');
    }
  }

  private parseZoneState(data: string): void {
    // %01 data: hex-encoded packed bitfield, one bit per zone (up to 128 zones = 32 hex chars = 16 bytes)
    // bit N set = zone N+1 is faulted
    for (let byteIdx = 0; byteIdx < Math.min(data.length / 2, 16); byteIdx++) {
      const byteVal = parseInt(data.substr(byteIdx * 2, 2), 16);
      if (isNaN(byteVal)) continue;

      for (let bit = 0; bit < 8; bit++) {
        const zoneNumber = byteIdx * 8 + bit + 1;
        const faulted = (byteVal & (1 << bit)) !== 0;
        const previous = this.zoneStates[zoneNumber - 1];

        if (faulted !== previous) {
          this.zoneStates[zoneNumber - 1] = faulted;
          this.emit('zoneUpdate', { zoneNumber, faulted } satisfies ZoneUpdate);
        }
      }
    }
  }

  private parsePartitionState(data: string): void {
    // %02 data: 16 hex chars = 8 bytes, one per partition slot
    // Parse each byte as HEX (critical — the original plugin got this wrong)
    for (let i = 0; i < 8; i++) {
      const hex = data.substr(i * 2, 2);
      const code = parseInt(hex, 16);
      if (isNaN(code) || code === 0x00) continue;

      const status = PARTITION_STATUS[code] ?? `UNKNOWN_${hex}`;
      this.emit('partitionUpdate', {
        partition: i + 1,
        status,
        statusCode: code,
      } satisfies PartitionUpdate);
    }
  }

  private parseHostInfo(data: string): void {
    // %05 format: <MAC>,UNO,<firmware>,<unknown>,<timestamp>
    const parts = data.split(',');
    if (parts.length >= 3) {
      this.emit('hostInfo', { mac: parts[0], firmware: parts[2] } satisfies HostInfo);
    }
  }

  private parseTroubleState(data: string): void {
    // %06 data: 16 hex chars = 8 bytes, one per partition, each byte is a bitmask
    const TROUBLE_BITS: Record<number, string> = {
      0: 'service_required',
      1: 'ac_failure',
      2: 'wireless_device_low_battery',
      3: 'server_offline',
      4: 'zone_trouble',
      5: 'system_battery_overcurrent',
      6: 'system_bell_fault',
      7: 'wireless_device_faulted',
    };

    for (let i = 0; i < 8; i++) {
      const byte = parseInt(data.substr(i * 2, 2), 16);
      if (isNaN(byte) || byte === 0) continue;

      const troubles: string[] = [];
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) troubles.push(TROUBLE_BITS[bit]);
      }
      if (troubles.length > 0) {
        this.emit('troubleUpdate', { partition: i + 1, troubles } satisfies TroubleUpdate);
      }
    }
  }

  private startHeartbeat(): void {
    this.lastMessageAt = Date.now();
    this.heartbeatTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastMessageAt;
      if (elapsed > 180_000) {
        this.log.warn('Heartbeat timeout — reconnecting');
        this.socket?.destroy();
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    this.reconnectTimer = setTimeout(() => {
      this.log.info('Reconnecting to TPI...');
      this.connect();
    }, 10_000);
  }
}
