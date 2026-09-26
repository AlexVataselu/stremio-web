// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');

// Asks the detection engine for an episode's skippable segments (in seconds).
const useSkipIntroSegments = ({ seriesId, season, episode, runtimeSeconds, streamUrl }) => {
    const [skipSegments, setSkipSegments] = React.useState([]);
    // The player can refine the duration mid-playback; that is still the same
    // episode, so only the runtime becoming known asks again, not its every change.
    const runtimeRef = React.useRef(runtimeSeconds);
    runtimeRef.current = runtimeSeconds;
    const runtimeKnown = Boolean(runtimeSeconds);
    React.useEffect(() => {
        setSkipSegments([]); // reset when the episode changes
        if (!seriesId || season === null || season === undefined || episode === null || episode === undefined || !runtimeKnown || !streamUrl) return;

        let ignore = false;
        fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seriesId, season, episode, runtimeSeconds: runtimeRef.current, streamUrl }),
        })
            .then((res) => res.json())
            .then((data) => { if (!ignore) setSkipSegments(data.segments || (data.segment ? [data.segment] : [])); })
            .catch(() => { if (!ignore) setSkipSegments([]); }); // network/engine failure -> no button, per spec §5
        return () => { ignore = true; };
    }, [seriesId, season, episode, runtimeKnown, streamUrl]);
    return skipSegments;
};

module.exports = useSkipIntroSegments;
