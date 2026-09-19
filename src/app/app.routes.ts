import { Routes } from '@angular/router'; export const routes:Routes=[
{path:'accounts',loadComponent:()=>import('./features/accounts/accounts.page').then(m=>m.AccountsPage)},
{path:'subscribe',loadComponent:()=>import('./features/subscribe/subscribe.page').then(m=>m.SubscribePage)},
{path:'subscriptions',loadComponent:()=>import('./features/subscriptions/subscriptions.page').then(m=>m.SubscriptionsPage)},
{path:'feeds',loadComponent:()=>import('./features/shell/shell.page').then(m=>m.ShellPage)},
{path:'article/:id',loadComponent:()=>import('./features/article/article.page').then(m=>m.ArticlePage)},
{path:'settings',loadComponent:()=>import('./features/settings/settings.page').then(m=>m.SettingsPage)},
{path:'',redirectTo:'accounts',pathMatch:'full'},{path:'**',redirectTo:'accounts'}];
