import { extractMedia, parseYouTubeId, youtubeEmbedUrl, youtubeThumbnail } from './media';

describe('parseYouTubeId', () => {
  it('parses every common YouTube URL shape', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
  });

  it('rejects non-YouTube and malformed URLs', () => {
    expect(parseYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeId('not a url')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch')).toBeNull();
  });
});

describe('extractMedia', () => {
  it('finds YouTube iframes and links once each', () => {
    const items = extractMedia('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><a href="https://youtu.be/dQw4w9WgXcQ">same</a>');
    expect(items).toEqual([{ type: 'youtube', videoId: 'dQw4w9WgXcQ', embedUrl: youtubeEmbedUrl('dQw4w9WgXcQ'), originalUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }]);
  });

  it('finds GIF images and video elements, resolving relative URLs', () => {
    const items = extractMedia('<img src="/media/cat.gif"><video><source src="clip.mp4"></video>', 'https://blog.test/post');
    expect(items).toEqual([
      { type: 'gif', url: 'https://blog.test/media/cat.gif' },
      { type: 'video', url: 'https://blog.test/clip.mp4' },
    ]);
  });

  it('ignores ordinary images and links', () => {
    expect(extractMedia('<img src="photo.jpg"><a href="https://example.com">x</a>')).toEqual([]);
  });

  it('builds thumbnail URLs', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
