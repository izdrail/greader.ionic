import { TestBed } from '@angular/core/testing';
import { AdsService, ADMOB_BANNER_UNIT_ANDROID, ADMOB_BANNER_UNIT_IOS } from './ads.service';

describe('AdsService', () => {
  let service: AdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdsService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('no-ops in the browser (non-native platform)', async () => {
    await expect(service.showBanner()).resolves.toBeUndefined();
    await expect(service.hideBanner()).resolves.toBeUndefined();
  });

  it('ships Google test ad units until real AdMob IDs are configured', () => {
    expect(ADMOB_BANNER_UNIT_ANDROID).toMatch(/^ca-app-pub-3940256099942544\//);
    expect(ADMOB_BANNER_UNIT_IOS).toMatch(/^ca-app-pub-3940256099942544\//);
  });
});
