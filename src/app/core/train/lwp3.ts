import { numbersToDataView } from '@capacitor-community/bluetooth-le';
import { DetectedColor, TrainLightColor, TrainSound } from './train.types';

export const LWP3_SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123';
export const LWP3_CHARACTERISTIC_UUID = '00001624-1212-efde-1623-785feabcd123';

/**
 * DUPLO Train Hub port mapping.
 *
 * These values are intentionally centralized because the first real-train test
 * should verify them through attached-IO notifications. If one port differs on
 * your unit/firmware, only this mapping needs to change.
 */
export const DUPLO_PORTS = {
  motor: 0x00,
  speaker: 0x01,
  light: 0x11,
  colorSensor: 0x12,
  speedSensor: 0x13
} as const;

const MESSAGE_TYPE = {
  hubProperty: 0x01,
  portInputFormatSetupSingle: 0x41,
  portValueSingle: 0x45,
  portOutputCommand: 0x81
} as const;

const HUB_PROPERTY = {
  rssi: 0x05,
  batteryVoltage: 0x06
} as const;

const HUB_PROPERTY_OPERATION = {
  enableUpdates: 0x02,
  requestUpdate: 0x05,
  update: 0x06
} as const;

const OUTPUT_SUBCOMMAND = {
  writeDirectModeData: 0x51
} as const;

const STARTUP_AND_COMPLETION = 0x11;

const LIGHT_COLOR_ID: Record<TrainLightColor, number> = {
  white: 0x09,
  red: 0x08,
  yellow: 0x06,
  green: 0x05,
  blue: 0x03,
  purple: 0x02
};

/**
 * First-pass DUPLO train sound IDs.
 * Validate on the physical train; the UI and command queue already isolate this
 * mapping from the rest of the app.
 */
const SOUND_ID: Record<TrainSound, number> = {
  brake: 0x03,
  depart: 0x05,
  water: 0x07,
  horn: 0x09,
  steam: 0x0a
};

const COLOR_ID: Record<number, DetectedColor> = {
  0x00: 'fekete',
  0x01: 'ismeretlen',
  0x02: 'ismeretlen',
  0x03: 'kék',
  0x04: 'ismeretlen',
  0x05: 'zöld',
  0x06: 'sárga',
  0x07: 'barna',
  0x08: 'piros',
  0x09: 'fehér',
  0xff: 'ismeretlen'
};

export interface ParsedLwp3Message {
  kind: 'battery' | 'rssi' | 'color' | 'speed' | 'unknown';
  value?: number | DetectedColor;
}

export function createSetSpeedPacket(speedPercent: number): DataView {
  return outputCommand(DUPLO_PORTS.motor, [signedByte(clamp(speedPercent, -100, 100))]);
}

export function createSetLightPacket(color: TrainLightColor): DataView {
  return outputCommand(DUPLO_PORTS.light, [LIGHT_COLOR_ID[color]]);
}

export function createPlaySoundPacket(sound: TrainSound): DataView {
  return outputCommand(DUPLO_PORTS.speaker, [SOUND_ID[sound]]);
}

export function createRequestBatteryPacket(): DataView {
  return message([MESSAGE_TYPE.hubProperty, HUB_PROPERTY.batteryVoltage, HUB_PROPERTY_OPERATION.requestUpdate]);
}

export function createRequestRssiPacket(): DataView {
  return message([MESSAGE_TYPE.hubProperty, HUB_PROPERTY.rssi, HUB_PROPERTY_OPERATION.requestUpdate]);
}

export function createEnableColorNotificationsPacket(): DataView {
  return portInputFormat(DUPLO_PORTS.colorSensor, 0x00, 1, true);
}

export function createEnableSpeedNotificationsPacket(): DataView {
  return portInputFormat(DUPLO_PORTS.speedSensor, 0x00, 1, true);
}

export function parseLwp3Message(value: DataView): ParsedLwp3Message {
  const bytes = toBytes(value);
  if (bytes.length < 3) {
    return { kind: 'unknown' };
  }

  const messageType = bytes[2];

  if (messageType === MESSAGE_TYPE.hubProperty && bytes.length >= 6) {
    const property = bytes[3];
    const operation = bytes[4];
    const payload = bytes[5];

    if (operation === HUB_PROPERTY_OPERATION.update && property === HUB_PROPERTY.batteryVoltage) {
      return { kind: 'battery', value: payload };
    }

    if (operation === HUB_PROPERTY_OPERATION.update && property === HUB_PROPERTY.rssi) {
      return { kind: 'rssi', value: signedInt8(payload) };
    }
  }

  if (messageType === MESSAGE_TYPE.portValueSingle && bytes.length >= 5) {
    const port = bytes[3];
    const payload = bytes[4];

    if (port === DUPLO_PORTS.colorSensor) {
      return { kind: 'color', value: COLOR_ID[payload] ?? 'ismeretlen' };
    }

    if (port === DUPLO_PORTS.speedSensor) {
      return { kind: 'speed', value: signedInt8(payload) };
    }
  }

  return { kind: 'unknown' };
}

function outputCommand(port: number, payload: number[]): DataView {
  return message([
    MESSAGE_TYPE.portOutputCommand,
    port,
    STARTUP_AND_COMPLETION,
    OUTPUT_SUBCOMMAND.writeDirectModeData,
    ...payload
  ]);
}

function portInputFormat(port: number, mode: number, deltaInterval: number, notificationsEnabled: boolean): DataView {
  return message([
    MESSAGE_TYPE.portInputFormatSetupSingle,
    port,
    mode,
    deltaInterval & 0xff,
    (deltaInterval >> 8) & 0xff,
    (deltaInterval >> 16) & 0xff,
    (deltaInterval >> 24) & 0xff,
    notificationsEnabled ? 0x01 : 0x00
  ]);
}

function message(body: number[]): DataView {
  return numbersToDataView([body.length + 2, 0x00, ...body]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function signedByte(value: number): number {
  return value < 0 ? 256 + value : value;
}

function signedInt8(value: number): number {
  return value > 127 ? value - 256 : value;
}

function toBytes(value: DataView): number[] {
  return Array.from({ length: value.byteLength }, (_, index) => value.getUint8(index));
}
