(() => {
    'use strict';

    const gsapRuntime = window.gsap;
    const splash = document.getElementById('splash-screen');
    const clouds = document.querySelector('.splash-clouds-gsap');
    const sun = document.querySelector('.splash-sun-gsap');
    const cleanSun = document.querySelector('.splash-sun-frame-clean');
    const warmSun = document.querySelector('.splash-sun-frame-warm');
    if (!gsapRuntime || !splash || !clouds || !sun || !cleanSun || !warmSun) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isRunning = false;

    gsapRuntime.set(clouds, { x: 0, y: 0, force3D: false });
    gsapRuntime.set(sun, { x: 0, y: 0, force3D: false });
    gsapRuntime.set(cleanSun, { opacity: 1, force3D: false });
    gsapRuntime.set(warmSun, { opacity: 0, force3D: false });

    // Retains the original very small vertical movement, but replaces the
    // abrupt CSS steps with the same smooth easing used by animal accents.
    const cloudsTimeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    cloudsTimeline
        .to(clouds, { y: -1, duration: 2.16, ease: 'sine.inOut', force3D: false })
        .to(clouds, { y: -2, duration: 2.16, ease: 'sine.inOut', force3D: false })
        .to(clouds, { y: 1, duration: 2.64, ease: 'sine.inOut', force3D: false })
        .to(clouds, { y: -2, duration: 2.64, ease: 'sine.inOut', force3D: false })
        .to(clouds, { y: 0, duration: 2.4, ease: 'sine.inOut', force3D: false });

    const sunTimeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    sunTimeline
        .to(sun, { y: -1, duration: 1.45, ease: 'sine.inOut', force3D: false })
        .to(sun, { y: -2, duration: 1.45, ease: 'sine.inOut', force3D: false })
        .to(sun, { y: -1, duration: 1.45, ease: 'sine.inOut', force3D: false })
        .to(sun, { y: 0, duration: 1.45, ease: 'sine.inOut', force3D: false });

    const sunWarmthTimeline = gsapRuntime.timeline({ paused: true, repeat: -1 });
    sunWarmthTimeline
        .to(warmSun, { opacity: 0, duration: 1.25, ease: 'none', force3D: false })
        .to(warmSun, { opacity: 0.72, duration: 3.4, ease: 'sine.inOut', force3D: false })
        .to(warmSun, { opacity: 0, duration: 4.1, ease: 'sine.inOut', force3D: false })
        .to(warmSun, { opacity: 0, duration: 6.25, ease: 'none', force3D: false });

    const timelines = [cloudsTimeline, sunTimeline, sunWarmthTimeline];
    const shouldRun = () => (
        splash.classList.contains('active')
        && !document.hidden
        && !reducedMotion.matches
    );

    const reset = () => {
        timelines.forEach(timeline => timeline.pause(0));
        gsapRuntime.set(clouds, { x: 0, y: 0, force3D: false });
        gsapRuntime.set(sun, { x: 0, y: 0, force3D: false });
        gsapRuntime.set(cleanSun, { opacity: 1, force3D: false });
        gsapRuntime.set(warmSun, { opacity: 0, force3D: false });
    };

    const syncAnimation = () => {
        const nextRunning = shouldRun();
        if (nextRunning && !isRunning) {
            timelines.forEach(timeline => timeline.restart(true));
        } else if (!nextRunning && isRunning) {
            reset();
        }
        isRunning = nextRunning;
    };

    const screenObserver = new MutationObserver(syncAnimation);
    screenObserver.observe(splash, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncAnimation);

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', syncAnimation);
    } else if (typeof reducedMotion.addListener === 'function') {
        reducedMotion.addListener(syncAnimation);
    }

    window.addEventListener('pagehide', () => {
        reset();
        isRunning = false;
    });

    syncAnimation();
})();
