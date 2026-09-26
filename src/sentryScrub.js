// Copyright (C) 2017-2026 Smart code 203358507

// Keeps secrets out of Sentry events: addon urls carry debrid keys in their
// path (…/realdebrid=KEY/stream/…), stream urls carry debrid tokens or
// credentials (user:pass@host), the player route's hash holds the stream, and
// an infoHash or Stremio id (tt0068098, kitsu:1376) names what is watched.
// Mirrors detection-engine/src/scrub.js.
const URL_PATTERN = /\b(https?):\/\/([^\s/?#"'<>@]*@)?([^\s/?#"'<>@]+)([^\s?#"'<>]*)([?#][^\s"'<>]*)?/gi;
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
const INFO_HASH_PATTERN = /\b[0-9a-f]{40}\b/gi;
const SERIES_ID_PATTERN = /\b(tt\d{5,}|(kitsu|tmdb|tvdb|mal|anilist|anidb|imdb):\d+)\b/gi;

const scrubUrl = (_, scheme, userinfo, host, pathPart, query) => {
    const kept = LOOPBACK_HOST.test(host) ? pathPart : (pathPart ? '/[redacted]' : '');
    return `${scheme}://${userinfo ? '[redacted]@' : ''}${host}${kept}${query ? '?[redacted]' : ''}`;
};

const scrubText = (text) => text
    .replace(URL_PATTERN, scrubUrl)
    .replace(INFO_HASH_PATTERN, '[infohash]')
    .replace(SERIES_ID_PATTERN, '[series]');

const scrubDeep = (value, seen = new WeakSet()) => {
    if (typeof value === 'string') return scrubText(value);
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = scrubDeep(value[i], seen);
        return value;
    }
    for (const key of Object.keys(value)) value[key] = scrubDeep(value[key], seen);
    return value;
};

module.exports = { scrubText, scrubDeep };
