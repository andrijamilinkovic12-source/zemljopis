(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const tails = Array.from(document.querySelectorAll('.zivotinja-fox-gsap-tail'));
    const mainMenu = document.getElementById('main-menu');
    if (!gsapRuntime || tails.length !== 1 || !mainMenu) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(tails, {
        rotation: 0,
        transformOrigin: '80.255% 23.699%',
        force3D: false
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(tails, { rotation: 0, duration: 0.7, ease: 'none', force3D: false })
        .to(tails, { rotation: -1.2, duration: 0.5, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -2.0, duration: 0.55, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -0.5, duration: 0.6, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: -1.55, duration: 0.55, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: 0, duration: 0.8, ease: 'sine.inOut', force3D: false })
        .to(tails, { rotation: 0, duration: 2.0, ease: 'none', force3D: false });

    const shouldRun = () => (
        document.body.dataset.tema === 'zivotinja'
        && mainMenu.classList.contains('active')
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
        isRunning = false;
    });

    syncAnimation();
})();
