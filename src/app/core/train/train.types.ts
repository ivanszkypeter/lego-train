export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Direction = 'hátra' | 'áll' | 'előre';
export type MovementState = 'Áll' | 'Mozog';

export type TrainLightColor = 'white' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
export type TrainSound = 'horn' | 'depart' | 'brake' | 'water' | 'steam';
export type DetectedColor = 'fekete' | 'barna' | 'piros' | 'sárga' | 'zöld' | 'kék' | 'fehér' | 'ismeretlen';

export interface TrainState {
  connection: ConnectionState;
  deviceId?: string;
  hubName: string;
  batteryPercent?: number;
  rssi?: number;
  targetSpeed: number;
  measuredSpeed: number;
  direction: Direction;
  movementState: MovementState;
  lightColor: TrainLightColor;
  detectedColor: DetectedColor;
  lastEvent: TrainEvent;
  brickFollowEnabled: boolean;
  stationModeEnabled: boolean;
  childModeEnabled: boolean;
  error?: string;
}

export interface TrainEvent {
  label: string;
  icon: string;
  at: Date;
}

export interface SoundButton {
  id: TrainSound;
  label: string;
  icon: string;
}

export interface LightButton {
  id: TrainLightColor;
  label: string;
  cssClass: string;
}

export const INITIAL_TRAIN_STATE: TrainState = {
  connection: 'disconnected',
  hubName: 'LEGO Hub',
  batteryPercent: 78,
  rssi: undefined,
  targetSpeed: 0,
  measuredSpeed: 0,
  direction: 'áll',
  movementState: 'Áll',
  lightColor: 'blue',
  detectedColor: 'ismeretlen',
  lastEvent: {
    label: 'Indításra kész',
    icon: '⭐',
    at: new Date()
  },
  brickFollowEnabled: true,
  stationModeEnabled: false,
  childModeEnabled: true
};
