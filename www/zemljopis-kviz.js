// zemljopis-kviz.js - Online Zemljopis kviz, šest različitih rundi 1 na 1.
// Server je jedini izvor rešenja, vremena i bodova.

const KvizManager = {
    socket: null,
    sobaId: null,
    cekanjeUToku: false,
    mecUToku: false,
    odgovorPoslat: false,
    indeksRunde: -1,
    aktivnaRunda: null,
    krajRundeAt: 0,
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
        socket.on('kviz:runda', (podaci = {}) => this.primiRundu(podaci));
        socket.on('kviz:trag', (podaci = {}) => this.primiTrag(podaci));
        socket.on('kviz:rezultatRunde', (podaci = {}) => this.primiRezultatRunde(podaci));
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
        this.postaviStatus('Tražimo protivnika za duel od šest rundi...', false);

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
        this.postaviStatus('Odustao/la si od čekanja. Spreman/na si za novi duel.', false);
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
        this.postaviTekst('kviz-round', 'RUNDA 1 / 6');
        this.postaviTekst('kviz-kategorija', 'SPREMI SE');
        this.postaviTekst('kviz-pitanje', 'Protivnik je pronađen. Prva runda stiže uskoro...');
        this.postaviTekst('kviz-answer-status', 'Očekuje te šest potpuno različitih izazova.');
        this.ocistiSadrzajRunde();
    },

    primiRundu: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId || !podaci.runda) return;
        this.odgovorPoslat = false;
        this.indeksRunde = Number(podaci.indeksRunde);
        this.aktivnaRunda = podaci.runda;
        this.krajRundeAt = Number(podaci.krajRundeAt) || 0;

        this.postaviTekst('kviz-round', `RUNDA ${Number(podaci.redniBroj) || 1} / ${Number(podaci.ukupno) || 6}`);
        this.postaviTekst('kviz-kategorija', this.aktivnaRunda.kategorija || this.aktivnaRunda.naziv || 'ZEMLJOPIS');
        this.postaviTekst('kviz-pitanje', this.aktivnaRunda.pitanje || 'Zadatak nije dostupan.');
        this.postaviTekst('kviz-answer-status', this.aktivnaRunda.uputstvo || 'Pošalji odgovor pre isteka vremena.');
        this.prikaziNapredak(Number(podaci.redniBroj) || 1, Number(podaci.ukupno) || 6);
        this.renderujRundu(this.aktivnaRunda);
        this.pokreniTajmer();
    },

    primiTrag: function(podaci) {
        if (
            !this.mecUToku
            || podaci.sobaId !== this.sobaId
            || Number(podaci.indeksRunde) !== this.indeksRunde
            || this.aktivnaRunda?.tip !== 'misterija'
        ) return;

        const tragovi = Array.isArray(this.aktivnaRunda.tragovi) ? this.aktivnaRunda.tragovi : [];
        if (!tragovi.includes(podaci.tekst)) tragovi.push(podaci.tekst);
        this.aktivnaRunda.tragovi = tragovi;
        this.prikaziTragoveMisterije();
    },

    renderujRundu: function(runda) {
        const sadrzaj = this.sadrzajRunde();
        if (!sadrzaj) return;
        sadrzaj.replaceChildren();

        if (runda.tip === 'brzopotezne') return this.renderujBrzopotezne(sadrzaj, runda);
        if (runda.tip === 'spojnice') return this.renderujSpojnice(sadrzaj, runda);
        if (runda.tip === 'uljez') return this.renderujUljeza(sadrzaj, runda);
        if (runda.tip === 'misterija') return this.renderujMisteriju(sadrzaj, runda);
        if (runda.tip === 'emoji') return this.renderujEmoji(sadrzaj, runda);
        if (runda.tip === 'asocijacije') return this.renderujAsocijacije(sadrzaj, runda);

        this.postaviTekst('kviz-answer-status', 'Ovaj tip runde trenutno nije dostupan.', true);
    },

    renderujBrzopotezne: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-triples-form');
        const uputstvo = document.createElement('p');
        uputstvo.className = 'kviz-inline-title';
        uputstvo.textContent = `Upiši ${runda.trazeno || 3} različita pojma.`;
        forma.appendChild(uputstvo);
        const polja = [];
        for (let indeks = 0; indeks < (runda.trazeno || 3); indeks++) {
            const polje = document.createElement('input');
            polje.className = 'kviz-text-input';
            polje.type = 'text';
            polje.maxLength = 40;
            polje.autocomplete = 'off';
            polje.placeholder = `Pojam ${indeks + 1}`;
            polja.push(polje);
            forma.appendChild(polje);
        }
        this.dodajDugmeZaSlanje(forma, 'POŠALJI TROJKU', () => {
            this.posaljiOdgovor({ stavke: polja.map(polje => polje.value) });
        });
    },

    renderujSpojnice: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-matching-form');
        const spojeno = {};
        (runda.levo || []).forEach((pojam, indeks) => {
            const red = document.createElement('label');
            red.className = 'kviz-match-row';
            const levo = document.createElement('b');
            levo.textContent = pojam;
            const select = document.createElement('select');
            select.className = 'kviz-select';
            const podrazumevano = document.createElement('option');
            podrazumevano.value = '';
            podrazumevano.textContent = 'Izaberi reku';
            select.appendChild(podrazumevano);
            (runda.opcije || []).forEach(opcija => {
                const izbor = document.createElement('option');
                izbor.value = opcija;
                izbor.textContent = opcija;
                select.appendChild(izbor);
            });
            select.addEventListener('change', () => { spojeno[indeks] = select.value; });
            red.append(levo, select);
            forma.appendChild(red);
        });
        this.dodajDugmeZaSlanje(forma, 'POTVRDI SPAJANJE', () => this.posaljiOdgovor({ spojeno }));
    },

    renderujUljeza: function(kontejner, runda) {
        const lista = document.createElement('div');
        lista.className = 'kviz-choice-list';
        (runda.opcije || []).forEach((opcija, indeks) => {
            const dugme = document.createElement('button');
            dugme.type = 'button';
            dugme.className = 'kviz-option';
            const oznaka = document.createElement('span');
            oznaka.textContent = String.fromCharCode(65 + indeks);
            const tekst = document.createElement('b');
            tekst.textContent = opcija;
            dugme.append(oznaka, tekst);
            dugme.addEventListener('click', () => {
                dugme.classList.add('selected');
                this.posaljiOdgovor({ indeks });
            });
            lista.appendChild(dugme);
        });
        kontejner.appendChild(lista);
    },

    renderujMisteriju: function(kontejner, runda) {
        const tragovi = document.createElement('div');
        tragovi.id = 'kviz-misterija-tragovi';
        tragovi.className = 'kviz-clues';
        kontejner.appendChild(tragovi);
        this.prikaziTragoveMisterije();
        this.renderujTekstualniOdgovor(kontejner, 'Tvoje rešenje', 'POGODI POJAM');
    },

    renderujEmoji: function(kontejner, runda) {
        const emoji = document.createElement('div');
        emoji.className = 'kviz-emoji-clue';
        emoji.textContent = runda.emoji || '🗺️';
        kontejner.appendChild(emoji);
        this.renderujTekstualniOdgovor(kontejner, 'Naziv grada', 'POŠALJI ODGOVOR');
    },

    renderujAsocijacije: function(kontejner, runda) {
        const mreza = document.createElement('div');
        mreza.className = 'kviz-association-grid';
        (runda.kolone || []).forEach(kolona => {
            const kartica = document.createElement('article');
            kartica.className = 'kviz-association-card';
            const naslov = document.createElement('h4');
            naslov.textContent = `${kolona.oznaka} · ${kolona.kategorija}`;
            const tragovi = document.createElement('p');
            tragovi.textContent = (kolona.tragovi || []).join(' · ');
            kartica.append(naslov, tragovi);
            mreza.appendChild(kartica);
        });
        kontejner.appendChild(mreza);
        this.renderujTekstualniOdgovor(kontejner, 'Konačno rešenje', 'ZAKLJUČAJ REŠENJE');
    },

    renderujTekstualniOdgovor: function(kontejner, placeholder, oznakaDugmeta) {
        const forma = this.napraviFormu(kontejner, 'kviz-text-answer-form');
        const polje = document.createElement('input');
        polje.className = 'kviz-text-input';
        polje.type = 'text';
        polje.maxLength = 60;
        polje.autocomplete = 'off';
        polje.placeholder = placeholder;
        forma.appendChild(polje);
        this.dodajDugmeZaSlanje(forma, oznakaDugmeta, () => this.posaljiOdgovor({ tekst: polje.value }));
    },

    napraviFormu: function(kontejner, klasa) {
        const forma = document.createElement('form');
        forma.className = `kviz-round-form ${klasa}`;
        forma.addEventListener('submit', dogadjaj => dogadjaj.preventDefault());
        kontejner.appendChild(forma);
        return forma;
    },

    dodajDugmeZaSlanje: function(forma, oznaka, akcija) {
        const dugme = document.createElement('button');
        dugme.type = 'button';
        dugme.className = 'kviz-round-submit';
        dugme.textContent = oznaka;
        dugme.addEventListener('click', akcija);
        forma.appendChild(dugme);
    },

    prikaziTragoveMisterije: function() {
        const kontejner = document.getElementById('kviz-misterija-tragovi');
        if (!kontejner) return;
        kontejner.replaceChildren();
        (this.aktivnaRunda?.tragovi || []).forEach((trag, indeks) => {
            const stavka = document.createElement('p');
            stavka.className = 'kviz-clue';
            const oznaka = document.createElement('b');
            oznaka.textContent = `TRAG ${indeks + 1}`;
            const tekst = document.createElement('span');
            tekst.textContent = trag;
            stavka.append(oznaka, tekst);
            kontejner.appendChild(stavka);
        });
    },

    posaljiOdgovor: function(odgovor) {
        if (!this.mecUToku || this.odgovorPoslat || !this.sobaId || !this.socket || this.indeksRunde < 0) return;
        this.odgovorPoslat = true;
        this.onemoguciUnosRunde();
        this.postaviTekst('kviz-answer-status', 'Odgovor je zaključan. Čekamo protivnika...');
        this.socket.emit('kviz:odgovori', {
            sobaId: this.sobaId,
            indeksRunde: this.indeksRunde,
            odgovor
        });
    },

    primiRezultatRunde: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId || Number(podaci.indeksRunde) !== this.indeksRunde) return;
        this.zaustaviTajmer();
        this.odgovorPoslat = true;
        this.onemoguciUnosRunde();

        const rezultati = Array.isArray(podaci.rezultati) ? podaci.rezultati : [];
        rezultati.forEach(rezultat => {
            this.rezultat[rezultat.playerId] = rezultat;
            if (rezultat.playerId === this.igracId()) this.postaviTekst('kviz-moji-poeni', String(rezultat.ukupnoPoena || 0));
            else this.postaviTekst('kviz-protivnik-poeni', String(rezultat.ukupnoPoena || 0));
        });

        const mojRezultat = rezultati.find(rezultat => rezultat.playerId === this.igracId()) || {};
        this.prikaziResenjeRunde(podaci.tip, podaci.resenje || {});
        this.postaviTekst('kviz-answer-status', this.porukaRezultataRunde(mojRezultat, podaci) + (podaci.poslednje ? ' Računamo konačan rezultat...' : ' Sledeća runda stiže uskoro...'));
    },

    porukaRezultataRunde: function(mojRezultat, podaci) {
        if (!mojRezultat.poslat) return 'Vreme je isteklo pre slanja odgovora.';
        if (podaci.tip === 'brzopotezne') {
            const bonus = Number(mojRezultat.bonus) ? ' + bonus za originalnost!' : '';
            return `Tačnih pojmova: ${mojRezultat.tacnih || 0}. Osvojeno: +${mojRezultat.poeniRunde || 0}.${bonus}`;
        }
        return mojRezultat.tacno
            ? `Tačno! Osvojeno: +${mojRezultat.poeniRunde || 0}.`
            : 'Ovog puta odgovor nije tačan.';
    },

    prikaziResenjeRunde: function(tip, resenje) {
        const kontejner = this.sadrzajRunde();
        if (!kontejner) return;
        kontejner.querySelector('.kviz-round-solution')?.remove();
        const okvir = document.createElement('div');
        okvir.className = 'kviz-round-solution';
        const naslov = document.createElement('b');
        naslov.textContent = 'REŠENJE';
        const tekst = document.createElement('span');

        if (tip === 'brzopotezne') tekst.textContent = `Prihvaćeni pojmovi: ${(resenje.prihvaceni || []).join(', ')}.`;
        else if (tip === 'spojnice') tekst.textContent = (resenje.parovi || []).map(par => `${par.levo} — ${par.desno}`).join(' · ');
        else if (tip === 'uljez') tekst.textContent = `${resenje.uljez || ''}. ${resenje.objasnjenje || ''}`;
        else if (tip === 'misterija' || tip === 'emoji') tekst.textContent = `Odgovor: ${resenje.odgovor || ''}.`;
        else if (tip === 'asocijacije') {
            const kolone = (resenje.kolone || []).map(kolona => `${kolona.oznaka}: ${kolona.resenje}`).join(' · ');
            tekst.textContent = `${kolone}. Konačno: ${resenje.odgovor || ''}.`;
        }
        okvir.append(naslov, tekst);
        kontejner.appendChild(okvir);
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
        const naslov = jeNereseno ? 'Nerešeno!' : (pobedio ? 'Pobeda!' : 'Ovog puta je protivnik uspešniji');

        this.prikaziSekciju('kraj');
        this.postaviTekst('kviz-final-moji', String(ja.ukupnoPoena || 0));
        this.postaviTekst('kviz-final-protivnik', String(protivnik.ukupnoPoena || 0));
        this.postaviTekst('kviz-result-title', naslov);
        this.postaviTekst('kviz-result-copy', jeNereseno
            ? 'Isti broj poena nakon svih šest rundi.'
            : (pobedio ? `Savladao/la si ${protivnik.ime || 'protivnika'}!` : `Čestitaj ${protivnik.ime || 'protivniku'} na pobedi.`));
        this.postaviTekst('kviz-result-eyebrow', podaci.razlog === 'predaja' ? 'PROTIVNIK JE NAPUSTIO MEČ' : 'REZULTAT ŠEST RUNDI');
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
        this.postaviStatus('Spreman si za duel kroz šest rundi.', false);
        this.ocistiSadrzajRunde();
        const progress = document.getElementById('kviz-progress-fill');
        if (progress) progress.style.width = '0%';
    },

    resetujStanje: function() {
        this.zaustaviTajmer();
        this.sobaId = null;
        this.cekanjeUToku = false;
        this.mecUToku = false;
        this.odgovorPoslat = false;
        this.indeksRunde = -1;
        this.aktivnaRunda = null;
        this.krajRundeAt = 0;
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
                : '<i class="fa-solid fa-bolt" aria-hidden="true"></i> ZAPOČNI DUEL';
        }
        if (otkazi) otkazi.hidden = !ceka;
    },

    pokreniTajmer: function() {
        this.zaustaviTajmer();
        const osvezi = () => {
            const serverSada = typeof Game !== 'undefined' && typeof Game.serverSada === 'function' ? Game.serverSada() : Date.now();
            const preostalo = Math.max(0, Math.ceil((this.krajRundeAt - serverSada) / 1000));
            this.postaviTekst('kviz-tajmer', String(preostalo));
            if (preostalo <= 0) {
                this.onemoguciUnosRunde();
                if (!this.odgovorPoslat) this.postaviTekst('kviz-answer-status', 'Vreme je isteklo. Čekamo rezultat runde...');
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

    sadrzajRunde: function() {
        return document.getElementById('kviz-runda-sadrzaj');
    },

    ocistiSadrzajRunde: function() {
        this.sadrzajRunde()?.replaceChildren();
    },

    onemoguciUnosRunde: function() {
        this.sadrzajRunde()?.querySelectorAll('button, input, select, textarea').forEach(element => { element.disabled = true; });
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
