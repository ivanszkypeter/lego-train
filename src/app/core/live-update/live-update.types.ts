export type LiveUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'ready-to-reload'
  | 'reloading'
  | 'error';

export interface LiveUpdateManifest {
  version: string;
  channel: string;
  url: string;
  notes?: string;
  mandatory?: boolean;
  sha256?: string;
}

export interface LiveUpdateState {
  status: LiveUpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  message: string;
  error?: string;
}

export interface NativeUpdaterAdapter {
  notifyAppReady(): Promise<void>;
  getCurrentVersion(): Promise<string | undefined>;
  download(manifest: LiveUpdateManifest): Promise<string>;
  set(bundleId: string): Promise<void>;
  reload(): Promise<void>;
}
