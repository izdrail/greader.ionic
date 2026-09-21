import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular';
import { StoragePort } from '../../core/storage/storage.port';
import { LocalProvider } from '../../core/providers/local.provider';
import { ProviderKind } from '../../core/domain/models';

@Component({ selector: 'app-accounts', templateUrl: 'accounts.page.html', styleUrls: ['accounts.page.scss'], imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonNote, IonList, IonItem, IonInput] })
export class AccountsPage {
  selected = signal<ProviderKind | undefined>(undefined); busy = signal(false); error = signal(''); username = ''; password = '';
  providers = [
    { id: 'local' as const, name: 'RSS Reader (Local)', logo: 'logo_rss_reader_large.png', text: 'No account required. Feeds and articles stay on this device.' },
  ];
  constructor(private storage: StoragePort, private local: LocalProvider, private router: Router) {}
  async connect(kind: ProviderKind) {
    this.error.set(''); this.busy.set(true);
    try {
      if (kind === 'local') { const account = await this.local.connect(); await this.storage.putAccount(account); await this.router.navigateByUrl('/subscribe'); return; }
      this.selected.set(kind);
      this.error.set(kind === 'feedly' ? 'Feedly OAuth needs a new application client before live sign-in can be enabled.' : 'The current provider authentication contract is being verified. Credentials are not stored or sent yet.');
    } finally { this.busy.set(false); }
  }
}
