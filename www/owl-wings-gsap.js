(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const leftWing = document.querySelector('.zivotinja-owl-wing-left');
    const rightWing = document.querySelector('.zivotinja-owl-wing-right');
    const mainMenu = document.getElementById('main-menu');
    if (!gsapRuntime || !leftWing || !rightWing || !mainMenu) return;

    const wings = [leftWing, rightWing];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(leftWing, {
        rotation: 0,
        opacity: 1,
        transformOrigin: '66.6667% 16.3043%',
        force3D: false
    });
    gsapRuntime.set(rightWing, {
        rotation: 0,
        opacity: 1,
        transformOrigin: '52.3810% 11.1111%',
        force3D: false
    });

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(wings, { rotation: 0, duration: 0.7, ease: 'none', force3D: false })
        .to(leftWing, { rotation: 4.8, duration: 0.56, ease: 'sine.inOut', force3D: false })
        .to(rightWing, { rotation: -4.5, duration: 0.56, ease: 'sine.inOut', force3D: false }, '<')
        .to(leftWing, { rotation: 1.2, duration: 0.42, ease: 'sine.inOut', force3D: false })
        .to(rightWing, { rotation: -1.1, duration: 0.42, ease: 'sine.inOut', force3D: false }, '<')
        .to(wings, { rotation: 0, duration: 0.66, ease: 'sine.inOut', force3D: false })
        .to(wings, { rotation: 0, duration: 2.1, ease: 'none', force3D: false });

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
            gsapRuntime.set(wings, { rotation: 0, opacity: 1, force3D: false });
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
