import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.greaderapp.com',
  appName: 'gReader News',
  webDir: 'www',
  plugins: { CapacitorHttp: { enabled: true } }
};

export default config;
