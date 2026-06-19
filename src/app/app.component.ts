import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonApp, IonButton, IonContent, IonRange, IonToggle } from '@ionic/angular/standalone';
import { DuploTrainService } from './core/train/duplo-train.service';
import { LightButton, SoundButton, TrainLightColor, TrainSound } from './core/train/train.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, IonApp, IonContent, IonButton, IonRange, IonToggle],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly train = inject(DuploTrainService);

  readonly sounds: SoundButton[] = [
    { id: 'horn', label: 'Duda', icon: '📣' },
    { id: 'depart', label: 'Indulás', icon: '▶️' },
    { id: 'brake', label: 'Fék', icon: '🛑' },
    { id: 'water', label: 'Víz', icon: '💧' },
    { id: 'steam', label: 'Gőz', icon: '💨' }
  ];

  readonly lights: LightButton[] = [
    { id: 'white', label: 'Fehér', cssClass: 'white' },
    { id: 'red', label: 'Piros', cssClass: 'red' },
    { id: 'yellow', label: 'Sárga', cssClass: 'yellow' },
    { id: 'green', label: 'Zöld', cssClass: 'green' },
    { id: 'blue', label: 'Kék', cssClass: 'blue' },
    { id: 'purple', label: 'Lila', cssClass: 'purple' }
  ];

  async connectOrDisconnect(): Promise<void> {
    const connection = this.train.state().connection;
    if (connection === 'connected' || connection === 'connecting') {
      await this.train.disconnect();
      return;
    }

    await this.train.connect();
  }

  async onSpeedChange(value: number): Promise<void> {
    await this.train.setSpeed(value);
  }

  async setPresetSpeed(value: number): Promise<void> {
    await this.train.setSpeed(value);
  }

  async stop(): Promise<void> {
    await this.train.stop();
  }

  async playSound(sound: TrainSound): Promise<void> {
    await this.train.playSound(sound);
  }

  async setLight(color: TrainLightColor): Promise<void> {
    await this.train.setLight(color);
  }

  connectionText(): string {
    return {
      disconnected: 'Nincs kapcsolat',
      connecting: 'Kapcsolódás...',
      connected: 'Kapcsolódva',
      error: 'Hiba'
    }[this.train.state().connection];
  }

  batteryText(): string {
    const batteryPercent = this.train.state().batteryPercent;
    return batteryPercent === undefined ? '--%' : `${batteryPercent}%`;
  }

  activeLightText(): string {
    return this.lights.find((light) => light.id === this.train.state().lightColor)?.label ?? 'Ismeretlen';
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  isConnected(): boolean {
    return this.train.state().connection === 'connected';
  }
}
