// dnevniizazov.js - Server-kanonski dnevni izazov (jednom dnevno, Beograd vreme)

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
    ucitavanje: false,
    zavrsavanjeUToku: false,
    serverOffsetMs: 0,
    pocetakIgreAt: null,
    rokAt: null,
    introTajmer: null,
    introTrajanjeMs: 5200,
    x2PreuzimanjeUToku: false,
    poslednjiRezultat: null,

    init: function() {
        this.ucitajLokalnoStanje();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.proveriIstekVremena();
            }
        });
    },

    ucitajLokalnoStanje: function() {
        const sacuvano = localStorage.getItem('zemljopis_dnevni_izazov');
        if (!sacuvano) return;

        try {
            this.dnevniPodaci = JSON.parse(sacuvano);
        } catch (error) {
            this.dnevniPodaci = null;
        }
    },

    snimiStanje: function() {
        if (!this.dnevniPodaci) return;
        localStorage.setItem('zemljopis_dnevni_izazov', JSON.stringify(this.dnevniPodaci));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },

    serverDostupan: function() {
        return typeof Game !== 'undefined'
            && Game.socket
            && Game.socket.connected;
    },

    sadaServer: function() {
        return Date.now() + this.serverOffsetMs;
    },

    pozoviServer: function(dogadjaj, podaci = {}) {
        return new Promise((resolve, reject) => {
            if (!this.serverDostupan()) {
                reject(new Error('SERVER_NEDOSTUPAN'));
                return;
            }

            Game.socket.timeout(12000).emit(dogadjaj, podaci, (greska, odgovor) => {
                if (greska) {
                    reject(greska);
                    return;
                }
                resolve(odgovor || {});
            });
        });
    },

    primeniServerStanje: function(odgovor) {
        if (!odgovor || !odgovor.datumId || !Array.isArray(odgovor.zadaci)) return;

        if (typeof odgovor.serverVreme === 'number') {
            this.serverOffsetMs = odgovor.serverVreme - Date.now();
        }

        this.pocetakIgreAt = Number(odgovor.pocetakIgreAt) || null;
        this.rokAt = Number(odgovor.rokAt) || null;
        this.introTrajanjeMs = Math.max(4200, Math.min(6000, Number(odgovor.introMs) || 5200));
        this.dnevniPodaci = {
            datum: odgovor.datum,
            datumId: odgovor.datumId,
            vremenskaZona: odgovor.vremenskaZona || 'Europe/Belgrade',
            zadaci: odgovor.zadaci,
            status: odgovor.status || (odgovor.odigrano ? 'odigrano' : 'dostupan'),
            zapoceto: Boolean(odgovor.zapoceto),
            odigrano: Boolean(odgovor.odigrano),
            pocetakIgreAt: this.pocetakIgreAt,
            rokAt: this.rokAt,
            rezultat: odgovor.rezultat || null
        };
        this.snimiStanje();
    },

    otvoriEkran: async function() {
        if (this.ucitavanje || this.izazovUToku) return;

        if (!this.serverDostupan()) {
            UIManager.prikaziObavestenje(
                "Dnevni izazov",
                "Za dnevni izazov je potrebna internet veza i prijavljen profil, jer se igra zaključava na serveru jednom dnevno.",
                null,
                "U redu"
            );
            return;
        }

        this.ucitavanje = true;
        try {
            const odgovor = await this.pozoviServer('dnevniIzazovPokreni');
            this.primeniServerStanje(odgovor);

            if (!odgovor.uspeh) {
                UIManager.prikaziObavestenje(
                    "Već si odigrao!",
                    odgovor.poruka || "Dnevni izazov možeš igrati samo jednom dnevno. Vrati se sutra za nove nagrade!",
                    null,
                    "U redu"
                );
                return;
            }

            this.izazovUToku = true;
            this.zavrsavanjeUToku = false;
            if (typeof KeyboardManager !== 'undefined') {
                KeyboardManager.hideKeyboard();
            }

            const preostaloDoStarta = this.pocetakIgreAt
                ? Math.max(0, this.pocetakIgreAt - this.sadaServer())
                : 0;

            if (!odgovor.nastavak && preostaloDoStarta > 700) {
                this.prikaziIntro(preostaloDoStarta, () => this.pokreniIgruIzServera());
            } else {
                this.pokreniIgruIzServera();
            }
        } catch (error) {
            UIManager.prikaziObavestenje(
                "Dnevni izazov",
                "Server trenutno ne može da potvrdi dnevni izazov. Proveri internet i pokušaj ponovo.",
                null,
                "U redu"
            );
        } finally {
            this.ucitavanje = false;
        }
    },

    prikaziIntro: function(preostaloDoStarta, callback) {
        const overlay = document.getElementById('dnevni-intro-overlay');
        const trajanje = Math.max(4200, Math.min(6000, Math.ceil(preostaloDoStarta) || this.introTrajanjeMs));

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--daily-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
                callback();
            }, 420);
        }, trajanje);
    },

    pokreniIgruIzServera: function() {
        if (!this.dnevniPodaci || !Array.isArray(this.dnevniPodaci.zadaci)) return;

        UIManager.prikaziEkran('dnevni-izazov-screen');
        this.prikaziZadatke();
        this.pokreniTajmerDoRoka(this.rokAt || (this.sadaServer() + 60000));
    },

    prikaziZadatke: function() {
        const kontejner = document.getElementById('dnevni-izazov-polja');
        if (!kontejner || !this.dnevniPodaci) return;

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

                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < inputs.length - 1) {
                            inputs[index + 1].focus();
                        } else {
                            input.blur();
                            if (typeof KeyboardManager !== 'undefined') {
                                KeyboardManager.hideKeyboard();
                            }
                        }
                    }
                });
            });

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

    pokreniTajmerDoRoka: function(rokAt) {
        this.rokAt = Number(rokAt) || (this.sadaServer() + 60000);
        clearInterval(this.tajmerInterval);

        const azuriraj = () => {
            const preostaloMs = this.rokAt - this.sadaServer();
            this.preostaloVreme = Math.max(0, Math.ceil(preostaloMs / 1000));
            this.azurirajTajmerUI();

            if (preostaloMs <= 0) {
                clearInterval(this.tajmerInterval);
                if (this.izazovUToku && !this.zavrsavanjeUToku) {
                    if (typeof KeyboardManager !== 'undefined') {
                        KeyboardManager.hideKeyboard();
                    }
                    this.zavrsiIzazov();
                }
            }
        };

        azuriraj();
        this.tajmerInterval = setInterval(azuriraj, 500);
    },

    proveriIstekVremena: function() {
        if (
            this.izazovUToku
            && !this.zavrsavanjeUToku
            && this.rokAt
            && this.sadaServer() >= this.rokAt
        ) {
            this.zavrsiIzazov();
        }
    },

    azurirajTajmerUI: function() {
        const el = document.getElementById('dnevni-tajmer');
        if (!el) return;

        let m = parseInt(this.preostaloVreme / 60, 10);
        let s = parseInt(this.preostaloVreme % 60, 10);
        m = m < 10 ? "0" + m : m;
        s = s < 10 ? "0" + s : s;

        el.innerText = m + ":" + s;

        if (this.preostaloVreme <= 10 && this.preostaloVreme > 0) {
            el.style.color = "#ff0000";
            el.style.borderColor = "rgba(255, 0, 0, 0.4)";
            el.style.transform = this.preostaloVreme % 2 === 0 ? "scale(1.08)" : "scale(1)";
        } else {
            el.style.color = "#ff416c";
            el.style.borderColor = "rgba(255, 65, 108, 0.3)";
            el.style.transform = "scale(1)";
        }
    },

    prikupiOdgovore: function() {
        const odgovori = {};
        const zadaci = this.dnevniPodaci ? this.dnevniPodaci.zadaci : [];

        zadaci.forEach((zadatak, index) => {
            const inputEl = document.getElementById(`dnevni-input-${index}`);
            odgovori[zadatak.kategorija] = inputEl ? inputEl.value.trim() : "";
        });
        return odgovori;
    },

    zakljucajPolja: function() {
        document.querySelectorAll('#dnevni-izazov-polja .game-input').forEach(input => {
            input.disabled = true;
        });
    },

    obojiPoljaPoServeru: function(provera) {
        if (!Array.isArray(provera)) return;

        provera.forEach(stavka => {
            const inputEl = document.getElementById(`dnevni-input-${stavka.index}`);
            if (inputEl && typeof UIManager !== 'undefined') {
                UIManager.zakljucajIObojiPolje(inputEl, Boolean(stavka.tacno));
            }
        });
    },

    azurirajLokalneNagrade: function(odgovor) {
        if (typeof odgovor.dukati === 'number' && typeof RiznicaManager !== 'undefined') {
            RiznicaManager.dukati = RiznicaManager.normalizujDukate(odgovor.dukati, RiznicaManager.dukati);
            RiznicaManager.snimiStanje();
        }

        if (odgovor.kvartal && typeof KvartalniNivoManager !== 'undefined') {
            KvartalniNivoManager.statistika = {
                sezonskiPojmovi: odgovor.kvartal.sezonskiPojmovi || 0,
                svaVremenaPojmovi: odgovor.kvartal.svaVremenaPojmovi || 0
            };
            localStorage.setItem('zemljopis_kvartal', JSON.stringify(KvartalniNivoManager.statistika));
            KvartalniNivoManager.azurirajBedzUMeniju();
        }
    },

    zavrsiIzazov: async function() {
        if (this.zavrsavanjeUToku || !this.dnevniPodaci) return;

        this.zavrsavanjeUToku = true;
        this.izazovUToku = false;
        clearInterval(this.tajmerInterval);
        this.zakljucajPolja();

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        try {
            const odgovor = await this.pozoviServer('dnevniIzazovZavrsi', {
                datumId: this.dnevniPodaci.datumId,
                odgovori: this.prikupiOdgovore()
            });

            if (!odgovor.uspeh) {
                throw new Error(odgovor.kod || 'DNEVNI_ZAVRSETAK_NEUSPEO');
            }

            this.primeniServerStanje(odgovor);
            const rezultat = odgovor.rezultat || {};
            this.poslednjiRezultat = rezultat;
            this.obojiPoljaPoServeru(rezultat.provera);
            this.azurirajLokalneNagrade(odgovor);

            setTimeout(() => this.prikaziRezultat(rezultat), 900);
        } catch (error) {
            this.zavrsavanjeUToku = false;
            UIManager.prikaziObavestenje(
                "Dnevni izazov",
                "Rezultat nije upisan na server. Ostani na ovom ekranu i pokušaj ponovo dok se veza ne vrati.",
                () => {
                    UIManager.zatvoriObavestenje();
                    this.zavrsiIzazov();
                },
                "Pokušaj ponovo"
            );
        }
    },

    napraviRezultatPoruku: function(rezultat, statusTekst = "") {
        const ukupnoTacnih = Math.max(0, Number(rezultat.tacniPojmovi) || 0);
        const osvojenoDukata = Math.max(0, Number(rezultat.osvojenoDukata) || 0);
        const bonusPerfektno = Math.max(0, Number(rezultat.bonusPerfektno) || 0);
        const bonusDnevniNiz = Math.max(0, Number(rezultat.bonusDnevniNiz) || 0);
        const dnevniNiz = Math.max(0, Number(rezultat.dnevniNiz) || 0);
        const x2Preuzet = Boolean(rezultat.x2Preuzet);
        const x2BonusDukata = Math.max(0, Number(rezultat.x2BonusDukata) || 0);
        const ukupnoDukata = Math.max(
            osvojenoDukata + x2BonusDukata,
            Number(rezultat.ukupnoDukata) || 0
        );

        let poruka = `Pronašao/la si <b>${ukupnoTacnih}/4</b> tačnih pojmova.<br><br>`;

        if (osvojenoDukata > 0) {
            if (bonusPerfektno > 0) {
                poruka += `Bonus za 4/4: <b style="color:#38ef7d;">+${bonusPerfektno}</b><br>`;
            }
            if (bonusDnevniNiz > 0) {
                poruka += `Dnevni niz (${dnevniNiz} dana): <b style="color:#38ef7d;">+${bonusDnevniNiz}</b><br>`;
            }
            poruka += `Osvojena nagrada: <br><b style="color:#f5af19; font-size:1.5rem; text-shadow: 0 0 10px rgba(245,175,25,0.4);">+${osvojenoDukata} <i class="fa-solid fa-coins"></i></b>`;

            if (x2Preuzet) {
                poruka += `<span class="dnevni-result-total">x2 bonus: <b>+${x2BonusDukata}</b><br>Ukupno preuzeto: <b>${ukupnoDukata} <i class="fa-solid fa-coins"></i></b></span>`;
            } else {
                poruka += `
                    <span class="dnevni-result-actions">
                        <button type="button" id="dnevni-x2-btn" class="dnevni-result-x2-btn">
                            <i class="fa-solid fa-clapperboard" aria-hidden="true"></i>
                            <span>x2 nagrada</span>
                        </button>
                    </span>
                `;
            }
        } else {
            poruka += rezultat.razlog === "isteklo_vreme"
                ? `Vreme je isteklo pre predaje odgovora. Vrati se sutra za novi izazov.`
                : `Nažalost, nisi uspeo/la da osvojiš dukate. Više sreće sutra!`;
        }

        poruka += `<span id="dnevni-x2-status" class="dnevni-result-status">${statusTekst || ""}</span>`;
        return poruka;
    },

    poveziDnevniX2Dugme: function() {
        const dugme = document.getElementById('dnevni-x2-btn');
        if (!dugme) return;

        dugme.disabled = this.x2PreuzimanjeUToku;
        dugme.addEventListener('click', () => this.duplirajDnevnuNagradu());
    },

    postaviDnevniX2Status: function(tekst, zauzeto = false) {
        const status = document.getElementById('dnevni-x2-status');
        const dugme = document.getElementById('dnevni-x2-btn');
        if (status) status.textContent = tekst || "";
        if (dugme) dugme.disabled = Boolean(zauzeto);
    },

    osveziDnevniRezultatModal: function(rezultat, statusTekst = "") {
        this.poslednjiRezultat = {
            ...(this.poslednjiRezultat || {}),
            ...(rezultat || {})
        };

        const porukaEl = document.getElementById('modal-message');
        if (!porukaEl) return;

        porukaEl.innerHTML = this.napraviRezultatPoruku(this.poslednjiRezultat, statusTekst);
        this.poveziDnevniX2Dugme();
    },

    duplirajDnevnuNagradu: function() {
        if (this.x2PreuzimanjeUToku) return;

        const rezultat = this.poslednjiRezultat || (this.dnevniPodaci && this.dnevniPodaci.rezultat) || {};
        const osvojenoDukata = Math.max(0, Number(rezultat.osvojenoDukata) || 0);
        if (!this.dnevniPodaci || osvojenoDukata < 1 || rezultat.x2Preuzet) {
            this.postaviDnevniX2Status("x2 nagrada nije dostupna za ovaj rezultat.", false);
            return;
        }

        if (typeof TokeniManager === 'undefined' || typeof TokeniManager.prikaziReklamu !== 'function') {
            this.postaviDnevniX2Status("Reward reklama trenutno nije spremna.", false);
            return;
        }

        this.x2PreuzimanjeUToku = true;
        this.postaviDnevniX2Status("Pripremam reward reklamu...", true);

        const pokrenuto = TokeniManager.prikaziReklamu('rewarded', {
            naslov: 'X2 DNEVNA NAGRADA',
            opis: 'Odgledaj reklamu do kraja da dupliraš dnevnu nagradu.',
            onUspeh: async () => {
                try {
                    this.postaviDnevniX2Status("Upisujem x2 nagradu na server...", true);
                    const odgovor = await this.pozoviServer('dnevniIzazovDuplirajNagradu', {
                        datumId: this.dnevniPodaci.datumId
                    });

                    if (!odgovor.uspeh) {
                        throw new Error(odgovor.kod || 'DNEVNI_X2_NEUSPEO');
                    }

                    this.primeniServerStanje(odgovor);
                    this.azurirajLokalneNagrade(odgovor);
                    const noviRezultat = odgovor.rezultat || {
                        ...rezultat,
                        x2Preuzet: true,
                        x2BonusDukata: odgovor.x2BonusDukata || osvojenoDukata,
                        ukupnoDukata: osvojenoDukata + (odgovor.x2BonusDukata || osvojenoDukata)
                    };
                    const bonus = Math.max(0, Number(noviRezultat.x2BonusDukata) || 0);

                    this.x2PreuzimanjeUToku = false;
                    this.osveziDnevniRezultatModal(noviRezultat, `x2 nagrada preuzeta: +${bonus} dukata.`);
                } catch (error) {
                    this.x2PreuzimanjeUToku = false;
                    this.postaviDnevniX2Status("Server nije upisao x2 nagradu. Pokušaj ponovo dok je rezultat otvoren.", false);
                }
            },
            onNeuspeh: (poruka) => {
                this.x2PreuzimanjeUToku = false;
                this.postaviDnevniX2Status(poruka || "Reklama nije završena, x2 nije preuzet.", false);
            }
        });

        if (!pokrenuto) {
            this.x2PreuzimanjeUToku = false;
            this.postaviDnevniX2Status("Reward reklama trenutno nije dostupna.", false);
        }
    },

    prikaziRezultat: function(rezultat) {
        this.poslednjiRezultat = rezultat || {};
        this.x2PreuzimanjeUToku = false;

        UIManager.prikaziObavestenje(
            "Dnevni Izazov Završen!",
            this.napraviRezultatPoruku(this.poslednjiRezultat),
            () => {
                UIManager.prikaziEkran('main-menu');
            },
            "Preuzmi nagradu i izađi"
        );
        this.poveziDnevniX2Dugme();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DnevniIzazovManager.init();
});
