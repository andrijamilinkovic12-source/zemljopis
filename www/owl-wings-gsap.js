(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const leftWing = document.querySelector('.zivotinja-owl-wing-tip-left');
    const rightWing = document.querySelector('.zivotinja-owl-wing-tip-right');
    const mainMenu = document.getElementById('main-menu');
    if (!gsapRuntime || !leftWing || !rightWing || !mainMenu) return;

    const wings = [leftWing, rightWing];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(leftWing, {
        rotation: 0,
        opacity: 0,
        transformOrigin: '82.6923% 70.1754%',
        force3D: false
    });
    gsapRuntime.set(rightWing, {
        rotation: 0,
        opacity: 0,
        transformOrigin: '12.1212% 83.7209%',
        force3D: false
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(wings, { rotation: 0, opacity: 0, duration: 5.4, ease: 'none', force3D: false })
        .to(leftWing, { rotation: 2.1, opacity: 0.42, duration: 0.42, ease: 'sine.inOut', force3D: false })
        .to(rightWing, { rotation: -1.9, opacity: 0.38, duration: 0.42, ease: 'sine.inOut', force3D: false }, '<0.03')
        .to(leftWing, { rotation: 4.2, opacity: 0.82, duration: 0.38, ease: 'sine.inOut', force3D: false })
        .to(rightWing, { rotation: -3.9, opacity: 0.78, duration: 0.38, ease: 'sine.inOut', force3D: false }, '<0.02')
        .to(leftWing, { rotation: 1.0, opacity: 0.30, duration: 0.44, ease: 'sine.inOut', force3D: false })
        .to(rightWing, { rotation: -0.9, opacity: 0.27, duration: 0.44, ease: 'sine.inOut', force3D: false }, '<0.02')
        .to(wings, { rotation: 0, opacity: 0, duration: 0.68, ease: 'sine.inOut', force3D: false })
        .to(wings, { rotation: 0, opacity: 0, duration: 3.8, ease: 'none', force3D: false });

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
            gsapRuntime.set(wings, { rotation: 0, opacity: 0, force3D: false });
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
