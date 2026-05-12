// UNO TPI protocol constants — firmware 1.0.124+
// Source: doc/UNO-PROTOCOL.md, ufodone/pyenvisalink
export const PARTITION_STATUS = {
    0x00: 'NOT_USED',
    0x01: 'READY',
    0x02: 'READY_BYPASS',
    0x03: 'NOT_READY',
    0x04: 'ARMED_STAY',
    0x05: 'ARMED_AWAY',
    0x06: 'ARMED_MAX',
    0x08: 'EXIT_DELAY',
    0x09: 'ARMED_ZERO_ENTRY_DELAY',
    0x0C: 'ENTRY_DELAY',
    0x11: 'IN_ALARM',
};
// TPI commands (sent as "^XX,<args>\n")
export const CMD = {
    STAY_ARM: '^08',
    AWAY_ARM: '^09',
    NIGHT_ARM: '^0A',
    DISARM: '^12',
    BYPASS_ZONE: '^04',
    UNBYPASS_ZONE: '^05',
    INITIAL_STATE: '^0C',
    HOST_INFO: '^0D',
    PANIC: '^11',
};
// TPI message codes (received as "%XX,<data>$")
export const MSG = {
    ZONE_STATE: '%01',
    PARTITION_STATE: '%02',
    KEYPAD_UPDATE: '%00',
    ZONE_BYPASS: '%04',
    HOST_INFO: '%05',
    TROUBLE_STATE: '%06',
};
// Trouble byte bitmask (per partition, from %06)
export const TROUBLE_BITS = {
    0: 'service_required',
    1: 'ac_failure',
    2: 'wireless_device_low_battery',
    3: 'server_offline',
    4: 'zone_trouble',
    5: 'system_battery_overcurrent',
    6: 'system_bell_fault',
    7: 'wireless_device_faulted',
};
//# sourceMappingURL=unoProtocol.js.map