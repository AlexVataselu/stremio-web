// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

function SkipIntroButton({ className, segment, currentTime, onSkip }) {
    const { t } = useTranslation();
    if (!segment) return null;
    const isActive = currentTime >= segment.start && currentTime < segment.end;
    if (!isActive) return null;

    return (
        <button type="button" className={className} onClick={() => onSkip(segment.end)}>
            {t('PLAYER_SKIP_INTRO', { defaultValue: 'Skip Intro' })}
        </button>
    );
}

SkipIntroButton.propTypes = {
    className: PropTypes.string,
    segment: PropTypes.shape({
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
    }),
    currentTime: PropTypes.number,
    onSkip: PropTypes.func.isRequired,
};

export default SkipIntroButton;
