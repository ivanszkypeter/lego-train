import { Injectable, signal } from '@angular/core';
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import {
  createEnableColorNotificationsPacket,
  createEnableSpeedNotificationsPacket,
  createPlaySoundPacket,
  createRequestBatteryPacket,
  createRequestRssiPacket,
  createSetLightPacket,
  createSetSpeedPacket,
  LWP3_CHARACTERISTIC_UUID,
  LWP3_SERVICE_UUID,
  parseLwp3Message
} from './lwp3';
import {
  DetectedColor,
  INITIAL_TRAIN_STATE,
  TrainLightColor,
  TrainSound,
  TrainState
} from './train.types';

@Injectable({ providedIn: 'root' })
export class DuploTrainService {
  private readonly stateSignal = signal<TrainState>(INITIAL_TRAIN_STATE);
  readonly state = this.stateSignal.asReadonly();

  private device?: BleDevice;
  private writeQueue: Promise<void> = Promise.resolve();

  async connect(): Promise<void> {
    this.patchState({ connection: 'connecting', error: undefined });

    try {
      await BleClient.initialize({ androidNeverForLocation: true });

      // DUPLO/Powered Up hubs do not reliably expose the LWP3 service UUID in
      // their advertising packet, so a `services` scan filter can hide them.
      // Filter by the advertised name instead and keep LWP3 as an optional
      // service so we can use its GATT characteristic after connecting.
      const device = await BleClient.requestDevice({
        namePrefix: 'Train',
        optionalServices: [LWP3_SERVICE_UUID]
      });

      await BleClient.connect(device.deviceId, () => this.onDisconnected());
      this.device = device;

      this.patchState({
        connection: 'connected',
        deviceId: device.deviceId,
        hubName: device.name || 'LEGO Hub'
      });
      this.pushEvent('Kapcsolódva', '🟢');

      await BleClient.startNotifications(
        device.deviceId,
        LWP3_SERVICE_UUID,
        LWP3_CHARACTERISTIC_UUID,
        (value) => this.handleNotification(value)
      );

      await this.write(createRequestBatteryPacket());
      await this.write(createRequestRssiPacket());
      await this.write(createEnableColorNotificationsPacket());
      await this.write(createEnableSpeedNotificationsPacket());
      await this.setLight(this.state().lightColor);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.patchState({ connection: 'error', error: message });
      this.pushEvent('Nem sikerült kapcsolódni', '⚠️');
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await BleClient.disconnect(this.device.deviceId).catch(() => undefined);
    }
    this.onDisconnected();
  }

  async setSpeed(speedPercent: number): Promise<void> {
    const limitedSpeed = this.state().childModeEnabled ? clamp(speedPercent, -45, 45) : clamp(speedPercent, -100, 100);
    this.patchSpeed(limitedSpeed, limitedSpeed);
    this.pushEvent(`Sebesség ${limitedSpeed}%`, '🎚️');

    if (!this.device) {
      return;
    }

    await this.write(createSetSpeedPacket(limitedSpeed));
  }

  async stop(): Promise<void> {
    await this.setSpeed(0);
    await this.playSound('brake');
    this.pushEvent('STOP', '🛑');
  }

  async playSound(sound: TrainSound): Promise<void> {
    this.pushEvent(this.soundLabel(sound), this.soundIcon(sound));

    if (!this.device) {
      return;
    }

    await this.write(createPlaySoundPacket(sound));
  }

  async setLight(color: TrainLightColor): Promise<void> {
    this.patchState({ lightColor: color });
    this.pushEvent(`${this.lightLabel(color)} fény`, '💡');

    if (!this.device) {
      return;
    }

    await this.write(createSetLightPacket(color));
  }

  toggleBrickFollow(enabled: boolean): void {
    this.patchState({ brickFollowEnabled: enabled });
    this.pushEvent(enabled ? 'Brick követés be' : 'Brick követés ki', '🧱');
  }

  toggleStationMode(enabled: boolean): void {
    this.patchState({ stationModeEnabled: enabled });
    this.pushEvent(enabled ? 'Állomás mód be' : 'Állomás mód ki', '🏠');
  }

  toggleChildMode(enabled: boolean): void {
    this.patchState({ childModeEnabled: enabled });
    this.pushEvent(enabled ? 'Gyerek mód be' : 'Gyerek mód ki', '🙂');

    if (enabled && Math.abs(this.state().targetSpeed) > 45) {
      void this.setSpeed(this.state().targetSpeed > 0 ? 45 : -45);
    }
  }

  private async write(packet: DataView): Promise<void> {
    if (!this.device) {
      return;
    }

    this.writeQueue = this.writeQueue.then(() =>
      BleClient.write(
        this.device!.deviceId,
        LWP3_SERVICE_UUID,
        LWP3_CHARACTERISTIC_UUID,
        packet
      )
    );

    await this.writeQueue;
  }

  private handleNotification(value: DataView): void {
    const message = parseLwp3Message(value);

    if (message.kind === 'battery' && typeof message.value === 'number') {
      this.patchState({ batteryPercent: message.value });
      return;
    }

    if (message.kind === 'rssi' && typeof message.value === 'number') {
      this.patchState({ rssi: message.value });
      return;
    }

    if (message.kind === 'speed' && typeof message.value === 'number') {
      this.patchSpeed(this.state().targetSpeed, clamp(message.value, -100, 100));
      return;
    }

    if (message.kind === 'color' && typeof message.value === 'string') {
      this.handleDetectedColor(message.value as DetectedColor);
    }
  }

  private handleDetectedColor(color: DetectedColor): void {
    this.patchState({ detectedColor: color });
    this.pushEvent(`${capitalize(color)} észlelve`, '⭐');

    if (!this.state().brickFollowEnabled) {
      return;
    }

    if (color === 'piros') {
      void this.stop();
      void this.setLight('red');
    }

    if (color === 'sárga' && this.state().stationModeEnabled) {
      void this.playSound('depart');
      void this.setSpeed(35);
      void this.setLight('yellow');
    }

    if (color === 'kék' && this.state().stationModeEnabled) {
      void this.playSound('water');
      void this.setLight('blue');
    }
  }

  private onDisconnected(): void {
    this.device = undefined;
    this.patchState({ connection: 'disconnected', deviceId: undefined });
    this.pushEvent('Kapcsolat bontva', '⚪');
  }

  private patchSpeed(targetSpeed: number, measuredSpeed: number): void {
    this.patchState({
      targetSpeed,
      measuredSpeed,
      direction: targetSpeed > 0 ? 'előre' : targetSpeed < 0 ? 'hátra' : 'áll',
      movementState: Math.abs(measuredSpeed) > 0 ? 'Mozog' : 'Áll'
    });
  }

  private patchState(patch: Partial<TrainState>): void {
    this.stateSignal.update((current) => ({ ...current, ...patch }));
  }

  private pushEvent(label: string, icon: string): void {
    this.patchState({ lastEvent: { label, icon, at: new Date() } });
  }

  private soundLabel(sound: TrainSound): string {
    return {
      horn: 'Duda',
      depart: 'Indulás',
      brake: 'Fék',
      water: 'Víz',
      steam: 'Gőz'
    }[sound];
  }

  private soundIcon(sound: TrainSound): string {
    return {
      horn: '📣',
      depart: '▶️',
      brake: '🛑',
      water: '💧',
      steam: '💨'
    }[sound];
  }

  private lightLabel(color: TrainLightColor): string {
    return {
      white: 'Fehér',
      red: 'Piros',
      yellow: 'Sárga',
      green: 'Zöld',
      blue: 'Kék',
      purple: 'Lila'
    }[color];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
