import { DirectoryService } from './directory.service';
describe('DirectoryService',()=>{it('restores feed links from APK feed/ identifiers',()=>{const service=new DirectoryService() as any;expect(service.feedUrl('feed/https://example.com/rss')).toBe('https://example.com/rss');expect(service.feedUrl('https://example.com/rss')).toBe('https://example.com/rss');});});
