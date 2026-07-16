(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const mainMenu = document.getElementById('main-menu');
    const flags = Array.from(document.querySelectorAll('.drzava-flag-gsap-sprite'));
    if (!gsapRuntime || !mainMenu || flags.length !== 6) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gust = [-2.2, -1.95, -2.35, -2.05, -2.15, -2.0];
    let isRunning = false;

    flags.forEach((flag) => {
        gsapRuntime.set(flag, {
            rotation: 0,
            skewY: 0,
            scaleX: 1,
            transformOrigin: flag.style.getPropertyValue('--flag-origin'),
            force3D: false
        });
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(flags, {
            rotation: (index) => gust[index],
            scaleX: 1,
            duration: 0.86,
            stagger: 0.028,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: (index) => -gust[index] * 0.24,
            scaleX: 1,
            duration: 0.48,
            stagger: 0.018,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: 0,
            skewY: 0,
            scaleX: 1,
            duration: 1.2,
            stagger: 0.022,
            ease: 'sine.inOut',
            force3D: false
        })
        .to(flags, {
            rotation: 0,
            skewY: 0,
            scaleX: 1,
            duration: 4.2,
            ease: 'none',
            force3D: false
        });

    const shouldRun = () => (
        document.body.dataset.tema === 'drzava'
        && mainMenu.classList.contains('active')
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        gsapRuntime.set(flags, { rotation: 0, skewY: 0, scaleX: 1, force3D: false });
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
