// Copyright (C) 2017-2026 Smart code 203358507

const MAX_PREVIOUS = 3;

// The episodes a recap may quote, nearest first: up to three before this one
// in the season, or the previous season's finale for a season premiere.
const previousEpisodes = (videos, season, episode) => {
    const seen = new Set();
    const list = (videos || [])
        .filter((video) => Number.isInteger(video.season) && video.season >= 1 && Number.isInteger(video.episode))
        .filter((video) => {
            const key = `${video.season}:${video.episode}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map((video) => ({ season: video.season, episode: video.episode }))
        .sort((a, b) => a.season - b.season || a.episode - b.episode);
    const at = list.findIndex((video) => video.season === season && video.episode === episode);
    if (at <= 0) return [];
    const earlier = list.slice(0, at).reverse();
    const sameSeason = earlier.filter((video) => video.season === season).slice(0, MAX_PREVIOUS);
    if (sameSeason.length) return sameSeason;
    const finale = earlier.find((video) => video.season < season);
    return finale ? [finale] : [];
};

// The recap as a skippable segment, ending where the next intro starts so the
// two buttons never show at once.
const recapSegments = (recap, introSegments) => {
    if (!recap) return [];
    const nextIntro = (introSegments || [])
        .filter((segment) => segment.start >= recap.start)
        .sort((a, b) => a.start - b.start)[0];
    const end = nextIntro ? Math.min(recap.end, nextIntro.start) : recap.end;
    return end > recap.start ? [{ start: recap.start, end }] : [];
};

module.exports = { previousEpisodes, recapSegments };
