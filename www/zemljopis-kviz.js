// zemljopis-kviz.js - Online Zemljopis kviz, isključivo 1 na 1.
// Pitanja, tačni odgovori i bodovanje ostaju na serveru.

const KvizManager = {
    socket: null,
    sobaId: null,
    cekanjeUToku: false,
    mecUToku: false,
    odgovorPoslat: false,
    krajPitanjaAt: 0,
    tajmer: null,
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,
    mojeIme: 'Igrač',
    protivnik: null,
    rezultat: {},

    init: function() {
        if (this.inicijalizovano) return;
        this.inicijalizovano = true;
    },

    poveziSokete: function(socket) {
        if (!socket || this.socket === socket) return;
        this.socket = socket;

        socket.on('kviz:pronadjenMec', (podaci = {}) => this.primiPronadjenMec(podaci));
        socket.on('kviz:pitanje', (podaci = {}) => this.primiPitanje(podaci));
        socket.on('kviz:rezultatPitanja', (podaci = {}) => this.primiRezultatPitanja(podaci));
        socket.on('kviz:krajMeca', (podaci = {}) => this.primiKrajMeca(podaci));
        socket.on('kviz:protivnikNapustio', (podaci = {}) => this.primiPredaju(podaci));
    },

    otvoriEkran: function() {
        if (typeof PodesavanjaManager !== 'undefined' && !PodesavanjaManager.zahtevajProfil()) return;
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;
        this.resetujPrikaz();
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('zemljopis-kviz-screen');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('zemljopis-kviz-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--soba-prijatelja-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('zemljopis-kviz-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('kviz-entering');
        void ekran.offsetWidth;
        ekran.classList.add('kviz-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('kviz-entering'), 720);
    },

    traziMec: function() {
        if (typeof PodesavanjaManager !== 'undefined' && !PodesavanjaManager.zahtevajProfil()) return;
        if (!this.socket || !this.socket.connected) {
            this.postaviStatus('Povezivanje sa serverom još nije završeno. Pokušaj ponovo za trenutak.', true);
            return;
        }
        if (this.cekanjeUToku || this.mecUToku) return;

        this.cekanjeUToku = true;
        this.prikaziCekanje(true);
        this.postaviStatus('Tražimo protivnika za tvoj kviz...', false);

        this.socket.emit('kviz:traziMec', (odgovor = {}) => {
            if (odgovor.uspeh) return;
            this.cekanjeUToku = false;
            this.prikaziCekanje(false);
            this.postaviStatus(odgovor.poruka || 'Meč trenutno nije moguće pronaći.', true);
        });
    },

    otkaziCekanje: function() {
        if (!this.cekanjeUToku) return;
        this.socket?.emit('kviz:otkaziCekanje');
        this.cekanjeUToku = false;
        this.prikaziCekanje(false);
        this.postaviStatus('Odustao/la si od čekanja. Spreman/na si za novi meč.', false);
    },

    primiPronadjenMec: function(podaci) {
        this.cekanjeUToku = false;
        this.mecUToku = true;
        this.sobaId = podaci.sobaId || null;
        this.protivnik = podaci.protivnik || {};
        this.mojeIme = podaci.ja?.ime || this.imeIgraca();
        this.rezultat = {};
        this.prikaziCekanje(false);
        this.prikaziSekciju('igra');
        this.postaviTekst('kviz-moje-ime', this.mojeIme);
        this.postaviTekst('kviz-protivnik-ime', this.protivnik.ime || 'Protivnik');
        this.postaviTekst('kviz-moji-poeni', '0');
        this.postaviTekst('kviz-protivnik-poeni', '0');
        this.postaviTekst('kviz-question', 'Protivnik je pronađen. Prvo pitanje stiže uskoro...');
        this.postaviTekst('kviz-answer-status', 'Spremi se!');
        this.ocistiOpcije();
    },

    primiPitanje: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId) return;
        this.odgovorPoslat = false;
        this.krajPitanjaAt = Number(podaci.krajPitanjaAt) || 0;
        this.postaviTekst('kviz-round', `${Number(podaci.redniBroj) || 1} / ${Number(podaci.ukupno) || 8}`);
        this.postaviTekst('kviz-kategorija', podaci.kategorija || 'GEOGRAFIJA');
        this.postaviTekst('kviz-question', podaci.pitanje || 'Pitanje nije dostupno.');
        this.postaviTekst('kviz-answer-status', 'Izaberi jedan odgovor. Brži tačan odgovor nosi više poena.');
        this.prikaziNapredak(Number(podaci.redniBroj) || 1, Number(podaci.ukupno) || 8);
        this.renderujOpcije(Array.isArray(podaci.opcije) ? podaci.opcije : [], Number(podaci.indeks));
        this.pokreniTajmer();
    },

    renderujOpcije: function(opcije, indeksPitanja) {
        const kontejner = document.getElementById('kviz-opcije');
        if (!kontejner) return;
        kontejner.replaceChildren();
        opcije.forEach((opcija, indeksOpcije) => {
            const dugme = document.createElement('button');
            dugme.type = 'button';
            dugme.className = 'kviz-option';
            dugme.dataset.indeks = String(indeksOpcije);
            dugme.innerHTML = `<span>${String.fromCharCode(65 + indeksOpcije)}</span><b></b>`;
            dugme.querySelector('b').textContent = String(opcija || '');
            dugme.addEventListener('click', () => this.posaljiOdgovor(indeksPitanja, indeksOpcije));
            kontejner.appendChild(dugme);
        });
    },

    posaljiOdgovor: function(indeksPitanja, indeksOpcije) {
        if (!this.mecUToku || this.odgovorPoslat || !this.sobaId || !this.socket) return;
        this.odgovorPoslat = true;
        document.querySelectorAll('#kviz-opcije .kviz-option').forEach(dugme => {
            dugme.disabled = true;
            if (Number(dugme.dataset.indeks) === indeksOpcije) dugme.classList.add('selected');
        });
        this.postaviTekst('kviz-answer-status', 'Odgovor je poslat. Čekamo protivnika...');
        this.socket.emit('kviz:odgovori', {
            sobaId: this.sobaId,
            indeksPitanja,
            indeksOpcije
        });
    },

    primiRezultatPitanja: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId) return;
        this.zaustaviTajmer();
        this.odgovorPoslat = true;
        const tacanIndeks = Number(podaci.tacanIndeks);
        document.querySelectorAll('#kviz-opcije .kviz-option').forEach(dugme => {
            const indeks = Number(dugme.dataset.indeks);
            dugme.disabled = true;
            dugme.classList.remove('selected');
            if (indeks === tacanIndeks) dugme.classList.add('correct');
        });

        const rezultati = Array.isArray(podaci.rezultati) ? podaci.rezultati : [];
        rezultati.forEach(rezultat => {
            this.rezultat[rezultat.playerId] = rezultat;
            if (rezultat.playerId === this.igracId()) {
                this.postaviTekst('kviz-moji-poeni', String(rezultat.ukupnoPoena || 0));
            } else {
                this.postaviTekst('kviz-protivnik-poeni', String(rezultat.ukupnoPoena || 0));
            }
        });

        const mojRezultat = rezultati.find(rezultat => rezultat.playerId === this.igracId());
        const poruka = !mojRezultat || mojRezultat.odgovorIndeks === null
            ? 'Vreme je isteklo.'
            : (mojRezultat.tacno ? `Tačno! +${mojRezultat.poeni} poena.` : 'Netačno. Tačan odgovor je označen zeleno.');
        this.postaviTekst('kviz-answer-status', poruka + (podaci.poslednje ? ' Računamo konačan rezultat...' : ' Sledeće pitanje stiže uskoro...'));
    },

    primiKrajMeca: function(podaci) {
        if (!this.sobaId || podaci.sobaId !== this.sobaId) return;
        this.zaustaviTajmer();
        this.mecUToku = false;
        this.cekanjeUToku = false;
        const rezultati = Array.isArray(podaci.rezultati) ? podaci.rezultati : [];
        const ja = rezultati.find(rezultat => rezultat.playerId === this.igracId()) || {};
        const protivnik = rezultati.find(rezultat => rezultat.playerId !== this.igracId()) || {};
        const jeNereseno = podaci.nereseno || ja.ukupnoPoena === protivnik.ukupnoPoena;
        const pobedio = podaci.pobednikPlayerIds?.includes(this.igracId());
        const naslov = jeNereseno ? 'Nerešeno!' : (pobedio ? 'Pobeda!' : 'Ovog puta je protivnik brži');

        this.prikaziSekciju('kraj');
        this.postaviTekst('kviz-final-moji', String(ja.ukupnoPoena || 0));
        this.postaviTekst('kviz-final-protivnik', String(protivnik.ukupnoPoena || 0));
        this.postaviTekst('kviz-result-title', naslov);
        this.postaviTekst('kviz-result-copy', jeNereseno
            ? 'Isti broj poena — delite rezultat meča.'
            : (pobedio ? `Savladao/la si ${protivnik.ime || 'protivnika'}!` : `Čestitaj ${protivnik.ime || 'protivniku'} na pobedi.`));
        this.postaviTekst('kviz-result-eyebrow', podaci.razlog === 'predaja' ? 'PROTIVNIK JE NAPUSTIO MEČ' : 'REZULTAT MEČA');
        const ikona = document.getElementById('kviz-result-icon');
        if (ikona) ikona.classList.toggle('loss', !jeNereseno && !pobedio);
    },

    primiPredaju: function(podaci) {
        if (!this.sobaId || podaci.sobaId !== this.sobaId) return;
        this.primiKrajMeca({
            ...podaci,
            razlog: 'predaja',
            pobednikPlayerIds: [this.igracId()],
            rezultati: podaci.rezultati || [
                { playerId: this.igracId(), ime: this.mojeIme, ukupnoPoena: Number(document.getElementById('kviz-moji-poeni')?.textContent) || 0 },
                { playerId: this.protivnik?.playerId || 'protivnik', ime: this.protivnik?.ime || 'Protivnik', ukupnoPoena: Number(document.getElementById('kviz-protivnik-poeni')?.textContent) || 0 }
            ]
        });
    },

    igrajPonovo: function() {
        this.resetujPrikaz();
        this.traziMec();
    },

    nazadUMeni: function() {
        if (this.cekanjeUToku) this.otkaziCekanje();
        if (this.mecUToku && this.sobaId) this.socket?.emit('kviz:napusti');
        this.resetujStanje();
        UIManager.prikaziEkran('main-menu');
    },

    resetujPrikaz: function() {
        this.resetujStanje();
        this.prikaziSekciju('lobi');
        this.prikaziCekanje(false);
        this.postaviStatus('Spreman si za meč.', false);
        this.postaviTekst('kviz-progress-fill', '');
        const progress = document.getElementById('kviz-progress-fill');
        if (progress) progress.style.width = '0%';
    },

    resetujStanje: function() {
        this.zaustaviTajmer();
        this.sobaId = null;
        this.cekanjeUToku = false;
        this.mecUToku = false;
        this.odgovorPoslat = false;
        this.krajPitanjaAt = 0;
        this.protivnik = null;
        this.rezultat = {};
    },

    prikaziSekciju: function(naziv) {
        const sekcije = { lobi: 'kviz-lobi', igra: 'kviz-igra', kraj: 'kviz-kraj' };
        Object.entries(sekcije).forEach(([ime, id]) => {
            const sekcija = document.getElementById(id);
            if (sekcija) sekcija.hidden = ime !== naziv;
        });
    },

    prikaziCekanje: function(ceka) {
        const dugme = document.getElementById('kviz-match-btn');
        const otkazi = document.getElementById('kviz-cancel-btn');
        if (dugme) {
            dugme.disabled = ceka;
            dugme.classList.toggle('searching', ceka);
            dugme.innerHTML = ceka
                ? '<i class="fa-solid fa-spinner" aria-hidden="true"></i> TRAŽIMO...'
                : '<i class="fa-solid fa-bolt" aria-hidden="true"></i> PRONAĐI PROTIVNIKA';
        }
        if (otkazi) otkazi.hidden = !ceka;
    },

    pokreniTajmer: function() {
        this.zaustaviTajmer();
        const osvezi = () => {
            const serverSada = typeof Game !== 'undefined' && typeof Game.serverSada === 'function'
                ? Game.serverSada()
                : Date.now();
            const preostalo = Math.max(0, Math.ceil((this.krajPitanjaAt - serverSada) / 1000));
            this.postaviTekst('kviz-tajmer', String(preostalo));
            if (preostalo <= 0) {
                this.odgovorPoslat = true;
                document.querySelectorAll('#kviz-opcije .kviz-option').forEach(dugme => { dugme.disabled = true; });
                this.postaviTekst('kviz-answer-status', 'Vreme je isteklo. Čekamo rezultat...');
                this.zaustaviTajmer();
            }
        };
        osvezi();
        this.tajmer = setInterval(osvezi, 180);
    },

    zaustaviTajmer: function() {
        if (this.tajmer) clearInterval(this.tajmer);
        this.tajmer = null;
    },

    prikaziNapredak: function(redniBroj, ukupno) {
        const popuna = document.getElementById('kviz-progress-fill');
        if (popuna) popuna.style.width = `${Math.min(100, Math.max(0, (redniBroj / ukupno) * 100))}%`;
    },

    ocistiOpcije: function() {
        document.getElementById('kviz-opcije')?.replaceChildren();
    },

    postaviStatus: function(tekst, greska) {
        const status = document.getElementById('kviz-status');
        if (!status) return;
        status.textContent = tekst;
        status.classList.toggle('error', Boolean(greska));
    },

    postaviTekst: function(id, tekst) {
        const element = document.getElementById(id);
        if (element) element.textContent = tekst;
    },

    igracId: function() {
        return typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke?.playerId : null;
    },

    imeIgraca: function() {
        return typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke?.nadimak || 'Igrač' : 'Igrač';
    }
};

KvizManager.init();
