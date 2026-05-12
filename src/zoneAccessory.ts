import type {
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import type { EnvisalinkUnoPlatform } from './platform.js';
import type { UnoClient, ZoneUpdate } from './unoClient.js';
import type { ZoneConfig } from './unoProtocol.js';

export class ZoneAccessory {
  private readonly service: Service;

  constructor(
    private readonly platform: EnvisalinkUnoPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly client: UnoClient,
    private readonly zone: ZoneConfig,
    private readonly log: Logger,
  ) {
    const { Characteristic, Service } = this.platform.api.hap;

    accessory.getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, 'Eyezon')
      .setCharacteristic(Characteristic.Model, 'EnvisaLink UNO Zone')
      .setCharacteristic(Characteristic.SerialNumber, `zone-${zone.zoneNumber}`);

    this.service = this.getOrAddService();

    this.client.on('zoneUpdate', (update: ZoneUpdate) => {
      if (update.zoneNumber !== zone.zoneNumber) return;
      this.handleZoneUpdate(update.faulted);
    });
  }

  private getOrAddService(): Service {
    const { Service } = this.platform.api.hap;
    const { Characteristic } = this.platform.api.hap;

    switch (this.zone.sensorType) {
      case 'motion': {
        const svc = this.accessory.getService(Service.MotionSensor)
          ?? this.accessory.addService(Service.MotionSensor, this.zone.name);
        svc.getCharacteristic(Characteristic.MotionDetected).onGet(() => false);
        return svc;
      }
      case 'smoke': {
        const svc = this.accessory.getService(Service.SmokeSensor)
          ?? this.accessory.addService(Service.SmokeSensor, this.zone.name);
        svc.getCharacteristic(Characteristic.SmokeDetected).onGet(
          () => Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
        );
        return svc;
      }
      case 'co': {
        const svc = this.accessory.getService(Service.CarbonMonoxideSensor)
          ?? this.accessory.addService(Service.CarbonMonoxideSensor, this.zone.name);
        svc.getCharacteristic(Characteristic.CarbonMonoxideDetected).onGet(
          () => Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL,
        );
        return svc;
      }
      default: {
        const svc = this.accessory.getService(Service.ContactSensor)
          ?? this.accessory.addService(Service.ContactSensor, this.zone.name);
        svc.getCharacteristic(Characteristic.ContactSensorState).onGet(
          () => Characteristic.ContactSensorState.CONTACT_DETECTED,
        );
        return svc;
      }
    }
  }

  private handleZoneUpdate(faulted: boolean): void {
    const { Characteristic } = this.platform.api.hap;
    this.log.debug(`Zone ${this.zone.zoneNumber} (${this.zone.name}): ${faulted ? 'FAULTED' : 'RESTORED'}`);

    switch (this.zone.sensorType) {
      case 'motion':
        this.service.updateCharacteristic(Characteristic.MotionDetected, faulted);
        break;
      case 'smoke':
        this.service.updateCharacteristic(
          Characteristic.SmokeDetected,
          faulted
            ? Characteristic.SmokeDetected.SMOKE_DETECTED
            : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
        );
        break;
      case 'co':
        this.service.updateCharacteristic(
          Characteristic.CarbonMonoxideDetected,
          faulted
            ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL
            : Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL,
        );
        break;
      default:
        this.service.updateCharacteristic(
          Characteristic.ContactSensorState,
          faulted
            ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
            : Characteristic.ContactSensorState.CONTACT_DETECTED,
        );
    }
  }
}
