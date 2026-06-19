import { Injectable } from '@angular/core';
import { LiveUpdateManifest, NativeUpdaterAdapter } from './live-update.types';

type CapgoUpdaterLike = {
  notifyAppReady?: () => Promise<void>;
  current?: () => Promise<Record<string, unknown>>;
  download?: (options: { url: string; version: string }) => Promise<Record<string, unknown>>;
  set?: (options: { id: string }) => Promise<void>;
  reload?: () => Promise<void>;
};

@Injectable({ providedIn: 'root' })
export class CapgoUpdaterAdapter implements NativeUpdaterAdapter {
  private pluginPromise?: Promise<CapgoUpdaterLike>;

  async notifyAppReady(): Promise<void> {
    const updater = await this.loadPlugin();
    await updater.notifyAppReady?.();
  }

  async getCurrentVersion(): Promise<string | undefined> {
    const updater = await this.loadPlugin();
    const current = await updater.current?.();
    return asString(current?.['version']) ?? asString(current?.['id']) ?? asString(current?.['bundle']);
  }

  async download(manifest: LiveUpdateManifest): Promise<string> {
    const updater = await this.loadPlugin();
    const result = await updater.download?.({ url: manifest.url, version: manifest.version });
    const bundleId =
      asString(result?.['id']) ??
      asString(result?.['bundle']) ??
      asString(result?.['bundleId']) ??
      asString((result?.['bundle'] as Record<string, unknown> | undefined)?.['id']);

    if (!bundleId) {
      throw new Error('A live update csomag letöltődött, de nem kaptunk bundle azonosítót.');
    }

    return bundleId;
  }

  async set(bundleId: string): Promise<void> {
    const updater = await this.loadPlugin();
    await updater.set?.({ id: bundleId });
  }

  async reload(): Promise<void> {
    const updater = await this.loadPlugin();

    if (updater.reload) {
      await updater.reload();
      return;
    }

    window.location.reload();
  }

  private loadPlugin(): Promise<CapgoUpdaterLike> {
    this.pluginPromise ??= import('@capgo/capacitor-updater').then((module) => {
      const updater = module.CapacitorUpdater as CapgoUpdaterLike | undefined;
      if (!updater) {
        throw new Error('A CapacitorUpdater plugin nem elérhető ezen a platformon.');
      }
      return updater;
    });

    return this.pluginPromise;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
