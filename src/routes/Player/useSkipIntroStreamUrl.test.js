/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@stremio/stremio-video/src/withStreamingServer/createTorrent', () => jest.fn());
const createTorrent = require('@stremio/stremio-video/src/withStreamingServer/createTorrent');
const useSkipIntroStreamUrl = require('./useSkipIntroStreamUrl');

const SERVER = 'http://127.0.0.1:4747/';

describe('useSkipIntroStreamUrl', () => {
    beforeEach(() => createTorrent.mockReset());

    test('uses a direct stream url as-is', () => {
        const { result } = renderHook(() => useSkipIntroStreamUrl({ url: 'https://debrid.example/ep.mkv' }, SERVER, { season: 1, episode: 2 }));
        expect(result.current).toBe('https://debrid.example/ep.mkv');
        expect(createTorrent).not.toHaveBeenCalled();
    });

    test('resolves a torrent without a file index the same way the player does', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}3110c9/-1` });
        const { result } = renderHook(() => useSkipIntroStreamUrl({ infoHash: '3110c9' }, SERVER, { season: 1, episode: 3 }));

        await waitFor(() => expect(result.current).toBe(`${SERVER}3110c9/-1`));
        expect(createTorrent).toHaveBeenCalledWith(SERVER, '3110c9', null, null, { season: 1, episode: 3 });
    });

    test('passes a known file index and trackers through', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}a51229/1?tr=x` });
        const stream = { infoHash: 'a51229', fileIdx: 1, announce: ['tracker:x'] };
        const { result } = renderHook(() => useSkipIntroStreamUrl(stream, SERVER, { season: 12, episode: 2 }));

        await waitFor(() => expect(result.current).toBe(`${SERVER}a51229/1?tr=x`));
        expect(createTorrent).toHaveBeenCalledWith(SERVER, 'a51229', 1, ['tracker:x'], { season: 12, episode: 2 });
    });

    test('stays null when the torrent cannot be resolved', async () => {
        createTorrent.mockRejectedValue(new Error('500'));
        const { result } = renderHook(() => useSkipIntroStreamUrl({ infoHash: 'dead' }, SERVER, null));
        await waitFor(() => expect(createTorrent).toHaveBeenCalled());
        expect(result.current).toBeNull();
    });

    test('stays null without a streaming server for a torrent', () => {
        const { result } = renderHook(() => useSkipIntroStreamUrl({ infoHash: 'abc' }, null, null));
        expect(result.current).toBeNull();
        expect(createTorrent).not.toHaveBeenCalled();
    });

    test('does not resolve again when the same stream arrives as a new object', async () => {
        createTorrent.mockResolvedValue({ url: `${SERVER}abc/-1` });
        const { result, rerender } = renderHook(({ stream }) => useSkipIntroStreamUrl(stream, SERVER, { season: 1, episode: 1 }), {
            initialProps: { stream: { infoHash: 'abc' } },
        });
        await waitFor(() => expect(result.current).toBe(`${SERVER}abc/-1`));

        rerender({ stream: { infoHash: 'abc' } });
        expect(createTorrent).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(`${SERVER}abc/-1`);
    });

    test('never pairs the new episode with the previous episode\'s url, in any render', async () => {
        let resolveSecond;
        createTorrent
            .mockResolvedValueOnce({ url: `${SERVER}ep1/-1` })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
        const rendered = [];
        const { rerender } = renderHook(({ stream, seriesInfo }) => {
            const url = useSkipIntroStreamUrl(stream, SERVER, seriesInfo);
            rendered.push([seriesInfo.episode, url]);
            return url;
        }, {
            initialProps: { stream: { infoHash: 'ep1' }, seriesInfo: { season: 28, episode: 1 } },
        });
        await waitFor(() => expect(rendered).toContainEqual([1, `${SERVER}ep1/-1`]));

        rerender({ stream: { infoHash: 'ep2' }, seriesInfo: { season: 28, episode: 2 } });
        resolveSecond({ url: `${SERVER}ep2/-1` });
        await waitFor(() => expect(rendered).toContainEqual([2, `${SERVER}ep2/-1`]));

        expect(rendered).not.toContainEqual([2, `${SERVER}ep1/-1`]);
    });

    test('a direct url switches in the same render as the episode', () => {
        const rendered = [];
        const { rerender } = renderHook(({ stream, seriesInfo }) => {
            rendered.push([seriesInfo.episode, useSkipIntroStreamUrl(stream, SERVER, seriesInfo)]);
        }, {
            initialProps: { stream: { url: 'https://d/ep1.mkv' }, seriesInfo: { season: 1, episode: 1 } },
        });
        rerender({ stream: { url: 'https://d/ep2.mkv' }, seriesInfo: { season: 1, episode: 2 } });
        expect(rendered).not.toContainEqual([2, 'https://d/ep1.mkv']);
        expect(rendered).toContainEqual([2, 'https://d/ep2.mkv']);
    });
});
