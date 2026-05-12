import type {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import { UnoClient } from './unoClient.js';
import { PartitionAccessory } from './partitionAccessory.js';
import { ZoneAccessory } from './zoneAccessory.js';
import type { PluginConfig, ZoneConfig } from './unoProtocol.js';

const PLUGIN_NAME = 'homebridge-envisalink-uno';
const PLATFORM_NAME = 'EnvisalinkUNO';

export class EnvisalinkUnoPlatform implements DynamicPlatformPlugin {
  private readonly accessories: Map<string, PlatformAccessory> = new Map();
  private client: UnoClient | null = null;
  private config: PluginConfig;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = config as unknown as PluginConfig;

    if (!this.config.host) {
      this.log.error('No host configured — plugin disabled');
      return;
    }

    this.api.on('didFinishLaunching', () => this.discoverDevices());
    this.api.on('shutdown', () => this.client?.destroy());
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  private discoverDevices(): void {
    const { host, password, pin, zones = [], partitionName = 'Home' } = this.config;

    this.client = new UnoClient(host, 4025, password, this.log);

    // Register / restore partition accessory
    const partitionUUID = this.api.hap.uuid.generate(`${PLUGIN_NAME}:partition:1`);
    const existingPartition = this.accessories.get(partitionUUID);
    const partitionPlatformAcc = existingPartition ?? this.createAccessory(partitionUUID, partitionName);
    if (!existingPartition) this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [partitionPlatformAcc]);

    const partitionAcc = new PartitionAccessory(this, partitionPlatformAcc, this.client, pin, this.log);

    // Register / restore zone accessories
    const activeUUIDs = new Set<string>([partitionUUID]);

    for (const zone of zones as ZoneConfig[]) {
      const uuid = this.api.hap.uuid.generate(`${PLUGIN_NAME}:zone:${zone.zoneNumber}`);
      activeUUIDs.add(uuid);

      const existing = this.accessories.get(uuid);
      const platformAcc = existing ?? this.createAccessory(uuid, zone.name);
      if (!existing) this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [platformAcc]);

      new ZoneAccessory(this, platformAcc, this.client, zone, this.log);
    }

    // Unregister stale accessories (zones removed from config)
    for (const [uuid, acc] of this.accessories) {
      if (!activeUUIDs.has(uuid)) {
        this.log.info(`Removing stale accessory: ${acc.displayName}`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        this.accessories.delete(uuid);
      }
    }

    // Suppress unused variable warning — partitionAcc subscribes to events in constructor
    void partitionAcc;

    this.client.connect();
  }

  private createAccessory(uuid: string, name: string): PlatformAccessory {
    const acc = new this.api.platformAccessory(name, uuid);
    this.accessories.set(uuid, acc);
    return acc;
  }
}
