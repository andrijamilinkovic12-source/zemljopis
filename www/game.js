// game.js - Glavna logika koja upravlja tokom igre sa MULTIPLAYER (Socket.IO) integracijom

const Game = {
    // === MULTIPLAYER VARIJABLE ===
    socketURL: 'https://zemljopis.onrender.com', // TVOJ PRAVI RENDER LINK
    socket: null,
    trenutnaSoba: null,
    jeHost: false,

    // === LOKALNE VARIJABLE ===
    trenutniMod: '',
    zadatoSlovo: '',
    tajmerInterval: null,
    preostaloVreme: 120, 
    trenutnaRunda: 1, 
    ukupanScore: 0,   
    ukupnoTacnihOdgovora: 0, 
    brojIgracaUSobi: 0, 
    rezultatiProtivnika: {}, // OVO JE SADA OBJEKAT (za prave igrače sa servera)
    iskoriscenaSlova: [], 
    rundaUToku: false, 
    kazneniPoeni: 0, 
    antiCheatTimeout: null, 

    init: function() {
        this.podesiTastaturu();
        this.poveziSeNaServer();
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.detektujVaralicu();
                if (this.rundaUToku && this.trenutniMod === 'multi' && this.kazneniPoeni < 2) {
                    this.antiCheatTimeout = setTimeout(() => {
                        this.izbaciZbogVremena();
                    }, 7000);
                }
            } else if (document.visibilityState === 'visible') {
                if (this.antiCheatTimeout) {
                    clearTimeout(this.antiCheatTimeout);
                    this.antiCheatTimeout = null;
                }
            }
        });

        setTimeout(() => { UIManager.prikaziEkran('main-menu'); }, 2600); 
    },

    // INICIJALIZACIJA SOCKET.IO KONEKCIJE
    poveziSeNaServer: function() {
        if (typeof io !== 'undefined') {
            this.socket = io(this.socketURL);
            
            this.socket.on('connect', () => {
                console.log("Povezan na server sa ID:", this.socket.id);
            });

            // Kada server javi da se neko novi povezao u sobu
            this.socket.on('noviIgracUSobi', (podaci) => {
                if (this.jeHost) {
                    UIManager.prikaziObavestenje(
                        "Soba: " + this.trenutnaSoba,
                        `Trenutno igrača: <b>${podaci.brojIgraca}/${podaci.max}</b><br><br>Da li želiš da započneš meč?`,
                        () => { this.socket.emit('pokreniIgru', this.trenutnaSoba); },
                        "Započni igru"
                    );
                }
            });

            // Kada server javi da host pokreće igru
            this.socket.on('igraPocela', (podaci) => {
                UIManager.zatvoriObavestenje();
                this.pokreniIgru('multi', podaci.slovo);
            });

            // Prijem svih odgovora od servera kada svi završe
            this.socket.on('sviOdgovoriPrikupjeni', (odgovoriSobe) => {
                UIManager.zatvoriObavestenje();
                this.obradiMultiplayerOdgovore(odgovoriSobe);
            });

            // --- NOVO: Kada se broj igrača u JAVNOJ sobi promeni ---
            this.socket.on('azuriranjeJavneSobe', (podaci) => {
                UIManager.prikaziObavestenje(
                    "Traženje protivnika...",
                    `Pronađena soba! Čekamo ostale...<br><br>Igrača: <b style="color:#f5af19; font-size: 1.2rem;">${podaci.brojIgraca} / ${podaci.max}</b><br><br>Igra počinje automatski kada se soba napuni.`,
                    () => { 
                        this.povratakUMeni(); 
                        this.socket.emit('napustiSobu'); 
                    },
                    "Odustani"
                );
            });

        } else {
            console.error("Socket.IO nije učitan! Proveri index.html");
        }
    },

    // Javno traženje nasumičnih igrača za meč (MATCHMAKING)
    traziSobu: function(brojIgraca) {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        this.brojIgracaUSobi = brojIgraca;
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        // Prikazujemo početni ekran za čekanje
        UIManager.prikaziObavestenje(
            "Traženje protivnika...", 
            `Tražim slobodnu sobu za ${brojIgraca} igrača...<br><br>Igrača: <b style="color:#f5af19; font-size: 1.2rem;">1 / ${brojIgraca}</b>`, 
            () => { 
                this.povratakUMeni(); 
                this.socket.emit('napustiSobu'); 
            },
            "Odustani"
        );

        // Šaljemo zahtev serveru za matchmaking
        this.socket.emit('traziJavnuSobu', { brojIgraca: brojIgraca, ime: mojNadimak }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = odgovor.kodSobe;
                this.jeHost = odgovor.isHost;
            }
        });
    },

    kreirajPrivatnuSobu: function(brojIgraca) {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        this.brojIgracaUSobi = brojIgraca;
        this.jeHost = true;

        UIManager.prikaziObavestenje("Kreiranje...", "Pravim sobu na serveru...", null, "...");

        // Šaljemo zahtev serveru da kreira sobu
        this.socket.emit('kreirajSobu', brojIgraca, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = odgovor.kodSobe;
                UIManager.prikaziObavestenje(
                    "Soba je kreirana!",
                    `Tvoj kod sobe je:<br><br><b style="font-size: 2.5rem; color: #f5af19; letter-spacing: 5px; text-shadow: 0 0 10px rgba(245,175,25,0.4);">${odgovor.kodSobe}</b><br><br>Pošalji ovaj kod prijateljima.<br>Kada uđu, iskočiće ti dugme za početak!`,
                    () => { this.socket.emit('pokreniIgru', this.trenutnaSoba); },
                    "Započni igru (Samo ako žuriš)" // Host može da pokrene i ranije
                );
            }
        });
    },

    pridruziSeSobi: function() {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        const input = document.getElementById('room-code-input');
        const kod = input.value.trim().toUpperCase();

        if (kod.length < 3) {
            UIManager.prikaziObavestenje("Greška", "Moraš uneti ispravan kod sobe!", null, "U redu");
            return;
        }

        this.jeHost = false;
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        UIManager.prikaziObavestenje("Povezivanje...", "Proveravam kod na serveru...", null, "...");

        // Šaljemo zahtev za ulazak
        this.socket.emit('pridruziSeSobi', { kodSobe: kod, ime: mojNadimak }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = kod;
                UIManager.prikaziObavestenje(
                    "Uspešno!",
                    `Povezan si u sobu: <b style="color:#38ef7d">${kod}</b><br><br>Čekamo da Host započne meč...`,
                    null,
                    "Čekam..." 
                );
                input.value = ''; 
            } else {
                UIManager.prikaziObavestenje("Greška", odgovor.poruka, null, "Pokušaj ponovo");
            }
        });
    },

    pokreniIgru: function(mod, zadatoSlovoSaServera = null) {
        this.trenutniMod = mod;
        this.trenutnaRunda = 1; 
        this.ukupanScore = 0;   
        this.ukupnoTacnihOdgovora = 0; 
        this.iskoriscenaSlova = []; 
        
        this.kazneniPoeni = 0; 
        if (this.antiCheatTimeout) {
            clearTimeout(this.antiCheatTimeout);
            this.antiCheatTimeout = null;
        }
        this.azurirajAntiCheatUI(); 
        
        // Resetujemo prave protivnike (Objekat, a ne niz nula više)
        this.rezultatiProtivnika = {}; 
        
        this.zapocniRundu(zadatoSlovoSaServera);    
    },

    zapocniRundu: function(zadatoSlovoSaServera = null) {
        // Ako igramo solo, sami biramo slovo. Ako je multi, uzimamo ono koje je server prosledio.
        if (this.trenutniMod === 'solo' || !zadatoSlovoSaServera) {
            const svaSlova = "ABVGDĐEŽZIJKLLJMNNJOPRSTĆUFHCČDŽŠ".split("");
            let dostupnaSlova = svaSlova.filter(slovo => !this.iskoriscenaSlova.includes(slovo));
            if (dostupnaSlova.length === 0) {
                this.iskoriscenaSlova = []; 
                dostupnaSlova = svaSlova;
            }
            this.zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
        } else {
            this.zadatoSlovo = zadatoSlovoSaServera;
        }

        this.iskoriscenaSlova.push(this.zadatoSlovo);
        this.rundaUToku = true; 

        UIManager.pripremiPolja();
        UIManager.podesiTabluZaIgru(this.trenutniMod, this.zadatoSlovo);
        UIManager.azurirajRundu(this.trenutnaRunda); 
        
        // Ako je solo, u Live stat ide broj tačnih, ako je multi onda idu poeni i podaci protivnika (kao objekat)
        let prikazRezultata = this.trenutniMod === 'solo' ? this.ukupnoTacnihOdgovora : this.ukupanScore;
        // Konvertujemo objekat rezultatiProtivnika u niz za UIManager, ukoliko ga ima
        let arrayZaLiveStatistiku = Object.values(this.rezultatiProtivnika).map(p => ({ ime: p.ime, poeni: p.poeni }));
        UIManager.azurirajLiveStatistiku(prikazRezultata, this.trenutniMod, arrayZaLiveStatistiku.length > 0 ? arrayZaLiveStatistiku : this.brojIgracaUSobi);
        
        const prikaziIPokreni = () => {
            UIManager.prikaziEkran('game-board');
            this.pokreniTajmer(120);
            setTimeout(() => {
                const prviUnos = document.querySelector('#game-board .game-input');
                if (prviUnos) prviUnos.focus();
            }, 100);
        };

        if (this.trenutnaRunda === 1) {
            UIManager.pokreniTranzicijuVrata(prikaziIPokreni);
        } else {
            prikaziIPokreni();
        }
    },

    // --------------------------------------------------------------------------
    // ZAVRŠETAK RUNDE - Logika odvojena za Solo (lokalno) i Multi (slanje na server)
    // --------------------------------------------------------------------------
    zavrsiRundu: function() {
        if (!this.rundaUToku) return; 
        this.rundaUToku = false; 

        if (this.antiCheatTimeout) { clearTimeout(this.antiCheatTimeout); this.antiCheatTimeout = null; }
        clearInterval(this.tajmerInterval);
        const inputs = document.querySelectorAll('#game-board .game-input');

        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        // === SOLO LOGIKA ===
        if (this.trenutniMod === 'solo') {
            let tacnihOveRunde = 0; 
            let pregledIgraca = {
                'ja': { ime: `👤 ${mojNadimak}`, ukupnoPoena: 0, odgovori: [], isMe: true }
            };
            
            inputs.forEach(input => {
                const kategorija = input.getAttribute('data-kategorija');
                const nazivKategorije = input.previousElementSibling.innerText; 
                const mojOdgovor = input.value.trim();
                const isCorrect = BazaPodataka.proveriPojam(kategorija, mojOdgovor, this.zadatoSlovo);
                
                UIManager.zakljucajIObojiPolje(input, isCorrect);

                if (isCorrect) tacnihOveRunde++;
                pregledIgraca['ja'].odgovori.push({
                    kategorija: nazivKategorije,
                    odgovor: mojOdgovor || "-",
                    boja: isCorrect ? 'green' : 'red',
                    poeni: isCorrect ? '✓' : '✗'
                });
            });

            this.ukupnoTacnihOdgovora += tacnihOveRunde;
            UIManager.azurirajLiveStatistiku(this.ukupnoTacnihOdgovora, this.trenutniMod, []);
            
            setTimeout(() => {
                this.prikaziRezimeRunde(pregledIgraca, tacnihOveRunde);
            }, 1200);

        // === MULTIPLAYER LOGIKA ===
        } else {
            let mojiOdgovori = {};
            inputs.forEach(input => {
                const kategorija = input.getAttribute('data-kategorija');
                mojiOdgovori[kategorija] = input.value.trim();
                input.disabled = true; // Zaključavamo polja
            });

            // Prikazujemo obaveštenje i čekamo server da javi da su svi gotovi
            UIManager.prikaziObavestenje(
                "Vreme je isteklo!",
                "Slanje tvojih odgovora na server...<br><br>Čekamo ostale igrače da završe.",
                null,
                "..." 
            );

            // Šaljemo svoje odgovore na server
            this.socket.emit('posaljiOdgovore', {
                kodSobe: this.trenutnaSoba,
                odgovori: mojiOdgovori
            });
        }
    },

    obradiMultiplayerOdgovore: function(odgovoriSobeSaServera) {
        let pregledIgraca = {};
        let scoreOveRunde = {}; 

        // 1. Priprema strukture za svakog pravog igrača
        odgovoriSobeSaServera.forEach(p => {
            let isMe = p.idIgraca === this.socket.id;
            pregledIgraca[p.idIgraca] = {
                ime: isMe ? `👤 ${p.ime}` : `🌍 ${p.ime}`,
                ukupnoPoena: 0,
                odgovori: [],
                isMe: isMe
            };
            scoreOveRunde[p.idIgraca] = 0;

            // Beležimo protivnike u globalni skor (ako već nisu tu)
            if (!isMe && !this.rezultatiProtivnika[p.idIgraca]) {
                this.rezultatiProtivnika[p.idIgraca] = { ime: p.ime, poeni: 0 };
            }
        });

        const inputs = document.querySelectorAll('#game-board .game-input');
        
        // 2. Obrada i bodovanje za svaku kategoriju pojedinačno
        inputs.forEach(input => {
            const kategorija = input.getAttribute('data-kategorija');
            const nazivKategorije = input.previousElementSibling.innerText; 
            
            let odgovoriZaKategoriju = [];

            // Prikupljamo šta je ko napisao za ovu kategoriju
            odgovoriSobeSaServera.forEach(p => {
                let odgovorIgraca = p.odgovori[kategorija] || "";
                let isCorrect = BazaPodataka.proveriPojam(kategorija, odgovorIgraca, this.zadatoSlovo);

                // Oboji samo tvoje polje lokalno
                if (p.idIgraca === this.socket.id) {
                    UIManager.zakljucajIObojiPolje(input, isCorrect);
                }

                odgovoriZaKategoriju.push({
                    id: p.idIgraca,
                    odgovor: odgovorIgraca,
                    tacan: isCorrect
                });
            });

            // Kroz tvoju staru funkciju obračunavamo duplikate
            let obradjeniOdgovori = this.obracunajKategoriju(kategorija, odgovoriZaKategoriju);
            
            obradjeniOdgovori.forEach(unos => {
                let statusBoja = 'red'; 
                if (unos.tacan && unos.odgovor !== "") {
                    if (unos.poeni === 20) statusBoja = 'green';
                    else if (unos.poeni === 10 || unos.poeni === 5) statusBoja = 'yellow';
                }

                scoreOveRunde[unos.id] += unos.poeni;

                pregledIgraca[unos.id].odgovori.push({
                    kategorija: nazivKategorije,
                    odgovor: unos.odgovor || "-",
                    boja: statusBoja,
                    poeni: unos.poeni > 0 ? `+${unos.poeni}` : '0'
                });
            });
        });

        // 3. Sabiranje poena
        let arrayZaLiveStatistiku = [];
        for (let socketId in pregledIgraca) {
            pregledIgraca[socketId].ukupnoPoena = scoreOveRunde[socketId];

            if (pregledIgraca[socketId].isMe) {
                this.ukupanScore += scoreOveRunde[socketId];
            } else {
                this.rezultatiProtivnika[socketId].poeni += scoreOveRunde[socketId];
                arrayZaLiveStatistiku.push({ ime: this.rezultatiProtivnika[socketId].ime, poeni: this.rezultatiProtivnika[socketId].poeni });
            }
        }

        UIManager.azurirajLiveStatistiku(this.ukupanScore, 'multi', arrayZaLiveStatistiku);

        setTimeout(() => {
            this.prikaziRezimeRunde(pregledIgraca, 0);
        }, 1200);
    },

    obracunajKategoriju: function(kategorija, odgovoriIgraca) {
        let frekvencijaOdgovora = {};
        let ukupanBrojTacnihOdgovora = 0;

        odgovoriIgraca.forEach(unos => {
            if (unos.tacan && unos.odgovor.trim() !== "") {
                let formatiranOdgovor = BazaPodataka.standardizujPojam(kategorija, unos.odgovor, this.zadatoSlovo);
                frekvencijaOdgovora[formatiranOdgovor] = (frekvencijaOdgovora[formatiranOdgovor] || 0) + 1;
                ukupanBrojTacnihOdgovora++;
            }
        });

        odgovoriIgraca.forEach(unos => {
            unos.poeni = 0; 
            if (unos.tacan && unos.odgovor.trim() !== "") {
                let formatiranOdgovor = BazaPodataka.standardizujPojam(kategorija, unos.odgovor, this.zadatoSlovo);
                let brojPonavljanja = frekvencijaOdgovora[formatiranOdgovor];

                if (brojPonavljanja >= 2) {
                    unos.poeni = 5; 
                } else if (brojPonavljanja === 1) {
                    if (ukupanBrojTacnihOdgovora === 1) unos.poeni = 20; 
                    else unos.poeni = 10; 
                }
            }
        });

        return odgovoriIgraca;
    },

    prikaziRezimeRunde: function(pregledIgraca, tacnihOveRunde) {
        UIManager.prikaziEkran('round-summary-screen');
        
        const carousel = document.getElementById('summary-carousel');
        const leaderboardContainer = document.getElementById('round-leaderboard-container');
        carousel.innerHTML = '';

        // Pretvaramo objekat u niz i stavljamo TEBE na prvo mesto u slider-u
        let sviIgraci = Object.values(pregledIgraca);
        sviIgraci.sort((a, b) => (a.isMe === b.isMe) ? 0 : a.isMe ? -1 : 1);

        if (this.trenutniMod === 'multi') {
            let trenutnaTabela = [];
            let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";
            trenutnaTabela.push({ ime: `👤 ${mojNadimak}`, poeni: this.ukupanScore, isMe: true });
            
            for (let socketId in this.rezultatiProtivnika) {
                trenutnaTabela.push({ ime: `🌍 ${this.rezultatiProtivnika[socketId].ime}`, poeni: this.rezultatiProtivnika[socketId].poeni, isMe: false });
            }
            trenutnaTabela.sort((a, b) => b.poeni - a.poeni);
            
            let tabelaHtml = `<div style="padding: 0 1rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.8rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="color: #38ef7d; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.6rem; text-align: center; letter-spacing: 1px;"><i class="fa-solid fa-chart-simple"></i> Trenutni poredak</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">`;
            
            trenutnaTabela.forEach((igrac, idx) => {
                let bgBoja = igrac.isMe ? 'rgba(56,239,125,0.15)' : 'rgba(255,255,255,0.05)';
                let bojaTeksta = igrac.isMe ? '#38ef7d' : '#fff';
                let fw = igrac.isMe ? '800' : '600';
                let border = igrac.isMe ? '1px solid rgba(56,239,125,0.3)' : '1px solid transparent';
                
                tabelaHtml += `
                    <div style="background: ${bgBoja}; color: ${bojaTeksta}; font-weight: ${fw}; border: ${border}; font-size: 0.85rem; padding: 0.4rem 0.6rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${idx + 1}. ${igrac.ime}</span>
                        <span>${igrac.poeni}</span>
                    </div>`;
            });
            tabelaHtml += `</div></div></div>`;
            
            if (leaderboardContainer) {
                leaderboardContainer.innerHTML = tabelaHtml;
                leaderboardContainer.style.display = 'block';
            }
            
        } else {
            if (leaderboardContainer) leaderboardContainer.style.display = 'none';
        }

        sviIgraci.forEach(igrac => {
            let listHtml = '';
            igrac.odgovori.forEach(odg => {
                let colorHex = '#ff416c'; 
                if (odg.boja === 'green') colorHex = '#38ef7d'; 
                else if (odg.boja === 'yellow') colorHex = '#f5af19'; 

                listHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 0.75rem; color: #a0aec0; width: 30%; text-transform: uppercase;">${odg.kategorija}</span>
                        <span style="font-size: 0.95rem; font-weight: 800; color: ${colorHex}; flex: 1; text-align: left; padding-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">${odg.odgovor}</span>
                        <span style="font-size: 0.85rem; font-weight: 800; color: ${colorHex}; background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 6px;">${odg.poeni}</span>
                    </div>
                `;
            });

            let cardHtml = `
                <div class="summary-card" style="padding: 0.8rem 1rem;">
                    <h3 style="font-size: 1.15rem; margin-bottom: 0.2rem;">${igrac.ime}</h3>
                    <p style="text-align: center; color: #38ef7d; font-weight: 800; font-size: 1rem; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(56,239,125,0.2);">
                        ${this.trenutniMod === 'solo' ? `Pronađeno: ${tacnihOveRunde}/7` : `Osvojeno: +${igrac.ukupnoPoena} pts`}
                    </p>
                    <div style="flex: 1; overflow-y: auto; scrollbar-width: none;">
                        ${listHtml}
                    </div>
                </div>
            `;
            carousel.innerHTML += cardHtml;
        });

        const staroDugme = document.getElementById('btn-next-round');
        const btnNext = staroDugme.cloneNode(true);
        staroDugme.replaceWith(btnNext); 

        btnNext.disabled = true;
        btnNext.style.background = 'rgba(255,255,255,0.1)';
        btnNext.style.color = '#a0aec0';
        btnNext.style.boxShadow = 'none';

        let preostalo = 10;
        btnNext.innerText = `Sačekaj (${preostalo}s)`;

        let timer = setInterval(() => {
            preostalo--;
            if (preostalo > 0) {
                btnNext.innerText = `Sačekaj (${preostalo}s)`;
            } else {
                clearInterval(timer);
                btnNext.disabled = false;
                btnNext.innerText = "Sledeća Runda";
                btnNext.style.background = 'linear-gradient(45deg, #11998e, #38ef7d)';
                btnNext.style.color = '#000';
                btnNext.style.boxShadow = '0 4px 15px rgba(56, 239, 125, 0.3)';
            }
        }, 1000);

        btnNext.addEventListener('click', () => {
            if (this.trenutnaRunda < 6) {
                this.trenutnaRunda++; 
                this.zapocniRundu();  
            } else {
                this.zavrsiIgruKonacno();
            }
        });
    },

    zavrsiIgruKonacno: function() {
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        if (this.trenutniMod === 'multi') {
            let sviIgraci = [];
            sviIgraci.push({ ime: `👤 ${mojNadimak}`, poeni: this.ukupanScore, isMe: true });
            
            for (let socketId in this.rezultatiProtivnika) {
                sviIgraci.push({ ime: `🌍 ${this.rezultatiProtivnika[socketId].ime}`, poeni: this.rezultatiProtivnika[socketId].poeni, isMe: false });
            }
            
            sviIgraci.sort((a, b) => b.poeni - a.poeni);
            
            let tabelaHtml = `<div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 10px; margin-top: 1rem;">`;
            
            sviIgraci.forEach((igrac, index) => {
                let medalja = "";
                if (index === 0) medalja = "🥇";
                else if (index === 1) medalja = "🥈";
                else if (index === 2) medalja = "🥉";
                else medalja = `<b>${index + 1}.</b>`;
                
                let fontWeigth = igrac.isMe ? '800' : '600';
                let boja = igrac.isMe ? '#38ef7d' : '#cbd5e0';
                
                tabelaHtml += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-weight: ${fontWeigth}; color: ${boja}; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.4rem;">
                        <span>${medalja} ${igrac.ime}</span>
                        <span>${igrac.poeni} pts</span>
                    </div>`;
            });
            tabelaHtml += `</div>`;

            UIManager.prikaziObavestenje(
                "🏆 KRAJ IGRE 🏆", 
                `Konačan plasman takmičara:<br> ${tabelaHtml}`, 
                () => {
                    if (this.socket) this.socket.emit('napustiSobu');
                    this.povratakUMeni();
                },
                "Nazad u Meni" 
            );
        } else {
            UIManager.prikaziObavestenje(
                "Kraj treninga!", 
                `Svaka čast, <b>${mojNadimak}</b>! Završio/la si svih 6 rundi.<br><br>Tvoj rezultat je: <b style="color:#38ef7d; font-size:1.2rem;">${this.ukupnoTacnihOdgovora} / 42</b> tačnih odgovora.`, 
                () => this.povratakUMeni(),
                "Završi" 
            );
        }
    },

    pokreniTajmer: function(sekunde) {
        this.preostaloVreme = sekunde;
        clearInterval(this.tajmerInterval);
        UIManager.azurirajTajmer(this.preostaloVreme);

        this.tajmerInterval = setInterval(() => {
            this.preostaloVreme--;
            UIManager.azurirajTajmer(this.preostaloVreme);

            if (this.preostaloVreme <= 0) {
                this.zavrsiRundu(); 
            }
        }, 1000);
    },

    povratakUMeni: function() {
        clearInterval(this.tajmerInterval);
        if (this.antiCheatTimeout) {
            clearTimeout(this.antiCheatTimeout);
            this.antiCheatTimeout = null;
        }
        this.rundaUToku = false; 
        UIManager.prikaziEkran('main-menu');
    },

    podesiTastaturu: function() {
        const inputs = document.querySelectorAll('#game-board .game-input');
        inputs.forEach((input, index) => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (index < inputs.length - 1) inputs[index + 1].focus();
                    else input.blur();
                }
            });
        });
    },

    // --- ANTI-CHEAT FUNKCIJE ---
    detektujVaralicu: function() {
        if (this.rundaUToku && this.trenutniMod === 'multi') {
            this.kazneniPoeni++;
            this.azurirajAntiCheatUI();
            
            if (this.kazneniPoeni >= 2) {
                this.izbaciZbogVremena();
            } else {
                UIManager.prikaziObavestenje(
                    "Upozorenje!",
                    "Izlazak iz aplikacije tokom runde nije dozvoljen! Sledeći put ćeš biti izbačen.",
                    null,
                    "Razumem"
                );
            }
        }
    },

    izbaciZbogVremena: function() {
        this.rundaUToku = false;
        clearInterval(this.tajmerInterval);
        UIManager.prikaziObavestenje(
            "Izbačen si!",
            "Izbačen si iz runde zbog napuštanja aplikacije tokom partije.",
            () => {
                if (this.socket) this.socket.emit('napustiSobu');
                this.povratakUMeni();
            },
            "Nazad u meni"
        );
    },

    azurirajAntiCheatUI: function() {
        const statusEl = document.getElementById('anti-cheat-status');
        if (!statusEl) return;
        
        if (this.kazneniPoeni === 0) {
            statusEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i> АНТИ ЧИТ: <span style="color:#38ef7d;">У игри</span>';
        } else if (this.kazneniPoeni === 1) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> АНТИ ЧИТ: <span style="color:#f5af19;">Упозорење</span>';
        } else {
            statusEl.innerHTML = '<i class="fa-solid fa-ban"></i> АНТИ ЧИТ: <span style="color:#ff416c;">Избачен</span>';
        }
    }
};

Game.init();