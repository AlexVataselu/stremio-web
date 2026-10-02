// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const { previousEpisodes } = require('./skipRecap');

// Asks the detection engine where the episode's recap is (in seconds). The
// answer depends on the release, so it waits for the player's video params,
// which carry the file name.
const useSkipRecapSegment = ({ seriesId, season, episode, streamUrl, videoParams, videos }) => {
    const [recap, setRecap] = React.useState(null);
    const videosRef = React.useRef(videos);
    videosRef.current = videos;
    // When the episode changes, the player still holds the previous file's
    // params until it unloads: those must never be sent for the new episode.
    const episodeKey = `${seriesId}:${season}:${episode}:${streamUrl}`;
    const episodeKeyRef = React.useRef(null);
    const lastParamsRef = React.useRef(null);
    const staleParamsRef = React.useRef(null);
    if (episodeKeyRef.current !== episodeKey) {
        // The params held when the switch happened (none on the first episode).
        staleParamsRef.current = episodeKeyRef.current === null ? null : lastParamsRef.current;
        episodeKeyRef.current = episodeKey;
    }
    lastParamsRef.current = videoParams;
    const paramsReady = videoParams !== null && videoParams !== undefined && videoParams !== staleParamsRef.current;
    const filename = paramsReady && typeof videoParams.filename === 'string' ? videoParams.filename : null;
    const hasVideos = Array.isArray(videos) && videos.length > 0;
    React.useEffect(() => {
        setRecap(null); // reset when the episode changes
        if (!seriesId || !Number.isInteger(season) || !Number.isInteger(episode) || !streamUrl || !paramsReady || !hasVideos) return;
        const previous = previousEpisodes(videosRef.current, season, episode);
        if (!previous.length) return;

        let ignore = false;
        fetch('/recap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seriesId, season, episode, streamUrl, filename, previousEpisodes: previous }),
        })
            .then((res) => res.json())
            .then((data) => { if (!ignore) setRecap(data && data.recap ? data.recap : null); })
            .catch(() => { if (!ignore) setRecap(null); }); // engine unreachable -> no button
        return () => { ignore = true; };
    }, [seriesId, season, episode, streamUrl, paramsReady, filename, hasVideos]);
    return recap;
};

module.exports = useSkipRecapSegment;
