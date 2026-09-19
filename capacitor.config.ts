import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.izdrail.greader',
  appName: 'gReader',
  webDir: 'www',
  plugins: { CapacitorHttp: { enabled: true } }
};

export default config;
