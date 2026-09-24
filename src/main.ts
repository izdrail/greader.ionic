import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { STORAGE_PROVIDER } from './app/core/storage/storage.providers';
import { AI_PROVIDERS } from './app/core/ai/ai.providers';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    STORAGE_PROVIDER,
    ...AI_PROVIDERS,
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
});
