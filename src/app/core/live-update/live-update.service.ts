import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CapgoUpdaterAdapter } from './capgo-updater.adapter';
import { LiveUpdateState } from './live-update.types';

@Injectable({ providedIn: 'root' })
export class LiveUpdateService {
  private readonly updater = inject(CapgoUpdaterAdapter);

  private readonly stateSignal = signal<LiveUpdateState>({
    status: 'idle',
    currentVersion: 'bundled',
    message: 'Frissítésre kész'
  });

  readonly state = this.stateSignal.asReadonly();

  async initialize(): Promise<void> {
    if (!environment.liveUpdate.enabled) {
      this.patch({ status: 'idle', message: 'Live update kikapcsolva' });
      return;
    }

    this.patch({ status: 'checking', message: 'Frissítések ellenőrzése...' });

    try {
      await this.updater.notifyAppReady();
      const currentVersion = await this.updater.getCurrentVersion();

      this.patch({
        status: 'up-to-date',
        currentVersion: currentVersion ?? 'bundled',
        message: 'Az app automatikusan a legújabb webes csomagra frissül.'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.patch({
        status: 'error',
        message: 'A frissítéskezelő nem elérhető ezen a platformon.',
        error: errorMessage
      });
    }
  }

  private patch(patch: Partial<LiveUpdateState>): void {
    this.stateSignal.update((current) => ({ ...current, ...patch }));
  }
}
