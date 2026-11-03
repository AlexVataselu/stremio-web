// Copyright (C) 2017-2026 Smart code 203358507

// Filters for the stream list: the resolution of each torrent and the torrent
// site it was found on, read from what the addon wrote in the row.

// Highest first; `other` collects rows without a recognised resolution.
const RESOLUTIONS = ['4k', '1440p', '1080p', '720p', '576p', '480p', '360p', 'other'];

const RESOLUTION_PATTERNS = [
    ['4k', /\b(2160p|4k|uhd)\b/i],
    ['1440p', /\b1440p\b/i],
    ['1080p', /\b1080p\b/i],
    ['720p', /\b720p\b/i],
    ['576p', /\b576p\b/i],
    ['480p', /\b480p\b/i],
    ['360p', /\b360p\b/i],
];

// Torrentio ends a row with "👤 47 💾 406.8 MB ⚙️ TorrentGalaxy".
const SITE_MARK = '⚙️';

const text = (value) => (typeof value === 'string' ? value : '');

// The site name is not part of the release: "Wolfmax4k" is no 4K torrent.
const withoutSite = (value) => {
    const at = value.indexOf(SITE_MARK);
    return at === -1 ? value : value.slice(0, at);
};

const resolutionIn = (value) => {
    const found = RESOLUTION_PATTERNS.find(([, pattern]) => pattern.test(value));
    return found ? found[0] : null;
};

// The addon's own label in `name` ("Torrentio\n1080p") decides; a pack title
// in the description can list several resolutions.
const resolutionOf = (stream) => {
    return resolutionIn(withoutSite(text(stream && stream.name)))
        || resolutionIn(withoutSite(text(stream && stream.description)))
        || 'other';
};

const siteOf = (stream) => {
    const description = text(stream && stream.description);
    const at = description.indexOf(SITE_MARK);
    if (at === -1) return null;
    const site = description.slice(at + SITE_MARK.length).split('\n')[0].trim();
    return site || null;
};

const countBy = (streams, keyOf) => {
    const counts = new Map();
    for (const stream of streams) {
        const key = keyOf(stream);
        if (key !== null) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
};

/**
 * The rows to show for the saved choice, and what each control offers.
 * A filter only acts while its control is shown (two or more values here),
 * a saved pick missing from this list is skipped (marked unavailable), and
 * when both filters together leave nothing the site pick gives way first,
 * then the resolution pick, so a list with rows never comes out empty.
 * Counts come from `streams` alone, the list as the addon dropdown left it.
 */
const filterStreams = (streams, saved) => {
    const resolutionCounts = countBy(streams, resolutionOf);
    const siteCounts = countBy(streams, siteOf);
    const resolutionsShown = resolutionCounts.size >= 2;
    const sitesShown = siteCounts.size >= 2;

    const pick = (values, counts, shown) => (shown ? values.filter((value) => counts.has(value)) : []);
    let resolutionPick = pick(saved.resolutions, resolutionCounts, resolutionsShown);
    let sitePick = pick(saved.sites, siteCounts, sitesShown);

    const apply = () => streams.filter((stream) =>
        (resolutionPick.length === 0 || resolutionPick.includes(resolutionOf(stream)))
        && (sitePick.length === 0 || sitePick.includes(siteOf(stream))));

    let visible = apply();
    if (visible.length === 0 && sitePick.length > 0) {
        sitePick = [];
        visible = apply();
    }
    if (visible.length === 0 && resolutionPick.length > 0) {
        resolutionPick = [];
        visible = apply();
    }

    const options = (order, counts, savedValues, applied) => order
        .concat(savedValues.filter((value) => !order.includes(value)))
        .map((value) => ({
            value,
            count: counts.get(value) || 0,
            ticked: savedValues.includes(value),
            unavailable: savedValues.includes(value) && !applied.includes(value),
        }));

    const resolutionOrder = RESOLUTIONS.filter((value) => resolutionCounts.has(value));
    const siteOrder = [...siteCounts.keys()].sort((a, b) => siteCounts.get(b) - siteCounts.get(a) || a.localeCompare(b));

    return {
        visible,
        resolutions: { shown: resolutionsShown, options: options(resolutionOrder, resolutionCounts, saved.resolutions, resolutionPick) },
        sites: { shown: sitesShown, options: options(siteOrder, siteCounts, saved.sites, sitePick) },
    };
};

module.exports = { RESOLUTIONS, resolutionOf, siteOf, filterStreams };
