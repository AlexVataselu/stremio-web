// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const createTorrent = require('@stremio/stremio-video/src/withStreamingServer/createTorrent');

// The encoded stream is the first part of a player deep link.
const encodedStream = (deepLink) => {
    const match = typeof deepLink === 'string' ? deepLink.match(/\/player\/([^/]+)/) : null;
    return match ? decodeURIComponent(match[1]) : null;
};

// Has the detection engine find the next episode's intro while this one plays.
// A torrent delivers an opening about as fast as it plays, so an analysis that
// starts with the episode answers after a short opening is over.
// `playing` names the episode on screen and `started` says it is under way.
// After an episode switch the player still reports the previous episode's
// time and next episode for a moment, so `started` only counts once it has
// been seen false for the episode now playing.
const usePrefetchNextIntro = ({ seriesId, playing, nextVideo, streamingServerUrl, decodeStream, started }) => {
    const season = nextVideo?.season ?? null;
    const episode = nextVideo?.episode ?? null;
    // Only a next episode whose stream is already picked (the one binge watching plays).
    const encoded = encodedStream(nextVideo?.deepLinks?.player);
    const asked = React.useRef(null);
    const armedFor = React.useRef(null);
    if (!started) armedFor.current = playing;
    // A "next" episode that is the one on screen is the previous episode's, not yet replaced.
    const underWay = started && playing !== null && armedFor.current === playing && playing !== `${season}:${episode}`;
    // A new function on every render must not ask again.
    const decodeStreamRef = React.useRef(decodeStream);
    decodeStreamRef.current = decodeStream;

    React.useEffect(() => {
        if (!underWay || !seriesId || typeof season !== 'number' || typeof episode !== 'number' || encoded === null) return;
        const key = JSON.stringify([seriesId, season, episode, encoded]);
        if (asked.current === key) return;
        asked.current = key;

        Promise.resolve(decodeStreamRef.current(encoded))
            .then((stream) => {
                if (typeof stream?.url === 'string') return stream.url;
                if (typeof stream?.infoHash !== 'string' || !streamingServerUrl) return null;
                // The streaming server picks the file by season and episode, as it
                // does when the episode plays: a file index carried over from the
                // episode on screen would name the wrong file of a season pack.
                return createTorrent(streamingServerUrl, stream.infoHash, null, stream.announce ?? null, { season, episode })
                    .then((torrent) => torrent.url);
            })
            .then((streamUrl) => {
                if (!streamUrl) return;
                return fetch('/prefetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seriesId, season, episode, streamUrl }),
                });
            })
            .catch(() => null); // no engine or no stream -> the intro is found when the episode plays
    }, [underWay, seriesId, season, episode, encoded, streamingServerUrl]);
};

module.exports = usePrefetchNextIntro;
