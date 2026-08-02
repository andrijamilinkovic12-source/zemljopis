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
            stvarnaMapa: "assets/kviz-pikado-europa.svg",
            mapaViewBox: "120 20 800 570",
            gradovi: [
                [413, 461, "Madrid"], [473, 373, "Pariz"], [449, 345, "London"], [499, 336, "Amsterdam"], [584, 334, "Berlin"], [594, 359, "Prag"], [614, 379, "Beč"], [640, 386, "Budimpešta"], [654, 414, "Beograd"], [740, 454, "Istanbul"]
            ]
        },
        {
            id: 1, ime: "Azija", min: 1000, max: 2499, boja: "#f5af19",
            obris: "M86 214 L125 145 197 116 256 131 315 95 382 113 427 84 501 108 568 96 646 133 703 185 679 245 627 269 587 304 511 287 457 309 400 281 342 302 284 271 221 282 161 253 Z",
            gradovi: [[104, 230, "Istanbul"], [185, 185, "Teheran"], [281, 232, "Delhi"], [392, 259, "Bangkok"], [471, 292, "Singapur"], [592, 210, "Peking"], [672, 180, "Tokio"]]
        },
        {
            id: 2, ime: "Australija i Okeanija", min: 2500, max: 4999, boja: "#38d9a9",
            obris: "M203 229 L243 166 342 151 414 185 469 242 443 299 370 323 304 306 251 281 Z M552 125 L587 108 611 130 597 158 565 158 Z M628 242 L664 224 697 252 673 286 638 277 Z",
            gradovi: [[231, 227, "Pert"], [331, 283, "Melburn"], [405, 251, "Sidnej"], [587, 145, "Port Morsbi"], [663, 259, "Okland"]]
        },
        {
            id: 3, ime: "Severna Amerika", min: 5000, max: 8999, boja: "#ff8a65",
            obris: "M105 90 L175 71 229 97 286 113 343 165 390 218 359 266 301 269 260 303 207 278 183 228 129 205 89 151 Z M393 288 L424 274 443 302 420 330 394 318 Z",
            gradovi: [[126, 115, "Vankuver"], [174, 147, "Sijetl"], [207, 211, "San Francisko"], [252, 249, "Los Anđeles"], [322, 274, "Meksiko Siti"], [412, 290, "Havana"]]
        },
        {
            id: 4, ime: "Južna Amerika", min: 9000, max: 13999, boja: "#9ccc65",
            obris: "M321 74 L390 91 430 146 421 197 457 247 430 312 387 355 347 322 338 260 298 204 285 139 Z",
            gradovi: [[328, 103, "Bogota"], [314, 152, "Kito"], [322, 208, "Lima"], [370, 244, "La Paz"], [393, 310, "Santijago"], [428, 271, "Buenos Ajres"], [425, 206, "Rio de Žaneiro"]]
        },
        {
            id: 5, ime: "Afrika", min: 14000, max: 19999, boja: "#f4c36a",
            obris: "M263 78 L342 69 414 102 443 169 425 226 390 278 360 348 314 318 286 250 235 198 227 130 Z",
            gradovi: [[251, 111, "Kazablanka"], [298, 100, "Alžir"], [402, 132, "Kairo"], [387, 211, "Najrobi"], [374, 247, "Dar es Salam"], [354, 323, "Kejptaun"]]
        },
        {
            id: 6, ime: "Antarktik", min: 20000, max: Infinity, boja: "#b9e7ff",
            obris: "M116 223 L165 178 248 183 303 143 386 170 455 147 522 181 611 171 681 207 647 256 572 272 513 308 428 284 349 314 278 287 194 296 138 266 Z",
            gradovi: [[153, 236, "Poluostrvo"], [292, 206, "Stanica Vostok"], [432, 224, "Južni pol"], [591, 230, "Roso more"]]
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

    // Ovde se smeštaju podaci koji stignu iz MongoDB/Servera
    serverPodaci: {
        sezona: [[], [], [], [], [], [], []],
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
        this.statistika.sezonskiPojmovi = podaci.sezonskiPojmovi || 0;
        this.statistika.svaVremenaPojmovi = podaci.svaVremenaPojmovi || 0;
        localStorage.setItem('zemljopis_kvartal', JSON.stringify(this.statistika));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
        this.azurirajBedzUMeniju();
        this.posaljiDogadjajeNaCekanju();
    },

    primiTopListe: function(podaci) {
        this.ucitavanje = false;
        this.serverPodaci = {
            sezona: Array.isArray(podaci && podaci.sezona) ? podaci.sezona : [[], [], [], [], [], [], []],
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
        if (nivo.max === Infinity) return 100;
        const raspon = nivo.max - nivo.min;
        if (raspon <= 0) return 100;
        return Math.max(0, Math.min(100, ((this.statistika.sezonskiPojmovi - nivo.min) / raspon) * 100));
    },

    renderMapaPutaHTML: function(info) {
        const nivo = info.trenutni;
        const procenat = this.procenatEtape(nivo);
        const tacke = nivo.gradovi.map(([x, y]) => `${x},${y}`).join(' ');
        const sledecaEtapa = info.sledeci
            ? `Sledeća etapa: ${info.sledeci.ime}`
            : 'Završio si put oko sveta!';
        const doCilja = nivo.max === Infinity
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
                <svg class="put-oko-sveta-map ${nivo.stvarnaMapa ? 'put-evropa-map' : ''}" viewBox="${nivo.mapaViewBox || '0 0 760 390'}" role="img" aria-label="Put kroz ${nivo.ime}">
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
                    ${nivo.stvarnaMapa
                        ? `<image class="put-stvarna-mapa" href="${nivo.stvarnaMapa}" width="1000" height="620" />
                           <rect class="put-stvarna-mapa-izmaglica" width="1000" height="620" />`
                        : `<path class="put-kontinent" d="${nivo.obris}" fill="url(#kopno-${nivo.id})" />`}
                    <polyline class="put-linija put-linija-pozadina" points="${tacke}" pathLength="100" />
                    <polyline class="put-linija put-linija-napredak" points="${tacke}" pathLength="100" filter="url(#sjaj-${nivo.id})" />
                    ${nivo.gradovi.map(([x, y, grad], indeks) => `
                        <g class="put-stajaliste ${indeks === 0 ? 'pocetak' : ''}">
                            <circle cx="${x}" cy="${y}" r="${indeks === 0 ? 7 : 5}" />
                            <text x="${x}" y="${y - 13}">${grad}</text>
                        </g>
                    `).join('')}
                </svg>
                <div class="put-oko-sveta-route-footer">
                    <span>${doCilja}</span>
                    <b>${sledecaEtapa}</b>
                </div>
            </section>
        `;
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
