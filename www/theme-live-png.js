(() => {
    'use strict';

    const screenIds = [
        'main-menu', 'kvartalni-nivo-screen', 'online-igraci-screen',
        'soba-prijatelja-screen', 'tokeni-screen', 'trofeji-main-screen',
        'riznica-screen', 'toplista-screen', 'podesavanja-screen',
        'global-chat-screen'
    ];
    const screens = screenIds.map((id) => document.getElementById(id)).filter(Boolean);
    const themes = new Set(['drzava', 'okean', 'grad', 'planina', 'biljka', 'zivotinja', 'predmet']);
    if (!screens.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const image = document.createElement('img');
    image.className = 'theme-live-png';
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.decoding = 'async';
    image.hidden = true;
    image.addEventListener('load', () => { image.hidden = false; });

    const sync = () => {
        const theme = document.body.dataset.tema;
        const supported = themes.has(theme);
        document.body.classList.toggle('theme-live-png-enabled', supported);
        const active = screens.find((screen) => screen.classList.contains('active'));
        if (supported && active && !document.hidden && !reducedMotion.matches) {
            if (image.parentElement !== active) active.appendChild(image);
            const source = theme === 'drzava'
                ? 'assets/theme-live-v3/drzava-live.png?v=3'
                : `assets/theme-live-v2/${theme}-live.png`;
            if (image.getAttribute('src') !== source) {
                image.hidden = true;
                image.src = source;
            }
        } else {
            image.hidden = true;
            image.removeAttribute('src');
            image.remove();
        }
    };

    const observer = new MutationObserver(sync);
    screens.forEach((screen) => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-tema'] });
    document.addEventListener('visibilitychange', sync);
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', sync);
    else reducedMotion.addListener(sync);
    sync();
})();
