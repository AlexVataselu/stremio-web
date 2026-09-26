/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import { renderHook, waitFor } from '@testing-library/react';

const useSkipIntroSegments = require('./useSkipIntroSegments');

const EPISODE = { seriesId: 'tt1', season: 1, episode: 2, streamUrl: 'http://127.0.0.1:11470/abc/0' };
const answer = (segments) => Promise.resolve({ json: () => Promise.resolve({ segment: segments[0] || null, segments }) });

describe('useSkipIntroSegments', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() => answer([{ start: 30, end: 60 }]));
    });

    test('asks the engine once everything about the episode is known', async () => {
        const { result } = renderHook(() => useSkipIntroSegments({ ...EPISODE, runtimeSeconds: 1500 }));

        await waitFor(() => expect(result.current).toEqual([{ start: 30, end: 60 }]));
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ ...EPISODE, runtimeSeconds: 1500 });
    });

    test('waits for the runtime before asking', () => {
        renderHook(() => useSkipIntroSegments({ ...EPISODE, runtimeSeconds: null }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('keeps the button when the player refines the duration mid-playback', async () => {
        const { result, rerender } = renderHook((props) => useSkipIntroSegments(props), {
            initialProps: { ...EPISODE, runtimeSeconds: 1500 },
        });
        await waitFor(() => expect(result.current).toEqual([{ start: 30, end: 60 }]));

        rerender({ ...EPISODE, runtimeSeconds: 1500.042 });

        expect(result.current).toEqual([{ start: 30, end: 60 }]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('forgets the previous episode\'s intro when the episode changes', async () => {
        const { result, rerender } = renderHook((props) => useSkipIntroSegments(props), {
            initialProps: { ...EPISODE, runtimeSeconds: 1500 },
        });
        await waitFor(() => expect(result.current).toEqual([{ start: 30, end: 60 }]));

        global.fetch = jest.fn(() => new Promise(() => {}));
        rerender({ ...EPISODE, episode: 3, streamUrl: 'http://127.0.0.1:11470/abc/1', runtimeSeconds: 1480 });

        expect(result.current).toEqual([]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('shows no button when the engine cannot be reached', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        const { result } = renderHook(() => useSkipIntroSegments({ ...EPISODE, runtimeSeconds: 1500 }));
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(result.current).toEqual([]);
    });
});
