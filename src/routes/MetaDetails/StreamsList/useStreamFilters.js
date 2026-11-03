// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');

// One choice for every show and movie, kept in this web UI's local storage.
const STORAGE_KEY = 'stremioSkipIntro.streamFilters';
const KINDS = ['resolutions', 'sites'];

const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);

// Anything unreadable (blocked storage, an old or hand-edited value) is no choice.
const readSaved = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return stored !== null && typeof stored === 'object' && !Array.isArray(stored) ?
            { resolutions: strings(stored.resolutions), sites: strings(stored.sites) }
            :
            { resolutions: [], sites: [] };
    } catch (_) {
        return { resolutions: [], sites: [] };
    }
};

const writeSaved = (saved) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (_) {
        // The choice still applies until the window closes.
    }
};

const useStreamFilters = () => {
    const [saved, setSaved] = React.useState(readSaved);
    const change = React.useCallback((kind, update) => {
        if (!KINDS.includes(kind)) return;
        setSaved((current) => {
            const next = { ...current, [kind]: update(current[kind]) };
            writeSaved(next);
            return next;
        });
    }, []);
    const toggle = React.useCallback((kind, value) => {
        change(kind, (values) => (values.includes(value) ? values.filter((item) => item !== value) : [...values, value]));
    }, [change]);
    const clear = React.useCallback((kind) => change(kind, () => []), [change]);
    return { saved, toggle, clear };
};

module.exports = { useStreamFilters, STORAGE_KEY };
