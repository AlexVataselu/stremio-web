/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Jest here does not resolve the app's `stremio/*` aliases or Less modules;
// stand-ins keep the menu's own behaviour under test.
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, options) => (options && options.defaultValue || key).replace('{{count}}', options && options.count) }),
}));
jest.mock('@stremio/stremio-icons/react', () => ({ __esModule: true, default: () => null }));
jest.mock('stremio/components', () => {
    const ReactLib = require('react');
    return { Button: ReactLib.forwardRef(({ className, ...props }, ref) => <button ref={ref} type="button" className={className} {...props} />) };
}, { virtual: true });
jest.mock('stremio/common', () => {
    const ReactLib = require('react');
    return {
        useBinaryState: (initial) => {
            const [on, setOn] = ReactLib.useState(initial);
            return [on, () => setOn(true), () => setOn(false), () => setOn((value) => !value)];
        },
    };
}, { virtual: true });
jest.mock('stremio/common/useOutsideClick', () => ({ __esModule: true, default: () => ({ current: null }) }), { virtual: true });
jest.mock('stremio/components/MultiselectMenu/MultiselectMenu.less', () => ({}), { virtual: true });
jest.mock('stremio/components/MultiselectMenu/Dropdown/Dropdown.less', () => ({}), { virtual: true });
jest.mock('stremio/components/MultiselectMenu/Dropdown/Option/Option.less', () => ({}), { virtual: true });
jest.mock('./styles', () => ({}), { virtual: true });

const SiteFilterMenu = require('./SiteFilterMenu');

const site = (value, count, ticked = false, unavailable = false) => ({ value, count, ticked, unavailable });

describe('SiteFilterMenu', () => {
    test('Escape closes a menu opened with the mouse', () => {
        render(<SiteFilterMenu options={[site('ThePirateBay', 16), site('1337x', 8)]} onToggle={() => {}} onClear={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /all sites/i }));
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('the button names only the sites that apply to this list', () => {
        // ThePirateBay is ticked but gave way here: the list shows every site.
        render(<SiteFilterMenu options={[site('ThePirateBay', 16, true, true), site('1337x', 8)]} onToggle={() => {}} onClear={() => {}} />);
        expect(screen.getByRole('button', { name: /all sites/i })).toBeInTheDocument();
    });
});
