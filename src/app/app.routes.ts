import { Routes } from '@angular/router'; export const routes:Routes=[
{path:'',loadComponent:()=>import('./features/welcome/home-redirect.page').then(m=>m.HomeRedirectPage)},
{path:'welcome',loadComponent:()=>import('./features/welcome/welcome.page').then(m=>m.WelcomePage)},
{path:'accounts',loadComponent:()=>import('./features/accounts/accounts.page').then(m=>m.AccountsPage)},
{path:'subscribe',loadComponent:()=>import('./features/subscribe/subscribe.page').then(m=>m.SubscribePage)},
{path:'subscriptions',loadComponent:()=>import('./features/subscriptions/subscriptions.page').then(m=>m.SubscriptionsPage)},
{path:'downloads',loadComponent:()=>import('./features/downloads/downloads.page').then(m=>m.DownloadsPage)},
{path:'tts',loadComponent:()=>import('./features/tts/tts.page').then(m=>m.TtsPage)},
{path:'premium',loadComponent:()=>import('./features/premium/premium.page').then(m=>m.PremiumPage)},
{path:'feeds',loadComponent:()=>import('./features/shell/shell.page').then(m=>m.ShellPage)},
{path:'article/:id',loadComponent:()=>import('./features/article/article.page').then(m=>m.ArticlePage)},
{path:'settings',loadComponent:()=>import('./features/settings/settings.page').then(m=>m.SettingsPage)},
{path:'**',redirectTo:''}];
