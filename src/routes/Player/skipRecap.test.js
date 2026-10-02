// Copyright (C) 2017-2026 Smart code 203358507

const { previousEpisodes, recapSegments } = require('./skipRecap');

const video = (season, episode) => ({ id: `tt1:${season}:${episode}`, season, episode });

describe('previousEpisodes', () => {
  test('up to three episodes before this one, nearest first', () => {
    const videos = [1, 2, 3, 4, 5].map((e) => video(1, e));
    expect(previousEpisodes(videos, 1, 5)).toEqual([{ season: 1, episode: 4 }, { season: 1, episode: 3 }, { season: 1, episode: 2 }]);
    expect(previousEpisodes(videos, 1, 2)).toEqual([{ season: 1, episode: 1 }]);
  });

  test('a season premiere gets the previous season\'s finale', () => {
    const videos = [video(1, 1), video(1, 2), video(1, 10), video(2, 1)];
    expect(previousEpisodes(videos, 2, 1)).toEqual([{ season: 1, episode: 10 }]);
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
