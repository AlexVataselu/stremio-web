// Copyright (C) 2017-2024 Smart code 203358507

import React, { memo } from 'react';
import { HorizontalScroll } from 'stremio/components';
import Chip from './Chip';
import styles from './Chips.less';

type Option = {
    label: string,
    value: string,
    dimmed?: boolean,
};

type Props = {
    options: Option[],
    selected: string[],
    onSelect: (value: string) => {},
};

const Chips = memo(({ options, selected, onSelect }: Props) => {
    return (
        <HorizontalScroll className={styles['chips']}>
            {
                options.map(({ label, value, dimmed }) => (
                    <Chip
                        key={value}
                        label={label}
                        value={value}
                        active={selected.includes(value)}
                        dimmed={dimmed}
                        onSelect={onSelect}
                    />
                ))
            }
        </HorizontalScroll>
    );
});

export default Chips;
