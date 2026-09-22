import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import { StoragePort } from '../../core/storage/storage.port';

/**
 * Entry route: decides between the reading experience and the welcome screen
 * from the actual persisted state, on every cold start.
 *
 *   has articles            -> /feeds (straight into reading)
 *   no articles, has feeds  -> /feeds (normal empty state)
 *   no feeds at all         -> /welcome
 *
 * The redirect replaces history so Back never lands here again, and the
 * welcome screen never reappears once the user has content.
 */
@Component({
  selector: 'app-home-redirect',
  template: '<ion-content><div class="gate"><ion-spinner name="crescent"></ion-spinner></div></ion-content>',
  styles: ['.gate{display:flex;align-items:center;justify-content:center;height:100%}'],
  imports: [IonContent, IonSpinner],
})
export class HomeRedirectPage implements OnInit {
  private db = inject(StoragePort);
  private router = inject(Router);

  async ngOnInit() {
    let target = '/welcome';
    try {
      const account = (await this.db.listAccounts())[0];
      if (account) {
        const [subscriptions, articles] = await Promise.all([
          this.db.listSubscriptions(account.id),
          this.db.listArticles(account.id, { limit: 1 }),
        ]);
        if (articles.length || subscriptions.length) target = '/feeds';
      }
    } catch { /* storage unreadable this launch: fall back to the welcome screen */ }
    await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
