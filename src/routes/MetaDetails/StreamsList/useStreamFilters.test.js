/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import { renderHook, act } from '@testing-library/react';

const { useStreamFilters, STORAGE_KEY } = require('./useStreamFilters');

describe('useStreamFilters', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    test('starts empty and saves each change at once', () => {
        const { result } = renderHook(() => useStreamFilters());
        expect(result.current.saved).toEqual({ resolutions: [], sites: [] });
        act(() => result.current.toggle('resolutions', '1080p'));
        act(() => result.current.toggle('sites', 'ThePirateBay'));
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({ resolutions: ['1080p'], sites: ['ThePirateBay'] });
    });

    test('the saved choice is there for the next episode', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ resolutions: ['1080p', '720p'], sites: [] }));
        expect(renderHook(() => useStreamFilters()).result.current.saved.resolutions).toEqual(['1080p', '720p']);
    });

    test('toggling a ticked value unticks it, clear empties one filter only', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ resolutions: ['1080p'], sites: ['1337x'] }));
        const { result } = renderHook(() => useStreamFilters());
        act(() => result.current.toggle('resolutions', '1080p'));
        expect(result.current.saved).toEqual({ resolutions: [], sites: ['1337x'] });
        act(() => result.current.clear('sites'));
        expect(result.current.saved).toEqual({ resolutions: [], sites: [] });
    });

    test('a corrupt or old saved value reads as no choice', () => {
        for (const bad of ['not json', '[1,2]', '{"resolutions":"1080p"}', '{"resolutions":[1080],"sites":null}']) {
            localStorage.setItem(STORAGE_KEY, bad);
            expect(renderHook(() => useStreamFilters()).result.current.saved).toEqual({ resolutions: [], sites: [] });
        }
    });

    test('blocked storage leaves the filters working in memory', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        const { result } = renderHook(() => useStreamFilters());
        act(() => result.current.toggle('resolutions', '720p'));
        expect(result.current.saved.resolutions).toEqual(['720p']);
    });
});
