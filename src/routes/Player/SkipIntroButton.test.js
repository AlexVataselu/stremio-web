/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// The real app initializes i18next asynchronously (see src/index.js) with
// translations from the external `stremio-translations` package, which does
// not yet contain a key for this new button. Stub `t` here so this isolated
// unit test doesn't depend on that init/package and still sees the button's
// `defaultValue` text, matching what real users see once i18next is ready.
jest.mock('i18next', () => ({
    t: (key, options) => (options && options.defaultValue) || key,
}));

import SkipIntroButton from './SkipIntroButton';

describe('SkipIntroButton', () => {
    test('renders nothing when there is no segment', () => {
        const { container } = render(
            <SkipIntroButton segment={null} currentTime={5} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing when currentTime is before the segment', () => {
        const { container } = render(
            <SkipIntroButton segment={{ start: 30, end: 60 }} currentTime={10} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing when currentTime is at/after the segment end', () => {
        const { container } = render(
            <SkipIntroButton segment={{ start: 30, end: 60 }} currentTime={60} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the button when currentTime is inside the segment', () => {
        render(<SkipIntroButton segment={{ start: 30, end: 60 }} currentTime={45} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument();
    });

    test('renders at the exact start boundary (inclusive)', () => {
        render(<SkipIntroButton segment={{ start: 30, end: 60 }} currentTime={30} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument();
    });

    test('clicking calls onSkip with the segment end time', () => {
        const onSkip = jest.fn();
        render(<SkipIntroButton segment={{ start: 30, end: 60 }} currentTime={45} onSkip={onSkip} />);
        fireEvent.click(screen.getByRole('button', { name: /skip intro/i }));
        expect(onSkip).toHaveBeenCalledWith(60);
    });
});
