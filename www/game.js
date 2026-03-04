// game.js - Glavna logika koja upravlja tokom igre

const Game = {
    trenutniMod: '',
    zadatoSlovo: '',
    tajmerInterval: null,
    preostaloVreme: 120, 
    trenutnaRunda: 1, 
    ukupanScore: 0,   
    ukupnoTacnihOdgovora: 0, 
    brojIgracaUSobi: 0, 
    rezultatiProtivnika: [], 
    iskoriscenaSlova: [], 
    rundaUToku: false, 
    kazneniPoeni: 0, // Brojač za pokušaje varanja
    antiCheatTimeout: null, // Tajmer za 7 sekundi izbacivanje

    init: function() {
        this.podesiTastaturu();
        
        // Anti-Cheat detekcija promene taba ili minimizacije prozora
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.detektujVaralicu();

                // Ako meč traje i mod je multi, pokrećemo tajmer na 7 sekundi
                if (this.rundaUToku && this.trenutniMod === 'multi' && this.kazneniPoeni < 2) {
                    this.antiCheatTimeout = setTimeout(() => {
                        this.izbaciZbogVremena();
                    }, 7000);
                }
            } else if (document.visibilityState === 'visible') {
                // Ako se vratio u igru pre isteka 7 sekundi, gasimo tajmer
                if (this.antiCheatTimeout) {
                    clearTimeout(this.antiCheatTimeout);
                    this.antiCheatTimeout = null;
                }
            }
        });

        setTimeout(() => { UIManager.prikaziEkran('main-menu'); }, 2600); 
    },

    // Izbacivanje ako se zadrži više od 7 sekundi van igre
    izbaciZbogVremena: function() {
        if (this.rundaUToku && this.trenutniMod === 'multi') {
            this.kazneniPoeni = 2; // Odmah postavljamo na maksimum za diskvalifikaciju
            this.azurirajAntiCheatUI();
            this.rundaUToku = false;
            clearInterval(this.tajmerInterval);
            UIManager.prikaziObavestenje(
                '<span style="font-size: 1.20rem;">🚫 Дисквалификација (ВРЕМЕ)</span>', 
                "Izbačen/a si iz meča jer si se predugo (više od 7 sekundi) zadržao/la van igre. Zabranjeno je traženje pojmova!", 
                () => { this.povratakUMeni(); }, 
                "Povratak u Meni"
            );
        }
    },

    // Funkcija za kažnjavanje (izlazak iz taba)
    detektujVaralicu: function() {
        // Reagujemo samo ako je meč aktivan i ako je u pitanju multiplayer
        if (this.rundaUToku && this.trenutniMod === 'multi') {
            this.kazneniPoeni++;
            this.azurirajAntiCheatUI();

            if (this.kazneniPoeni === 1) {
                // Prvi prekršaj - Opomena
                UIManager.prikaziObavestenje(
                    "⚠️ Упозорење (АНТИ ЧИТ)", 
                    "Detektovan je izlazak sa ekrana igre! Zabranjeno je traženje pojmova na internetu. Ponovni izlazak će rezultovati automatskom diskvalifikacijom!", 
                    null, 
                    "Razumem"
                );
            } else if (this.kazneniPoeni >= 2) {
                // Drugi prekršaj - Diskvalifikacija
                this.rundaUToku = false;
                clearInterval(this.tajmerInterval);
                UIManager.prikaziObavestenje(
                    '<span style="font-size: 1.20rem;">🚫 Дисквалификација</span>', 
                    "Izbačen/a si iz meča zbog ponovljenog napuštanja igre (pokušaj varanja).", 
                    () => { this.povratakUMeni(); }, 
                    "Povratak u Meni"
                );
            }
        }
    },

    // Bojenje statusa ispod predmeta
    azurirajAntiCheatUI: function() {
        const statusEl = document.getElementById('anti-cheat-status');
        if (!statusEl) return;
        
        if (this.kazneniPoeni === 0) {
            statusEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i> АНТИ ЧИТ: <span style="color:#38ef7d;">У игри</span>';
            statusEl.style.borderColor = "rgba(56, 239, 125, 0.2)";
        } else if (this.kazneniPoeni === 1) {
            statusEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i> АНТИ ЧИТ: <span style="color:#f5af19;">1. Упозорење</span>';
            statusEl.style.borderColor = "rgba(245, 175, 25, 0.4)";
        } else {
            statusEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i> АНТИ ЧИТ: <span style="color:#ff416c; font-size: 1.20rem; font-weight: 800; letter-spacing: 0; display: inline-block; vertical-align: middle; transform: translateY(-1px);">ДИСКВАЛИФИКОВАН</span>';
            statusEl.style.borderColor = "rgba(255, 65, 108, 0.4)";
        }
    },

    traziSobu: function(brojIgraca) {
        UIManager.prikaziObavestenje(
            "Povezivanje...", 
            `Tražim slobodnu sobu za ${brojIgraca} igrača na serveru.<br><br>Molimo sačekajte...`, 
            () => {
                this.brojIgracaUSobi = brojIgraca; 
                this.pokreniIgru('multi');
            },
            "Prekini pretragu"
        );
    },

    kreirajPrivatnuSobu: function(brojIgraca) {
        this.brojIgracaUSobi = brojIgraca;
        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) { kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); }

        UIManager.prikaziObavestenje(
            "Soba je kreirana!",
            `Tvoj kod sobe je:<br><br><b style="font-size: 2.5rem; color: #f5af19; letter-spacing: 5px; text-shadow: 0 0 10px rgba(245,175,25,0.4);">${kodSobe}</b><br><br>Pošalji ovaj kod prijateljima.<br>Kada ti jave da su uneli kod, započni igru!`,
            () => { this.pokreniIgru('multi'); },
            "Započni igru"
        );
    },

    pridruziSeSobi: function() {
        const input = document.getElementById('room-code-input');
        const kod = input.value.trim().toUpperCase();

        if (kod.length < 3) {
            UIManager.prikaziObavestenje("Greška", "Moraš uneti ispravan kod sobe!", null, "U redu");
            return;
        }

        let nasumicanBrojIgraca = Math.floor(Math.random() * 4) + 2; 
        UIManager.prikaziObavestenje(
            "Povezivanje...",
            `Povezujem se na sobu: <b style="color:#38ef7d">${kod}</b><br><br>Uspešno povezan! Čekamo hosta (tvog prijatelja) da pokrene meč...`,
            () => {
                this.brojIgracaUSobi = nasumicanBrojIgraca;
                this.pokreniIgru('multi');
            },
            "Uđi u meč" 
        );
        input.value = ''; 
    },

    pokreniIgru: function(mod) {
        this.trenutniMod = mod;
        this.trenutnaRunda = 1; 
        this.ukupanScore = 0;   
        this.ukupnoTacnihOdgovora = 0; 
        this.iskoriscenaSlova = []; 
        
        // Resetujemo sve za anti-cheat sistem pri svakom novom meču
        this.kazneniPoeni = 0; 
        if (this.antiCheatTimeout) {
            clearTimeout(this.antiCheatTimeout);
            this.antiCheatTimeout = null;
        }
        this.azurirajAntiCheatUI(); 
        
        this.rezultatiProtivnika = [];
        if (mod === 'multi') {
            for (let i = 0; i < this.brojIgracaUSobi - 1; i++) {
                this.rezultatiProtivnika.push(0);
            }
        }
        this.zapocniRundu();    
    },

    zapocniRundu: function() {
        const svaSlova = "ABVGDĐEŽZIJKLLJMNNJOPRSTĆUFHCČDŽŠ".split("");
        let dostupnaSlova = svaSlova.filter(slovo => !this.iskoriscenaSlova.includes(slovo));

        if (dostupnaSlova.length === 0) {
            this.iskoriscenaSlova = []; 
            dostupnaSlova = svaSlova;
        }

        this.zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
        this.iskoriscenaSlova.push(this.zadatoSlovo);
        this.rundaUToku = true; 

        UIManager.pripremiPolja();
        UIManager.podesiTabluZaIgru(this.trenutniMod, this.zadatoSlovo);
        UIManager.azurirajRundu(this.trenutnaRunda); 
        
        let prikazRezultata = this.trenutniMod === 'solo' ? this.ukupnoTacnihOdgovora : this.ukupanScore;
        UIManager.azurirajLiveStatistiku(prikazRezultata, this.trenutniMod, this.rezultatiProtivnika);
        
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

    povratakUMeni: function() {
        clearInterval(this.tajmerInterval);
        if (this.antiCheatTimeout) {
            clearTimeout(this.antiCheatTimeout);
            this.antiCheatTimeout = null;
        }
        this.rundaUToku = false; 
        UIManager.prikaziEkran('main-menu');
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

    zavrsiRundu: function() {
        if (!this.rundaUToku) return; 
        this.rundaUToku = false; 

        if (this.antiCheatTimeout) {
            clearTimeout(this.antiCheatTimeout);
            this.antiCheatTimeout = null;
        }

        clearInterval(this.tajmerInterval);
        const inputs = document.querySelectorAll('#game-board .game-input');

        let scoreOveRunde = 0;
        let tacnihOveRunde = 0; 
        let poeniProtivnikaOveRunde = new Array(this.rezultatiProtivnika.length).fill(0);
        
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        let pregledIgraca = {
            'ja': { ime: `👤 ${mojNadimak}`, ukupnoPoena: 0, odgovori: [] }
        };
        for(let i=0; i < this.rezultatiProtivnika.length; i++) {
            pregledIgraca[i] = { ime: `🤖 Igrač ${i+2}`, ukupnoPoena: 0, odgovori: [] };
        }
        
        inputs.forEach(input => {
            const kategorija = input.getAttribute('data-kategorija');
            const nazivKategorije = input.previousElementSibling.innerText; 
            const mojOdgovor = input.value.trim();
            const isCorrect = BazaPodataka.proveriPojam(kategorija, mojOdgovor, this.zadatoSlovo);
            
            UIManager.zakljucajIObojiPolje(input, isCorrect);

            if (this.trenutniMod === 'solo') {
                if (isCorrect) tacnihOveRunde++;
                pregledIgraca['ja'].odgovori.push({
                    kategorija: nazivKategorije,
                    odgovor: mojOdgovor || "-",
                    boja: isCorrect ? 'green' : 'red',
                    poeni: isCorrect ? '✓' : '✗'
                });
            } else {
                let odgovoriSobe = [];
                odgovoriSobe.push({ id: 'ja', odgovor: mojOdgovor, tacan: isCorrect });
                
                let validneReci = [];
                if (BazaPodataka.reci[kategorija]) {
                    validneReci = BazaPodataka.reci[kategorija].filter(r => r.startsWith(this.zadatoSlovo));
                }

                for (let i = 0; i < this.rezultatiProtivnika.length; i++) {
                    let srecniBroj = Math.random();
                    let oppOdgovor = "";
                    let oppTacan = false;

                    if (srecniBroj < 0.25) {
                    } else if (srecniBroj < 0.45 && isCorrect) {
                        oppOdgovor = mojOdgovor; 
                        oppTacan = true;
                    } else if (srecniBroj < 0.8 && validneReci.length > 0) {
                        let randomIndeks = Math.floor(Math.random() * validneReci.length);
                        oppOdgovor = validneReci[randomIndeks];
                        oppOdgovor = oppOdgovor.charAt(0) + oppOdgovor.slice(1).toLowerCase();
                        oppTacan = true; 
                    } else {
                        const sufiksi = ["glupost", "nesto", "pojma", "nemam", "test"];
                        oppOdgovor = this.zadatoSlovo + sufiksi[Math.floor(Math.random() * sufiksi.length)];
                        oppTacan = false;
                    }
                    odgovoriSobe.push({ id: i, odgovor: oppOdgovor, tacan: oppTacan });
                }

                let obradjeniOdgovori = this.obracunajKategoriju(kategorija, odgovoriSobe);
                
                obradjeniOdgovori.forEach(unos => {
                    let statusBoja = 'red'; 
                    if (unos.tacan && unos.odgovor !== "") {
                        if (unos.poeni === 20) statusBoja = 'green';
                        else if (unos.poeni === 10 || unos.poeni === 5) statusBoja = 'yellow';
                    }

                    if (unos.id === 'ja') scoreOveRunde += unos.poeni;
                    else poeniProtivnikaOveRunde[unos.id] += unos.poeni;

                    pregledIgraca[unos.id].odgovori.push({
                        kategorija: nazivKategorije,
                        odgovor: unos.odgovor || "-",
                        boja: statusBoja,
                        poeni: unos.poeni > 0 ? `+${unos.poeni}` : '0'
                    });
                });
            }
        });

        pregledIgraca['ja'].ukupnoPoena = scoreOveRunde;
        for(let i=0; i<this.rezultatiProtivnika.length; i++) {
            pregledIgraca[i].ukupnoPoena = poeniProtivnikaOveRunde[i];
        }

        if (this.trenutniMod === 'solo') {
            this.ukupnoTacnihOdgovora += tacnihOveRunde;
            UIManager.azurirajLiveStatistiku(this.ukupnoTacnihOdgovora, this.trenutniMod, []);
        } else {
            this.ukupanScore += scoreOveRunde;
            for (let i = 0; i < this.rezultatiProtivnika.length; i++) {
                this.rezultatiProtivnika[i] += poeniProtivnikaOveRunde[i];
            }
            UIManager.azurirajLiveStatistiku(this.ukupanScore, this.trenutniMod, this.rezultatiProtivnika);
        }

        setTimeout(() => {
            this.prikaziRezimeRunde(pregledIgraca, tacnihOveRunde);
        }, 1200);
    },

    prikaziRezimeRunde: function(pregledIgraca, tacnihOveRunde) {
        UIManager.prikaziEkran('round-summary-screen');
        
        const carousel = document.getElementById('summary-carousel');
        const leaderboardContainer = document.getElementById('round-leaderboard-container');
        carousel.innerHTML = '';

        let sviIgraci = [pregledIgraca['ja']];
        if (this.trenutniMod === 'multi') {
            for (let i=0; i < this.rezultatiProtivnika.length; i++) {
                sviIgraci.push(pregledIgraca[i]);
            }
            
            let trenutnaTabela = [];
            let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";
            trenutnaTabela.push({ ime: `👤 ${mojNadimak}`, poeni: this.ukupanScore, isMe: true });
            for (let i = 0; i < this.rezultatiProtivnika.length; i++) {
                trenutnaTabela.push({ ime: `🤖 Igrač ${i + 2}`, poeni: this.rezultatiProtivnika[i], isMe: false });
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

        let isDown = false;
        let startX;
        let scrollLeft;
        
        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        carousel.addEventListener('mouseleave', () => { isDown = false; });
        carousel.addEventListener('mouseup', () => { isDown = false; });
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2; 
            carousel.scrollLeft = scrollLeft - walk;
        });
    },

    zavrsiIgruKonacno: function() {
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        if (this.trenutniMod === 'multi') {
            let sviIgraci = [];
            sviIgraci.push({ ime: `👤 ${mojNadimak}`, poeni: this.ukupanScore, isMe: true });
            for (let i = 0; i < this.rezultatiProtivnika.length; i++) {
                sviIgraci.push({ ime: `🤖 Igrač ${i + 2}`, poeni: this.rezultatiProtivnika[i], isMe: false });
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
                () => this.povratakUMeni(),
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
    }
};

Game.init();