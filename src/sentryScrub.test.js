// Copyright (C) 2017-2026 Smart code 203358507

const { scrubText, scrubDeep } = require('./sentryScrub');

const HASH = '0123456789abcdef0123456789abcdef01234567';

describe('scrubText', () => {
    it('drops the path of a remote url, where addon and debrid keys live', () => {
        expect(scrubText('GET https://torrentio.example/realdebrid=KEY/stream/series/tt1.json (500)'))
            .toBe('GET https://torrentio.example/[redacted] (500)');
    });

    it('keeps loopback paths but hides the infoHash', () => {
        expect(scrubText(`http://127.0.0.1:11470/${HASH}/3/stats.json`)).toBe('http://127.0.0.1:11470/[infohash]/3/stats.json');
    });

    it('drops the player route hash and any query string', () => {
        expect(scrubText('http://127.0.0.1:4747/#/player/eAEBOgDF%2F3sidXJs')).toBe('http://127.0.0.1:4747/?[redacted]');
        expect(scrubText('http://127.0.0.1:11470/hlsv2/x.m3u8?mediaURL=https%3A%2F%2Fd.example')).toBe('http://127.0.0.1:11470/hlsv2/x.m3u8?[redacted]');
    });
});

describe('scrubDeep', () => {
    it('scrubs every string of an event, at any depth', () => {
        const event = {
            request: { url: 'http://127.0.0.1:4747/#/player/abc' },
            breadcrumbs: [{ category: 'fetch', data: { url: `http://127.0.0.1:11470/${HASH}/0` } }],
            exception: { values: [{ value: 'Failed to fetch https://d.example/d/TOKEN/f.mkv' }] },
        };
        event.self = event;

        const out = scrubDeep(event);

        expect(out.request.url).toBe('http://127.0.0.1:4747/?[redacted]');
        expect(out.breadcrumbs[0].data.url).toBe('http://127.0.0.1:11470/[infohash]/0');
        expect(out.exception.values[0].value).toBe('Failed to fetch https://d.example/[redacted]');
        expect(out.self).toBe(out);
    });
});
