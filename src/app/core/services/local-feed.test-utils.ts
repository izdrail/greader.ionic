export const parserStub = (failOn: RegExp) => ({
  parse: (xml: string) => {
    if (failOn.test(xml)) throw new Error('This URL returned a web page');
    return { title: 'Example Blog', link: 'https://example.com', items: [{ uid: 'post-1', title: 'First post', link: 'https://example.com/1', publishedAt: 1 }] };
  },
}) as any;
