/**
 * @jest-environment jsdom
 */
// Copyright (C) 2017-2026 Smart code 203358507

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// The real app initializes i18next asynchronously (see src/index.js) with
// translations from the external `stremio-translations` package, which does
// not yet contain a key for this new button. Stub the react-i18next hook
// here so this isolated unit test doesn't depend on that init/package and
// still sees the button's `defaultValue` text, matching what real users see
// once i18next is ready.
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => (options && options.defaultValue) || key,
    }),
}));

import SkipIntroButton from './SkipIntroButton';

describe('SkipIntroButton', () => {
    test('renders nothing when there are no segments', () => {
        const { container } = render(
            <SkipIntroButton segments={null} currentTime={5} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing when currentTime is before the segment', () => {
        const { container } = render(
            <SkipIntroButton segments={[{ start: 30, end: 60 }]} currentTime={10} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing when currentTime is at/after the segment end', () => {
        const { container } = render(
            <SkipIntroButton segments={[{ start: 30, end: 60 }]} currentTime={60} onSkip={() => {}} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the button when currentTime is inside the segment', () => {
        render(<SkipIntroButton segments={[{ start: 30, end: 60 }]} currentTime={45} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument();
    });

    test('renders at the exact start boundary (inclusive)', () => {
        render(<SkipIntroButton segments={[{ start: 30, end: 60 }]} currentTime={30} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument();
    });

    test('clicking calls onSkip with the segment end time', () => {
        const onSkip = jest.fn();
        render(<SkipIntroButton segments={[{ start: 30, end: 60 }]} currentTime={45} onSkip={onSkip} />);
        fireEvent.click(screen.getByRole('button', { name: /skip intro/i }));
        expect(onSkip).toHaveBeenCalledWith(60);
    });

    test('applies the passed className to the wrapper layer that holds the button', () => {
        render(
            <SkipIntroButton
                className="layer skip-intro-layer"
                segments={[{ start: 30, end: 60 }]}
                currentTime={45}
                onSkip={() => {}}
            />
        );
        const button = screen.getByRole('button', { name: /skip intro/i });
        expect(button.parentElement).toHaveClass('layer', 'skip-intro-layer');
    });

    test('lines the button up with the intro start on the progress bar', () => {
        render(<SkipIntroButton segments={[{ start: 300, end: 360 }]} duration={2400} currentTime={310} onSkip={() => {}} />);
        const button = screen.getByRole('button', { name: /skip intro/i });
        expect(button.style.left).toBe('12.5%');
        expect(button.style.transform).toBe('translateX(-12.5%)');
    });

    test('keeps the button at the far left for an intro at 0:00', () => {
        render(<SkipIntroButton segments={[{ start: 0, end: 47 }]} duration={1320} currentTime={5} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i }).style.left).toBe('0%');
    });

    test('clamps the position to the bar when the start is past the reported duration', () => {
        render(<SkipIntroButton segments={[{ start: 500, end: 560 }]} duration={400} currentTime={510} onSkip={() => {}} />);
        const button = screen.getByRole('button', { name: /skip intro/i });
        expect(button.style.left).toBe('100%');
        expect(button.style.transform).toBe('translateX(-100%)');
    });

    test('falls back to the far left when the duration is unknown', () => {
        render(<SkipIntroButton segments={[{ start: 300, end: 360 }]} duration={null} currentTime={310} onSkip={() => {}} />);
        expect(screen.getByRole('button', { name: /skip intro/i }).style.left).toBe('0%');
    });

    test('appears again for a second segment later in the episode', () => {
        const segments = [{ start: 0, end: 27 }, { start: 900, end: 990 }];
        const onSkip = jest.fn();
        const { rerender, container } = render(
            <SkipIntroButton segments={segments} duration={3000} currentTime={10} onSkip={onSkip} />
        );
        expect(screen.getByRole('button', { name: /skip intro/i }).style.left).toBe('0%');

        rerender(<SkipIntroButton segments={segments} duration={3000} currentTime={400} onSkip={onSkip} />);
        expect(container).toBeEmptyDOMElement();

        rerender(<SkipIntroButton segments={segments} duration={3000} currentTime={920} onSkip={onSkip} />);
        const button = screen.getByRole('button', { name: /skip intro/i });
        expect(button.style.left).toBe('30%');
        fireEvent.click(button);
        expect(onSkip).toHaveBeenCalledWith(990);
    });
});
