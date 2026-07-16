(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const mainMenu = document.getElementById('main-menu');
    const flags = Array.from(document.querySelectorAll('.drzava-flag-gsap-sprite'));
    if (!gsapRuntime || !mainMenu || flags.length !== 6) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const frameSteps = 32;
    let isRunning = false;

    flags.forEach((flag) => {
        gsapRuntime.set(flag, { backgroundPositionY: '0%' });
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(flags, {
            backgroundPositionY: '100%',
            duration: 2.7,
            ease: `steps(${frameSteps})`
        });

    const shouldRun = () => (
        document.body.dataset.tema === 'drzava'
        && mainMenu.getClientRects().length > 0
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        gsapRuntime.set(flags, { backgroundPositionY: '0%' });
    };

    const syncAnimation = () => {
        const nextRunning = shouldRun();
        if (nextRunning && !isRunning) {
            timeline.restart(true);
        } else if (!nextRunning && isRunning) {
            timeline.pause(0);
            reset();
        }
        isRunning = nextRunning;
    };

    const themeObserver = new MutationObserver(syncAnimation);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-tema'] });
    const screenObserver = new MutationObserver(syncAnimation);
    screenObserver.observe(mainMenu, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncAnimation);

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', syncAnimation);
    } else if (typeof reducedMotion.addListener === 'function') {
        reducedMotion.addListener(syncAnimation);
    }

    window.addEventListener('pagehide', () => {
        timeline.pause();
        reset();
        isRunning = false;
    });

    syncAnimation();
})();
