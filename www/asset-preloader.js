// asset-preloader.js - Učitava i dekodira kritične vizuale dok je splash još prikazan.
(() => {
    'use strict';

    const STANJE = {
        poslovi: new Map(),
        slike: new Map(),
        pokretanje: null
    };

    const GLAVNI_MENI_SELEKTORI = [
        '#main-menu .status-icon',
        '#main-menu .top-menu-icon',
        '#main-menu .rank-icon-bg',
        '#main-menu .big-mode-icon',
        '#main-menu .sub-mode-icon',
        '#main-menu .daily-challenge-icon',
        '#main-menu .menu-action-icon'
    ];

    const EKRAN_SELEKTORI = {
        'soba-prijatelja-screen': [
            '#soba-prijatelja-screen .screen-pattern-icon',
            '#soba-prijatelja-screen .page-title-icon',
            '#soba-prijatelja-screen .soba-prijatelja-tab-icon'
        ],
        'toplista-screen': [
            '#toplista-screen .screen-pattern-icon',
            '#toplista-screen .page-title-icon',
            '#toplista-screen .toplista-group-tab-icon'
        ],
        'riznica-screen': [
            '#riznica-screen .screen-pattern-icon',
            '#riznica-screen .page-title-icon',
            '#riznica-screen .riznica-tab-ikona'
        ],
        'podesavanja-screen': [
            '#podesavanja-screen .screen-pattern-icon',
            '#podesavanja-screen .page-title-icon',
            '#podesavanja-screen .settings-page-tab-icon',
            '#podesavanja-screen .settings-theme-icon',
            '#podesavanja-screen .settings-footer-action-icon'
        ],
        'global-chat-screen': [
            '#global-chat-screen .screen-pattern-icon',
            '#global-chat-screen .page-title-icon'
        ],
        'kvartalni-nivo-screen': [
            '#kvartalni-nivo-screen .screen-pattern-icon',
            '#kvartalni-nivo-screen .page-title-icon'
        ],
        'trofeji-main-screen': [
            '#trofeji-main-screen .screen-pattern-icon',
            '#trofeji-main-screen .page-title-icon'
        ],
        'online-igraci-screen': [
            '#online-igraci-screen .screen-pattern-icon',
            '#online-igraci-screen .page-title-icon'
        ],
        'tokeni-screen': [
            '#tokeni-screen .screen-pattern-icon',
            '#tokeni-screen .page-title-icon',
            '#tokeni-screen .tokeni-main-icon'
        ]
    };

    const EKRAN_DODATNI_ASSETI = {
        'podesavanja-screen': [
            'assets/avatars/atlas-clay-soft-matte-3d.png',
            'assets/avatars/luna-clay-soft-matte-3d.png',
            'assets/avatars/orion-clay-soft-matte-3d.png',
            'assets/avatars/tara-clay-soft-matte-3d.png',
            'assets/avatars/niko-clay-soft-matte-3d.png',
            'assets/avatars/mila-clay-soft-matte-3d.png',
            'assets/avatars/sava-clay-soft-matte-3d.png',
            'assets/avatars/zara-clay-soft-matte-3d.png',
            'assets/avatars/vuk-clay-soft-matte-3d.png',
            'assets/avatars/iris-clay-soft-matte-3d.png',
            'assets/avatars/leo-clay-soft-matte-3d.png',
            'assets/avatars/nova-clay-soft-matte-3d.png'
        ],
        'kvartalni-nivo-screen': [
            'assets/kvartalni-nivo-istrazivac-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-bronza-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-srebro-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-zlato-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-legenda-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-apsolutni-vladari-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-slavni-medalje-clay-soft-3d-v1.png',
            'assets/kvartalni-nivo-slavni-sampioni-clay-soft-3d-v1.png',
            'assets/toplista-medalja-zlatna-clay-soft-3d.png',
            'assets/toplista-medalja-srebrna-clay-soft-3d.png',
            'assets/toplista-medalja-bronzana-clay-soft-3d.png'
        ]
    };

    const TEMATSKI_ASSETI = {
        drzava: [
            'assets/drzava-static-geo-flags-open-v19.png',
            'assets/drzava-static-geo-africa-gold-clean-v3.png',
            'assets/drzava-clouds-without-russia-v1.png'
        ],
        okean: [
            'assets/reka-soft-matte-bg-v3.png',
            'assets/reka-clouds-layer.png',
            'assets/reka-water-flow-texture-v3.png',
            'assets/reka-water-surface-clean-v2.png'
        ],
        grad: [
            'assets/grad-soft-matte-bg-clean.png',
            'assets/grad-clouds-layer-clean-v3.png'
        ],
        planina: [
            'assets/planina-soft-matte-bg-v3.png',
            'assets/planina-clouds-layer-clean-v3.png'
        ],
        biljka: ['assets/biljka-soft-matte-bg.png'],
        zivotinja: [
            'assets/zivotinja-bg-fox-tail-owl-complete-v2.png',
            'assets/zivotinja-owl-gsap/owl-wing-left-isolated-v3.png',
            'assets/zivotinja-owl-gsap/owl-wing-right-isolated-v3.png',
            'assets/zivotinja-fox-gsap/fox-tail-clean-v2.png'
        ],
        predmet: ['assets/predmet-soft-matte-bg.png']
    };

    function normalizujUrl(url) {
        return new URL(url, document.baseURI).href;
    }

    function trenutnaTema() {
        if (document.body.dataset.tema) return document.body.dataset.tema;
        if (typeof PodesavanjaManager !== 'undefined' && PodesavanjaManager.postavke?.tema) {
            return PodesavanjaManager.postavke.tema;
        }
        return 'drzava';
    }

    function dekodirajSliku(slike) {
        if (!slike?.src && !slike?.currentSrc) return Promise.resolve();

        const url = normalizujUrl(slike.currentSrc || slike.src);
        if (STANJE.poslovi.has(url)) return STANJE.poslovi.get(url);

        try {
            slike.decoding = 'async';
            slike.fetchPriority = 'high';
        } catch (_) {
            // Stariji WebView ignoriše fetchPriority; učitavanje i dalje radi normalno.
        }

        const posao = new Promise(resolve => {
            const zavrsi = () => {
                if (typeof slike.decode !== 'function') {
                    resolve();
                    return;
                }
                slike.decode().catch(() => undefined).then(resolve);
            };

            if (slike.complete && slike.naturalWidth > 0) {
                zavrsi();
                return;
            }

            slike.addEventListener('load', zavrsi, { once: true });
            slike.addEventListener('error', resolve, { once: true });
        });

        STANJE.poslovi.set(url, posao);
        return posao;
    }

    function dekodirajUrl(url) {
        const apsolutniUrl = normalizujUrl(url);
        if (STANJE.poslovi.has(apsolutniUrl)) return STANJE.poslovi.get(apsolutniUrl);

        const slika = new Image();
        slika.decoding = 'async';
        try {
            slika.fetchPriority = 'high';
        } catch (_) {
            // Nije potrebno posebno ponašanje ako WebView nema ovu opciju.
        }

        STANJE.slike.set(apsolutniUrl, slika);
        const posao = new Promise(resolve => {
            slika.addEventListener('load', () => {
                if (typeof slika.decode !== 'function') {
                    resolve();
                    return;
                }
                slika.decode().catch(() => undefined).then(resolve);
            }, { once: true });
            slika.addEventListener('error', resolve, { once: true });
            slika.src = apsolutniUrl;
        });

        STANJE.poslovi.set(apsolutniUrl, posao);
        return posao;
    }

    async function obradiURedovima(stavke, limit = 3) {
        let sledeci = 0;
        const radnik = async () => {
            while (sledeci < stavke.length) {
                const stavka = stavke[sledeci++];
                await stavka();
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, stavke.length) }, radnik));
    }

    function slikeZaSelektore(selektori = []) {
        return selektori.flatMap(selektor => Array.from(document.querySelectorAll(selektor)));
    }

    function pripremiEkran(ekranId) {
        const slike = slikeZaSelektore(EKRAN_SELEKTORI[ekranId]);
        const dodatniAsseti = EKRAN_DODATNI_ASSETI[ekranId] || [];
        const zadaci = [
            ...slike.map(slika => () => dekodirajSliku(slika)),
            ...dodatniAsseti.map(url => () => dekodirajUrl(url))
        ];
        return obradiURedovima(zadaci, 2);
    }

    function pokreni() {
        if (STANJE.pokretanje) return STANJE.pokretanje;

        STANJE.pokretanje = (async () => {
            const glavneSlike = slikeZaSelektore(GLAVNI_MENI_SELEKTORI);
            await obradiURedovima(glavneSlike.map(slika => () => dekodirajSliku(slika)), 3);

            const tema = trenutnaTema();
            const tematskiVizuali = TEMATSKI_ASSETI[tema] || TEMATSKI_ASSETI.drzava;
            await obradiURedovima(tematskiVizuali.map(url => () => dekodirajUrl(url)), 2);

            // Sledeći ekrani se pripremaju posle menija, dok korisnik još bira sledeću akciju.
            const sledeciEkrani = [
                'soba-prijatelja-screen',
                'toplista-screen',
                'riznica-screen',
                'podesavanja-screen',
                'global-chat-screen',
                'online-igraci-screen',
                'tokeni-screen',
                'kvartalni-nivo-screen',
                'trofeji-main-screen'
            ];
            const sledeciZadaci = sledeciEkrani.flatMap(ekranId => [
                ...slikeZaSelektore(EKRAN_SELEKTORI[ekranId]).map(slika => () => dekodirajSliku(slika)),
                ...(EKRAN_DODATNI_ASSETI[ekranId] || []).map(url => () => dekodirajUrl(url))
            ]);
            await obradiURedovima(sledeciZadaci, 2);
        })();

        return STANJE.pokretanje;
    }

    window.AssetPreloader = { pokreni, pripremiEkran };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pokreni, { once: true });
    } else {
        pokreni();
    }
})();
