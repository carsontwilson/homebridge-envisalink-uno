import type {
  CharacteristicValue,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import type { EnvisalinkUnoPlatform } from './platform.js';
import type { UnoClient, PartitionUpdate } from './unoClient.js';

export class PartitionAccessory {
  private readonly service: Service;
  private currentState: CharacteristicValue;
  private targetState: CharacteristicValue;

  constructor(
    private readonly platform: EnvisalinkUnoPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly client: UnoClient,
    private readonly pin: string,
    private readonly log: Logger,
  ) {
    const { Characteristic, Service } = this.platform.api.hap;

    this.currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
    this.targetState = Characteristic.SecuritySystemTargetState.DISARM;

    accessory.getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, 'Eyezon')
      .setCharacteristic(Characteristic.Model, 'EnvisaLink UNO')
      .setCharacteristic(Characteristic.SerialNumber, 'UNO-1');

    this.service = accessory.getService(Service.SecuritySystem)
      ?? accessory.addService(Service.SecuritySystem);

    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .onGet(() => this.currentState);

    this.service.getCharacteristic(Characteristic.SecuritySystemTargetState)
      .onGet(() => this.targetState)
      .onSet((value) => this.handleTargetStateSet(value));

    this.client.on('partitionUpdate', (update: PartitionUpdate) => {
      if (update.partition !== 1) return;
      this.handlePartitionUpdate(update);
    });
  }

  private handlePartitionUpdate(update: PartitionUpdate): void {
    const { Characteristic } = this.platform.api.hap;
    const C = Characteristic.SecuritySystemCurrentState;
    const T = Characteristic.SecuritySystemTargetState;

    let current: CharacteristicValue = C.DISARMED;
    let target: CharacteristicValue = T.DISARM;

    switch (update.status) {
      case 'READY':
      case 'READY_BYPASS':
      case 'NOT_READY':
        current = C.DISARMED;
        target = T.DISARM;
        break;
      case 'ARMED_STAY':
        current = C.STAY_ARM;
        target = T.STAY_ARM;
        break;
      case 'ARMED_AWAY':
      case 'ARMED_MAX':
        current = C.AWAY_ARM;
        target = T.AWAY_ARM;
        break;
      case 'ARMED_ZERO_ENTRY_DELAY':
        current = C.NIGHT_ARM;
        target = T.NIGHT_ARM;
        break;
      case 'IN_ALARM':
        current = C.ALARM_TRIGGERED;
        // Keep last target state during alarm
        target = this.targetState;
        break;
      case 'EXIT_DELAY':
      case 'ENTRY_DELAY':
        // Transitioning — keep current as disarmed, preserve target
        current = C.DISARMED;
        target = this.targetState;
        break;
    }

    this.log.debug(`Partition status: ${update.status} → current=${current} target=${target}`);

    if (current !== this.currentState) {
      this.currentState = current;
      this.service.updateCharacteristic(Characteristic.SecuritySystemCurrentState, current);
    }

    if (target !== this.targetState) {
      this.targetState = target;
      this.service.updateCharacteristic(Characteristic.SecuritySystemTargetState, target);
    }
  }

  private handleTargetStateSet(value: CharacteristicValue): void {
    const T = this.platform.api.hap.Characteristic.SecuritySystemTargetState;
    this.log.info(`Arm command: ${value}`);

    switch (value) {
      case T.STAY_ARM:
        this.client.sendStayArm();
        break;
      case T.AWAY_ARM:
        this.client.sendAwayArm();
        break;
      case T.NIGHT_ARM:
        this.client.sendNightArm();
        break;
      case T.DISARM:
        this.client.sendDisarm(this.pin);
        break;
    }

    this.targetState = value;
  }
}
