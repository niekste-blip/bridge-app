import { describe, expect, it } from 'vitest';
import { serviceWorkerSource, versionOf } from './serviceWorker';

describe('versionOf', () => {
  it('is the same for the same files in any order', () => {
    expect(versionOf(['a.js', 'b.css'])).toBe(versionOf(['b.css', 'a.js']));
  });

  it('changes when a file name changes', () => {
    expect(versionOf(['assets/index-abc.js'])).not.toBe(versionOf(['assets/index-abd.js']));
  });
});

describe('serviceWorkerSource', () => {
  const source = serviceWorkerSource('v1', ['index.html', 'assets/index-abc.js']);

  it('names the store after the version', () => {
    expect(source).toContain('const CACHE = "bridge-v1";');
  });

  it('lists the start page and every file', () => {
    expect(source).toContain('"./"');
    expect(source).toContain('"index.html"');
    expect(source).toContain('"assets/index-abc.js"');
  });

  it('does not take over pages that are already open', () => {
    expect(source).not.toContain('skipWaiting');
    expect(source).not.toContain('clients.claim');
    expect(source).toContain("cache: 'reload'");
  });

  it('is valid JavaScript that registers the three handlers', () => {
    const events: string[] = [];
    const self = { addEventListener: (name: string) => events.push(name) };
    new Function('self', source)(self);
    expect(events).toEqual(['install', 'activate', 'fetch']);
  });
});
