// kvartalninivo.js - Put oko sveta i Dvorana slavnih povezani sa serverom

const KvartalniNivoManager = {
    // Tvoja lična statistika
    statistika: {
        sezonskiPojmovi: 0,
        svaVremenaPojmovi: 0
    },

    nivoi: [
        {
            id: 0, ime: "Evropa", min: 0, max: 999, boja: "#74b9ff",
            fokus: [1100, 360, 1.95],
            gradovi: [
                [1012, 416, "Madrid"], [1043, 354, "Pariz"], [1001, 315, "London"], [1059, 331, "Amsterdam"], [1100, 333, "Berlin"], [1105, 354, "Prag"], [1120, 365, "Beč"], [1140, 370, "Budimpešta"], [1154, 384, "Beograd"], [1204, 408, "Istanbul"]
            ],
            gradoviDetalj: [
                [320, 600, "Madrid"], [450, 510, "Pariz"], [345, 390, "London"], [474, 455, "Amsterdam"], [620, 450, "Berlin"], [640, 500, "Prag"], [690, 530, "Beč"], [740, 540, "Budimpešta"], [760, 585, "Beograd"], [890, 610, "Istanbul"]
            ]
        },
        {
            id: 1, ime: "Azija", min: 1000, max: 2499, boja: "#f5af19",
            fokus: [1510, 450, 1.7],
            gradovi: [[1204, 408, "Istanbul"], [1280, 430, "Teheran"], [1380, 490, "Delhi"], [1532, 530, "Bangkok"], [1538, 580, "Singapur"], [1650, 375, "Peking"], [1805, 360, "Tokio"]]
        },
        {
            id: 2, ime: "Australija i Okeanija", min: 2500, max: 4999, boja: "#38d9a9",
            fokus: [1800, 730, 1.75],
            gradovi: [[1685, 695, "Pert"], [1782, 790, "Melburn"], [1837, 750, "Sidnej"], [1844, 660, "Port Morsbi"], [1980, 820, "Okland"]]
        },
        {
            id: 3, ime: "Severna Amerika", min: 5000, max: 7499, boja: "#ff8a65",
            fokus: [380, 400, 1.8],
            gradovi: [[312, 286, "Vankuver"], [338, 314, "Sijetl"], [348, 402, "San Francisko"], [366, 440, "Los Anđeles"], [444, 518, "Meksiko Siti"], [579, 539, "Havana"]]
        },
        {
            id: 4, ime: "Južna Amerika", min: 7500, max: 9499, boja: "#9ccc65",
            fokus: [680, 700, 1.8],
            gradovi: [[620, 585, "Bogota"], [630, 640, "Kito"], [625, 700, "Lima"], [690, 720, "La Paz"], [680, 850, "Santijago"], [752, 820, "Buenos Ajres"], [790, 740, "Rio de Žaneiro"]]
        },
        {
            id: 5, ime: "Afrika", min: 9500, max: Infinity, cilj: 12000, boja: "#f4c36a",
            fokus: [1100, 620, 1.8],
            gradovi: [[974, 458, "Kazablanka"], [1015, 472, "Alžir"], [1174, 506, "Kairo"], [1175, 645, "Najrobi"], [1186, 682, "Dar es Salam"], [1128, 860, "Kejptaun"], [1132, 978, "Antarktik"]]
        }
    ],

    aktivniTab: 'sezona',
    aktivniNivoTab: 0,
    aktivniSlavniTab: 'medalje',
    ucitavanje: false,
    slanjeUToku: false,
    dogadjajiNaCekanju: [],
    poslatiDogadjaji: [],
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,
    mapaTransform: { nivoId: null, skala: 1, x: 0, y: 0, postavljena: false, detaljEvropa: false },
    antarktikPrag: 12000,

    // Ovde se smeštaju podaci koji stignu iz MongoDB/Servera
    serverPodaci: {
        sezona: [[], [], [], [], [], []],
        svaVremena: [],
        medalje: [],
        sampioni: []
    },

    init: function() {
        let sacuvano = localStorage.getItem('zemljopis_kvartal');
        if (sacuvano) {
            try {
                this.statistika = { ...this.statistika, ...JSON.parse(sacuvano) };
            } catch (error) {
                console.warn("Sačuvana kvartalna statistika nije ispravna.", error);
            }
        }
        try {
            this.dogadjajiNaCekanju = JSON.parse(
                localStorage.getItem('zemljopis_kvartal_cekanje') || "[]"
            );
            this.poslatiDogadjaji = JSON.parse(
                localStorage.getItem('zemljopis_kvartal_poslato') || "[]"
            );
        } catch (error) {
            this.dogadjajiNaCekanju = [];
            this.poslatiDogadjaji = [];
        }
        this.azurirajBedzUMeniju();
    },

    // --- SLANJE POGOĐENIH POJMOVA NA SERVER ---
    dodajPojmove: function(broj, dogadjajId = null) {
        broj = Number(broj);
        if (!Number.isInteger(broj) || broj <= 0 || broj > 7) return;

        const id = dogadjajId || `kv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        if (
            this.poslatiDogadjaji.includes(id)
            || this.dogadjajiNaCekanju.some(dogadjaj => dogadjaj.dogadjajId === id)
        ) {
            return;
        }

        this.statistika.sezonskiPojmovi += broj;
        this.statistika.svaVremenaPojmovi += broj;
        this.dogadjajiNaCekanju.push({ broj, dogadjajId: id });
        localStorage.setItem('zemljopis_kvartal', JSON.stringify(this.statistika));
        this.sacuvajRedSlanja();
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
        this.azurirajBedzUMeniju();
        this.posaljiDogadjajeNaCekanju();
    },

    normalizujDogadjajId: function(vrednost, rezervnaVrednost = "dogadjaj") {
        const normalizovano = String(vrednost || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 70);
        return normalizovano || rezervnaVrednost;
    },

    dodajDnevnePojmove: function(broj, datum) {
        const datumId = this.normalizujDogadjajId(datum, "nepoznat_datum");
        this.dodajPojmove(broj, `dnevni:${datumId}`);
    },

    dodajTurnirskePojmove: function(broj, turnirId, runda) {
        const brojRunde = Math.floor(Number(runda));
        if (!Number.isInteger(brojRunde) || brojRunde < 1) return;

        const bezbedanTurnirId = this.normalizujDogadjajId(turnirId, "turnir");
        this.dodajPojmove(broj, `turnir:${bezbedanTurnirId}:r${brojRunde}`);
    },

    dodajPojmoveUSerijama: function(broj, dogadjajId) {
        broj = Math.floor(Number(broj));
        if (!Number.isInteger(broj) || broj <= 0 || !dogadjajId) return 0;

        let preostalo = broj;
        let deo = 0;

        while (preostalo > 0) {
            const kolicina = Math.min(7, preostalo);
            this.dodajPojmove(kolicina, `${dogadjajId}:deo${deo}`);
            preostalo -= kolicina;
            deo++;
        }

        return broj;
    },

    sacuvajRedSlanja: function() {
        localStorage.setItem(
            'zemljopis_kvartal_cekanje',
            JSON.stringify(this.dogadjajiNaCekanju.slice(-100))
        );
        localStorage.setItem(
            'zemljopis_kvartal_poslato',
            JSON.stringify(this.poslatiDogadjaji.slice(-300))
        );
    },

    posaljiDogadjajeNaCekanju: function() {
        if (
            this.slanjeUToku
            || this.dogadjajiNaCekanju.length === 0
            || typeof Game === 'undefined'
            || !Game.socket
            || !Game.socket.connected
        ) {
            return;
        }

        this.slanjeUToku = true;
        const dogadjaj = this.dogadjajiNaCekanju[0];
        Game.socket.timeout(10000).emit('dodajPojmove', dogadjaj, (greska, odgovor) => {
            this.slanjeUToku = false;
            if (greska || !odgovor || !odgovor.uspeh) return;

            this.dogadjajiNaCekanju = this.dogadjajiNaCekanju
                .filter(stavka => stavka.dogadjajId !== dogadjaj.dogadjajId);
            this.poslatiDogadjaji.push(dogadjaj.dogadjajId);
            this.poslatiDogadjaji = this.poslatiDogadjaji.slice(-300);
            this.sacuvajRedSlanja();
            this.primiMojePodatke(odgovor.statistika);
            this.posaljiDogadjajeNaCekanju();

            const ekran = document.getElementById('kvartalni-nivo-screen');
            if (
                this.dogadjajiNaCekanju.length === 0
                && ekran
                && ekran.classList.contains('active')
            ) {
                this.ucitavanje = true;
                Game.socket.emit('traziKvartalneListe');
            }
        });
    },

    // --- PRIJEM PODATAKA SA SERVERA ---
    primiMojePodatke: function(podaci) {
        if (!podaci) return;
        const prethodniBroj = this.statistika.sezonskiPojmovi || 0;
        this.statistika.sezonskiPojmovi = podaci.sezonskiPojmovi || 0;
        this.statistika.svaVremenaPojmovi = podaci.svaVremenaPojmovi || 0;
        localStorage.setItem('zemljopis_kvartal', JSON.stringify(this.statistika));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
        this.azurirajBedzUMeniju();
        if (prethodniBroj < this.antarktikPrag && this.statistika.sezonskiPojmovi >= this.antarktikPrag) {
            this.prikaziDolazakNaAntarktik();
        }
        this.posaljiDogadjajeNaCekanju();
    },

    prikaziDolazakNaAntarktik: function() {
        document.getElementById('antarktik-dolazak-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'antarktik-dolazak-overlay';
        overlay.className = 'antarktik-dolazak-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'assertive');
        overlay.innerHTML = `
            <div class="antarktik-ledeni-sjaj"></div>
            <img class="antarktik-realisticni-led" src="assets/antarktik-realisticni-led-v1.png" alt="" aria-hidden="true">
            <div class="antarktik-pahulje" aria-hidden="true">✦ ❄ ✧ ❅ ✦ ❄ ✧</div>
            <div class="antarktik-dolazak-sadrzaj">
                <div class="antarktik-kruna" aria-hidden="true"><i class="fa-solid fa-crown"></i></div>
                <span>ZAVRŠNA TAČKA</span>
                <strong>STIGLI STE NA ANTARKTIK</strong>
                <p>Od Rta dobre nade do ledene krune sveta.</p>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                const ekran = document.getElementById('kvartalni-nivo-screen');
                if (ekran?.classList.contains('active')) this.renderEkran();
            }, 500);
        }, 5200);
    },

    primiTopListe: function(podaci) {
        this.ucitavanje = false;
        this.serverPodaci = {
            sezona: Array.isArray(podaci && podaci.sezona) ? podaci.sezona : [[], [], [], [], [], []],
            svaVremena: Array.isArray(podaci && podaci.svaVremena) ? podaci.svaVremena : [],
            medalje: Array.isArray(podaci && podaci.medalje) ? podaci.medalje : [],
            sampioni: Array.isArray(podaci && podaci.sampioni) ? podaci.sampioni : []
        };
        const ekran = document.getElementById('kvartalni-nivo-screen');
        if (ekran && (ekran.classList.contains('active') || this.otvaranjeUToku)) {
            this.renderEkran();
        }
    },

    napraviAvatarHTML: function(avatarId) {
        if (typeof PodesavanjaManager !== 'undefined') {
            const avatar = PodesavanjaManager.avatari.find(stavka => stavka.id === avatarId)
                || PodesavanjaManager.avatari[0];
            return PodesavanjaManager.napraviAvatarSvg(avatar);
        }
        return `<i class="fa-solid fa-user-astronaut"></i>`;
    },

    odrediTrenutniNivo: function() {
        let pojmovi = this.statistika.sezonskiPojmovi;
        let trenutni = this.nivoi[0];
        let sledeci = this.nivoi[1];
        let nivoIndex = 1;

        for (let i = 0; i < this.nivoi.length; i++) {
            if (pojmovi >= this.nivoi[i].min && pojmovi <= (this.nivoi[i].max || Infinity)) {
                trenutni = this.nivoi[i];
                sledeci = this.nivoi[i + 1] || null;
                nivoIndex = i + 1;
                break;
            }
        }
        return { trenutni, sledeci, nivoIndex };
    },

    azurirajBedzUMeniju: function() {
        const info = this.odrediTrenutniNivo();
        const span = document.querySelector('.rank-btn span');
        const btn = document.querySelector('.rank-btn');
        if (span) span.innerText = info.nivoIndex;
        if (btn) {
            btn.style.borderColor = info.trenutni.boja;
            btn.style.color = info.trenutni.boja;
            btn.style.boxShadow = `0 0 20px ${info.trenutni.boja}40`;
            const label = btn.querySelector('.rank-label');
            if (label) {
                label.style.background = info.trenutni.boja;
                label.style.color = (info.nivoIndex === 1 || info.nivoIndex === 5) ? '#fff' : '#000';
            }
        }
    },

    otvoriEkran: function() {
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;
        this.aktivniTab = 'sezona';
        const info = this.odrediTrenutniNivo();
        this.aktivniNivoTab = info.trenutni.id; 

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }
        
        // Liste i početni prikaz se pripremaju tokom uvoda.
        if (typeof Game !== 'undefined' && Game.socket) {
            this.ucitavanje = true;
            Game.socket.emit('traziKvartalneListe');
        }

        this.renderEkran();
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('kvartalni-nivo-screen');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('kvartalni-nivo-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--kvartalni-nivo-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            // Ciljni ekran se priprema iza uvoda, bez međukadra glavnog menija.
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('kvartalni-nivo-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('kvartalni-nivo-entering');
        void ekran.offsetWidth;
        ekran.classList.add('kvartalni-nivo-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('kvartalni-nivo-entering'), 720);
    },

    promeniTab: function(tab) {
        this.aktivniTab = tab;
        this.renderEkran();
    },
    promeniNivoTab: function(nivoId) {
        this.aktivniNivoTab = nivoId;
        this.renderEkran();
    },
    promeniSlavniTab: function(tab) {
        this.aktivniSlavniTab = tab;
        this.renderEkran();
    },

    procenatEtape: function(nivo) {
        const krajEtape = nivo.cilj || nivo.max;
        if (krajEtape === Infinity) return 100;
        const raspon = krajEtape - nivo.min;
        if (raspon <= 0) return 100;
        return Math.max(0, Math.min(100, ((this.statistika.sezonskiPojmovi - nivo.min) / raspon) * 100));
    },

    renderMapaPutaHTML: function(info) {
        const nivo = info.trenutni;
        const procenat = this.procenatEtape(nivo);
        const antarktikDostignut = nivo.ime === 'Afrika' && this.statistika.sezonskiPojmovi >= (nivo.cilj || Infinity);
        const sledecaEtapa = antarktikDostignut
            ? 'Kruna Antarktika je osvojena'
            : nivo.cilj
            ? 'Sledeće odredište: Antarktik'
            : info.sledeci
            ? `Sledeća etapa: ${info.sledeci.ime}`
            : 'Završio si put oko sveta!';
        const doCilja = antarktikDostignut
            ? 'Pojmovi se sada skupljaju na završnoj tački'
            : nivo.cilj
            ? `${Math.max(0, nivo.cilj - this.statistika.sezonskiPojmovi)} pojmova do Antarktika`
            : nivo.max === Infinity
            ? 'Završna etapa'
            : `${Math.max(0, nivo.max - this.statistika.sezonskiPojmovi)} pojmova do sledećeg kontinenta`;

        return `
            <section class="put-oko-sveta-route-card" style="--put-boja: ${nivo.boja}; --put-napredak: ${procenat};">
                <div class="put-oko-sveta-route-heading">
                    <div>
                        <span>AKTUELNA ETAPA</span>
                        <h3>${nivo.ime}</h3>
                    </div>
                    <b>${Math.round(procenat)}%</b>
                </div>
                <div id="put-oko-sveta-viewport" class="put-oko-sveta-viewport" aria-label="Interaktivna mapa sveta. Uvećaj ili pomeraj prstima.">
                <svg id="put-oko-sveta-mapa" class="put-oko-sveta-map" viewBox="0 0 2048 1024" role="img" aria-label="Put kroz ${nivo.ime}">
                    <defs>
                        <linearGradient id="kopno-${nivo.id}" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stop-color="#2c6888" />
                            <stop offset="1" stop-color="#13334d" />
                        </linearGradient>
                        <filter id="sjaj-${nivo.id}" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="5" result="zamagljenje" />
                            <feMerge><feMergeNode in="zamagljenje" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <image class="put-svetska-mapa" href="assets/put-oko-sveta-svetska-mapa-bez-teksta-v1.png" width="2048" height="1024" />
                    <rect class="put-svetska-mapa-izmaglica" width="2048" height="1024" />
                    <image class="put-antarktik-na-mapi" href="assets/antarktik-realisticni-led-v1.png" x="982" y="730" width="300" height="300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
                </svg>
                ${nivo.id === 0 ? `
                    <svg id="put-oko-sveta-mapa-evropa-detalj" class="put-oko-sveta-mapa put-evropa-detalj" viewBox="0 0 1536 1024" role="img" aria-label="Detaljna mapa Evrope">
                        <image class="put-svetska-mapa" href="assets/put-oko-sveta-evropa-detalj-v1.png" width="1536" height="1024" />
                        <rect class="put-svetska-mapa-izmaglica" width="1536" height="1024" />
                    </svg>
                ` : ''}
                </div>
                <div class="put-oko-sveta-route-footer">
                    <span>${doCilja}</span>
                    <b>${sledecaEtapa}</b>
                </div>
            </section>
        `;
    },

    primeniMapuTransform: function() {
        const mapa = document.getElementById('put-oko-sveta-mapa');
        const detaljEvrope = document.getElementById('put-oko-sveta-mapa-evropa-detalj');
        const viewport = document.getElementById('put-oko-sveta-viewport');
        if (!mapa) return;
        const stanje = this.mapaTransform;
        mapa.style.transform = `translate(${stanje.x}px, ${stanje.y}px) scale(${stanje.skala})`;
        if (detaljEvrope) detaljEvrope.style.transform = `translate(${stanje.x}px, ${stanje.y}px) scale(${stanje.skala})`;
        if (viewport) viewport.classList.toggle('evropa-detalj-active', Boolean(stanje.detaljEvropa));
    },

    ogranicIMapuTransform: function(viewport) {
        const sirina = viewport.clientWidth;
        const visina = viewport.clientHeight;
        const osnovnaVisina = this.mapaTransform.detaljEvropa ? sirina * (2 / 3) : sirina / 2;
        const prikazanaSirina = sirina * this.mapaTransform.skala;
        const prikazanaVisina = osnovnaVisina * this.mapaTransform.skala;
        const centarX = (sirina - prikazanaSirina) / 2;
        const centarY = (visina - prikazanaVisina) / 2;
        this.mapaTransform.x = prikazanaSirina <= sirina
            ? centarX
            : Math.min(0, Math.max(sirina - prikazanaSirina, this.mapaTransform.x));
        this.mapaTransform.y = prikazanaVisina <= visina
            ? centarY
            : Math.min(0, Math.max(visina - prikazanaVisina, this.mapaTransform.y));
    },

    prebaciNaDetaljEvrope: function(nivo, viewport) {
        if (nivo.id !== 0 || this.mapaTransform.detaljEvropa || this.mapaTransform.skala < 2.25) return;
        const sirina = viewport.clientWidth;
        const visina = viewport.clientHeight;
        const osnovnaVisina = sirina * (2 / 3);
        const skala = 1.16;
        this.mapaTransform = {
            ...this.mapaTransform,
            detaljEvropa: true,
            skala,
            x: (sirina / 2) - ((690 / 1536) * sirina * skala),
            y: (visina / 2) - ((530 / 1024) * osnovnaVisina * skala)
        };
    },

    vratiNaCeluSvetskuMapu: function(nivo) {
        if (nivo.id !== 0 || !this.mapaTransform.detaljEvropa || this.mapaTransform.skala > 1.05) return;
        this.mapaTransform = {
            ...this.mapaTransform,
            detaljEvropa: false,
            skala: 1,
            x: 0,
            y: 0
        };
    },

    pripremiInteraktivnuMapu: function(info) {
        const viewport = document.getElementById('put-oko-sveta-viewport');
        const mapa = document.getElementById('put-oko-sveta-mapa');
        if (!viewport || !mapa) return;

        if (viewport.clientWidth === 0 || viewport.clientHeight === 0) {
            requestAnimationFrame(() => this.pripremiInteraktivnuMapu(info));
            return;
        }

        const nivo = info.trenutni;
        if (this.mapaTransform.nivoId !== nivo.id || !this.mapaTransform.postavljena) {
            const [fokusX, fokusY, skala] = nivo.fokus || [1024, 512, 1];
            const sirina = viewport.clientWidth;
            const visina = viewport.clientHeight;
            const osnovnaVisina = sirina / 2;
            this.mapaTransform = {
                nivoId: nivo.id,
                skala,
                x: (sirina / 2) - ((fokusX / 2048) * sirina * skala),
                y: (visina / 2) - ((fokusY / 1024) * osnovnaVisina * skala),
                postavljena: true,
                detaljEvropa: false
            };
        }
        this.ogranicIMapuTransform(viewport);
        this.primeniMapuTransform();

        const dodiri = new Map();
        let prethodniRazmak = 0;
        let prethodnaTacka = null;
        const razmak = () => {
            const tacke = [...dodiri.values()];
            return tacke.length < 2 ? 0 : Math.hypot(tacke[0].x - tacke[1].x, tacke[0].y - tacke[1].y);
        };

        viewport.addEventListener('pointerdown', dogadjaj => {
            viewport.setPointerCapture(dogadjaj.pointerId);
            dodiri.set(dogadjaj.pointerId, { x: dogadjaj.clientX, y: dogadjaj.clientY });
            prethodniRazmak = razmak();
            prethodnaTacka = { x: dogadjaj.clientX, y: dogadjaj.clientY };
        });
        viewport.addEventListener('pointermove', dogadjaj => {
            if (!dodiri.has(dogadjaj.pointerId)) return;
            dogadjaj.preventDefault();
            const prethodna = dodiri.get(dogadjaj.pointerId);
            dodiri.set(dogadjaj.pointerId, { x: dogadjaj.clientX, y: dogadjaj.clientY });
            if (dodiri.size === 2) {
                const noviRazmak = razmak();
                if (prethodniRazmak) this.mapaTransform.skala = Math.max(1, Math.min(4, this.mapaTransform.skala * (noviRazmak / prethodniRazmak)));
                prethodniRazmak = noviRazmak;
            } else if (prethodna && prethodnaTacka) {
                this.mapaTransform.x += dogadjaj.clientX - prethodnaTacka.x;
                this.mapaTransform.y += dogadjaj.clientY - prethodnaTacka.y;
            }
            prethodnaTacka = { x: dogadjaj.clientX, y: dogadjaj.clientY };
            this.vratiNaCeluSvetskuMapu(nivo);
            this.prebaciNaDetaljEvrope(nivo, viewport);
            this.ogranicIMapuTransform(viewport);
            this.primeniMapuTransform();
        });
        const zavrsiDodir = dogadjaj => {
            dodiri.delete(dogadjaj.pointerId);
            prethodniRazmak = razmak();
        };
        viewport.addEventListener('pointerup', zavrsiDodir);
        viewport.addEventListener('pointercancel', zavrsiDodir);
        viewport.addEventListener('wheel', dogadjaj => {
            dogadjaj.preventDefault();
            this.mapaTransform.skala = Math.max(1, Math.min(4, this.mapaTransform.skala * (dogadjaj.deltaY < 0 ? 1.12 : 0.88)));
            this.vratiNaCeluSvetskuMapu(nivo);
            this.prebaciNaDetaljEvrope(nivo, viewport);
            this.ogranicIMapuTransform(viewport);
            this.primeniMapuTransform();
        }, { passive: false });
    },

    renderEkran: function() {
        const sadrzaj = document.getElementById('kvartalni-nivo-sadrzaj');
        
        let html = `
            <div class="kvartal-main-tabs" role="tablist" aria-label="Put oko sveta">
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'sezona' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('sezona')">Moj put</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'svaVremena' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('svaVremena')">Rekordi</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'slavni' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('slavni')">Dvorana slavnih</button>
            </div>
        `;

        if (this.aktivniTab === 'sezona') html += this.renderSezonaHTML();
        else if (this.aktivniTab === 'svaVremena') html += this.renderSvaVremenaHTML();
        else if (this.aktivniTab === 'slavni') html += this.renderSlavniHTML();

        sadrzaj.className = `kvartalni-nivo-lista kvartalni-nivo-${this.aktivniTab}`;
        sadrzaj.innerHTML = html;
    },

    renderSezonaHTML: function() {
        const info = this.odrediTrenutniNivo();
        let html = `
            <section class="kvartal-summary-card" style="--kvartal-nivo-boja: ${info.trenutni.boja};">
                <div class="kvartal-summary-copy">
                    <span class="kvartal-eyebrow">Tvoj istraživački rang</span>
                    <strong class="kvartal-current-level">${info.trenutni.ime}</strong>
                    <span class="kvartal-route-copy">Etapa ${info.nivoIndex} od ${this.nivoi.length} na putu oko sveta</span>
                </div>
                <div class="kvartal-summary-score">
                    <strong>${this.statistika.sezonskiPojmovi}</strong>
                    <span><i class="fa-solid fa-check-double" aria-hidden="true"></i> pojmova</span>
                </div>
            </section>
        `;

        html += this.renderMapaPutaHTML(info);

        const izabraniNivo = info.trenutni;
        const listaIgraca = this.serverPodaci.sezona[izabraniNivo.id] || [];

        html += `<section class="kvartal-ranking-card" style="--kvartal-nivo-boja: ${izabraniNivo.boja};">`;
        html += `<h4 class="kvartal-ranking-title">Istraživači: <span>${izabraniNivo.ime}</span></h4>`;

        if (listaIgraca.length === 0) {
            html += `<div class="kvartal-empty-state">${this.ucitavanje ? 'Učitavanje istraživača...' : 'Još nema istraživača u ovom rangu.'}</div>`;
        } else {
            listaIgraca.forEach((igrac, index) => {
                html += `
                    <article class="kvartal-ranking-row">
                        <div class="kvartal-ranking-player">
                            <b class="kvartal-ranking-position">${index + 1}.</b>
                            <div class="kvartal-avatar kvartal-avatar-level">${this.napraviAvatarHTML(igrac.avatar)}</div>
                            <span class="kvartal-player-name">${igrac.ime}</span>
                        </div>
                        <strong class="kvartal-row-score">${igrac.pojmovi}</strong>
                    </article>
                `;
            });
        }
        html += `</section>`;

        requestAnimationFrame(() => this.pripremiInteraktivnuMapu(info));

        return html;
    },

    renderSvaVremenaHTML: function() {
        let html = `
            <div class="kvartal-heading">
                <img class="kvartal-all-time-icon" src="assets/kvartalni-nivo-apsolutni-vladari-clay-soft-3d-v1.png" alt="" aria-hidden="true" decoding="async">
                <h3>Svetski rekorderi</h3>
                <p>Najviše pogođenih pojmova u istoriji igre.</p>
            </div>
            <section class="kvartal-ranking-card kvartal-all-time-card">
        `;

        if (!this.serverPodaci.svaVremena || this.serverPodaci.svaVremena.length === 0) {
            html += `<div class="kvartal-empty-state">${this.ucitavanje ? 'Učitavanje podataka sa servera...' : 'Još nema upisanih rezultata.'}</div>`;
        } else {
            const medalje = [
                { src: 'assets/toplista-medalja-zlatna-clay-soft-3d.png', alt: 'Prvo mesto' },
                { src: 'assets/toplista-medalja-srebrna-clay-soft-3d.png', alt: 'Drugo mesto' },
                { src: 'assets/toplista-medalja-bronzana-clay-soft-3d.png', alt: 'Treće mesto' }
            ];

            this.serverPodaci.svaVremena.forEach((igrac, index) => {
                const kruna = index === 0 ? `<i class="fa-solid fa-crown kvartal-crown" aria-label="Prvo mesto"></i>` : '';
                const medalja = index < medalje.length
                    ? `<img class="kvartal-all-time-medal" src="${medalje[index].src}" alt="${medalje[index].alt}" decoding="async">`
                    : `<b class="kvartal-ranking-position">${index + 1}.</b>`;

                html += `
                    <article class="kvartal-ranking-row kvartal-all-time-row ${index === 0 ? 'first-place' : ''}">
                        <div class="kvartal-ranking-player">
                            <span class="kvartal-all-time-medal-slot">${medalja}</span>
                            <div class="kvartal-avatar kvartal-avatar-all-time ${index < 3 ? 'top-three' : ''}">
                                ${this.napraviAvatarHTML(igrac.avatar)}
                                ${kruna}
                            </div>
                            <span class="kvartal-player-name">${igrac.ime}</span>
                        </div>
                        <strong class="kvartal-row-score all-time">${igrac.pojmovi}</strong>
                    </article>
                `;
            });
        }
        html += `</section>`;
        return html;
    },

    renderSlavniHTML: function() {
        let html = `
            <div class="kvartal-legend-tabs" role="tablist" aria-label="Slavni igrači">
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniSlavniTab === 'medalje' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniSlavniTab('medalje')"><img class="kvartal-legend-tab-icon" src="assets/kvartalni-nivo-slavni-medalje-clay-soft-3d-v1.png" alt="" aria-hidden="true" decoding="async"> Medalje</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniSlavniTab === 'sampioni' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniSlavniTab('sampioni')"><img class="kvartal-legend-tab-icon" src="assets/kvartalni-nivo-slavni-sampioni-clay-soft-3d-v1.png" alt="" aria-hidden="true" decoding="async"> Pobednici</button>
            </div>
        `;

        if (this.aktivniSlavniTab === 'medalje') {
            html += `<p class="kvartal-info-copy">Igrači koji su završili u TOP 3 tokom bilo koje ekspedicije.</p>`;
            
            if (!this.serverPodaci.medalje || this.serverPodaci.medalje.length === 0) {
                html += `<div class="kvartal-empty-card"><div class="kvartal-empty-state">Čekamo prve osvajače medalja...</div></div>`;
            } else {
                this.serverPodaci.medalje.forEach((igrac, index) => {
                    html += `
                        <article class="kvartal-medal-card">
                            <div class="kvartal-medal-player">
                                <b class="kvartal-medal-position">${index + 1}.</b>
                                <div class="kvartal-avatar kvartal-avatar-medal">${this.napraviAvatarHTML(igrac.avatar)}</div>
                                <span class="kvartal-player-name">${igrac.ime}</span>
                            </div>
                            <div class="kvartal-medal-counts">
                                <div class="kvartal-medal-count gold"><img class="kvartal-medal-count-icon" src="assets/toplista-medalja-zlatna-clay-soft-3d.png" alt="Zlatna medalja" decoding="async"><b>${igrac.zlato || 0}</b></div>
                                <div class="kvartal-medal-count silver"><img class="kvartal-medal-count-icon" src="assets/toplista-medalja-srebrna-clay-soft-3d.png" alt="Srebrna medalja" decoding="async"><b>${igrac.srebro || 0}</b></div>
                                <div class="kvartal-medal-count bronze"><img class="kvartal-medal-count-icon" src="assets/toplista-medalja-bronzana-clay-soft-3d.png" alt="Bronzana medalja" decoding="async"><b>${igrac.bronza || 0}</b></div>
                            </div>
                        </article>
                    `;
                });
            }
        } else {
            html += `<p class="kvartal-info-copy">Osvajači prvog mesta na kraju svake tromesečne ekspedicije.</p>`;
            
            if (!this.serverPodaci.sampioni || this.serverPodaci.sampioni.length === 0) {
                html += `<div class="kvartal-empty-card"><div class="kvartal-empty-state">Čekamo prve pobednike ekspedicije...</div></div>`;
            } else {
                this.serverPodaci.sampioni.forEach(igrac => {
                    html += `
                        <article class="kvartal-champion-card">
                            <div class="kvartal-champion-trophy">
                                <img class="kvartal-champion-trophy-icon" src="assets/kvartalni-nivo-slavni-sampioni-clay-soft-3d-v1.png" alt="Pehar šampiona" decoding="async">
                            </div>
                            <div class="kvartal-champion-copy">
                                <div class="kvartal-champion-cycle">${igrac.ciklus}</div>
                                <div class="kvartal-champion-player">
                                    <div class="kvartal-avatar kvartal-avatar-champion">${this.napraviAvatarHTML(igrac.avatar)}</div>
                                    <span class="kvartal-player-name">${igrac.ime}</span>
                                </div>
                                <div class="kvartal-champion-score"><b>${igrac.poeni}</b> pojmova ukupno</div>
                            </div>
                        </article>
                    `;
                });
            }
        }

        return html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { KvartalniNivoManager.init(); }, 500);
});
