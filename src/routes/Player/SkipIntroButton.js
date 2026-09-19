// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

function introPosition(start, duration) {
    if (!(duration > 0)) return '0%';
    const fraction = Math.min(Math.max(start / duration, 0), 1);
    return `${Number((fraction * 100).toFixed(2))}%`;
}

// An episode can hold several skippable stretches (a franchise ident at 0:00,
// then the show's own titles after a cold open); the button follows the one playing.
function SkipIntroButton({ className, segments, duration, currentTime, onSkip }) {
    const { t } = useTranslation();
    const segment = (segments || []).find(({ start, end }) => currentTime >= start && currentTime < end);
    if (!segment) return null;

    const position = introPosition(segment.start, duration);
    return (
        <div className={className}>
            <button
                type="button"
                style={{ left: position, transform: `translateX(-${position})` }}
                onClick={() => onSkip(segment.end)}
            >
                {t('PLAYER_SKIP_INTRO', { defaultValue: 'Skip Intro' })}
            </button>
        </div>
    );
}

SkipIntroButton.propTypes = {
    className: PropTypes.string,
    segments: PropTypes.arrayOf(PropTypes.shape({
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
    })),
    duration: PropTypes.number,
    currentTime: PropTypes.number,
    onSkip: PropTypes.func.isRequired,
};

export default SkipIntroButton;
