// kvartalninivo.js - Liga takmičenje i Dvorana Slavnih povezana sa Serverom

const KvartalniNivoManager = {
    // Tvoja lična statistika
    statistika: {
        sezonskiPojmovi: 0,
        svaVremenaPojmovi: 0
    },

    nivoi: [
        { id: 0, ime: "Istraživač", min: 0, max: 999, ikona: "assets/kvartalni-nivo-istrazivac-clay-soft-3d-v1.png", boja: "#a0aec0" },
        { id: 1, ime: "Bronza", min: 1000, max: 2499, ikona: "assets/kvartalni-nivo-bronza-clay-soft-3d-v1.png", boja: "#cd7f32" },
        { id: 2, ime: "Srebro", min: 2500, max: 4999, ikona: "assets/kvartalni-nivo-srebro-clay-soft-3d-v1.png", boja: "#c0c0c0" },
        { id: 3, ime: "Zlato", min: 5000, max: 8999, ikona: "assets/kvartalni-nivo-zlato-clay-soft-3d-v1.png", boja: "#f5af19" },
        { id: 4, ime: "Legenda", min: 9000, max: Infinity, ikona: "assets/kvartalni-nivo-legenda-clay-soft-3d-v1.png", boja: "#38bdf8" }
    ],

    aktivniTab: 'sezona',
    aktivniNivoTab: 0,
    aktivniSlavniTab: 'medalje',
    ucitavanje: false,
    slanjeUToku: false,
    dogadjajiNaCekanju: [],
    poslatiDogadjaji: [],

    // Ovde se smeštaju podaci koji stignu iz MongoDB/Servera
    serverPodaci: {
        sezona: [[], [], [], [], []], 
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
            sezona: Array.isArray(podaci && podaci.sezona) ? podaci.sezona : [[], [], [], [], []],
            svaVremena: Array.isArray(podaci && podaci.svaVremena) ? podaci.svaVremena : [],
            medalje: Array.isArray(podaci && podaci.medalje) ? podaci.medalje : [],
            sampioni: Array.isArray(podaci && podaci.sampioni) ? podaci.sampioni : []
        };
        const ekran = document.getElementById('kvartalni-nivo-screen');
        if (ekran && ekran.classList.contains('active')) {
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
        this.aktivniTab = 'sezona';
        const info = this.odrediTrenutniNivo();
        this.aktivniNivoTab = info.trenutni.id; 
        
        // Zatraži osvežene liste iz baze prilikom ulaska
        if (typeof Game !== 'undefined' && Game.socket) {
            this.ucitavanje = true;
            Game.socket.emit('traziKvartalneListe');
        }

        this.renderEkran();
        UIManager.prikaziEkran('kvartalni-nivo-screen');
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

    renderEkran: function() {
        const sadrzaj = document.getElementById('kvartalni-nivo-sadrzaj');
        
        let html = `
            <div class="kvartal-main-tabs" role="tablist" aria-label="Kvartalni nivo">
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'sezona' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('sezona')">Liga</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'svaVremena' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('svaVremena')">Sva Vremena</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniTab === 'slavni' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniTab('slavni')">Slavni</button>
            </div>
        `;

        if (this.aktivniTab === 'sezona') html += this.renderSezonaHTML();
        else if (this.aktivniTab === 'svaVremena') html += this.renderSvaVremenaHTML();
        else if (this.aktivniTab === 'slavni') html += this.renderSlavniHTML();

        sadrzaj.innerHTML = html;
    },

    renderSezonaHTML: function() {
        const info = this.odrediTrenutniNivo();
        let html = `
            <section class="kvartal-summary-card" style="--kvartal-nivo-boja: ${info.trenutni.boja};">
                <div class="kvartal-summary-copy">
                    <span class="kvartal-eyebrow">Tvoj trenutni nivo</span>
                    <strong class="kvartal-current-level">${info.trenutni.ime}</strong>
                </div>
                <div class="kvartal-summary-score">
                    <strong>${this.statistika.sezonskiPojmovi}</strong>
                    <span><i class="fa-solid fa-check-double" aria-hidden="true"></i> pojmova</span>
                </div>
            </section>
        `;

        html += `<div class="kvartal-level-tabs" role="tablist" aria-label="Nivoi lige">`;
        this.nivoi.forEach(nivo => {
            const aktivan = this.aktivniNivoTab === nivo.id;
            html += `
                <button type="button" class="kvartal-level-tab ${aktivan ? 'active' : ''}" style="--kvartal-nivo-boja: ${nivo.boja};" onclick="KvartalniNivoManager.promeniNivoTab(${nivo.id})" aria-label="${nivo.ime}" title="${nivo.ime}">
                    <img class="kvartal-level-icon" src="${nivo.ikona}" alt="" aria-hidden="true" decoding="async">
                </button>
            `;
        });
        html += `</div>`;

        const izabraniNivo = this.nivoi[this.aktivniNivoTab];
        const listaIgraca = this.serverPodaci.sezona[this.aktivniNivoTab] || [];

        html += `<section class="kvartal-ranking-card" style="--kvartal-nivo-boja: ${izabraniNivo.boja};">`;
        html += `<h4 class="kvartal-ranking-title">Top lista: <span>${izabraniNivo.ime}</span></h4>`;

        if (listaIgraca.length === 0) {
            html += `<div class="kvartal-empty-state">${this.ucitavanje ? 'Učitavanje igrača...' : 'Još nema igrača na ovom nivou.'}</div>`;
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
                <i class="fa-solid fa-infinity" aria-hidden="true"></i>
                <h3>Apsolutni Vladari</h3>
                <p>Najviše pogođenih pojmova u istoriji igre.</p>
            </div>
            <section class="kvartal-ranking-card kvartal-all-time-card">
        `;

        if (!this.serverPodaci.svaVremena || this.serverPodaci.svaVremena.length === 0) {
            html += `<div class="kvartal-empty-state">${this.ucitavanje ? 'Učitavanje podataka sa servera...' : 'Još nema upisanih rezultata.'}</div>`;
        } else {
            this.serverPodaci.svaVremena.forEach((igrac, index) => {
                const kruna = index === 0 ? `<i class="fa-solid fa-crown kvartal-crown" aria-label="Prvo mesto"></i>` : '';

                html += `
                    <article class="kvartal-ranking-row kvartal-all-time-row ${index === 0 ? 'first-place' : ''}">
                        <div class="kvartal-ranking-player">
                            <b class="kvartal-ranking-position ${index < 3 ? 'top-three' : ''}">${index + 1}.</b>
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
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniSlavniTab === 'medalje' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniSlavniTab('medalje')"><i class="fa-solid fa-medal" aria-hidden="true"></i> Medalje</button>
                <button type="button" class="menu-btn kvartal-tab ${this.aktivniSlavniTab === 'sampioni' ? 'active' : ''}" onclick="KvartalniNivoManager.promeniSlavniTab('sampioni')"><i class="fa-solid fa-trophy" aria-hidden="true"></i> Šampioni</button>
            </div>
        `;

        if (this.aktivniSlavniTab === 'medalje') {
            html += `<p class="kvartal-info-copy">Igrači koji su završili u TOP 3 u bilo kom kvartalnom ciklusu.</p>`;
            
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
                                <div class="kvartal-medal-count gold"><i class="fa-solid fa-medal" aria-hidden="true"></i><b>${igrac.zlato || 0}</b></div>
                                <div class="kvartal-medal-count silver"><i class="fa-solid fa-medal" aria-hidden="true"></i><b>${igrac.srebro || 0}</b></div>
                                <div class="kvartal-medal-count bronze"><i class="fa-solid fa-medal" aria-hidden="true"></i><b>${igrac.bronza || 0}</b></div>
                            </div>
                        </article>
                    `;
                });
            }
        } else {
            html += `<p class="kvartal-info-copy">Osvajači prvog mesta na kraju svakog ciklusa lige.</p>`;
            
            if (!this.serverPodaci.sampioni || this.serverPodaci.sampioni.length === 0) {
                html += `<div class="kvartal-empty-card"><div class="kvartal-empty-state">Čekamo prve šampione...</div></div>`;
            } else {
                this.serverPodaci.sampioni.forEach(igrac => {
                    html += `
                        <article class="kvartal-champion-card">
                            <div class="kvartal-champion-trophy">
                                <i class="fa-solid fa-trophy" aria-hidden="true"></i>
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
