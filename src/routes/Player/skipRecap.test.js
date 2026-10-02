// Copyright (C) 2017-2026 Smart code 203358507

const { previousEpisodes, recapSegments } = require('./skipRecap');

const video = (season, episode) => ({ id: `tt1:${season}:${episode}`, season, episode });

describe('previousEpisodes', () => {
    test('the episodes before this one, nearest first', () => {
        const videos = [1, 2, 3, 4, 5].map((e) => video(1, e));
        expect(previousEpisodes(videos, 1, 5)).toEqual([4, 3, 2, 1].map((e) => ({ season: 1, episode: e })));
        expect(previousEpisodes(videos, 1, 2)).toEqual([{ season: 1, episode: 1 }]);
    });

    test('a season premiere gets the previous season, which a recap of it quotes', () => {
        const videos = [video(1, 1), video(1, 2), video(1, 10), video(2, 1), video(2, 2)];
        expect(previousEpisodes(videos, 2, 1)).toEqual([{ season: 1, episode: 10 }, { season: 1, episode: 2 }, { season: 1, episode: 1 }]);
        // Early in a season the previous one still counts (packs join S2E1 and S2E2 in one file).
        expect(previousEpisodes(videos, 2, 2)).toEqual([{ season: 2, episode: 1 }, { season: 1, episode: 10 }, { season: 1, episode: 2 }, { season: 1, episode: 1 }]);
    });

    test('at most the 12 episodes before this one', () => {
        const videos = Array.from({ length: 22 }, (_, i) => video(1, i + 1));
        const previous = previousEpisodes(videos, 1, 22);
        expect(previous).toHaveLength(12);
        expect(previous[0]).toEqual({ season: 1, episode: 21 });
        expect(previous[11]).toEqual({ season: 1, episode: 10 });
    });

    test('skips specials, entries without numbers and duplicates; unsorted input is fine', () => {
        const videos = [video(1, 3), video(0, 1), { id: 'x' }, video(1, 2), video(1, 2), video(1, 1)];
        expect(previousEpisodes(videos, 1, 3)).toEqual([{ season: 1, episode: 2 }, { season: 1, episode: 1 }]);
    });

    test('nothing for the first episode or an episode not in the list', () => {
        expect(previousEpisodes([video(1, 1)], 1, 1)).toEqual([]);
        expect(previousEpisodes([video(1, 1)], 1, 9)).toEqual([]);
        expect(previousEpisodes(null, 1, 2)).toEqual([]);
    });
});

describe('recapSegments', () => {
    test('ends the recap where the next intro starts', () => {
        expect(recapSegments({ start: 7, end: 60 }, [{ start: 0, end: 5 }, { start: 50, end: 110 }])).toEqual([{ start: 7, end: 50 }]);
    });

    test('leaves the recap alone when no intro follows inside it', () => {
        expect(recapSegments({ start: 7, end: 60 }, [{ start: 0, end: 5 }, { start: 250, end: 310 }])).toEqual([{ start: 7, end: 60 }]);
        expect(recapSegments({ start: 7, end: 60 }, [])).toEqual([{ start: 7, end: 60 }]);
    });

    test('no recap, no segment', () => {
        expect(recapSegments(null, [{ start: 0, end: 5 }])).toEqual([]);
        expect(recapSegments({ start: 7, end: 60 }, [{ start: 7, end: 70 }])).toEqual([]);
    });
});
