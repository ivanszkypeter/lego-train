import { Injectable, signal } from '@angular/core';
import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
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

  // LEGO System A/S Bluetooth company identifier (0x0397 = 919). Powered Up /
  // DUPLO hubs always include this in their advertisement, even when they expose
  // neither a local name nor the LWP3 service UUID in the advertising packet.
  private static readonly LEGO_MANUFACTURER_IDS = ['919', '0x0397', '397'];
  private static readonly SCAN_TIMEOUT_MS = 12000;

  private device?: BleDevice;
  private writeQueue: Promise<void> = Promise.resolve();
  private lastScanSummary = '';

  async connect(): Promise<void> {
    this.patchState({ connection: 'connecting', error: undefined });

    try {
      // Some OEMs (notably Xiaomi/MIUI) return zero BLE scan results unless the
      // app holds the location permission, regardless of the neverForLocation
      // hint. Initialize without that hint so the plugin requests location and
      // scans actually return advertisements.
      await BleClient.initialize({ androidNeverForLocation: false });

      const device = await this.scanForTrain();

      if (!device) {
        const detail = this.lastScanSummary ? ` Talált eszközök: ${this.lastScanSummary}.` : '';
        this.patchState({
          connection: 'error',
          error: `Nem találtam a vonatot. Kapcsold be (fehéren villog), és próbáld újra.${detail}`
        });
        this.pushEvent('Nincs eszköz', '⚠️');
        return;
      }

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

  /**
   * Discover the train via a raw BLE advertisement scan. We cannot rely on a
   * service- or name-based `requestDevice` filter because DUPLO hubs broadcast
   * neither in their advertising packet, so we match the LEGO manufacturer id
   * (and accept a name/service hit as a bonus). Records everything seen so a
   * failed scan can report what was actually nearby.
   */
  private scanForTrain(): Promise<BleDevice | undefined> {
    return new Promise<BleDevice | undefined>((resolve) => {
      const seen = new Map<string, string>();
      let settled = false;

      const finish = async (device?: BleDevice): Promise<void> => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        await BleClient.stopLEScan().catch(() => undefined);
        if (!device) {
          this.lastScanSummary = [...seen.values()].slice(0, 8).join(', ');
        }
        resolve(device);
      };

      const timer = setTimeout(() => void finish(undefined), DuploTrainService.SCAN_TIMEOUT_MS);

      BleClient.requestLEScan({ allowDuplicates: false }, (result: ScanResult) => {
        const mfg = result.manufacturerData ? Object.keys(result.manufacturerData) : [];
        const label = (result.localName || result.device.name || result.device.deviceId) +
          (mfg.length ? ` [mfg:${mfg.join('/')}]` : '');
        seen.set(result.device.deviceId, label);

        if (this.isTrainHub(result)) {
          void finish(result.device);
        }
      }).catch(() => void finish(undefined));
    });
  }

  private isTrainHub(result: ScanResult): boolean {
    const name = (result.localName || result.device.name || '').toLowerCase();
    if (name.includes('train') || name.includes('duplo') || name.includes('lego') || name.includes('hub')) {
      return true;
    }

    if (result.uuids?.some((uuid) => uuid.toLowerCase() === LWP3_SERVICE_UUID)) {
      return true;
    }

    const manufacturer = result.manufacturerData ?? {};
    return DuploTrainService.LEGO_MANUFACTURER_IDS.some((id) => id in manufacturer);
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
