// dnevniizazov.js - Logika za dnevni izazov (jednom dnevno, 1 minut, bez odustajanja, auto-submit)

const DnevniIzazovManager = {
    svaSlova: ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","LJ","M","N","NJ","O","P","R","S","T","Ć","U","F","H","C","Č","DŽ","Š"],
    
    sveKategorije: [
        { id: 'drzava', ikona: '🌍', naziv: 'Država' },
        { id: 'grad', ikona: '🏙️', naziv: 'Grad' },
        { id: 'reka', ikona: '🏞️', naziv: 'Reka' },
        { id: 'planina', ikona: '⛰️', naziv: 'Planina' },
        { id: 'biljka', ikona: '🌿', naziv: 'Biljka' },
        { id: 'zivotinja', ikona: '🦁', naziv: 'Životinja' },
        { id: 'predmet', ikona: '📦', naziv: 'Predmet' }
    ],
    
    dnevniPodaci: null,
    tajmerInterval: null,
    preostaloVreme: 60,
    izazovUToku: false,

    init: function() {
        this.proveriIDodeliDnevniZadatak();
    },

    vratiIdDana: function(datum = new Date()) {
        const godina = datum.getFullYear();
        const mesec = String(datum.getMonth() + 1).padStart(2, '0');
        const dan = String(datum.getDate()).padStart(2, '0');
        return `${godina}-${mesec}-${dan}`;
    },

    pomeriIdDana: function(datumId, brojDana) {
        const delovi = String(datumId || '').split('-').map(Number);
        if (delovi.length !== 3 || delovi.some(deo => !Number.isInteger(deo))) {
            return this.vratiIdDana();
        }

        const datum = new Date(delovi[0], delovi[1] - 1, delovi[2]);
        datum.setDate(datum.getDate() + brojDana);
        return this.vratiIdDana(datum);
    },

    bonusZaDnevniNiz: function(brojDana) {
        if (brojDana > 0 && brojDana % 14 === 0) return 300;
        if (brojDana > 0 && brojDana % 7 === 0) return 150;
        if (brojDana > 0 && brojDana % 3 === 0) return 50;
        return 0;
    },

    azurirajDnevniNiz: function(danasId) {
        const kljuc = 'zemljopis_dnevni_niz';
        let niz = { poslednjiDatum: null, brojDana: 0 };

        try {
            niz = JSON.parse(localStorage.getItem(kljuc) || '{}') || niz;
        } catch (error) {
            niz = { poslednjiDatum: null, brojDana: 0 };
        }

        if (niz.poslednjiDatum === danasId) {
            const brojDana = Math.max(1, Number(niz.brojDana) || 1);
            return { brojDana, bonusDukata: this.bonusZaDnevniNiz(brojDana) };
        }

        const juceId = this.pomeriIdDana(danasId, -1);
        const prethodniBrojDana = Math.max(0, Number(niz.brojDana) || 0);
        const brojDana = niz.poslednjiDatum === juceId ? prethodniBrojDana + 1 : 1;
        const novoStanje = { poslednjiDatum: danasId, brojDana };
        localStorage.setItem(kljuc, JSON.stringify(novoStanje));

        return { brojDana, bonusDukata: this.bonusZaDnevniNiz(brojDana) };
    },

    proveriIDodeliDnevniZadatak: function() {
        const danas = new Date().toLocaleDateString('sr-RS'); 
        const danasId = this.vratiIdDana();
        const sacuvano = localStorage.getItem('zemljopis_dnevni_izazov');

        if (sacuvano) {
            try {
                this.dnevniPodaci = JSON.parse(sacuvano);
            } catch (error) {
                this.dnevniPodaci = null;
            }
        }

        if (!this.dnevniPodaci || this.dnevniPodaci.datum !== danas) {
            let dostupneKategorije = [...this.sveKategorije].sort(() => 0.5 - Math.random()).slice(0, 4);
            let dostupnaSlova = [...this.svaSlova].sort(() => 0.5 - Math.random()).slice(0, 4);

            let zadaci = [];
            for(let i = 0; i < 4; i++) {
                zadaci.push({
                    kategorija: dostupneKategorije[i].id,
                    ikona: dostupneKategorije[i].ikona,
                    naziv: dostupneKategorije[i].naziv,
                    slovo: dostupnaSlova[i]
                });
            }

            this.dnevniPodaci = {
                datum: danas,
                datumId: danasId,
                odigrano: false,
                zadaci: zadaci
            };
            this.snimiStanje();
        }
    },

    snimiStanje: function() {
        localStorage.setItem('zemljopis_dnevni_izazov', JSON.stringify(this.dnevniPodaci));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },

    otvoriEkran: function() {
        this.proveriIDodeliDnevniZadatak(); 

        if (this.dnevniPodaci.odigrano) {
            UIManager.prikaziObavestenje(
                "Već si odigrao!", 
                "Dnevni izazov možeš igrati samo jednom dnevno. Vrati se sutra za nove nagrade!", 
                null, 
                "U redu"
            );
            return;
        }

        // ODMAH BELEŽIMO DA JE ZAPOČETO (sprečava varanje ako igrač zatvori aplikaciju)
        this.dnevniPodaci.odigrano = true;
        this.snimiStanje();
        this.izazovUToku = true;

        UIManager.prikaziEkran('dnevni-izazov-screen');
        this.prikaziZadatke();

        // Pokretanje tajmera na tačno 60 sekundi
        this.pokreniTajmer(60);
    },

    prikaziZadatke: function() {
        const kontejner = document.getElementById('dnevni-izazov-polja');
        if (!kontejner) return;

        let html = '';
        this.dnevniPodaci.zadaci.forEach((zadatak, index) => {
            html += `
            <div class="input-group dnevni-input-group">
                <label>
                    <span class="dnevni-zadatak-naziv">${zadatak.ikona} ${zadatak.naziv}</span>
                    <span class="dnevni-zadatak-slovo">Slovo: ${zadatak.slovo}</span>
                </label>
                <input type="text" id="dnevni-input-${index}" class="game-input" data-kategorija="${zadatak.kategorija}" placeholder="${zadatak.naziv} na ${zadatak.slovo}..." autocomplete="off" autocorrect="off" spellcheck="false">
            </div>
            `;
        });
        kontejner.innerHTML = html;
        const skrolKontejner = kontejner.closest('.dnevni-izazov-inputs');
        if (skrolKontejner) {
            skrolKontejner.scrollTop = 0;
            skrolKontejner.style.paddingBottom = '';
        }
        this.azurirajAktivniZadatak(0);
        
        // Povezivanje dinamički generisanih polja sa custom tastaturom
        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.bindInputs();
        }
        
        setTimeout(() => {
            const inputs = document.querySelectorAll('#dnevni-izazov-polja .game-input');
            
            inputs.forEach((input, index) => {
                const osveziAktivniPrikaz = function() {
                    DnevniIzazovManager.azurirajAktivniZadatak(index);
                    if (typeof KeyboardManager !== 'undefined') {
                        setTimeout(() => KeyboardManager.scrollInputIntoView(input), 220);
                    }
                };

                // Slušamo 'focus' event da osiguramo skrolovanje i vezu sa tastaturom svaki put kada se pređe na polje
                input.addEventListener('focus', function() {
                    if (typeof KeyboardManager !== 'undefined') {
                        KeyboardManager.setActiveInput(input);
                        if (DnevniIzazovManager.izazovUToku) {
                            KeyboardManager.showKeyboard();
                        }
                    }
                    osveziAktivniPrikaz();
                });
                input.addEventListener('zemljopis:active-input', osveziAktivniPrikaz);

                // Obezbeđujemo da 'OK' (Enter) prelazi na sledeće polje
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < inputs.length - 1) {
                            inputs[index + 1].focus(); // Fokusira sledeće polje (trigeruje focus event iznad)
                        } else {
                            input.blur();
                            if (typeof KeyboardManager !== 'undefined') {
                                KeyboardManager.hideKeyboard();
                            }
                        }
                    }
                });
            });

            // Fokusiraj odmah prvo polje čim se učita
            const prvoPolje = document.getElementById('dnevni-input-0');
            if (prvoPolje) {
                if (typeof KeyboardManager !== 'undefined') {
                    KeyboardManager.setActiveInput(prvoPolje);
                    KeyboardManager.showKeyboard();
                    setTimeout(() => KeyboardManager.scrollInputIntoView(prvoPolje), 280);
                } else {
                    prvoPolje.focus();
                }
            }
        }, 100);
    },

    azurirajAktivniZadatak: function(index) {
        const el = document.getElementById('dnevni-aktivni-zadatak');
        const zadaci = this.dnevniPodaci ? this.dnevniPodaci.zadaci : [];
        const zadatak = zadaci[index];
        if (!el || !zadatak) return;

        el.innerHTML = `
            <span class="dnevni-aktivni-redni">ZADATAK ${index + 1}/${zadaci.length}</span>
            <span class="dnevni-aktivni-pojam">${zadatak.ikona} ${zadatak.naziv}</span>
            <span class="dnevni-aktivni-slovo">Slovo: ${zadatak.slovo}</span>
        `;

        document.querySelectorAll('#dnevni-izazov-polja .dnevni-input-group').forEach((grupa, i) => {
            grupa.classList.toggle('active-dnevni-zadatak', i === index);
        });
    },

    pokreniTajmer: function(sekunde) {
        this.preostaloVreme = sekunde;
        clearInterval(this.tajmerInterval);
        this.azurirajTajmerUI();

        this.tajmerInterval = setInterval(() => {
            this.preostaloVreme--;
            this.azurirajTajmerUI();

            if (this.preostaloVreme <= 0) {
                clearInterval(this.tajmerInterval);
                if (this.izazovUToku) {
                    // Vreme isteklo - Automatski predajemo rad!
                    if (typeof KeyboardManager !== 'undefined') {
                        KeyboardManager.hideKeyboard();
                    }
                    UIManager.prikaziObavestenje("Vreme je isteklo!", "Proveravamo tvoje odgovore...", null, "...");
                    this.zavrsiIzazov();
                }
            }
        }, 1000);
    },

    azurirajTajmerUI: function() {
        const el = document.getElementById('dnevni-tajmer');
        if (!el) return;

        let m = parseInt(this.preostaloVreme / 60, 10);
        let s = parseInt(this.preostaloVreme % 60, 10);
        m = m < 10 ? "0" + m : m;
        s = s < 10 ? "0" + s : s;

        el.innerText = m + ":" + s;
        
        // Napravi stresnije obaveštenje kad ostane manje od 10 sekundi
        if (this.preostaloVreme <= 10 && this.preostaloVreme > 0) {
            el.style.color = "#ff0000";
            el.style.borderColor = "rgba(255, 0, 0, 0.4)";
            if (this.preostaloVreme % 2 === 0) {
                el.style.transform = "scale(1.08)";
            } else {
                el.style.transform = "scale(1)";
            }
        } else {
            el.style.color = "#ff416c";
            el.style.borderColor = "rgba(255, 65, 108, 0.3)";
            el.style.transform = "scale(1)";
        }
    },

    zavrsiIzazov: function() {
        if (!this.izazovUToku) return;
        this.izazovUToku = false;
        clearInterval(this.tajmerInterval);

        let ukupnoTacnih = 0;

        this.dnevniPodaci.zadaci.forEach((zadatak, index) => {
            const inputEl = document.getElementById(`dnevni-input-${index}`);
            if (!inputEl) return;
            const odgovor = inputEl.value.trim();
            
            const isCorrect = BazaPodataka.proveriPojam(zadatak.kategorija, odgovor, zadatak.slovo);
            UIManager.zakljucajIObojiPolje(inputEl, isCorrect);

            if (isCorrect) {
                ukupnoTacnih++;
            }
        });

        const osnovnaNagrada = ukupnoTacnih * 100;
        const bonusPerfektno = ukupnoTacnih === this.dnevniPodaci.zadaci.length ? 200 : 0;
        const danasId = this.dnevniPodaci.datumId || this.vratiIdDana();
        const dnevniNiz = this.azurirajDnevniNiz(danasId);
        let osvojenoDukata = osnovnaNagrada + bonusPerfektno + dnevniNiz.bonusDukata;
        
        // Još jedan sigurnosni snimak
        this.dnevniPodaci.odigrano = true;
        this.dnevniPodaci.datumId = danasId;
        this.dnevniPodaci.tacniPojmovi = ukupnoTacnih;
        this.dnevniPodaci.osvojenoDukata = osvojenoDukata;
        this.dnevniPodaci.dnevniNiz = dnevniNiz.brojDana;
        this.snimiStanje();

        if (typeof KvartalniNivoManager !== 'undefined') {
            KvartalniNivoManager.dodajDnevnePojmove(
                ukupnoTacnih,
                this.dnevniPodaci.datum
            );
        }

        if (osvojenoDukata > 0 && typeof RiznicaManager !== 'undefined') {
            RiznicaManager.dukati += osvojenoDukata;
            RiznicaManager.snimiStanje();
        }

        setTimeout(() => {
            let poruka = `Pronašao/la si <b>${ukupnoTacnih}/4</b> tačnih pojmova.<br><br>`;
            
            if (osvojenoDukata > 0) {
                if (bonusPerfektno > 0) {
                    poruka += `Bonus za 4/4: <b style="color:#38ef7d;">+${bonusPerfektno}</b><br>`;
                }
                if (dnevniNiz.bonusDukata > 0) {
                    poruka += `Dnevni niz (${dnevniNiz.brojDana} dana): <b style="color:#38ef7d;">+${dnevniNiz.bonusDukata}</b><br>`;
                }
                poruka += `Osvojena nagrada: <br><b style="color:#f5af19; font-size:1.5rem; text-shadow: 0 0 10px rgba(245,175,25,0.4);">+${osvojenoDukata} <i class="fa-solid fa-coins"></i></b>`;
            } else {
                poruka += `Nažalost, nisi uspeo/la da osvojiš dukate. Više sreće sutra!`;
            }

            UIManager.prikaziObavestenje(
                "Dnevni Izazov Završen!",
                poruka,
                () => { 
                    UIManager.prikaziEkran('main-menu'); 
                    UIManager.zatvoriObavestenje(); 
                },
                "Nazad u Meni"
            );
        }, 1500);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DnevniIzazovManager.init();
});
