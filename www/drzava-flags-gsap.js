(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const mainMenu = document.getElementById('main-menu');
    const flags = Array.from(document.querySelectorAll('.drzava-flag-gsap-sprite'));
    const routePaths = Array.from(document.querySelectorAll('.drzava-route-path'));
    const travelers = Array.from(document.querySelectorAll('.drzava-route-traveler'));
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

    const routeTweens = [];
    const prepareRoutes = () => {
        if (routeTweens.length) return;
        routePaths.forEach((path, index) => {
            const traveler = travelers[index];
            if (!traveler) return;
            const state = { distance: 0 };
            const length = path.getTotalLength();
            if (!length) return;
            routeTweens.push(gsapRuntime.to(state, {
                distance: length,
                duration: [12, 15, 13][index],
                delay: [0, 3.4, 7.1][index],
                ease: 'none',
                repeat: -1,
                paused: true,
                onUpdate: () => {
                    const point = path.getPointAtLength(state.distance);
                    traveler.setAttribute('cx', point.x.toFixed(1));
                    traveler.setAttribute('cy', point.y.toFixed(1));
                    traveler.style.opacity = state.distance > 0 && state.distance < length ? '0.82' : '0';
                }
            }));
        });
    };

    const shouldRun = () => (
        document.body.dataset.tema === 'drzava'
        && mainMenu.getClientRects().length > 0
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        gsapRuntime.set(flags, { backgroundPositionY: '0%' });
        travelers.forEach((traveler) => { traveler.style.opacity = '0'; });
    };

    const syncAnimation = () => {
        const nextRunning = shouldRun();
        if (nextRunning && !isRunning) {
            prepareRoutes();
            timeline.restart(true);
            routeTweens.forEach((tween) => tween.restart(true));
        } else if (!nextRunning && isRunning) {
            timeline.pause(0);
            routeTweens.forEach((tween) => tween.pause(0));
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
        routeTweens.forEach((tween) => tween.pause(0));
        reset();
        isRunning = false;
    });

    syncAnimation();
})();
