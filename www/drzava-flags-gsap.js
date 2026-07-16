(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const mainMenu = document.getElementById('main-menu');
    const flags = Array.from(document.querySelectorAll('.drzava-flag-gsap-sprite'));
    if (!gsapRuntime || !mainMenu || flags.length !== 6) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Samo naginjanje iz tačke na koplju: nema sečenja, skale ni razvlačenja platna.
    const gust = [-16, -15, -17, -15.5, -16.5, -15.5];
    let isRunning = false;

    flags.forEach((flag) => {
        gsapRuntime.set(flag, {
            rotation: 0,
            transformOrigin: flag.style.getPropertyValue('--flag-origin'),
            force3D: false
        });
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(flags, {
            rotation: (index) => gust[index],
            duration: 0.78,
            stagger: 0.04,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: (index) => -gust[index] * 0.24,
            duration: 0.5,
            stagger: 0.025,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: 0,
            duration: 1.1,
            stagger: 0.03,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: 0,
            duration: 2.8,
            ease: 'none',
            force3D: false
        });

    const shouldRun = () => (
        document.body.dataset.tema === 'drzava'
        && mainMenu.getClientRects().length > 0
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        gsapRuntime.set(flags, { rotation: 0, force3D: false });
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
