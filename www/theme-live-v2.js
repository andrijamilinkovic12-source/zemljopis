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

    const layer = document.createElement('div');
    layer.className = 'theme-live-v2';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
        <svg viewBox="0 0 941 1672" preserveAspectRatio="none" focusable="false" aria-hidden="true">
            <g class="live-scene live-drzava">
                <path class="live-route" d="M 142 579 Q 375 400 729 559"/>
                <path class="live-route live-route-slow" d="M 215 988 Q 470 725 808 990"/>
                <circle class="live-pulse" cx="153" cy="580" r="16"/>
                <circle class="live-pulse live-lag-1" cx="739" cy="541" r="16"/>
                <circle class="live-pulse live-lag-2" cx="218" cy="1000" r="16"/>
                <circle class="live-pulse live-lag-3" cx="842" cy="998" r="16"/>
            </g>
            <g class="live-scene live-okean">
                <path class="live-water" d="M 160 620 Q 265 604 365 624 T 580 624"/>
                <path class="live-water live-lag-1" d="M 380 820 Q 498 804 633 824 T 835 823"/>
                <path class="live-water live-lag-2" d="M 100 1065 Q 215 1049 344 1067 T 566 1067"/>
                <path class="live-water live-lag-3" d="M 480 1340 Q 608 1325 740 1345"/>
            </g>
            <g class="live-scene live-grad">
                <circle class="live-window" cx="91" cy="532" r="19"/>
                <circle class="live-window live-lag-1" cx="846" cy="596" r="17"/>
                <circle class="live-window live-lag-2" cx="298" cy="628" r="13"/>
                <circle class="live-window live-lag-3" cx="714" cy="660" r="13"/>
                <ellipse class="live-ripple" cx="281" cy="1430" rx="95" ry="26"/>
            </g>
            <g class="live-scene live-planina">
                <ellipse class="live-mist" cx="453" cy="806" rx="320" ry="35"/>
                <ellipse class="live-mist live-lag-2" cx="479" cy="1010" rx="260" ry="25"/>
                <circle class="live-spark" cx="127" cy="297" r="6"/>
                <circle class="live-spark live-lag-2" cx="796" cy="347" r="6"/>
            </g>
            <g class="live-scene live-biljka">
                <circle class="live-mote" cx="225" cy="780" r="5"/>
                <circle class="live-mote live-lag-1" cx="752" cy="1010" r="6"/>
                <circle class="live-mote live-lag-2" cx="350" cy="1180" r="4"/>
                <circle class="live-mote live-lag-3" cx="690" cy="640" r="5"/>
                <circle class="live-mote live-lag-4" cx="510" cy="1390" r="4"/>
            </g>
            <g class="live-scene live-zivotinja">
                <circle class="live-firefly" cx="322" cy="685" r="7"/>
                <circle class="live-firefly live-lag-1" cx="584" cy="812" r="6"/>
                <circle class="live-firefly live-lag-2" cx="441" cy="1020" r="7"/>
                <circle class="live-firefly live-lag-3" cx="721" cy="1180" r="6"/>
                <circle class="live-firefly live-lag-4" cx="183" cy="1232" r="5"/>
            </g>
            <g class="live-scene live-predmet">
                <ellipse class="live-lamp" cx="206" cy="1000" rx="170" ry="110"/>
                <circle class="live-spark" cx="189" cy="455" r="7"/>
                <circle class="live-spark live-lag-1" cx="844" cy="1090" r="7"/>
                <circle class="live-spark live-lag-3" cx="289" cy="1412" r="6"/>
            </g>
        </svg>`;

    const sync = () => {
        document.body.classList.toggle('theme-live-v2-enabled', themes.has(document.body.dataset.tema));
        const active = screens.find((screen) => screen.classList.contains('active'));
        if (active && layer.parentElement !== active) active.appendChild(layer);
        if (!active && layer.parentElement) layer.remove();
        document.body.classList.toggle('theme-live-paused', document.hidden);
    };

    const observer = new MutationObserver(sync);
    screens.forEach((screen) => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-tema'] });
    document.addEventListener('visibilitychange', sync);
    sync();
})();
