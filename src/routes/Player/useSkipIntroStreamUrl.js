// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const createTorrent = require('@stremio/stremio-video/src/withStreamingServer/createTorrent');

// Resolves the URL the player actually streams, using the same createTorrent()
// the video layer uses, so torrents without a fileIdx (single-file releases,
// season packs) get the file the streaming server picks for this episode.
const useSkipIntroStreamUrl = (stream, streamingServerUrl, seriesInfo) => {
    const season = seriesInfo?.season ?? null;
    const episode = seriesInfo?.episode ?? null;
    const directUrl = typeof stream?.url === 'string' ? stream.url : null;
    const torrentKey = !directUrl && stream && typeof stream.infoHash === 'string' && streamingServerUrl ?
        JSON.stringify([streamingServerUrl, stream.infoHash, stream.fileIdx ?? null, stream.announce ?? null, season, episode])
        :
        null;
    // The resolved url is kept together with the inputs it was resolved for, so a
    // render after an episode switch can never hand out the previous episode's url.
    const [resolved, setResolved] = React.useState({ key: null, url: null });

    React.useEffect(() => {
        if (torrentKey === null) return;

        const [serverUrl, infoHash, fileIdx, announce, keySeason, keyEpisode] = JSON.parse(torrentKey);
        let ignore = false;
        createTorrent(serverUrl, infoHash, fileIdx, announce, { season: keySeason, episode: keyEpisode })
            .then((torrent) => { if (!ignore) setResolved({ key: torrentKey, url: torrent.url }); })
            .catch(() => { if (!ignore) setResolved({ key: torrentKey, url: null }); });
        return () => { ignore = true; };
    }, [torrentKey]);

    if (directUrl) return directUrl;
    return torrentKey !== null && resolved.key === torrentKey ? resolved.url : null;
};

module.exports = useSkipIntroStreamUrl;
