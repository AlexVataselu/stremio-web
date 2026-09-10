// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import PropTypes from 'prop-types';
import { t } from 'i18next';

function SkipIntroButton({ segment, currentTime, onSkip }) {
    if (!segment) return null;
    const isActive = currentTime >= segment.start && currentTime < segment.end;
    if (!isActive) return null;

    return (
        <button type="button" onClick={() => onSkip(segment.end)}>
            {t('PLAYER_SKIP_INTRO', { defaultValue: 'Skip Intro' })}
        </button>
    );
}

SkipIntroButton.propTypes = {
    segment: PropTypes.shape({
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
    }),
    currentTime: PropTypes.number,
    onSkip: PropTypes.func.isRequired,
};

export default SkipIntroButton;
