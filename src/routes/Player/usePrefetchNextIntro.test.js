/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@stremio/stremio-video/src/withStreamingServer/createTorrent', () => jest.fn());
const createTorrent = require('@stremio/stremio-video/src/withStreamingServer/createTorrent');
const usePrefetchNextIntro = require('./usePrefetchNextIntro');

const SERVER = 'http://127.0.0.1:4747/';
const NEXT = { season: 18, episode: 8, deepLinks: { player: 'stremio:///player/eAEBencoded%2Fstream/a/b/series/tt1/tt1%3A18%3A8' } };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('usePrefetchNextIntro', () => {
    let decodeStream;
    const props = (overrides) => ({
        seriesId: 'tt1', playing: '18:7', nextVideo: NEXT, streamingServerUrl: SERVER, decodeStream, started: true, ...overrides,
    });
    // An episode from its first moment until it is under way.
    const play = (overrides) => {
        const hook = renderHook((p) => usePrefetchNextIntro(p), { initialProps: props({ ...overrides, started: false }) });
        hook.rerender(props(overrides));
        return hook;
    };
    const sent = () => global.fetch.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)]);

    beforeEach(() => {
        global.fetch = jest.fn(() => Promise.resolve({}));
        createTorrent.mockReset();
        decodeStream = jest.fn(() => Promise.resolve({ infoHash: 'a51229', fileIdx: 7, announce: ['tracker:x'] }));
    });

    test('has the engine analyse the next episode of a torrent once this one is under way', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/8?tr=x` });
        play();

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        expect(decodeStream).toHaveBeenCalledWith('eAEBencoded/stream');
        // Never the file index the stream carries: the server picks the file by season and episode.
        expect(createTorrent).toHaveBeenCalledWith(SERVER, 'a51229', null, ['tracker:x'], { season: 18, episode: 8 });
        expect(sent()).toEqual([['/prefetch', { seriesId: 'tt1', season: 18, episode: 8, streamUrl: `${SERVER}a51229/8?tr=x` }]]);
    });

    test('sends a direct stream url as it is', async () => {
        decodeStream.mockResolvedValue({ url: 'https://debrid.example/s18e08.mkv' });
        play();

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        expect(sent()[0][1].streamUrl).toBe('https://debrid.example/s18e08.mkv');
        expect(createTorrent).not.toHaveBeenCalled();
    });

    test('waits until playback is under way', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/8` });
        const { rerender } = renderHook((p) => usePrefetchNextIntro(p), { initialProps: props({ started: false }) });
        await settle();
        expect(decodeStream).not.toHaveBeenCalled();

        rerender(props({ started: true }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });

    test('ignores what the player still holds of the previous episode right after a switch', async () => {
        // Episode 7 ended at 2:30 with episode 8 as its next. Episode 8 now loads:
        // for a moment the time is still 2:30 and "next" still carries the old stream.
        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/8` });
        const { rerender } = play();
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        const after = { season: 18, episode: 9, deepLinks: { player: 'stremio:///player/staleStreamOfEpisode8/a/b/series/tt1/tt1%3A18%3A9' } };

        rerender(props({ playing: '18:8', nextVideo: after, started: true }));
        await settle();
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // The new episode starts from 0:00 and gets under way with its own next episode.
        const settled = { ...after, deepLinks: { player: 'stremio:///player/streamOfEpisode9/a/b/series/tt1/tt1%3A18%3A9' } };
        rerender(props({ playing: '18:8', nextVideo: settled, started: false }));
        rerender(props({ playing: '18:8', nextVideo: settled, started: true }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
        expect(decodeStream).toHaveBeenLastCalledWith('streamOfEpisode9');
        expect(decodeStream).not.toHaveBeenCalledWith('staleStreamOfEpisode8');
    });

    test('asks once per next episode, however often the player renders', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/8` });
        const { rerender } = play();
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        rerender(props({ nextVideo: { ...NEXT } }));
        await settle();

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('does nothing when the next episode has no stream picked yet, or is not an episode', async () => {
        const noStream = { season: 18, episode: 8, deepLinks: { player: null, metaDetailsStreams: 'stremio:///detail/series/tt1/tt1%3A18%3A8' } };
        play({ nextVideo: noStream });
        play({ nextVideo: null });
        play({ nextVideo: { deepLinks: NEXT.deepLinks } });
        await settle();

        expect(decodeStream).not.toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('stays quiet when the stream cannot be resolved or the engine is not there', async () => {
        createTorrent.mockRejectedValue(new Error('500'));
        play();
        await waitFor(() => expect(createTorrent).toHaveBeenCalled());
        await settle();
        expect(global.fetch).not.toHaveBeenCalled();

        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/9` });
        global.fetch = jest.fn(() => Promise.reject(new Error('refused')));
        play({ nextVideo: { ...NEXT, episode: 9 } });
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await settle();
    });
});
