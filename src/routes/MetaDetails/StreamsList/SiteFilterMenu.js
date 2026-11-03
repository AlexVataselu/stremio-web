// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('stremio/components');
const { useBinaryState } = require('stremio/common');
const { default: useOutsideClick } = require('stremio/common/useOutsideClick');
const menuStyles = require('stremio/components/MultiselectMenu/MultiselectMenu.less');
const dropdownStyles = require('stremio/components/MultiselectMenu/Dropdown/Dropdown.less');
const optionStyles = require('stremio/components/MultiselectMenu/Dropdown/Option/Option.less');
const { appliedValues } = require('./streamFilters');
const styles = require('./styles');

// Looks like Stremio's MultiselectMenu, but ticks several sites and stays
// open while ticking; the shared menu picks one value and closes.
const SiteFilterMenu = ({ className, options, onToggle, onClear }) => {
    const { t } = useTranslation();
    const [menuOpen, , closeMenu, toggleMenu] = useBinaryState(false);
    const menuRef = useOutsideClick(closeMenu);
    const buttonRef = React.useRef(null);
    const ticked = options.filter((option) => option.ticked);
    // The button names what acts on the list, not picks that gave way here.
    const applied = appliedValues({ options });

    // Stremio's buttons drop focus on mouse down, so a menu opened with the
    // mouse never holds focus: listen on the document while it is open.
    React.useEffect(() => {
        if (!menuOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            closeMenu();
            if (buttonRef.current) buttonRef.current.focus();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [menuOpen, closeMenu]);

    const label = applied.length === 0 ?
        t('STREAM_FILTER_ALL_SITES', { defaultValue: 'All sites' })
        :
        applied.length === 1 ?
            applied[0]
            :
            t('STREAM_FILTER_SITES', { count: applied.length, defaultValue: '{{count}} sites' });

    return (
        <div
            className={classnames(menuStyles['multiselect-menu'], { [menuStyles['active']]: menuOpen }, className)}
            ref={menuRef}
        >
            <Button
                ref={buttonRef}
                className={classnames(menuStyles['multiselect-button'], { [menuStyles['open']]: menuOpen })}
                onClick={toggleMenu}
                tabIndex={0}
                aria-haspopup={'listbox'}
                aria-expanded={menuOpen}
            >
                <div className={menuStyles['label']}>{label}</div>
                <Icon name={'caret-down'} className={classnames(menuStyles['icon'], { [menuStyles['open']]: menuOpen })} />
            </Button>
            {
                menuOpen ?
                    <div className={classnames(dropdownStyles['dropdown'], dropdownStyles['open'], styles['site-dropdown'])} role={'listbox'} aria-multiselectable={true}>
                        <Button className={optionStyles['option']} onClick={onClear} aria-selected={ticked.length === 0}>
                            <div className={optionStyles['label']}>{t('STREAM_FILTER_ALL_SITES', { defaultValue: 'All sites' })}</div>
                            {ticked.length === 0 ? <div className={optionStyles['icon']} /> : null}
                        </Button>
                        {options.map((option) => (
                            <Button
                                key={option.value}
                                className={classnames(optionStyles['option'], { [styles['site-unavailable']]: option.unavailable })}
                                onClick={() => onToggle(option.value)}
                                aria-selected={option.ticked}
                            >
                                <div className={optionStyles['label']}>
                                    {option.value}
                                    <span className={styles['site-count']}>
                                        {option.unavailable ? t('STREAM_FILTER_NOT_HERE', { defaultValue: 'not available here' }) : option.count}
                                    </span>
                                </div>
                                {option.ticked ? <div className={optionStyles['icon']} /> : null}
                            </Button>
                        ))}
                    </div>
                    :
                    null
            }
        </div>
    );
};

SiteFilterMenu.propTypes = {
    className: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired,
        ticked: PropTypes.bool.isRequired,
        unavailable: PropTypes.bool.isRequired,
    })).isRequired,
    onToggle: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

module.exports = SiteFilterMenu;
