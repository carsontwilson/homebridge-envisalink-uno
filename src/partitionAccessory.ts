import type {
  CharacteristicValue,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import type { EnvisalinkUnoPlatform } from './platform.js';
import type { UnoClient, PartitionUpdate, UnconfirmedCommand } from './unoClient.js';

export class PartitionAccessory {
  private readonly service: Service;
  private currentState: CharacteristicValue;
  private targetState: CharacteristicValue;
  private statusFault: CharacteristicValue;

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
    this.statusFault = Characteristic.StatusFault.NO_FAULT;

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

    this.service.getCharacteristic(Characteristic.StatusFault)
      .onGet(() => this.statusFault);

    this.client.on('partitionUpdate', (update: PartitionUpdate) => {
      if (update.partition !== 1) return;
      this.handlePartitionUpdate(update);
    });

    this.client.on('commandUnconfirmed', (info: UnconfirmedCommand) => {
      if (info.partition !== 1) return;
      this.handleCommandUnconfirmed(info);
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

    if (this.statusFault !== Characteristic.StatusFault.NO_FAULT) {
      this.statusFault = Characteristic.StatusFault.NO_FAULT;
      this.service.updateCharacteristic(Characteristic.StatusFault, this.statusFault);
    }
  }

  private handleCommandUnconfirmed(info: UnconfirmedCommand): void {
    const { Characteristic } = this.platform.api.hap;
    this.log.error(
      `${info.command} on partition ${info.partition} was not confirmed by the panel — ` +
      'flagging a HomeKit fault so it is visible outside the logs.',
    );

    this.statusFault = Characteristic.StatusFault.GENERAL_FAULT;
    this.service.updateCharacteristic(Characteristic.StatusFault, this.statusFault);

    // The set already committed optimistically in handleTargetStateSet — snap it
    // back to match reality instead of leaving HomeKit showing a change that
    // never happened.
    const revertedTarget = this.targetForCurrentState(this.currentState);
    if (revertedTarget !== this.targetState) {
      this.targetState = revertedTarget;
      this.service.updateCharacteristic(Characteristic.SecuritySystemTargetState, revertedTarget);
    }
  }

  private targetForCurrentState(current: CharacteristicValue): CharacteristicValue {
    const { Characteristic } = this.platform.api.hap;
    const C = Characteristic.SecuritySystemCurrentState;
    const T = Characteristic.SecuritySystemTargetState;

    switch (current) {
      case C.STAY_ARM: return T.STAY_ARM;
      case C.AWAY_ARM: return T.AWAY_ARM;
      case C.NIGHT_ARM: return T.NIGHT_ARM;
      default: return T.DISARM;
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
