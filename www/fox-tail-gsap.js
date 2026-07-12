(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const tails = Array.from(document.querySelectorAll('.zivotinja-fox-gsap-tail'));
    if (!gsapRuntime || tails.length !== 2) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(tails, {
        rotation: 0,
        transformOrigin: '71.338% 23.699%',
        force3D: false
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(tails, { rotation: 0, duration: 3, ease: 'none', force3D: false })
        .to(tails, { rotation: -2.4, duration: 0.45, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -5, duration: 0.58, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -1.4, duration: 0.52, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -3.8, duration: 0.48, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: 0, duration: 0.68, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: 0, duration: 2.1, ease: 'none', force3D: false });

    const shouldRun = () => (
        document.body.dataset.tema === 'zivotinja'
        && !document.hidden
        && !reducedMotion.matches
    );

    const syncAnimation = () => {
        const nextRunning = shouldRun();
        if (nextRunning && !isRunning) {
            timeline.restart(true);
        } else if (!nextRunning && isRunning) {
            timeline.pause(0);
            gsapRuntime.set(tails, { rotation: 0, force3D: false });
        }
        isRunning = nextRunning;
    };

    const themeObserver = new MutationObserver(syncAnimation);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-tema'] });
    document.addEventListener('visibilitychange', syncAnimation);

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', syncAnimation);
    } else if (typeof reducedMotion.addListener === 'function') {
        reducedMotion.addListener(syncAnimation);
    }

    window.addEventListener('pagehide', () => {
        timeline.pause();
        isRunning = false;
    });

    syncAnimation();
})();
