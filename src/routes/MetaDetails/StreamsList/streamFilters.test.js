// Copyright (C) 2017-2026 Smart code 203358507

const { resolutionOf, siteOf, filterStreams } = require('./streamFilters');

// Real Torrentio rows for The Simpsons S19E10.
const r = (name, description) => ({ name, description });
const KONTRAST = r('Torrentio\n1080p', 'The.Simpsons.S19.1080p.WEBRip.x265-KONTRAST\nThe.Simpsons.S19E10.1080p.WEBRip.x265-KONTRAST.mp4\n👤 47 💾 406.8 MB ⚙️ TorrentGalaxy');
const PACK = r('Torrentio\n1080p', 'The Simpsons - Complete Seasons S01 to S28 (1080p 720p DVDRip)\n👤 37 💾 174.66 MB ⚙️ 1337x');
const WOLF = r('Torrentio\nDVDRip', 'Los Simpson T19\n👤 3 ⚙️ Wolfmax4k');
const TPB720 = r('Torrentio\n720p', 'The.Simpsons.S19E10.720p.HDTV\n👤 9 ⚙️ ThePirateBay');
const TPB4K = r('Torrentio\n4k HDR', 'The.Simpsons.S19E10.2160p\n👤 2 ⚙️ ThePirateBay');
const BARE = { name: undefined, description: undefined };
const OTHER_ADDON = r('StremioX', 'The Simpsons S19E10 2160p WEB-DL');
const none = { resolutions: [], sites: [] };

test('resolution comes from the name line first', () => {
    expect(resolutionOf(KONTRAST)).toBe('1080p');
    expect(resolutionOf(PACK)).toBe('1080p');
    expect(resolutionOf(TPB4K)).toBe('4k');
});

test('falls back to the description, and a site name is never a resolution', () => {
    expect(resolutionOf(OTHER_ADDON)).toBe('4k');
    expect(resolutionOf(WOLF)).toBe('other');
    expect(resolutionOf(BARE)).toBe('other');
});

test('site is the text after the gear', () => {
    expect(siteOf(KONTRAST)).toBe('TorrentGalaxy');
    expect(siteOf(OTHER_ADDON)).toBeNull();
    expect(siteOf(BARE)).toBeNull();
});

test('no saved choice shows everything with counts', () => {
    const out = filterStreams([KONTRAST, PACK, TPB720, TPB4K], none);
    expect(out.visible).toHaveLength(4);
    expect(out.resolutions.shown).toBe(true);
    expect(out.resolutions.options.map((o) => [o.value, o.count])).toEqual([['4k', 1], ['1080p', 2], ['720p', 1]]);
    expect(out.sites.options.map((o) => o.value)).toEqual(['ThePirateBay', '1337x', 'TorrentGalaxy']);
});

test('resolution and site picks combine', () => {
    const out = filterStreams([KONTRAST, PACK, TPB720, TPB4K], { resolutions: ['720p', '4k'], sites: ['ThePirateBay'] });
    expect(out.visible).toEqual([TPB720, TPB4K]);
});

test('a saved pick missing here shows the full list and is marked unavailable', () => {
    const out = filterStreams([TPB720, WOLF], { resolutions: ['1080p'], sites: [] });
    expect(out.visible).toEqual([TPB720, WOLF]);
    expect(out.resolutions.options.find((o) => o.value === '1080p')).toEqual({ value: '1080p', count: 0, ticked: true, unavailable: true });
});

test('part of a saved pick applies', () => {
    expect(filterStreams([KONTRAST, TPB720, WOLF], { resolutions: ['720p', '480p'], sites: [] }).visible).toEqual([TPB720]);
});

test('when both together match nothing the site gives way first', () => {
    const out = filterStreams([KONTRAST, TPB720, TPB4K], { resolutions: ['1080p'], sites: ['ThePirateBay'] });
    expect(out.visible).toEqual([KONTRAST]);
    expect(out.sites.options.find((o) => o.value === 'ThePirateBay').unavailable).toBe(true);
    expect(out.resolutions.options.find((o) => o.value === '1080p').unavailable).toBe(false);
});

test('a filter whose control is hidden is not applied', () => {
    // One site only: no dropdown, so the saved site must not hide the StremioX row.
    const out = filterStreams([TPB720, TPB4K, OTHER_ADDON], { resolutions: [], sites: ['ThePirateBay'] });
    expect(out.sites.shown).toBe(false);
    expect(out.visible).toHaveLength(3);
});

test('chips are hidden with a single resolution group', () => {
    expect(filterStreams([KONTRAST, PACK], none).resolutions.shown).toBe(false);
});
