// zemljopis-kviz.js - Online Zemljopis kviz, sedam različitih rundi 1 na 1.
// Server je jedini izvor rešenja, vremena i bodova.

const KvizManager = {
    socket: null,
    sobaId: null,
    cekanjeUToku: false,
    mecUToku: false,
    odgovorPoslat: false,
    indeksRunde: -1,
    indeksPitanja: -1,
    aktivnaRunda: null,
    krajRundeAt: 0,
    tajmer: null,
    nastavakAt: 0,
    pauzaTajmer: null,
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,
    mojeIme: 'Igrač',
    protivnik: null,
    rezultat: {},
    rezultatiPoRundama: {},
    aktivneSpojnice: null,
    spojniceTajmer: null,

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
        socket.on('kviz:pitanjeZakljuceno', (podaci = {}) => this.primiPitanjeZakljuceno(podaci));
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
        this.postaviStatus('Tražimo protivnika za duel od sedam rundi...', false);

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
        this.rezultatiPoRundama = {};
        this.prikaziCekanje(false);
        this.prikaziSekciju('igra');
        this.vratiKvizNaPocetak();
        this.postaviTekst('kviz-moje-ime', this.mojeIme);
        this.postaviTekst('kviz-protivnik-ime', this.protivnik.ime || 'Protivnik');
        this.postaviTekst('kviz-moji-poeni', '0');
        this.postaviTekst('kviz-protivnik-poeni', '0');
        this.postaviTekst('kviz-round', 'RUNDA 1 / 7');
        this.postaviTekst('kviz-kategorija', 'SPREMI SE');
        this.postaviTekst('kviz-pitanje', 'Protivnik je pronađen. Prva runda stiže uskoro...');
        this.postaviTekst('kviz-answer-status', 'Očekuje te sedam potpuno različitih izazova.');
        this.ocistiSadrzajRunde();
    },

    primiRundu: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId || !podaci.runda) return;
        clearTimeout(this.spojniceTajmer);
        this.spojniceTajmer = null;
        this.sakrijPauzuRunde();
        this.vratiKvizNaPocetak();
        this.odgovorPoslat = false;
        this.indeksRunde = Number(podaci.indeksRunde);
        this.indeksPitanja = Number(podaci.indeksPitanja);
        this.aktivnaRunda = podaci.runda;
        this.krajRundeAt = Number(podaci.krajRundeAt) || 0;

        const redniBroj = Number(podaci.redniBroj) || 1;
        const ukupnoPitanja = Number(podaci.ukupnoPitanja) || 1;
        const rednoPitanje = (Number(podaci.indeksPitanja) || 0) + 1;
        this.postaviTekst('kviz-round', `RUNDA ${redniBroj}/${Number(podaci.ukupno) || 7}\nPITANJE ${rednoPitanje}/${ukupnoPitanja}`);
        this.postaviTekst('kviz-kategorija', this.aktivnaRunda.kategorija || this.aktivnaRunda.naziv || 'ZEMLJOPIS');
        this.postaviTekst('kviz-pitanje', this.aktivnaRunda.pitanje || 'Zadatak nije dostupan.');
        this.postaviTekst('kviz-answer-status', this.aktivnaRunda.uputstvo || 'Pošalji odgovor pre isteka vremena.');
        this.prikaziNapredak(Number(podaci.redniBroj) || 1, Number(podaci.ukupno) || 7);
        this.renderujRundu(this.aktivnaRunda);
        this.poveziKvizTastaturu();
        requestAnimationFrame(() => this.vratiKvizNaPocetak());
        this.pokreniTajmer();
    },

    primiTrag: function(podaci) {
        if (
            !this.mecUToku
            || podaci.sobaId !== this.sobaId
            || Number(podaci.indeksRunde) !== this.indeksRunde
            || Number(podaci.indeksPitanja) !== this.indeksPitanja
            || this.aktivnaRunda?.tip !== 'misterija'
        ) return;

        const izazov = this.aktivnaRunda.izazovi?.[Number(podaci.indeksIzazova)];
        if (!izazov) return;
        const tragovi = Array.isArray(izazov.tragovi) ? izazov.tragovi : [];
        if (!tragovi.includes(podaci.tekst)) tragovi.push(podaci.tekst);
        izazov.tragovi = tragovi;
        this.prikaziTragoveMisterije();
    },

    renderujRundu: function(runda) {
        const sadrzaj = this.sadrzajRunde();
        if (!sadrzaj) return;
        sadrzaj.replaceChildren();

        if (runda.tip === 'brzopotezne') return this.renderujBrzopotezne(sadrzaj, runda);
        if (runda.tip === 'spojnice') return this.renderujSpojnice(sadrzaj, runda);
        if (runda.tip === 'anagram') return this.renderujAnagram(sadrzaj, runda);
        if (runda.tip === 'uljez') return this.renderujUljeza(sadrzaj, runda);
        if (runda.tip === 'misterija') return this.renderujMisteriju(sadrzaj, runda);
        if (runda.tip === 'emoji') return this.renderujEmoji(sadrzaj, runda);
        if (runda.tip === 'pikado') return this.renderujPikado(sadrzaj, runda);

        this.postaviTekst('kviz-answer-status', 'Ovaj tip runde trenutno nije dostupan.', true);
    },

    renderujBrzopotezne: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-triples-form');
        const grupe = [];
        (runda.izazovi || []).forEach((izazov, indeksIzazova) => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv, `Upiši ${izazov.trazeno || 3} različita pojma.`);
            const polja = [];
            for (let indeks = 0; indeks < (izazov.trazeno || 3); indeks++) {
                const polje = document.createElement('input');
                polje.className = 'kviz-text-input game-input';
                polje.type = 'text';
                polje.maxLength = 40;
                polje.autocomplete = 'off';
                polje.placeholder = `Pojam ${indeks + 1}`;
                polje.setAttribute('aria-label', `${izazov.naziv || `Izazov ${indeksIzazova + 1}`}, pojam ${indeks + 1}`);
                this.zadrziFokusUKvizEkranu(polje);
                polja.push(polje);
                kartica.appendChild(polje);
            }
            grupe.push(polja);
        });
        this.dodajDugmeZaSlanje(forma, 'POŠALJI TROJKU', () => {
            this.posaljiOdgovor({ grupe: grupe.map(polja => polja.map(polje => polje.value)) });
        });
    },

    renderujSpojnice: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-matching-form');
        const spojeno = {};
        const redovi = new Map();
        const banke = [];
        let redniBroj = 0;
        (runda.izazovi || []).forEach(izazov => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv);
            const uputstvo = document.createElement('p');
            uputstvo.className = 'kviz-match-instruction';
            uputstvo.textContent = 'Dodirni levi pojam, pa njegov par iz banke ispod.';
            kartica.appendChild(uputstvo);
            const lista = document.createElement('div');
            lista.className = 'kviz-match-rows';
            const banka = document.createElement('div');
            banka.className = 'kviz-match-bank';
            const naslovBanke = document.createElement('b');
            naslovBanke.className = 'kviz-match-bank-title';
            naslovBanke.textContent = 'IZABERI PAR';
            const izbori = document.createElement('div');
            izbori.className = 'kviz-match-options';
            izbori.setAttribute('role', 'group');
            izbori.setAttribute('aria-label', 'Ponuđeni pojmovi za spajanje');
            const dugmiciIzbora = [];
            let aktivniRed = null;

            const osveziIzbor = () => {
                redovi.forEach((red, indeks) => {
                    const izabrano = spojeno[indeks];
                    red.red.classList.toggle('active', indeks === aktivniRed);
                    red.odgovor.classList.toggle('filled', Boolean(izabrano));
                    red.odgovor.textContent = izabrano || 'IZABERI PAR';
                    red.odgovor.setAttribute('aria-label', izabrano ? `Izabrani par: ${izabrano}` : 'Izaberi par');
                });
                dugmiciIzbora.forEach(dugme => {
                    const koristiSe = Object.values(spojeno).includes(dugme.dataset.kvizPojam);
                    dugme.classList.toggle('used', koristiSe);
                    dugme.setAttribute('aria-pressed', String(koristiSe));
                });
            };

            (izazov.levo || []).forEach(pojam => {
                const red = document.createElement('section');
                red.className = 'kviz-match-row';
                const levo = document.createElement('button');
                levo.type = 'button';
                levo.className = 'kviz-match-source';
                levo.textContent = pojam;
                const trenutniRed = redniBroj++;
                const odgovor = document.createElement('button');
                odgovor.type = 'button';
                odgovor.className = 'kviz-match-answer';
                odgovor.textContent = 'IZABERI PAR';
                const aktivirajRed = () => {
                    aktivniRed = trenutniRed;
                    osveziIzbor();
                };
                levo.addEventListener('click', aktivirajRed);
                odgovor.addEventListener('click', aktivirajRed);
                red.append(levo, odgovor);
                redovi.set(trenutniRed, { red, levo, odgovor });
                lista.appendChild(red);
            });
            (izazov.opcije || []).forEach(opcija => {
                const izbor = document.createElement('button');
                izbor.type = 'button';
                izbor.className = 'kviz-match-choice';
                izbor.textContent = opcija;
                izbor.dataset.kvizPojam = opcija;
                izbor.setAttribute('aria-pressed', 'false');
                izbor.addEventListener('click', () => {
                    if (aktivniRed === null) return;
                    Object.entries(spojeno).forEach(([indeks, vrednost]) => {
                        if (vrednost === opcija && Number(indeks) !== aktivniRed) delete spojeno[indeks];
                    });
                    spojeno[aktivniRed] = opcija;
                    aktivniRed = null;
                    osveziIzbor();
                });
                dugmiciIzbora.push(izbor);
                izbori.appendChild(izbor);
            });
            banka.append(naslovBanke, izbori);
            banke.push(banka);
            kartica.append(lista, banka);
            osveziIzbor();
        });
        this.aktivneSpojnice = { spojeno, redovi, banke };
        this.dodajDugmeZaSlanje(forma, 'POTVRDI SPAJANJE', () => this.posaljiOdgovor({ spojeno }));
    },

    renderujAnagram: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-anagram-form');
        const odgovori = [];
        (runda.izazovi || []).forEach((izazov, indeksIzazova) => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv);
            const odgovor = [];
            const prikazOdgovora = document.createElement('div');
            prikazOdgovora.className = 'kviz-anagram-answer';
            prikazOdgovora.textContent = '—';
            const slova = document.createElement('div');
            slova.className = 'kviz-anagram-tiles';
            const dugmici = [];
            const osveziOdgovor = () => { prikazOdgovora.textContent = odgovor.length ? odgovor.join('') : '—'; };
            (izazov.slova || []).forEach((slovo, indeks) => {
                const dugme = document.createElement('button');
                dugme.type = 'button';
                dugme.className = 'kviz-anagram-tile';
                dugme.style.setProperty('--kviz-wave-delay', `${(indeks + (indeksIzazova * 5)) * 85}ms`);
                dugme.textContent = slovo;
                dugme.addEventListener('click', () => {
                    odgovor.push(slovo);
                    dugme.disabled = true;
                    osveziOdgovor();
                });
                dugmici.push(dugme);
                slova.appendChild(dugme);
            });
            const akcije = document.createElement('div');
            akcije.className = 'kviz-anagram-actions';
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.className = 'kviz-anagram-reset';
            reset.textContent = 'ISPOČETKA';
            reset.addEventListener('click', () => {
                odgovor.splice(0);
                dugmici.forEach(dugme => { dugme.disabled = false; });
                osveziOdgovor();
            });
            akcije.appendChild(reset);
            kartica.append(prikazOdgovora, slova, akcije);
            odgovori.push(odgovor);
        });
        this.dodajDugmeZaSlanje(forma, 'PROVERI ANAGRAM', () => this.posaljiOdgovor({ tekstovi: odgovori.map(odgovor => odgovor.join('')) }));
    },

    renderujPikado: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-pikado-form');
        const koordinate = Array((runda.izazovi || []).length).fill(null);
        const mape = {
            francuska: { datoteka: 'kviz-pikado-francuska.svg', naziv: 'Francuske' },
            srbija: { datoteka: 'kviz-pikado-srbija.svg', naziv: 'Srbije' },
            italija: { datoteka: 'kviz-pikado-italija.svg', naziv: 'Italije' },
            evropa: { datoteka: 'kviz-pikado-europa.svg', naziv: 'Evrope' }
        };
        (runda.izazovi || []).forEach((izazov, indeks) => {
            const prikazMape = mape[izazov.mapa || runda.mapa] || mape.evropa;
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv, `Postavi pin za grad: ${izazov.grad}.`);
            const mapa = document.createElement('button');
            mapa.type = 'button';
            mapa.className = 'kviz-map-picker';
            mapa.setAttribute('aria-label', `Postavi pin za grad ${izazov.grad} na mapi ${prikazMape.naziv}`);
            const slika = document.createElement('img');
            slika.src = `assets/${prikazMape.datoteka}`;
            slika.alt = `Nema mapa ${prikazMape.naziv}`;
            slika.draggable = false;
            const pin = document.createElement('span');
            pin.className = 'kviz-map-pin';
            pin.hidden = true;
            pin.setAttribute('aria-hidden', 'true');
            mapa.append(slika, pin);
            const status = document.createElement('p');
            status.className = 'kviz-map-status';
            status.textContent = `Postavi pin za grad: ${izazov.grad}.`;
            mapa.addEventListener('click', dogadjaj => {
                const okvir = mapa.getBoundingClientRect();
                const x = Math.min(100, Math.max(0, ((dogadjaj.clientX - okvir.left) / okvir.width) * 100));
                const y = Math.min(100, Math.max(0, ((dogadjaj.clientY - okvir.top) / okvir.height) * 100));
                koordinate[indeks] = { x, y };
                pin.hidden = false;
                pin.style.left = `${x}%`;
                pin.style.top = `${y}%`;
                zakljucaj.disabled = !koordinate.every(Boolean);
                status.textContent = `Pin za ${izazov.grad} je postavljen.`;
            });
            kartica.append(mapa, status);
        });
        const akcije = document.createElement('div');
        akcije.className = 'kviz-pikado-actions';
        const zakljucaj = document.createElement('button');
        zakljucaj.type = 'button';
        zakljucaj.className = 'kviz-round-submit';
        zakljucaj.textContent = 'ZAKLJUČAJ PIN';
        zakljucaj.disabled = true;
        zakljucaj.addEventListener('click', () => this.posaljiOdgovor({ koordinate }));
        akcije.appendChild(zakljucaj);
        forma.appendChild(akcije);
    },

    renderujUljeza: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-uljez-form');
        const indeksi = Array((runda.izazovi || []).length).fill(null);
        (runda.izazovi || []).forEach((izazov, indeksIzazova) => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv, izazov.pitanje);
            const lista = document.createElement('div');
            lista.className = 'kviz-choice-list';
            (izazov.opcije || []).forEach((opcija, indeks) => {
                const dugme = document.createElement('button');
                dugme.type = 'button';
                dugme.className = 'kviz-option';
                const oznaka = document.createElement('span');
                oznaka.textContent = String.fromCharCode(65 + indeks);
                const tekst = document.createElement('b');
                tekst.textContent = opcija;
                dugme.append(oznaka, tekst);
                dugme.addEventListener('click', () => {
                    lista.querySelectorAll('.kviz-option').forEach(opcijaDugme => opcijaDugme.classList.remove('selected'));
                    dugme.classList.add('selected');
                    indeksi[indeksIzazova] = indeks;
                    potvrdi.disabled = !indeksi.every(indeksIzbora => Number.isInteger(indeksIzbora));
                });
                lista.appendChild(dugme);
            });
            kartica.appendChild(lista);
        });
        const potvrdi = this.dodajDugmeZaSlanje(forma, 'POTVRDI ULJEZA', () => this.posaljiOdgovor({ indeksi }));
        potvrdi.disabled = true;
    },

    renderujMisteriju: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-misterija-form');
        const polja = [];
        (runda.izazovi || []).forEach((izazov, indeks) => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv);
            const tragovi = document.createElement('div');
            tragovi.className = 'kviz-clues';
            tragovi.dataset.kvizTragovi = String(indeks);
            const polje = document.createElement('input');
            polje.className = 'kviz-text-input game-input';
            polje.type = 'text';
            polje.maxLength = 60;
            polje.autocomplete = 'off';
            polje.placeholder = `Rešenje za ${izazov.naziv}`;
            this.zadrziFokusUKvizEkranu(polje);
            kartica.append(tragovi, polje);
            polja.push(polje);
        });
        this.prikaziTragoveMisterije();
        this.dodajDugmeZaSlanje(forma, 'POGODI POJAM', () => this.posaljiOdgovor({ tekstovi: polja.map(polje => polje.value) }));
    },

    renderujEmoji: function(kontejner, runda) {
        const forma = this.napraviFormu(kontejner, 'kviz-emoji-form');
        const polja = [];
        (runda.izazovi || []).forEach(izazov => {
            const kartica = this.napraviKarticuIzazova(forma, izazov.naziv);
            const emoji = document.createElement('div');
            emoji.className = 'kviz-emoji-clue';
            emoji.textContent = izazov.emoji || '🗺️';
            const polje = document.createElement('input');
            polje.className = 'kviz-text-input game-input';
            polje.type = 'text';
            polje.maxLength = 60;
            polje.autocomplete = 'off';
            polje.placeholder = `Naziv ${izazov.naziv.toLowerCase()}`;
            this.zadrziFokusUKvizEkranu(polje);
            kartica.append(emoji, polje);
            polja.push(polje);
        });
        this.dodajDugmeZaSlanje(forma, 'POŠALJI ODGOVOR', () => this.posaljiOdgovor({ tekstovi: polja.map(polje => polje.value) }));
    },

    napraviKarticuIzazova: function(kontejner, naziv, pitanje = '') {
        const kartica = document.createElement('section');
        kartica.className = 'kviz-challenge-card';
        const naslov = document.createElement('h4');
        naslov.className = 'kviz-challenge-title';
        naslov.textContent = naziv || 'IZAZOV';
        kartica.appendChild(naslov);
        if (pitanje) {
            const tekst = document.createElement('p');
            tekst.className = 'kviz-challenge-copy';
            tekst.textContent = pitanje;
            kartica.appendChild(tekst);
        }
        kontejner.appendChild(kartica);
        return kartica;
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
        return dugme;
    },

    prikaziTragoveMisterije: function() {
        const izazovi = this.aktivnaRunda?.izazovi || [];
        document.querySelectorAll('[data-kviz-tragovi]').forEach(kontejner => {
            const indeksIzazova = Number(kontejner.dataset.kvizTragovi);
            const tragovi = izazovi[indeksIzazova]?.tragovi || [];
            kontejner.replaceChildren();
            tragovi.forEach((trag, indeks) => {
                const stavka = document.createElement('p');
                stavka.className = 'kviz-clue';
                const oznaka = document.createElement('b');
                oznaka.textContent = `TRAG ${indeks + 1}`;
                const tekst = document.createElement('span');
                tekst.textContent = trag;
                stavka.append(oznaka, tekst);
                kontejner.appendChild(stavka);
            });
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
            indeksPitanja: this.indeksPitanja,
            odgovor
        });
    },

    primiPitanjeZakljuceno: function(podaci) {
        if (
            !this.mecUToku
            || podaci.sobaId !== this.sobaId
            || Number(podaci.indeksRunde) !== this.indeksRunde
            || Number(podaci.indeksPitanja) !== this.indeksPitanja
        ) return;
        this.zaustaviTajmer();
        this.odgovorPoslat = true;
        this.onemoguciUnosRunde();
        if (podaci.tip === 'brzopotezne' || podaci.tip === 'spojnice') {
            const rezultati = Array.isArray(podaci.rezultati) ? podaci.rezultati : [];
            this.osveziRezultateIgraca(rezultati);
            const mojRezultat = rezultati.find(rezultat => rezultat.playerId === this.igracId()) || {};
            const protivnickiRezultat = rezultati.find(rezultat => rezultat.playerId !== this.igracId()) || {};
            if (podaci.tip === 'spojnice') {
                this.prikaziIshodSpajnica(podaci.resenje || {});
                this.postaviTekst('kviz-answer-status', 'Provera spojnica…');
                this.zakaziRezultatSpajnica(() => this.prikaziPauzuPodpitanja(podaci, mojRezultat, protivnickiRezultat));
                return;
            }
            this.prikaziPauzuPodpitanja(podaci, mojRezultat, protivnickiRezultat);
            return;
        }
        this.prikaziResenjeRunde(podaci.tip, podaci.resenje || {});
        const sledece = (Number(podaci.indeksPitanja) || 0) + 2;
        const ukupno = Number(podaci.ukupnoPitanja) || 1;
        this.postaviTekst('kviz-answer-status', `Pitanje je zaključano. Sledeće pitanje (${sledece}/${ukupno}) stiže za trenutak.`);
    },

    primiRezultatRunde: function(podaci) {
        if (!this.mecUToku || podaci.sobaId !== this.sobaId || Number(podaci.indeksRunde) !== this.indeksRunde) return;
        this.zaustaviTajmer();
        this.vratiKvizNaPocetak();
        this.odgovorPoslat = true;
        this.onemoguciUnosRunde();

        const rezultati = Array.isArray(podaci.rezultati) ? podaci.rezultati : [];
        this.osveziRezultateIgraca(rezultati);
        this.rezultatiPoRundama[Number(podaci.indeksRunde)] = rezultati;

        const mojRezultat = rezultati.find(rezultat => rezultat.playerId === this.igracId()) || {};
        const protivnickiRezultat = rezultati.find(rezultat => rezultat.playerId !== this.igracId()) || {};
        const poruka = podaci.tip === 'brzopotezne'
            ? 'Poeni su sabrani nakon sve četiri oblasti.'
            : (podaci.tip === 'spojnice'
                ? `Tačno spojenih: ${mojRezultat.tacnih || 0}. Osvojeno: +${mojRezultat.poeniRunde || 0}.`
                : this.porukaRezultataRunde(mojRezultat, podaci));
        const prikaziPauzu = () => {
            if (podaci.tip !== 'brzopotezne' && podaci.tip !== 'spojnice') this.prikaziResenjeRunde(podaci.tip, podaci.resenje || {});
            this.postaviTekst('kviz-answer-status', poruka);
            this.prikaziPauzuRunde(podaci, mojRezultat, protivnickiRezultat, poruka);
        };
        if (podaci.tip === 'spojnice') {
            this.prikaziIshodSpajnica(podaci.resenje || {});
            this.postaviTekst('kviz-answer-status', 'Provera spojnica…');
            this.zakaziRezultatSpajnica(prikaziPauzu);
            return;
        }
        prikaziPauzu();
    },

    prikaziIshodSpajnica: function(resenje) {
        const aktivne = this.aktivneSpojnice;
        const parovi = Array.isArray(resenje?.parovi) ? resenje.parovi : [];
        if (!aktivne || parovi.length === 0) return;
        aktivne.banke.forEach(banka => { banka.hidden = true; });
        aktivne.redovi.forEach((stavka, indeks) => {
            const tacanPar = parovi[indeks]?.desno || '';
            const izabraniPar = aktivne.spojeno[indeks] || '';
            const tacno = Boolean(izabraniPar) && izabraniPar === tacanPar;
            stavka.red.classList.remove('active');
            stavka.red.classList.add('revealed', tacno ? 'correct' : 'incorrect');
            stavka.levo.disabled = true;
            stavka.odgovor.disabled = true;
            stavka.odgovor.replaceChildren();
            const izabrano = document.createElement('span');
            izabrano.className = tacno ? 'kviz-match-result-correct' : 'kviz-match-result-wrong';
            izabrano.textContent = izabraniPar || 'NIJE SPOJENO';
            stavka.odgovor.appendChild(izabrano);
            if (!tacno) {
                const strelica = document.createElement('span');
                strelica.className = 'kviz-match-result-arrow';
                strelica.textContent = '→';
                const ispravno = document.createElement('strong');
                ispravno.className = 'kviz-match-result-correct';
                ispravno.textContent = tacanPar;
                stavka.odgovor.append(strelica, ispravno);
            }
        });
    },

    zakaziRezultatSpajnica: function(akcija) {
        clearTimeout(this.spojniceTajmer);
        this.spojniceTajmer = setTimeout(() => {
            this.spojniceTajmer = null;
            akcija();
        }, 1800);
    },

    osveziRezultateIgraca: function(rezultati) {
        rezultati.forEach(rezultat => {
            this.rezultat[rezultat.playerId] = rezultat;
            if (rezultat.playerId === this.igracId()) this.postaviTekst('kviz-moji-poeni', String(rezultat.ukupnoPoena || 0));
            else this.postaviTekst('kviz-protivnik-poeni', String(rezultat.ukupnoPoena || 0));
        });
    },

    pokreniAnimacijuRezultata: function(klasa) {
        const pauza = document.getElementById('kviz-pauza-runde');
        if (!pauza) return;
        pauza.classList.remove(
            'kviz-score-animate',
            'kviz-brzopotezne-score',
            'kviz-brzopotezne-final',
            'kviz-spojnice-score',
            'kviz-spojnice-final'
        );
        if (klasa) pauza.classList.add(klasa);
        void pauza.offsetWidth;
        pauza.classList.add('kviz-score-animate');
    },

    postaviOznakePauze: function({ obrva, mojaOznaka, protivnickaOznaka, ukupnoOznaka, prikaziLogo = false }) {
        this.postaviTekst('kviz-pauza-obrva', obrva);
        this.postaviTekst('kviz-pauza-moji-oznaka', mojaOznaka);
        this.postaviTekst('kviz-pauza-protivnik-oznaka', protivnickaOznaka);
        this.postaviTekst('kviz-pauza-ukupno-oznaka', ukupnoOznaka);
        const logo = document.getElementById('kviz-pauza-igra-logo');
        if (logo) logo.hidden = !prikaziLogo;
    },

    prikaziPauzuPodpitanja: function(podaci, mojRezultat, protivnickiRezultat) {
        const pauza = document.getElementById('kviz-pauza-runde');
        if (!pauza) return;
        const redniBroj = (Number(podaci.indeksPitanja) || 0) + 1;
        const ukupno = Number(podaci.ukupnoPitanja) || 4;
        const brzo = podaci.tip === 'brzopotezne';
        const oznaka = brzo ? 'OBLAST' : 'SPOJNICA';
        this.postaviOznakePauze({
            obrva: `REZULTAT ${oznaka}`,
            mojaOznaka: `TI · OVA ${oznaka}`,
            protivnickaOznaka: `PROTIVNIK · OVA ${oznaka}`,
            ukupnoOznaka: 'UKUPNO U MEČU'
        });
        this.postaviTekst('kviz-pauza-naslov', `${oznaka} ${redniBroj}/${ukupno} JE ZAVRŠENA`);
        this.postaviTekst('kviz-pauza-podnaslov', this.aktivnaRunda?.kategorija || (brzo ? 'Brzopotezne trojke' : 'Geografske spojnice'));
        this.postaviTekst('kviz-pauza-moji-runda', `+${Number(mojRezultat.poeniOblasti) || 0}`);
        this.postaviTekst('kviz-pauza-protivnik-runda', `+${Number(protivnickiRezultat.poeniOblasti) || 0}`);
        this.postaviTekst('kviz-pauza-ukupno', `${Number(mojRezultat.ukupnoPoena) || 0} : ${Number(protivnickiRezultat.ukupnoPoena) || 0}`);
        this.postaviTekst('kviz-pauza-poruka', `Bodovi su upisani. Sledeća ${oznaka.toLowerCase()} stiže za trenutak.`);
        this.postaviTekst('kviz-pauza-nastavak', `SLEDEĆA ${oznaka} ZA`);
        this.prikaziSazetakDveRunde(false);
        this.nastavakAt = Number(podaci.nastavakAt) || 0;
        pauza.hidden = false;
        document.getElementById('kviz-igra')?.classList.add('kviz-round-paused');
        this.pokreniAnimacijuRezultata(brzo ? 'kviz-brzopotezne-score' : 'kviz-spojnice-score');
        this.pokreniPauzaTajmer();
    },

    prikaziSazetakDveRunde: function(prikazi) {
        const okvir = document.getElementById('kviz-pauza-sazetak-rundi');
        if (!okvir) return;
        if (!prikazi) {
            okvir.hidden = true;
            return;
        }
        const rezultatRunde = indeksRunde => {
            const rezultati = this.rezultatiPoRundama[indeksRunde] || [];
            const ja = rezultati.find(rezultat => rezultat.playerId === this.igracId()) || {};
            const protivnik = rezultati.find(rezultat => rezultat.playerId !== this.igracId()) || {};
            return `${Number(ja.poeniRunde) || 0} : ${Number(protivnik.poeniRunde) || 0}`;
        };
        this.postaviTekst('kviz-pauza-runda-1', rezultatRunde(0));
        this.postaviTekst('kviz-pauza-runda-2', rezultatRunde(1));
        okvir.hidden = false;
    },

    prikaziPauzuRunde: function(podaci, mojRezultat, protivnickiRezultat, poruka) {
        const pauza = document.getElementById('kviz-pauza-runde');
        if (!pauza) return;
        const poslednje = Boolean(podaci.poslednje);
        const brzo = podaci.tip === 'brzopotezne';
        const spojnice = podaci.tip === 'spojnice';
        this.postaviOznakePauze(brzo ? {
            obrva: 'KONAČAN REZULTAT PRVE IGRE',
            mojaOznaka: 'TI · SVE 4 OBLASTI',
            protivnickaOznaka: 'PROTIVNIK · SVE 4 OBLASTI',
            ukupnoOznaka: 'UKUPNO U MEČU',
            prikaziLogo: true
        } : {
            obrva: 'REZULTAT RUNDE',
            mojaOznaka: 'TI · OVA RUNDA',
            protivnickaOznaka: 'PROTIVNIK · OVA RUNDA',
            ukupnoOznaka: 'UKUPNO',
            prikaziLogo: false
        });
        const brojSpojnica = Number(podaci.ukupnoPitanja) || 2;
        this.postaviTekst('kviz-pauza-naslov', brzo
            ? 'SVE 4 OBLASTI SU ZAVRŠENE'
            : (spojnice ? `SVE ${brojSpojnica} SPOJNICE SU ZAVRŠENE` : (poslednje ? 'POSLEDNJA RUNDA JE ZAVRŠENA' : `RUNDA ${Number(podaci.indeksRunde) + 1} JE ZAVRŠENA`)));
        this.postaviTekst('kviz-pauza-podnaslov', podaci.naziv || 'Zemljopis kviz');
        this.postaviTekst('kviz-pauza-moji-runda', `+${Number(mojRezultat.poeniRunde) || 0}`);
        this.postaviTekst('kviz-pauza-protivnik-runda', `+${Number(protivnickiRezultat.poeniRunde) || 0}`);
        this.postaviTekst('kviz-pauza-ukupno', `${Number(mojRezultat.ukupnoPoena) || 0} : ${Number(protivnickiRezultat.ukupnoPoena) || 0}`);
        this.postaviTekst('kviz-pauza-poruka', poruka);
        this.postaviTekst('kviz-pauza-nastavak', poslednje ? 'KONAČAN REZULTAT ZA' : (brzo ? 'SLEDEĆA IGRA ZA' : 'SLEDEĆA RUNDA ZA'));
        this.prikaziSazetakDveRunde(spojnice && Number(podaci.indeksRunde) === 1);
        this.nastavakAt = Number(podaci.nastavakAt) || 0;
        pauza.hidden = false;
        document.getElementById('kviz-igra')?.classList.add('kviz-round-paused');
        this.pokreniAnimacijuRezultata(brzo ? 'kviz-brzopotezne-final' : (spojnice ? 'kviz-spojnice-final' : ''));
        this.pokreniPauzaTajmer();
    },

    sakrijPauzuRunde: function() {
        this.zaustaviPauzaTajmer();
        this.nastavakAt = 0;
        const pauza = document.getElementById('kviz-pauza-runde');
        if (pauza) pauza.hidden = true;
        if (pauza) pauza.classList.remove(
            'kviz-score-animate',
            'kviz-brzopotezne-score',
            'kviz-brzopotezne-final',
            'kviz-spojnice-score',
            'kviz-spojnice-final'
        );
        const logo = document.getElementById('kviz-pauza-igra-logo');
        if (logo) logo.hidden = true;
        this.prikaziSazetakDveRunde(false);
        document.getElementById('kviz-igra')?.classList.remove('kviz-round-paused');
    },

    vratiKvizNaPocetak: function() {
        const igra = document.getElementById('kviz-igra');
        if (igra) igra.scrollTop = 0;
        this.vratiGlobalniKvizNaVrh();
    },

    vratiGlobalniKvizNaVrh: function() {
        const kvizEkran = document.getElementById('zemljopis-kviz-screen');
        if (kvizEkran) kvizEkran.scrollTop = 0;
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        window.scrollTo(0, 0);
    },

    zadrziFokusUKvizEkranu: function(polje) {
        polje.addEventListener('focus', () => {
            // Android ponekad otvori tastaturu tako što pomeri ceo dokument.
            // Sadržaj runde sada ima svoj skrol, pa globalni ekran ostaje na vrhu.
            window.setTimeout(() => this.vratiGlobalniKvizNaVrh(), 80);
        });
    },

    poveziKvizTastaturu: function() {
        const polja = this.sadrzajRunde()?.querySelectorAll('.kviz-text-input.game-input') || [];
        polja.forEach(polje => {
            polje.readOnly = true;
            polje.setAttribute('inputmode', 'none');
            polje.setAttribute('enterkeyhint', 'next');
        });
        if (typeof KeyboardManager !== 'undefined' && typeof KeyboardManager.bindInputs === 'function') {
            KeyboardManager.bindInputs();
        }
    },

    porukaRezultataRunde: function(mojRezultat, podaci) {
        if (!mojRezultat.poslat) return 'Vreme je isteklo pre slanja odgovora.';
        if (podaci.tip === 'brzopotezne') {
            const bonus = Number(mojRezultat.bonus) ? ' + bonus za originalnost!' : '';
            return `Tačnih pojmova: ${mojRezultat.tacnih || 0}. Osvojeno: +${mojRezultat.poeniRunde || 0}.${bonus}`;
        }
        if (podaci.tip === 'pikado') {
            const udaljenost = typeof mojRezultat.udaljenost === 'number' ? ` Udaljenost pina: ${mojRezultat.udaljenost}.` : '';
            return mojRezultat.tacno
                ? `Odličan pogodak! Osvojeno: +${mojRezultat.poeniRunde || 0}.${udaljenost}`
                : `Pin je predaleko za poene.${udaljenost}`;
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
        else if (tip === 'misterija' || tip === 'emoji' || tip === 'anagram') tekst.textContent = `Odgovor: ${resenje.odgovor || ''}.`;
        else if (tip === 'pikado') {
            tekst.textContent = `Tačna lokacija grada ${resenje.grad || ''} je označena zlatnim pinom.`;
            const mapa = kontejner.querySelector('.kviz-map-picker');
            if (mapa && resenje.cilj) {
                mapa.querySelector('.kviz-map-target')?.remove();
                const cilj = document.createElement('span');
                cilj.className = 'kviz-map-target';
                cilj.style.left = `${resenje.cilj.x}%`;
                cilj.style.top = `${resenje.cilj.y}%`;
                cilj.setAttribute('aria-label', `Tačna lokacija: ${resenje.grad || ''}`);
                mapa.appendChild(cilj);
            }
        }
        okvir.append(naslov, tekst);
        kontejner.appendChild(okvir);
    },

    primiKrajMeca: function(podaci) {
        if (!this.sobaId || podaci.sobaId !== this.sobaId) return;
        this.zaustaviTajmer();
        this.sakrijPauzuRunde();
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
            ? 'Isti broj poena nakon svih sedam rundi.'
            : (pobedio ? `Savladao/la si ${protivnik.ime || 'protivnika'}!` : `Čestitaj ${protivnik.ime || 'protivniku'} na pobedi.`));
        this.postaviTekst('kviz-result-eyebrow', podaci.razlog === 'predaja' ? 'PROTIVNIK JE NAPUSTIO MEČ' : 'REZULTAT SEDAM RUNDI');
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
        this.postaviStatus('Spreman si za duel kroz sedam rundi.', false);
        this.ocistiSadrzajRunde();
        const progress = document.getElementById('kviz-progress-fill');
        if (progress) progress.style.width = '0%';
    },

    resetujStanje: function() {
        this.zaustaviTajmer();
        this.sakrijPauzuRunde();
        this.sobaId = null;
        this.cekanjeUToku = false;
        this.mecUToku = false;
        this.odgovorPoslat = false;
        this.indeksRunde = -1;
        this.indeksPitanja = -1;
        this.aktivnaRunda = null;
        this.krajRundeAt = 0;
        this.protivnik = null;
        this.rezultat = {};
        this.rezultatiPoRundama = {};
        this.aktivneSpojnice = null;
        clearTimeout(this.spojniceTajmer);
        this.spojniceTajmer = null;
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

    pokreniPauzaTajmer: function() {
        this.zaustaviPauzaTajmer();
        const osvezi = () => {
            const preostalo = Math.max(0, Math.ceil((this.nastavakAt - this.serverSada()) / 1000));
            this.postaviTekst('kviz-pauza-tajmer', String(preostalo));
            if (preostalo <= 0) this.zaustaviPauzaTajmer();
        };
        osvezi();
        this.pauzaTajmer = setInterval(osvezi, 180);
    },

    zaustaviPauzaTajmer: function() {
        if (this.pauzaTajmer) clearInterval(this.pauzaTajmer);
        this.pauzaTajmer = null;
    },

    serverSada: function() {
        return typeof Game !== 'undefined' && typeof Game.serverSada === 'function' ? Game.serverSada() : Date.now();
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
        const aktivnoPolje = typeof KeyboardManager !== 'undefined' ? KeyboardManager.activeInput : null;
        if (aktivnoPolje?.closest('#zemljopis-kviz-screen')) KeyboardManager.hideKeyboard();
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
