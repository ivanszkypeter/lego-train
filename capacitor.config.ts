import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.ivanszkypeter.legotrain',
  appName: 'LEGO Train',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
