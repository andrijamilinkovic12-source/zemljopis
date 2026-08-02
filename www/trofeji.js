// trofeji.js - Menadžer za praćenje dostignuća van samog kviza.

const TrofejiManager = {
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,

    // Nagrade su namerno manje od najjeftinijeg artikla u Riznici (300 dukata).
    // Tako trofej ubrzava napredak, ali ne preskače sledeći cenovni nivo.
    podaci: [
        // KATEGORIJA: Riznica
        { id: 'r1', tip: 'kupljeni_artikli', naziv: 'Prvi dragulj', opis: 'Kupi prvi predmet u Riznici.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 25 },
        { id: 'r2', tip: 'kupljeni_artikli', naziv: 'Mali kolekcionar', opis: 'Kupi 5 predmeta u Riznici.', uslov: 5, napredak: 0, preuzeto: false, nagrada: 75 },
        { id: 'r3', tip: 'kupljeni_artikli', naziv: 'Čuvar riznice', opis: 'Kupi 12 predmeta u Riznici.', uslov: 12, napredak: 0, preuzeto: false, nagrada: 175 },
        { id: 'r4', tip: 'kupljene_teme', naziv: 'Menjač pejzaža', opis: 'Otključaj 3 teme igre.', uslov: 3, napredak: 0, preuzeto: false, nagrada: 60 },
        { id: 'r5', tip: 'kupljeni_efekti', naziv: 'Majstor proslave', opis: 'Otključaj 3 efekta pobede.', uslov: 3, napredak: 0, preuzeto: false, nagrada: 70 },
        { id: 'r6', tip: 'kupljene_tastature', naziv: 'Stil slova', opis: 'Otključaj 3 izgleda tastature.', uslov: 3, napredak: 0, preuzeto: false, nagrada: 90 },

        // KATEGORIJA: Štednja — meri se trenutno stanje, ne rezultat kviza.
        { id: 'd1', tip: 'dukati', naziv: 'Štediša', opis: 'Imaj 1.000 dukata na stanju.', uslov: 1000, napredak: 0, preuzeto: false, nagrada: 40 },
        { id: 'd2', tip: 'dukati', naziv: 'Domaćin', opis: 'Imaj 5.000 dukata na stanju.', uslov: 5000, napredak: 0, preuzeto: false, nagrada: 120 },
        { id: 'd3', tip: 'dukati', naziv: 'Tajkun', opis: 'Imaj 10.000 dukata na stanju.', uslov: 10000, napredak: 0, preuzeto: false, nagrada: 300 }
    ],

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_trofeji');
        if (sacuvano) {
            try {
                const parsirano = JSON.parse(sacuvano);
                if (Array.isArray(parsirano)) {
                    parsirano.forEach(sacuvanaStavka => {
                        const orgStavka = this.podaci.find(s => s.id === sacuvanaStavka.id);
                        if (!orgStavka) return;
                        if (Number.isFinite(sacuvanaStavka.napredak)) orgStavka.napredak = sacuvanaStavka.napredak;
                        if (typeof sacuvanaStavka.preuzeto === 'boolean') orgStavka.preuzeto = sacuvanaStavka.preuzeto;
                    });
                }
            } catch (greska) {
                console.warn('Sačuvani trofeji nisu ispravni:', greska);
            }
        }
        this.proveriRiznicu(false);
    },

    snimiStanje: function() {
        localStorage.setItem('zemljopis_trofeji', JSON.stringify(this.podaci));
        if (typeof SinhronizacijaManager !== 'undefined') SinhronizacijaManager.zakaziSlanje();
    },

    sinhronizujNagraduOdmah: function() {
        if (typeof SinhronizacijaManager !== 'undefined') {
            SinhronizacijaManager.sinhronizujOdmah();
        }
    },

    azurirajNapredakNaVrednost: function(tip, vrednost, prikaziObavestenje = true) {
        let promena = false;
        const bezbednaVrednost = Math.max(0, Number(vrednost) || 0);

        this.podaci.forEach(trofej => {
            if (trofej.tip !== tip || trofej.preuzeto || bezbednaVrednost <= trofej.napredak) return;
            const bioOtkljucan = trofej.napredak >= trofej.uslov;
            trofej.napredak = Math.min(trofej.uslov, bezbednaVrednost);
            promena = true;
            if (!bioOtkljucan && trofej.napredak >= trofej.uslov && prikaziObavestenje && typeof UIManager !== 'undefined') {
                UIManager.prikaziObavestenje('🏆 Novi trofej!', `Otključao si trofej: <b>${trofej.naziv}</b>!<br>Poseti Sobu trofeja da preuzmeš nagradu.`, null, 'Sjajno');
            }
        });
        return promena;
    },

    proveriRiznicu: function(prikaziObavestenje = true) {
        if (typeof RiznicaManager === 'undefined') return;
        const podaci = RiznicaManager.podaci || {};
        const brojKupljenih = kategorija => (podaci[kategorija] || []).filter(artikal => artikal.cena > 0 && artikal.kupljeno).length;
        const ukupnoKupljenih = brojKupljenih('teme') + brojKupljenih('efekti') + brojKupljenih('tastature');
        let promena = false;
        [
            ['kupljeni_artikli', ukupnoKupljenih],
            ['kupljene_teme', brojKupljenih('teme')],
            ['kupljeni_efekti', brojKupljenih('efekti')],
            ['kupljene_tastature', brojKupljenih('tastature')],
            ['dukati', RiznicaManager.dukati]
        ].forEach(([tip, vrednost]) => {
            promena = this.azurirajNapredakNaVrednost(tip, vrednost, prikaziObavestenje) || promena;
        });
        if (promena) this.snimiStanje();
        if (promena && prikaziObavestenje) this.sinhronizujNagraduOdmah();
    },

    // Pozivi iz starijih delova igre ostaju bezbedni, ali više ne stvaraju trofeje kviza.
    azurirajNapredak: function() {},
    proveriDukate: function() { this.proveriRiznicu(false); },

    otvoriEkran: function() {
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;
        if (typeof KeyboardManager !== 'undefined') KeyboardManager.hideKeyboard();
        this.proveriRiznicu(false);
        this.osveziPrikaz();
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('trofeji-main-screen');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('trofeji-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);
        if (!overlay) { setTimeout(callback, trajanje); return; }
        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--trofeji-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        this.introTajmer = setTimeout(() => {
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => { overlay.classList.remove('active', 'closing'); overlay.setAttribute('aria-hidden', 'true'); }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('trofeji-main-screen');
        if (!ekran) return;
        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('trofeji-entering');
        void ekran.offsetWidth;
        ekran.classList.add('trofeji-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('trofeji-entering'), 720);
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('trofeji-sadrzaj');
        if (!kontejner) return;
        kontejner.innerHTML = this.podaci.map(trofej => {
            const zavrsen = trofej.napredak >= trofej.uslov;
            const procenat = Math.min((trofej.napredak / trofej.uslov) * 100, 100);
            const akcija = zavrsen && !trofej.preuzeto
                ? `<button type="button" class="trofej-preuzmi" onclick="TrofejiManager.preuzmiNagradu('${trofej.id}')"><i class="fa-solid fa-coins"></i> Pokupi +${trofej.nagrada}</button>`
                : trofej.preuzeto
                    ? '<span class="status-zavrseno trofej-status-zavrsen"><i class="fa-solid fa-check"></i> Završeno</span>'
                    : `<span class="trofej-nagrada"><i class="fa-solid fa-coins"></i> ${trofej.nagrada}</span>`;
            return `<article class="trofej-kartica${zavrsen ? ' je-otkljucan' : ''}${trofej.preuzeto ? ' je-preuzet' : ''}">
                <div class="trofej-kartica-zaglavlje"><div class="trofej-kartica-info"><h4 class="trofej-naziv">${trofej.naziv}</h4><p class="trofej-opis">${trofej.opis}</p></div><div class="trofej-akcija">${akcija}</div></div>
                <div class="trofej-napredak-red"><div class="trofej-napredak" role="progressbar" aria-label="Napredak: ${trofej.naziv}" aria-valuemin="0" aria-valuemax="${trofej.uslov}" aria-valuenow="${trofej.napredak}"><span class="trofej-napredak-popuna${zavrsen ? ' zavrsen' : ''}" style="width: ${procenat}%;"></span></div><span class="trofej-napredak-vrednost">${trofej.napredak}/${trofej.uslov}</span></div>
            </article>`;
        }).join('');
    },

    preuzmiNagradu: function(trofejId) {
        const trofej = this.podaci.find(t => t.id === trofejId);
        if (!trofej || trofej.napredak < trofej.uslov || trofej.preuzeto) return;
        trofej.preuzeto = true;
        if (typeof RiznicaManager !== 'undefined') {
            RiznicaManager.dukati += trofej.nagrada;
            RiznicaManager.snimiStanje();
        }
        this.snimiStanje();
        this.sinhronizujNagraduOdmah();
        this.osveziPrikaz();
        if (typeof UIManager !== 'undefined') UIManager.prikaziObavestenje('Nagrada preuzeta!', `Osvojio si <b style="color:#f5af19;">${trofej.nagrada} dukata</b>!`, null, 'Super');
    }
};

document.addEventListener('DOMContentLoaded', () => TrofejiManager.init());
