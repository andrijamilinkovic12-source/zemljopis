(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const mainMenu = document.getElementById('main-menu');
    const owlPupils = Array.from(document.querySelectorAll('.zivotinja-eye-pupil-owl'));
    const foxPupils = Array.from(document.querySelectorAll('.zivotinja-eye-pupil-fox'));
    const owlLids = Array.from(document.querySelectorAll('.zivotinja-eye-lid-owl'));
    const foxLids = Array.from(document.querySelectorAll('.zivotinja-eye-lid-fox'));
    const pupils = [...owlPupils, ...foxPupils];
    const lids = [...owlLids, ...foxLids];
    if (!gsapRuntime || !mainMenu || pupils.length !== 4 || lids.length !== 4) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(pupils, {
        x: 0,
        y: 0,
        scaleY: 1,
        transformOrigin: '50% 50%',
        force3D: false
    });
    gsapRuntime.set(lids, {
        opacity: 0,
        scaleX: 0.7,
        scaleY: 0.8,
        transformOrigin: '50% 50%',
        force3D: false
    });

    const blink = (blinkPupils, blinkLids) => gsapRuntime.timeline()
        .to(blinkPupils, { scaleY: 0.08, duration: 0.08, ease: 'sine.in', force3D: false }, 0)
        .to(blinkLids, { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.05, ease: 'sine.out', force3D: false }, 0)
        .to(blinkPupils, { scaleY: 1, duration: 0.12, ease: 'sine.out', force3D: false }, 0.13)
        .to(blinkLids, { opacity: 0, scaleX: 0.72, scaleY: 0.82, duration: 0.12, ease: 'sine.out', force3D: false }, 0.13);

    const timeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    timeline
        .to(pupils, { x: 0, y: 0, duration: 0.65, ease: 'none', force3D: false })
        .to(owlPupils, { x: -1.15, y: -0.45, duration: 1.05, ease: 'sine.inOut', force3D: false })
        .to(foxPupils, { x: -0.75, y: -0.25, duration: 1.05, ease: 'sine.inOut', force3D: false }, '<')
        .add(blink(owlPupils, owlLids), '+=0.25')
        .to(owlPupils, { x: 1.0, y: 0.28, duration: 1.2, ease: 'sine.inOut', force3D: false }, '+=0.4')
        .to(foxPupils, { x: 0.68, y: 0.18, duration: 1.2, ease: 'sine.inOut', force3D: false }, '<')
        .add(blink(foxPupils, foxLids), '+=0.7')
        .to(pupils, { x: 0, y: 0, duration: 1.1, ease: 'sine.inOut', force3D: false }, '+=0.45')
        .to(pupils, { x: 0, y: 0, duration: 2.3, ease: 'none', force3D: false });

    const shouldRun = () => (
        document.body.dataset.tema === 'zivotinja'
        && mainMenu.classList.contains('active')
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        timeline.pause(0);
        gsapRuntime.set(pupils, { x: 0, y: 0, scaleY: 1, force3D: false });
        gsapRuntime.set(lids, { opacity: 0, scaleX: 0.7, scaleY: 0.8, force3D: false });
    };

    const syncAnimation = () => {
        const nextRunning = shouldRun();
        if (nextRunning && !isRunning) {
            timeline.restart(true);
        } else if (!nextRunning && isRunning) {
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
        isRunning = false;
    });

    syncAnimation();
})();
