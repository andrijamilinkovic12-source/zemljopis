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
    rezultatiProtivnika: {}, 
    iskoriscenaSlova: [], 
    rundaUToku: false, 
    kazneniPoeni: 0, 
    antiCheatTimeout: null, 

    // === PAMĆENJE SOBE ZA AUTO-JOIN NAKON REKLAME ===
    sobaNaCekanjuZbotTokena: null,
    proveraTokenaInterval: null,

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

    poveziSeNaServer: function() {
        if (typeof io !== 'undefined') {
            this.socket = io(this.socketURL);
            
            if (typeof GlobalChatManager !== 'undefined') {
                GlobalChatManager.poveziSokete(this.socket);
            }

            this.socket.on('connect', () => {
                console.log("Povezan na server sa ID:", this.socket.id);
                let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";
                this.socket.emit('prijavaNadimka', mojNadimak);
            });

            this.socket.on('podaciProfila', (podaci) => {
                console.log("📥 Podaci učitani iz baze:", podaci);
                
                const dukatiEl = document.getElementById('meni-dukati');
                const tokeniEl = document.getElementById('meni-tokeni');
                const tokeniVelikoEl = document.getElementById('tokeni-stanje-veliko');
                
                if (dukatiEl) dukatiEl.innerText = podaci.dukati;
                if (tokeniEl) tokeniEl.innerText = tokeniVelikoEl ? tokeniVelikoEl.innerText = podaci.tokeni : podaci.tokeni + "/3";
                if (tokeniVelikoEl) tokeniVelikoEl.innerText = podaci.tokeni;

                if (typeof TokeniManager !== 'undefined') TokeniManager.trenutnoTokena = podaci.tokeni;
                if (typeof RiznicaManager !== 'undefined') RiznicaManager.stanjeDukata = podaci.dukati;
            });

            this.socket.on('osveziMojeKvartalnePodatke', (podaci) => {
                if (typeof KvartalniNivoManager !== 'undefined') {
                    KvartalniNivoManager.primiMojePodatke(podaci);
                }
            });

            this.socket.on('kvartalnaTopListaServer', (podaci) => {
                if (typeof KvartalniNivoManager !== 'undefined') {
                    KvartalniNivoManager.primiTopListe(podaci);
                }
            });

            this.socket.on('azurirajBrojOnline', (broj) => {
                const el = document.getElementById('meni-online');
                if (el) el.innerText = broj;
            });

            this.socket.on('listaOnlineIgraca', (lista) => {
                if (typeof OnlineIgraciManager !== 'undefined') {
                    OnlineIgraciManager.renderLista(lista);
                }
            });

            this.socket.on('zahtevZaPrijateljstvo', (podaci) => {
                if (typeof OnlineIgraciManager !== 'undefined') {
                    OnlineIgraciManager.prikaziZahtev(podaci);
                }
            });

            this.socket.on('odgovorPrijateljstvo', (podaci) => {
                if (podaci.prihvaceno && typeof OnlineIgraciManager !== 'undefined') {
                    OnlineIgraciManager.uspesnoDodatPrijatelj(podaci);
                } else if (!podaci.prihvaceno) {
                    UIManager.prikaziObavestenje("Odbijeno", `<b style="color:#ff416c;">${podaci.imePrijatelja}</b> je odbio/la tvoj zahtev za prijateljstvo.`, null, "U redu");
                }
            });

            this.socket.on('sinhronizacijaPrijatelja', (podaci) => {
                if (typeof SobaPrijateljaManager !== 'undefined') {
                    SobaPrijateljaManager.primiSinhronizaciju(podaci);
                }
            });

            this.socket.on('noviOfflineZahtev', (imePosiljaoca) => {
                UIManager.prikaziObavestenje(
                    "Novi zahtev!", 
                    `Igrač <b style="color:#f5af19;">${imePosiljaoca}</b> ti je poslao zahtev za prijateljstvo!`, 
                    () => {
                        if (typeof SobaPrijateljaManager !== 'undefined') SobaPrijateljaManager.otvoriEkran();
                    }, 
                    "Pogledaj"
                );
                this.socket.emit('traziOsvezenjePrijatelja');
            });

            this.socket.on('pozivUSobu', (podaci) => {
                const modal = document.getElementById('game-invite-modal');
                if (modal) {
                    document.getElementById('game-invite-name').innerText = podaci.hostIme;
                    document.getElementById('btn-prihvati-igru').onclick = () => {
                        modal.classList.remove('active');
                        this.pridruziSeSobiDirektno(podaci.kodSobe); 
                    };
                    modal.classList.add('active');
                }
            });

            this.socket.on('noviIgracUSobi', (podaci) => {
                if (this.jeHost) {
                    if (podaci.brojIgraca < podaci.max) {
                        UIManager.prikaziObavestenje(
                            "Nova prijava",
                            `Tvoj prijatelj se povezao!<br><br>Trenutno igrača: <b style="color:#f5af19; font-size: 1.2rem;">${podaci.brojIgraca}/${podaci.max}</b><br><br>Čekamo ostale...`,
                            null, 
                            "Čekam..."
                        );
                    } else {
                        UIManager.prikaziObavestenje(
                            "Soba je puna!",
                            `Svi igrači su uspešno ušli! (<b style="color:#38ef7d;">${podaci.max}/${podaci.max}</b>)<br><br>Meč može da počne.`,
                            () => { this.socket.emit('pokreniIgru', this.trenutnaSoba); },
                            "Započni igru"
                        );
                    }
                } else {
                    if (podaci.brojIgraca === podaci.max) {
                        UIManager.prikaziObavestenje(
                            "Soba je puna!", 
                            "Svi igrači su tu! Čekamo hosta da pokrene meč...", 
                            null, 
                            "Spreman sam"
                        );
                    }
                }
            });

            this.socket.on('igraPocela', (podaci) => {
                UIManager.zatvoriObavestenje();
                this.pokreniIgru('multi', podaci.slovo);
            });

            this.socket.on('sviOdgovoriPrikupjeni', (odgovoriSobe) => {
                UIManager.zatvoriObavestenje();
                
                this.rundaUToku = false;
                clearInterval(this.tajmerInterval);
                
                if (typeof KeyboardManager !== 'undefined') {
                    KeyboardManager.hideKeyboard();
                }

                const inputs = document.querySelectorAll('#game-board .game-input');
                inputs.forEach(input => input.disabled = true);

                this.obradiMultiplayerOdgovore(odgovoriSobe);
            });

            this.socket.on('sledecaRundaPocinje', (podaci) => {
                UIManager.zatvoriObavestenje();
                this.trenutnaRunda = podaci.runda;
                this.zapocniRundu(podaci.slovo);
            });

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

            this.socket.on('igracNapustioSobu', (podaci) => {
                if (podaci.uIgri && podaci.ime) {
                    let razlogTekst = "je napustio meč.";
                    if (podaci.razlog === 'varanje') razlogTekst = "je izbačen zbog izlaska iz aplikacije (Anti-Cheat).";
                    else if (podaci.razlog === 'diskonekt') razlogTekst = "je izgubio konekciju sa serverom.";
                    
                    UIManager.prikaziObavestenje(
                        "Igrač izbačen/napustio",
                        `<b style="color:#ff416c;">${podaci.ime}</b> ${razlogTekst}`,
                        null,
                        "Nastavi igru"
                    );
                }
            });

            this.socket.on('pobedaZbogNapustanja', () => {
                if (this.trenutnaRunda >= 6 && !this.rundaUToku) return;

                this.rundaUToku = false;
                clearInterval(this.tajmerInterval);
                
                if (typeof KeyboardManager !== 'undefined') {
                    KeyboardManager.hideKeyboard();
                }
                document.querySelectorAll('#game-board .game-input').forEach(input => input.disabled = true);
                
                if (typeof TrofejiManager !== 'undefined') TrofejiManager.azurirajNapredak('pobede', 1);
                if (this.socket) this.socket.emit('upisiPobedu');
                
                UIManager.prikaziObavestenje(
                    "🏆 AUTOMATSKA POBEDA 🏆", 
                    "Svi protivnici su napustili meč ili su izbačeni.<br><br><b style='color:#38ef7d'>Osvojio si 1. mesto!</b>", 
                    () => {
                        this.povratakUMeni();
                    },
                    "Završi" 
                );
            });

        } else {
            console.error("Socket.IO nije učitan! Proveri index.html");
        }
    },

    zapocniProveruTokenaZaSobu: function() {
        if (this.proveraTokenaInterval) clearInterval(this.proveraTokenaInterval);
        
        this.proveraTokenaInterval = setInterval(() => {
            if (typeof TokeniManager !== 'undefined' && TokeniManager.imaTokena() && this.sobaNaCekanjuZbotTokena) {
                clearInterval(this.proveraTokenaInterval);
                let kod = this.sobaNaCekanjuZbotTokena;
                this.sobaNaCekanjuZbotTokena = null; 
                
                UIManager.prikaziEkran('main-menu'); 
                this.pridruziSeSobiDirektno(kod);    
            } 
            else if (document.getElementById('main-menu').classList.contains('active')) {
                clearInterval(this.proveraTokenaInterval);
                this.sobaNaCekanjuZbotTokena = null;
            }
        }, 1000);
    },

    traziSobu: function(brojIgraca) {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        if (typeof TokeniManager !== 'undefined' && !TokeniManager.imaTokena()) {
            UIManager.prikaziObavestenje(
                "Potrošio si sve tokene!", 
                "Potrošio si dnevni limit od 3 tokena za Multiplayer igru.<br><br>Dopuni svoje tokene gledanjem reklame kako bi nastavio igru sa ostalim igračima na mreži.", 
                () => { TokeniManager.otvoriEkran(); }, 
                "Dopuni tokene"
            );
            return;
        }

        this.brojIgracaUSobi = brojIgraca;
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        UIManager.prikaziObavestenje(
            "Traženje protivnika...", 
            `Tražim slobodnu sobu za ${brojIgraca} igrača...<br><br>Igrača: <b style="color:#f5af19; font-size: 1.2rem;">1 / ${brojIgraca}</b>`, 
            () => { 
                this.povratakUMeni(); 
                this.socket.emit('napustiSobu'); 
            },
            "Odustani"
        );

        this.socket.emit('traziJavnuSobu', { brojIgraca: brojIgraca, ime: mojNadimak }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = odgovor.kodSobe;
                this.jeHost = odgovor.isHost;
            }
        });
    },

    kreirajPrivatnuSobu: function(brojIgraca) {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        if (typeof TokeniManager !== 'undefined' && !TokeniManager.imaTokena()) {
            UIManager.prikaziObavestenje(
                "Nemaš više tokena!", 
                "Da bi kreirao sobu potreban ti je 1 token.<br><br>Potrošio si dnevni limit. Idi na sekciju za tokene i pogledaj reklamu da dobiješ novi.", 
                () => { TokeniManager.otvoriEkran(); }, 
                "Nabavi tokene"
            );
            return;
        }

        this.brojIgracaUSobi = brojIgraca;
        this.jeHost = true;

        UIManager.prikaziObavestenje("Kreiranje...", "Pravim sobu na serveru...", null, "...");

        this.socket.emit('kreirajSobu', brojIgraca, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = odgovor.kodSobe;
                UIManager.prikaziObavestenje(
                    "Soba je kreirana!",
                    `Tvoj kod sobe je:<br><br><b style="font-size: 2.5rem; color: #f5af19; letter-spacing: 5px; text-shadow: 0 0 10px rgba(245,175,25,0.4);">${odgovor.kodSobe}</b><br><br>Pošalji ovaj kod prijateljima.<br><br>Igrača: <b style="color:#f5af19;">1/${brojIgraca}</b>`,
                    null, 
                    "Čekam ostale..." 
                );
            }
        });
    },

    pridruziSeSobi: function() {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        const input = document.getElementById('room-code-input');
        const kod = input ? input.value.trim().toUpperCase() : '';

        if (kod.length < 3) {
            UIManager.prikaziObavestenje("Greška", "Moraš uneti ispravan kod sobe!", null, "U redu");
            return;
        }

        if (typeof TokeniManager !== 'undefined' && !TokeniManager.imaTokena()) {
            this.sobaNaCekanjuZbotTokena = kod; 
            UIManager.prikaziObavestenje(
                "Nemaš tokena za ulazak!", 
                "Nemaš više tokena za igru!<br><br>Pogledaj kratku reklamu da dobiješ token i <b>automatski ćeš biti ubačen u ovu sobu</b>.", 
                () => { 
                    TokeniManager.otvoriEkran(); 
                    this.zapocniProveruTokenaZaSobu(); 
                }, 
                "Gledaj reklamu"
            );
            return;
        }

        this.jeHost = false;
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        UIManager.prikaziObavestenje("Povezivanje...", "Proveravam kod na serveru...", null, "...");

        this.socket.emit('pridruziSeSobi', { kodSobe: kod, ime: mojNadimak }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = kod;
                UIManager.prikaziObavestenje(
                    "Uspešno!",
                    `Povezan si u sobu: <b style="color:#38ef7d">${kod}</b><br><br>Čekamo da Host započne meč...`,
                    null,
                    "Čekam..." 
                );
                if (input) input.value = ''; 
            } else {
                UIManager.prikaziObavestenje("Greška", odgovor.poruka, null, "Pokušaj ponovo");
            }
        });
    },

    pridruziSeSobiDirektno: function(kodSobe) {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        if (typeof TokeniManager !== 'undefined' && !TokeniManager.imaTokena()) {
            this.sobaNaCekanjuZbotTokena = kodSobe; 
            UIManager.prikaziObavestenje(
                "Nemaš tokena za ulazak!", 
                "Prijatelj te čeka u sobi, ali ti nemaš više tokena!<br><br>Pogledaj kratku reklamu da dobiješ token i <b>sistem će te automatski prebaciti u njegovu sobu</b>.", 
                () => { 
                    TokeniManager.otvoriEkran(); 
                    this.zapocniProveruTokenaZaSobu(); 
                }, 
                "Gledaj reklamu"
            );
            return;
        }

        this.jeHost = false;
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        UIManager.prikaziObavestenje("Povezivanje...", "Ulazim u sobu tvog prijatelja...", null, "...");

        this.socket.emit('pridruziSeSobi', { kodSobe: kodSobe, ime: mojNadimak }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = kodSobe;
                UIManager.prikaziObavestenje(
                    "Uspešno!",
                    `Uspešno si ušao u sobu!<br><br>Čekamo da Host započne meč...`,
                    null,
                    "Čekam..." 
                );
            } else {
                UIManager.prikaziObavestenje("Greška", odgovor.poruka, null, "Zatvori");
            }
        });
    },

    kreirajPrivatnuSobuIPozovi: function() {
        if (!this.socket) return alert("Nema konekcije sa serverom!");

        if (typeof TokeniManager !== 'undefined' && !TokeniManager.imaTokena()) {
            UIManager.prikaziObavestenje(
                "Nemaš više tokena!", 
                "Da bi kreirao sobu i pozvao prijatelje potreban ti je 1 token.<br><br>Potrošio si dnevni limit, dopuni tokene gledanjem reklame.", 
                () => { TokeniManager.otvoriEkran(); }, 
                "Dopuni tokene"
            );
            return;
        }

        const pozvani = typeof izabraniPrijateljiZaSobu !== 'undefined' ? izabraniPrijateljiZaSobu : [];
        
        if (pozvani.length === 0) {
            UIManager.prikaziObavestenje("Nema prijatelja", "Moraš dodati barem jednog prijatelja u slot da bi započeo igru!", null, "U redu");
            return;
        }

        let brojIgraca = pozvani.length + 1;

        this.brojIgracaUSobi = brojIgraca;
        this.jeHost = true;

        UIManager.prikaziObavestenje("Kreiranje...", "Pravim sobu i šaljem pozivnice prijateljima...", null, "...");

        this.socket.emit('kreirajSobuIPozovi', { pozvani: pozvani }, (odgovor) => {
            if (odgovor.uspeh) {
                this.trenutnaSoba = odgovor.kodSobe;
                let poruka = `Pozivnice su uspešno poslate!<br><br>Čekamo tvoje prijatelje da prihvate poziv.<br><br>Igrača u sobi: <b style="color:#f5af19;">1/${brojIgraca}</b>`;

                UIManager.prikaziObavestenje(
                    "Soba je spremna!",
                    poruka,
                    null, 
                    "Čekam ostale..." 
                );
                
                if (typeof hidePlayerSelect === 'function') hidePlayerSelect(); 
            }
        });
    },

    pokreniIgru: function(mod, zadatoSlovoSaServera = null) {
        if (typeof TokeniManager !== 'undefined') {
            if (mod === 'solo') {
                if (!TokeniManager.imaTokena()) {
                    UIManager.prikaziObavestenje("Nemaš više tokena!", "Potrošio si sve tokene za danas. Poseti sekciju za tokene da nabaviš nove preko reklame.", () => { TokeniManager.otvoriEkran(); }, "Nabavi tokene");
                    return; 
                }
            }
            TokeniManager.potrosiToken();
        }

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
        
        this.rezultatiProtivnika = {}; 
        
        this.zapocniRundu(zadatoSlovoSaServera);    
    },

    zapocniRundu: function(zadatoSlovoSaServera = null) {
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
        
        let prikazRezultata = this.trenutniMod === 'solo' ? this.ukupnoTacnihOdgovora : this.ukupanScore;
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

    zavrsiRundu: function(preskociPotvrdu = false) {
        if (!this.rundaUToku) return; 

        if (this.trenutniMod !== 'solo' && !preskociPotvrdu) {
            UIManager.prikaziPotvrdu(
                "ZAVRŠI RUNDU?",
                "Da li želiš da predaš odgovore pre isteka vremena?<br><br><span style='color:#f5af19; font-size:0.85rem;'>Ostali igrači će i dalje igrati dok im ne istekne vreme.</span>",
                () => { this.zavrsiRundu(true); }
            );
            return;
        }

        this.rundaUToku = false; 

        if (this.antiCheatTimeout) { clearTimeout(this.antiCheatTimeout); this.antiCheatTimeout = null; }
        clearInterval(this.tajmerInterval);
        
        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        const inputs = document.querySelectorAll('#game-board .game-input');

        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

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
            
            if (typeof TrofejiManager !== 'undefined') {
                TrofejiManager.azurirajNapredak('pojmovi', tacnihOveRunde);
                if (tacnihOveRunde === 7) TrofejiManager.azurirajNapredak('perfektno', 1);
            }

            if (typeof KvartalniNivoManager !== 'undefined') {
                KvartalniNivoManager.dodajPojmove(tacnihOveRunde);
            }

            setTimeout(() => {
                this.prikaziRezimeRunde(pregledIgraca, tacnihOveRunde);
            }, 1200);

        } else {
            let mojiOdgovori = {};
            inputs.forEach(input => {
                const kategorija = input.getAttribute('data-kategorija');
                mojiOdgovori[kategorija] = input.value.trim();
                input.disabled = true;
            });

            UIManager.prikaziObavestenje(
                "Odgovori poslati!",
                "Slanje tvojih odgovora na server...<br><br>Čekamo ostale igrače da završe.",
                null,
                "..." 
            );

            this.socket.emit('posaljiOdgovore', {
                kodSobe: this.trenutnaSoba,
                odgovori: mojiOdgovori
            });
        }
    },

    obradiMultiplayerOdgovore: function(odgovoriSobeSaServera) {
        let pregledIgraca = {};
        let scoreOveRunde = {}; 

        odgovoriSobeSaServera.forEach(p => {
            let isMe = p.idIgraca === this.socket.id;
            pregledIgraca[p.idIgraca] = {
                ime: isMe ? `👤 ${p.ime}` : `🌍 ${p.ime}`,
                ukupnoPoena: 0,
                odgovori: [],
                isMe: isMe
            };
            scoreOveRunde[p.idIgraca] = 0;

            if (!isMe && !this.rezultatiProtivnika[p.idIgraca]) {
                this.rezultatiProtivnika[p.idIgraca] = { ime: p.ime, poeni: 0 };
            }
        });

        const inputs = document.querySelectorAll('#game-board .game-input');
        
        inputs.forEach(input => {
            const kategorija = input.getAttribute('data-kategorija');
            const nazivKategorije = input.previousElementSibling.innerText; 
            
            let odgovoriZaKategoriju = [];

            odgovoriSobeSaServera.forEach(p => {
                let odgovorIgraca = p.odgovori[kategorija] || "";
                let isCorrect = BazaPodataka.proveriPojam(kategorija, odgovorIgraca, this.zadatoSlovo);

                if (p.idIgraca === this.socket.id) {
                    UIManager.zakljucajIObojiPolje(input, isCorrect);
                }

                odgovoriZaKategoriju.push({
                    id: p.idIgraca,
                    odgovor: odgovorIgraca,
                    tacan: isCorrect
                });
            });

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

        if (typeof TrofejiManager !== 'undefined') {
            let mojiTacni = 0;
            const inputPoljaZaPojmove = document.querySelectorAll('#game-board .game-input');
            inputPoljaZaPojmove.forEach(input => {
                if (input.classList.contains('input-correct')) mojiTacni++;
            });
            TrofejiManager.azurirajNapredak('pojmovi', mojiTacni);
            if (mojiTacni === 7) TrofejiManager.azurirajNapredak('perfektno', 1);
            
            if (typeof KvartalniNivoManager !== 'undefined') {
                KvartalniNivoManager.dodajPojmove(mojiTacni);
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
            
            let tabelaHtml = `<div style="padding: 0 1rem; margin-top: min(0.4rem, 0.8vh); margin-bottom: min(0.4rem, 0.8vh);">
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: min(0.5rem, 1vh); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="color: #38ef7d; font-size: min(0.75rem, 1.5vh); font-weight: 800; text-transform: uppercase; margin-bottom: min(0.4rem, 0.8vh); text-align: center; letter-spacing: 1px;"><i class="fa-solid fa-chart-simple"></i> Trenutni poredak</div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: min(0.4rem, 0.8vh);">`;
            
            trenutnaTabela.forEach((igrac, idx) => {
                let bgBoja = igrac.isMe ? 'rgba(56,239,125,0.15)' : 'rgba(255,255,255,0.05)';
                let bojaTeksta = igrac.isMe ? '#38ef7d' : '#fff';
                let fw = igrac.isMe ? '800' : '600';
                let border = igrac.isMe ? '1px solid rgba(56,239,125,0.3)' : '1px solid transparent';
                
                tabelaHtml += `
                    <div style="background: ${bgBoja}; color: ${bojaTeksta}; font-weight: ${fw}; border: ${border}; font-size: min(0.75rem, 1.5vh); padding: min(0.3rem, 0.6vh) min(0.5rem, 1vw); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
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
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: min(0.35rem, 0.7vh) 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: min(0.65rem, 1.3vh); color: #a0aec0; width: 30%; text-transform: uppercase;">${odg.kategorija}</span>
                        <span style="font-size: min(0.85rem, 1.7vh); font-weight: 800; color: ${colorHex}; flex: 1; text-align: left; padding-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">${odg.odgovor}</span>
                        <span style="font-size: min(0.75rem, 1.5vh); font-weight: 800; color: ${colorHex}; background: rgba(0,0,0,0.3); padding: min(0.15rem, 0.3vh) min(0.3rem, 0.6vw); border-radius: 6px;">${odg.poeni}</span>
                    </div>
                `;
            });

            let cardHtml = `
                <div class="summary-card">
                    <h3>${igrac.ime}</h3>
                    <p style="text-align: center; color: #38ef7d; font-weight: 800; font-size: min(0.9rem, 1.8vh); margin-bottom: min(0.3rem, 0.6vh); padding-bottom: min(0.3rem, 0.6vh); border-bottom: 1px solid rgba(56,239,125,0.2);">
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
        let tekstDugmeta = (this.trenutnaRunda < 6) ? "Sledeća Runda" : "Završi Igru";
        btnNext.innerText = `Sačekaj (${preostalo}s)`;

        let timer = setInterval(() => {
            preostalo--;
            if (preostalo > 0) {
                btnNext.innerText = `Sačekaj (${preostalo}s)`;
            } else {
                clearInterval(timer);
                btnNext.disabled = false;
                btnNext.innerText = tekstDugmeta;
                btnNext.style.background = 'linear-gradient(45deg, #11998e, #38ef7d)';
                btnNext.style.color = '#000';
                btnNext.style.boxShadow = '0 4px 15px rgba(56, 239, 125, 0.3)';
            }
        }, 1000);

        btnNext.addEventListener('click', () => {
            if (this.trenutnaRunda < 6) {
                if (this.trenutniMod === 'multi') {
                    btnNext.disabled = true;
                    btnNext.innerText = "Čekamo ostale igrače...";
                    btnNext.style.background = 'rgba(255,255,255,0.1)';
                    btnNext.style.color = '#a0aec0';
                    btnNext.style.boxShadow = 'none';
                    
                    this.socket.emit('spremanZaSledecuRundu', this.trenutnaSoba);
                } else {
                    this.trenutnaRunda++; 
                    this.zapocniRundu();  
                }
            } else {
                this.zavrsiIgruKonacno();
            }
        });
    },

    zavrsiIgruKonacno: function() {
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        if (typeof TrofejiManager !== 'undefined') {
            TrofejiManager.azurirajNapredak('partije', 1);
        }

        if (this.trenutniMod === 'multi') {
            let sviIgraci = [];
            sviIgraci.push({ ime: `👤 ${mojNadimak}`, poeni: this.ukupanScore, isMe: true });
            
            for (let socketId in this.rezultatiProtivnika) {
                sviIgraci.push({ ime: `🌍 ${this.rezultatiProtivnika[socketId].ime}`, poeni: this.rezultatiProtivnika[socketId].poeni, isMe: false });
            }
            
            sviIgraci.sort((a, b) => b.poeni - a.poeni);

            if (typeof TrofejiManager !== 'undefined' && sviIgraci[0].isMe) {
                TrofejiManager.azurirajNapredak('pobede', 1);

                if (this.socket) {
                    this.socket.emit('upisiPobedu');
                }
            }
            
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
                this.zavrsiRundu(true); 
            }
        }, 1000);
    },

    // --- FUNKCIJA KOJA ČUVA REZULTAT NA SERVER ---
    posaljiKrajnjiRezultat: function() {
        if (this.trenutniMod === 'multi' && this.ukupanScore > 0 && this.socket) {
            this.socket.emit('upisiKrajnjiRezultat', this.ukupanScore);
            this.ukupanScore = 0; 
        }
    },

    // --- AŽURIRANO: PRI SVAKOM IZLASKU ČUVA POENE ---
    povratakUMeni: function() {
        this.posaljiKrajnjiRezultat(); 
        
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
        
        if (this.socket) {
            this.socket.emit('napustiSobu', 'varanje');
        }

        UIManager.prikaziObavestenje(
            "Izbačen si!",
            "Izbačen si iz runde zbog napuštanja aplikacije tokom partije.",
            () => {
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