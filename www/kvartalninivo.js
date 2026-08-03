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
            fokus: [1045, 130, 3.25],
            gradovi: [
                [946, 207, "Sevilja"], [958, 195, "Madrid"], [963, 176, "Bilbao"], [1007, 160, "Pariz"], [990, 140, "London"], [1024, 145, "Amsterdam"], [1054, 145, "Berlin"], [1063, 165, "Prag"], [1075, 172, "Beč"], [1090, 176, "Budimpešta"], [1106, 187, "Beograd"], [1123, 195, "Sofija"], [1150, 207, "Istanbul"]
            ],
            gradoviDetalj: [
                [300, 760, "Sevilja"], [312, 706, "Madrid"], [310, 662, "Bilbao"], [435, 558, "Pariz"], [355, 415, "London"], [480, 478, "Amsterdam"], [665, 474, "Berlin"], [690, 535, "Prag"], [733, 562, "Beč"], [780, 572, "Budimpešta"], [805, 612, "Beograd"], [850, 633, "Sofija"], [910, 657, "Istanbul"]
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
    mapLibreInstanca: null,
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
                    <div id="put-oko-sveta-vektorska-mapa" class="put-oko-sveta-vektorska-mapa" role="img" aria-label="Vektorska mapa sveta: ${nivo.ime}"></div>
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
        if (!mapa) return;
        const stanje = this.mapaTransform;
        mapa.style.transform = `translate(${stanje.x}px, ${stanje.y}px) scale(${stanje.skala})`;
    },

    ogranicIMapuTransform: function(viewport) {
        const sirina = viewport.clientWidth;
        const visina = viewport.clientHeight;
        const osnovnaVisina = sirina * (1490 / 2048);
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
            const osnovnaVisina = sirina * (1490 / 2048);
            this.mapaTransform = {
                nivoId: nivo.id,
                skala,
                x: (sirina / 2) - ((fokusX / 2048) * sirina * skala),
                y: (visina / 2) - (((fokusY + 230) / 1490) * osnovnaVisina * skala),
                postavljena: true,
                detaljEvropa: false
            };
        }
        this.ogranicIMapuTransform(viewport);
        this.primeniMapuTransform();

        const dodiri = new Map();
        let prethodniRazmak = 0;
        const razmak = () => {
            const tacke = [...dodiri.values()];
            return tacke.length < 2 ? 0 : Math.hypot(tacke[0].x - tacke[1].x, tacke[0].y - tacke[1].y);
        };
        const sredisteDodira = () => {
            const tacke = [...dodiri.values()];
            if (tacke.length < 2) return null;
            const okvir = viewport.getBoundingClientRect();
            return {
                x: ((tacke[0].x + tacke[1].x) / 2) - okvir.left,
                y: ((tacke[0].y + tacke[1].y) / 2) - okvir.top
            };
        };
        let prethodnoSrediste = null;

        viewport.addEventListener('pointerdown', dogadjaj => {
            viewport.setPointerCapture(dogadjaj.pointerId);
            dodiri.set(dogadjaj.pointerId, { x: dogadjaj.clientX, y: dogadjaj.clientY });
            prethodniRazmak = razmak();
            prethodnoSrediste = sredisteDodira();
        });
        viewport.addEventListener('pointermove', dogadjaj => {
            if (!dodiri.has(dogadjaj.pointerId)) return;
            dogadjaj.preventDefault();
            const prethodna = dodiri.get(dogadjaj.pointerId);
            dodiri.set(dogadjaj.pointerId, { x: dogadjaj.clientX, y: dogadjaj.clientY });
            if (dodiri.size === 2) {
                const noviRazmak = razmak();
                const novoSrediste = sredisteDodira();
                if (prethodniRazmak && prethodnoSrediste && novoSrediste) {
                    const staraSkala = this.mapaTransform.skala;
                    const novaSkala = Math.max(1, Math.min(6, staraSkala * (noviRazmak / prethodniRazmak)));
                    const lokalnoX = (prethodnoSrediste.x - this.mapaTransform.x) / staraSkala;
                    const lokalnoY = (prethodnoSrediste.y - this.mapaTransform.y) / staraSkala;
                    this.mapaTransform.skala = novaSkala;
                    this.mapaTransform.x = novoSrediste.x - (lokalnoX * novaSkala);
                    this.mapaTransform.y = novoSrediste.y - (lokalnoY * novaSkala);
                }
                prethodniRazmak = noviRazmak;
                prethodnoSrediste = novoSrediste;
            } else if (prethodna) {
                this.mapaTransform.x += dogadjaj.clientX - prethodna.x;
                this.mapaTransform.y += dogadjaj.clientY - prethodna.y;
            }
            this.ogranicIMapuTransform(viewport);
            this.primeniMapuTransform();
        });
        const zavrsiDodir = dogadjaj => {
            dodiri.delete(dogadjaj.pointerId);
            prethodniRazmak = razmak();
            prethodnoSrediste = sredisteDodira();
        };
        viewport.addEventListener('pointerup', zavrsiDodir);
        viewport.addEventListener('pointercancel', zavrsiDodir);
        viewport.addEventListener('wheel', dogadjaj => {
            dogadjaj.preventDefault();
            const okvir = viewport.getBoundingClientRect();
            const fokusX = dogadjaj.clientX - okvir.left;
            const fokusY = dogadjaj.clientY - okvir.top;
            const staraSkala = this.mapaTransform.skala;
            const novaSkala = Math.max(1, Math.min(6, staraSkala * (dogadjaj.deltaY < 0 ? 1.12 : 0.88)));
            const lokalnoX = (fokusX - this.mapaTransform.x) / staraSkala;
            const lokalnoY = (fokusY - this.mapaTransform.y) / staraSkala;
            this.mapaTransform.skala = novaSkala;
            this.mapaTransform.x = fokusX - (lokalnoX * novaSkala);
            this.mapaTransform.y = fokusY - (lokalnoY * novaSkala);
            this.ogranicIMapuTransform(viewport);
            this.primeniMapuTransform();
        }, { passive: false });
    },

    evropskaRutaKoordinate: function() {
        return [
            [-5.99, 37.39], [-3.70, 40.42], [-2.93, 43.26], [2.35, 48.86],
            [-0.13, 51.51], [4.90, 52.37], [13.40, 52.52], [14.44, 50.08],
            [16.37, 48.21], [19.04, 47.50], [20.45, 44.79], [23.32, 42.70], [28.98, 41.01]
        ];
    },

    skratiRutu: function(tacke, procenat) {
        if (procenat <= 0) return [tacke[0], tacke[0]];
        if (procenat >= 100) return tacke;
        const uMerkator = sirina => Math.log(Math.tan((Math.PI / 4) + ((sirina * Math.PI / 180) / 2)));
        const izMerkatora = y => ((2 * Math.atan(Math.exp(y))) - (Math.PI / 2)) * 180 / Math.PI;
        const uRadijane = duzina => duzina * Math.PI / 180;
        const duzine = [];
        let ukupno = 0;
        for (let i = 1; i < tacke.length; i++) {
            const dx = uRadijane(tacke[i][0]) - uRadijane(tacke[i - 1][0]);
            const dy = uMerkator(tacke[i][1]) - uMerkator(tacke[i - 1][1]);
            const duzina = Math.hypot(dx, dy);
            duzine.push(duzina);
            ukupno += duzina;
        }
        let preostalo = ukupno * (procenat / 100);
        const rezultat = [tacke[0]];
        for (let i = 1; i < tacke.length; i++) {
            if (preostalo >= duzine[i - 1]) {
                rezultat.push(tacke[i]);
                preostalo -= duzine[i - 1];
                continue;
            }
            const odnos = preostalo / duzine[i - 1];
            const xOd = uRadijane(tacke[i - 1][0]);
            const yOd = uMerkator(tacke[i - 1][1]);
            const xDo = uRadijane(tacke[i][0]);
            const yDo = uMerkator(tacke[i][1]);
            rezultat.push([
                (xOd + ((xDo - xOd) * odnos)) * 180 / Math.PI,
                izMerkatora(yOd + ((yDo - yOd) * odnos))
            ]);
            break;
        }
        return rezultat;
    },

    stajalistaEvrope: function(procenat) {
        const tacke = this.evropskaRutaKoordinate();
        const nazivi = this.naziviGradovaEvrope();
        const uMerkator = sirina => Math.log(Math.tan((Math.PI / 4) + ((sirina * Math.PI / 180) / 2)));
        const kumulativno = [0];
        let ukupno = 0;
        for (let i = 1; i < tacke.length; i++) {
            const dx = (tacke[i][0] - tacke[i - 1][0]) * Math.PI / 180;
            const dy = uMerkator(tacke[i][1]) - uMerkator(tacke[i - 1][1]);
            ukupno += Math.hypot(dx, dy);
            kumulativno.push(ukupno);
        }
        let aktuelniIndeks = tacke.length - 1;
        for (let i = 0; i < tacke.length; i++) {
            if (procenat < ((kumulativno[i] / ukupno) * 100)) {
                aktuelniIndeks = i;
                break;
            }
        }
        return {
            type: 'FeatureCollection',
            features: tacke.map((koordinate, indeks) => ({
                type: 'Feature',
                properties: {
                    naziv: nazivi[indeks],
                    stanje: indeks < aktuelniIndeks ? 'zavrsen' : indeks === aktuelniIndeks ? 'aktuelan' : 'buduci'
                },
                geometry: { type: 'Point', coordinates: koordinate }
            }))
        };
    },

    dodajIkonuStajalista: function(mapa, id, fill, stroke) {
        return new Promise(resolve => {
            if (mapa.hasImage(id)) return resolve();
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="4" y="4" width="20" height="20" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="3"/><rect x="8" y="8" width="12" height="12" rx="2.5" fill="rgba(255,255,255,.18)"/></svg>`;
            const slika = new Image(28, 28);
            slika.onload = () => {
                mapa.addImage(id, slika, { pixelRatio: 2 });
                resolve();
            };
            slika.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        });
    },

    naziviGradovaEvrope: function() {
        const latinica = ['Sevilja', 'Madrid', 'Bilbao', 'Pariz', 'London', 'Amsterdam', 'Berlin', 'Prag', 'Beč', 'Budimpešta', 'Beograd', 'Sofija', 'Istanbul'];
        const cirilica = ['Севиља', 'Мадрид', 'Билбао', 'Париз', 'Лондон', 'Амстердам', 'Берлин', 'Праг', 'Беч', 'Будимпешта', 'Београд', 'Софија', 'Истанбул'];
        return document.body.dataset.pismo === 'cirilica' ? cirilica : latinica;
    },

    rastojanjeIzmedjuTacakaKm: function(prva, druga) {
        const uRadijane = vrednost => vrednost * Math.PI / 180;
        const [duzina1, sirina1] = prva;
        const [duzina2, sirina2] = druga;
        const deltaSirina = uRadijane(sirina2 - sirina1);
        const deltaDuzina = uRadijane(duzina2 - duzina1);
        const a = Math.sin(deltaSirina / 2) ** 2
            + Math.cos(uRadijane(sirina1)) * Math.cos(uRadijane(sirina2)) * Math.sin(deltaDuzina / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    duzinaEvropskeRuteKm: function() {
        const tacke = this.evropskaRutaKoordinate();
        return tacke.slice(1).reduce((ukupno, tacka, indeks) => (
            ukupno + this.rastojanjeIzmedjuTacakaKm(tacke[indeks], tacka)
        ), 0);
    },

    formatirajKilometre: function(kilometri) {
        return new Intl.NumberFormat('sr-RS').format(Math.round(kilometri));
    },

    polozajIgracaNaEtapi: function(pojmovi, nivo) {
        const raspon = Math.max(1, (nivo.cilj || nivo.max) - nivo.min);
        const procenat = Math.max(0, Math.min(1, ((Number(pojmovi) || 0) - nivo.min) / raspon));
        if (nivo.id !== 0) {
            return { kilometri: 0, lokacija: nivo.ime };
        }
        const tacke = this.evropskaRutaKoordinate();
        const nazivi = this.naziviGradovaEvrope();
        const ukupno = this.duzinaEvropskeRuteKm();
        const kilometri = ukupno * procenat;
        let predjeno = 0;
        for (let indeks = 1; indeks < tacke.length; indeks++) {
            predjeno += this.rastojanjeIzmedjuTacakaKm(tacke[indeks - 1], tacke[indeks]);
            if (kilometri < predjeno) return { kilometri, lokacija: `ka ${nazivi[indeks]}` };
        }
        return { kilometri: ukupno, lokacija: nazivi[nazivi.length - 1] };
    },

    dodajNaziveStajalista: function(mapa) {
        if (!window.maplibregl) return;
        const tacke = this.evropskaRutaKoordinate();
        const polozaji = [
            { anchor: 'left', offset: [10, -12] }, { anchor: 'left', offset: [10, 12] },
            { anchor: 'right', offset: [-10, -12] }, { anchor: 'right', offset: [-11, 12] },
            { anchor: 'right', offset: [-11, -12] }, { anchor: 'left', offset: [11, -14] },
            { anchor: 'left', offset: [11, 12] }, { anchor: 'right', offset: [-11, -13] },
            { anchor: 'left', offset: [11, 12] }, { anchor: 'right', offset: [-11, 13] },
            { anchor: 'left', offset: [11, -13] }, { anchor: 'right', offset: [-11, 13] },
            { anchor: 'left', offset: [11, -13] }
        ];
        const oznake = tacke.map((koordinate, indeks) => {
            const element = document.createElement('span');
            element.className = 'put-oko-sveta-oznaka-grada';
            new maplibregl.Marker({ element, anchor: polozaji[indeks].anchor, offset: polozaji[indeks].offset })
                .setLngLat(koordinate)
                .addTo(mapa);
            return element;
        });
        const osvezi = () => {
            const zum = mapa.getZoom();
            const velicina = Math.max(7.4, Math.min(12.4, 7.4 + ((zum - 1.7) * 1.7)));
            const vidljivost = Math.max(0, Math.min(0.88, (zum - 1.35) * 1.4));
            const nazivi = this.naziviGradovaEvrope();
            oznake.forEach((element, indeks) => {
                element.textContent = nazivi[indeks];
                element.style.fontSize = `${velicina}px`;
                element.style.opacity = vidljivost;
            });
        };
        osvezi();
        mapa.on('zoom', osvezi);
        const posmatracPisma = new MutationObserver(osvezi);
        posmatracPisma.observe(document.body, { attributes: true, attributeFilter: ['data-pismo'] });
        mapa.once('remove', () => posmatracPisma.disconnect());
    },

    pocetniPogledMape: function(nivo) {
        const pogledi = [
            { center: [15, 48], zoom: 2.15 },
            { center: [86, 35], zoom: 1.45 },
            { center: [154, -23], zoom: 1.65 },
            { center: [-103, 39], zoom: 1.55 },
            { center: [-60, -17], zoom: 1.55 },
            { center: [22, 2], zoom: 1.35 }
        ];
        return pogledi[nivo.id] || { center: [0, 18], zoom: 1.1 };
    },

    pripremiVektorskuMapu: function(info) {
        const kontejner = document.getElementById('put-oko-sveta-vektorska-mapa');
        if (!kontejner || !window.maplibregl) return;
        if (this.mapLibreInstanca) {
            this.mapLibreInstanca.remove();
            this.mapLibreInstanca = null;
        }

        const nivo = info.trenutni;
        const pogled = this.pocetniPogledMape(nivo);
        const mapa = new maplibregl.Map({
            container: kontejner,
            style: {
                version: 8,
                sources: {},
                layers: [{ id: 'okean', type: 'background', paint: { 'background-color': '#042465' } }]
            },
            center: pogled.center,
            zoom: pogled.zoom,
            minZoom: 0.45,
            maxZoom: 6,
            attributionControl: false,
            renderWorldCopies: false,
            pitchWithRotate: false,
            dragRotate: false
        });
        mapa.touchZoomRotate.disableRotation();
        this.mapLibreInstanca = mapa;

        mapa.once('load', () => {
            if (this.mapLibreInstanca !== mapa) return;
            mapa.addSource('granice-sveta', { type: 'geojson', data: 'assets/world-boundaries.geojson' });
            mapa.addLayer({
                id: 'kopno-sveta', type: 'fill', source: 'granice-sveta',
                paint: { 'fill-color': '#4f9ed1', 'fill-opacity': 0.96 }
            });
            mapa.addLayer({
                id: 'granice-drzava', type: 'line', source: 'granice-sveta',
                paint: { 'line-color': 'rgba(194, 230, 250, 0.78)', 'line-width': 0.85 }
            });

            if (nivo.id === 0) {
                const celaRuta = this.evropskaRutaKoordinate();
                const procenatRute = this.procenatEtape(nivo);
                const napredak = this.skratiRutu(celaRuta, procenatRute);
                mapa.addSource('ruta-evrope', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [
                            { type: 'Feature', properties: { vrsta: 'cela' }, geometry: { type: 'LineString', coordinates: celaRuta } },
                            { type: 'Feature', properties: { vrsta: 'napredak' }, geometry: { type: 'LineString', coordinates: napredak } }
                        ]
                    }
                });
                mapa.addLayer({
                    id: 'ruta-evrope-pozadina', type: 'line', source: 'ruta-evrope', filter: ['==', ['get', 'vrsta'], 'cela'],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: {
                        'line-color': 'rgba(194, 230, 250, 0.72)',
                        'line-width': 3.2,
                        'line-blur': 0.15,
                        'line-dasharray': [0.25, 1.35]
                    }
                });
                mapa.addLayer({
                    id: 'ruta-evrope-napredak', type: 'line', source: 'ruta-evrope', filter: ['==', ['get', 'vrsta'], 'napredak'],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: {
                        'line-color': '#45d6a0',
                        'line-width': 3.2,
                        'line-blur': 0.15,
                        'line-dasharray': [0.25, 1.35]
                    }
                });
                mapa.addSource('stajalista-evrope', { type: 'geojson', data: this.stajalistaEvrope(procenatRute) });
                Promise.all([
                    this.dodajIkonuStajalista(mapa, 'stajaliste-buduci', '#173a63', '#b8ddf2'),
                    this.dodajIkonuStajalista(mapa, 'stajaliste-zavrsen', '#45d6a0', '#d9fff0'),
                    this.dodajIkonuStajalista(mapa, 'stajaliste-aktuelan', '#f5d061', '#fff4c2')
                ]).then(() => {
                    if (this.mapLibreInstanca !== mapa) return;
                    mapa.addLayer({
                        id: 'stajalista-evrope-prsten', type: 'circle', source: 'stajalista-evrope',
                        filter: ['==', ['get', 'stanje'], 'aktuelan'],
                        paint: { 'circle-radius': 10, 'circle-color': 'rgba(245, 208, 97, 0.34)', 'circle-blur': 0.6 }
                    });
                    mapa.addLayer({
                        id: 'stajalista-evrope-ikone', type: 'symbol', source: 'stajalista-evrope',
                        layout: {
                            'icon-image': ['concat', 'stajaliste-', ['get', 'stanje']],
                            'icon-size': 0.72,
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true
                        }
                    });
                    this.dodajNaziveStajalista(mapa);
                });
            }
        });
    },

    renderEkran: function() {
        const sadrzaj = document.getElementById('kvartalni-nivo-sadrzaj');
        if (this.mapLibreInstanca) {
            this.mapLibreInstanca.remove();
            this.mapLibreInstanca = null;
        }
        
        let html = `
            <div class="kvartal-main-tabs" role="tablist" aria-label="Put oko sveta">
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'sezona' || this.aktivniTab === 'istrazivaci' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('sezona')">Moj put</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'svaVremena' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('svaVremena')">Rekordi</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'slavni' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('slavni')">Dvorana slavnih</button>
            </div>
        `;

        if (this.aktivniTab === 'sezona') html += this.renderSezonaHTML();
        else if (this.aktivniTab === 'istrazivaci') html += this.renderIstraživaceHTML();
        else if (this.aktivniTab === 'svaVremena') html += this.renderSvaVremenaHTML();
        else if (this.aktivniTab === 'slavni') html += this.renderSlavniHTML();

        sadrzaj.className = `kvartalni-nivo-lista kvartalni-nivo-${this.aktivniTab}`;
        sadrzaj.innerHTML = html;
        sadrzaj.scrollTop = 0;
        const ekran = document.getElementById('kvartalni-nivo-screen');
        if (ekran) ekran.scrollTop = 0;
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        requestAnimationFrame(() => {
            sadrzaj.scrollTop = 0;
            if (ekran) ekran.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            window.scrollTo(0, 0);
        });
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
        html += `
            <button type="button" class="menu-btn kvartal-explorers-button" style="--kvartal-nivo-boja: ${izabraniNivo.boja};" onclick="KvartalniNivoManager.otvoriIstraživace()">
                <span class="kvartal-explorers-button-copy">
                    <i class="fa-solid fa-users" aria-hidden="true"></i>
                    <span>
                        <b>Istraživači: ${izabraniNivo.ime}</b>
                        <small>Rang-lista po pređenom putu</small>
                    </span>
                </span>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
        `;

        requestAnimationFrame(() => this.pripremiVektorskuMapu(info));

        return html;
    },

    otvoriIstraživace: function() {
        this.aktivniTab = 'istrazivaci';
        this.renderEkran();
    },

    renderIstraživaceHTML: function() {
        const info = this.odrediTrenutniNivo();
        const nivo = info.trenutni;
        const listaIgraca = [...(this.serverPodaci.sezona[nivo.id] || [])]
            .sort((prvi, drugi) => (Number(drugi.pojmovi) || 0) - (Number(prvi.pojmovi) || 0)
                || String(prvi.ime || '').localeCompare(String(drugi.ime || ''), 'sr'));
        let html = `
            <section class="kvartal-explorer-list-card" style="--kvartal-nivo-boja: ${nivo.boja};">
                <header class="kvartal-explorer-list-heading">
                    <div>
                        <span>RANG-LISTA RUTE</span>
                        <h3>Istraživači: ${nivo.ime}</h3>
                        <p>Najviše pređenih kilometara je na vrhu liste.</p>
                    </div>
                    <button type="button" class="menu-btn kvartal-explorer-back" onclick="KvartalniNivoManager.promeniTab('sezona')">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Nazad
                    </button>
                </header>
        `;

        html += `<div class="kvartal-explorer-list-scroll">`;
        if (listaIgraca.length === 0) {
            html += `<div class="kvartal-empty-state">${this.ucitavanje ? 'Učitavanje istraživača...' : 'Još nema istraživača na ovoj ruti.'}</div>`;
        } else {
            html += `<div class="kvartal-explorer-list-labels"><span>ISTRAŽIVAČ</span><span>PREĐENO / LOKACIJA</span></div>`;
            listaIgraca.forEach((igrac, indeks) => {
                const put = this.polozajIgracaNaEtapi(igrac.pojmovi, nivo);
                html += `
                    <article class="kvartal-ranking-row kvartal-explorer-list-row">
                        <div class="kvartal-ranking-player">
                            <b class="kvartal-ranking-position ${indeks < 3 ? 'top-three' : ''}">${indeks + 1}.</b>
                            <div class="kvartal-avatar kvartal-avatar-level">${this.napraviAvatarHTML(igrac.avatar)}</div>
                            <span class="kvartal-player-name">${igrac.ime}</span>
                        </div>
                        <div class="kvartal-explorer-distance">
                            <strong>${this.formatirajKilometre(put.kilometri)} km</strong>
                            <span>${put.lokacija}</span>
                        </div>
                    </article>
                `;
            });
        }
        return `${html}</div></section>`;
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
