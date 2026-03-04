// dnevniizazov.js - Logika za dnevni izazov (jednom dnevno, nasumične kategorije i slova)

const DnevniIzazovManager = {
    // Definišemo pravu srpsku abecedu kako bismo izbegli greške sa Dž, Nj, Lj
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

    init: function() {
        this.proveriIDodeliDnevniZadatak();
    },

    proveriIDodeliDnevniZadatak: function() {
        // Uzimamo današnji datum u formatu stringa (npr. "3/3/2026")
        const danas = new Date().toLocaleDateString('sr-RS'); 
        const sacuvano = localStorage.getItem('zemljopis_dnevni_izazov');

        if (sacuvano) {
            this.dnevniPodaci = JSON.parse(sacuvano);
        }

        // Ako nemamo podatke za DANAS, generišemo novi izazov
        if (!this.dnevniPodaci || this.dnevniPodaci.datum !== danas) {
            
            // Mešamo kategorije i uzimamo prve 4 (osigurava 4 različite)
            let dostupneKategorije = [...this.sveKategorije].sort(() => 0.5 - Math.random()).slice(0, 4);
            
            // Mešamo slova i uzimamo prva 4 (osigurava 4 različita slova)
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
                odigrano: false,
                zadaci: zadaci
            };
            this.snimiStanje();
        }
    },

    snimiStanje: function() {
        localStorage.setItem('zemljopis_dnevni_izazov', JSON.stringify(this.dnevniPodaci));
    },

    otvoriEkran: function() {
        this.proveriIDodeliDnevniZadatak(); // Osiguranje u slučaju prelaska u novi dan dok je app upaljena

        if (this.dnevniPodaci.odigrano) {
            UIManager.prikaziObavestenje(
                "Već si odigrao!", 
                "Dnevni izazov možeš igrati samo jednom dnevno. Vrati se sutra za nove nagrade!", 
                null, 
                "U redu"
            );
            return;
        }

        this.prikaziZadatke();
        UIManager.prikaziEkran('dnevni-izazov-screen');
    },

    prikaziZadatke: function() {
        const kontejner = document.getElementById('dnevni-izazov-polja');
        if (!kontejner) return;

        let html = '';
        this.dnevniPodaci.zadaci.forEach((zadatak, index) => {
            html += `
            <div class="input-group" style="margin-bottom: 1.2rem; background: rgba(0,0,0,0.3); padding: 0.8rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <label style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.9rem; color: #fff;">${zadatak.ikona} ${zadatak.naziv}</span>
                    <span style="color: #f5af19; font-weight: 800; font-size: 1.1rem;">Slovo: ${zadatak.slovo}</span>
                </label>
                <input type="text" id="dnevni-input-${index}" class="game-input" placeholder="Unesi pojam..." autocomplete="off" autocorrect="off" spellcheck="false">
            </div>
            `;
        });
        kontejner.innerHTML = html;
    },

    zavrsiIzazov: function() {
        let ukupnoTacnih = 0;

        // Prolazimo kroz sve zadatke i proveravamo unose
        this.dnevniPodaci.zadaci.forEach((zadatak, index) => {
            const inputEl = document.getElementById(`dnevni-input-${index}`);
            const odgovor = inputEl.value.trim();
            
            // Oslanjamo se na bazu podataka iz glavne igre
            const isCorrect = BazaPodataka.proveriPojam(zadatak.kategorija, odgovor, zadatak.slovo);

            UIManager.zakljucajIObojiPolje(inputEl, isCorrect);

            if (isCorrect) {
                ukupnoTacnih++;
            }
        });

        // Svaki tačan odgovor donosi 100 dukata
        let osvojenoDukata = ukupnoTacnih * 100;
        
        // Beležimo da je izazov za danas završen
        this.dnevniPodaci.odigrano = true;
        this.snimiStanje();

        // Dodela dukata u Riznicu
        if (osvojenoDukata > 0) {
            RiznicaManager.dukati += osvojenoDukata;
            RiznicaManager.snimiStanje();
        }

        // Prikaz rezultata nakon kraće pauze (da bi korisnik video crveno/zeleno na poljima)
        setTimeout(() => {
            let poruka = `Pronašao/la si <b>${ukupnoTacnih}/4</b> tačnih pojmova.<br><br>`;
            
            if (ukupnoTacnih > 0) {
                poruka += `Osvojena nagrada: <br><b style="color:#f5af19; font-size:1.5rem; text-shadow: 0 0 10px rgba(245,175,25,0.4);">+${osvojenoDukata} <i class="fa-solid fa-coins"></i></b>`;
            } else {
                poruka += `Nažalost, nisi uspeo/la da osvojiš dukate. Više sreće sutra!`;
            }

            UIManager.prikaziObavestenje(
                "Dnevni Izazov Završen!",
                poruka,
                () => { UIManager.prikaziEkran('main-menu'); },
                "Nazad u Meni"
            );
        }, 1500);
    }
};

// Pokretanje inicijalizacije kada se učita prozor
document.addEventListener('DOMContentLoaded', () => {
    DnevniIzazovManager.init();
});