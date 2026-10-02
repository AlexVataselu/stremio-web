/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import { renderHook, waitFor } from '@testing-library/react';

const useSkipRecapSegment = require('./useSkipRecapSegment');

const VIDEOS = [1, 2, 3].map((e) => ({ id: `tt1:1:${e}`, season: 1, episode: e }));
const EPISODE = { seriesId: 'tt1', season: 1, episode: 3, streamUrl: 'http://127.0.0.1:11470/abc/0', videos: VIDEOS };
const PARAMS = { hash: null, size: null, filename: 'Show.S01E03-FLUX.mkv' };
const answer = (recap) => Promise.resolve({ json: () => Promise.resolve({ recap }) });

describe('useSkipRecapSegment', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => answer({ start: 7, end: 27.5 }));
    });

    test('waits for the video params before asking', () => {
        renderHook(() => useSkipRecapSegment({ ...EPISODE, videoParams: null }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('asks once with the file name and the episodes before this one', async () => {
        const { result } = renderHook(() => useSkipRecapSegment({ ...EPISODE, videoParams: PARAMS }));
        await waitFor(() => expect(result.current).toEqual({ start: 7, end: 27.5 }));
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toBe('/recap');
        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
            seriesId: 'tt1', season: 1, episode: 3, streamUrl: EPISODE.streamUrl,
            filename: 'Show.S01E03-FLUX.mkv',
            previousEpisodes: [{ season: 1, episode: 2 }, { season: 1, episode: 1 }],
        });
    });

    test('sends a null file name when the player could not tell it', async () => {
        renderHook(() => useSkipRecapSegment({ ...EPISODE, videoParams: { hash: null, size: null, filename: null } }));
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(JSON.parse(global.fetch.mock.calls[0][1].body).filename).toBeNull();
    });

    test('sends nothing for the first episode', () => {
        renderHook(() => useSkipRecapSegment({ ...EPISODE, episode: 1, videoParams: PARAMS }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('forgets the answer when the episode changes', async () => {
        const { result, rerender } = renderHook((props) => useSkipRecapSegment(props), {
            initialProps: { ...EPISODE, videoParams: PARAMS },
        });
        await waitFor(() => expect(result.current).toEqual({ start: 7, end: 27.5 }));
        global.fetch = jest.fn(() => new Promise(() => {}));
        rerender({ ...EPISODE, episode: 2, streamUrl: 'http://127.0.0.1:11470/abc/1', videoParams: PARAMS });
        expect(result.current).toBeNull();
    });

    test('after an episode switch, waits for the new file params instead of sending the old file name', async () => {
        const EPISODE_2 = { ...EPISODE, episode: 2, streamUrl: 'http://127.0.0.1:11470/abc/1' };
        const PARAMS_2 = { hash: null, size: null, filename: 'Show.S01E02-FLUX.mkv' };
        const { result, rerender } = renderHook((props) => useSkipRecapSegment(props), {
            initialProps: { ...EPISODE_2, videoParams: PARAMS_2 },
        });
        await waitFor(() => expect(result.current).toEqual({ start: 7, end: 27.5 }));
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // The player still holds episode 2's params when episode 3 starts.
        rerender({ ...EPISODE, videoParams: PARAMS_2 });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result.current).toBeNull();

        rerender({ ...EPISODE, videoParams: { ...PARAMS } });
        await waitFor(() => expect(result.current).toEqual({ start: 7, end: 27.5 }));
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({
            episode: 3, streamUrl: EPISODE.streamUrl, filename: 'Show.S01E03-FLUX.mkv',
        }));
    });

    test('no button when the engine cannot be reached', async () => {
        const EPISODE_2 = { ...EPISODE, episode: 2, streamUrl: 'http://127.0.0.1:11470/abc/1' };
        const { result, rerender } = renderHook((props) => useSkipRecapSegment(props), {
            initialProps: { ...EPISODE_2, videoParams: { ...PARAMS, filename: 'Show.S01E02-FLUX.mkv' } },
        });
        await waitFor(() => expect(result.current).toEqual({ start: 7, end: 27.5 }));

        let failed;
        global.fetch = jest.fn(() => {
            failed = Promise.reject(new Error('offline'));
            return failed;
        });
        rerender({ ...EPISODE, videoParams: { ...PARAMS } });
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        await failed.catch(() => {});
        await Promise.resolve();
        expect(result.current).toBeNull();
    });
});
