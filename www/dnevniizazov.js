// dnevniizazov.js - Logika za dnevni izazov (jednom dnevno, 1 minut, bez odustajanja)

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

    proveriIDodeliDnevniZadatak: function() {
        const danas = new Date().toLocaleDateString('sr-RS'); 
        const sacuvano = localStorage.getItem('zemljopis_dnevni_izazov');

        if (sacuvano) {
            this.dnevniPodaci = JSON.parse(sacuvano);
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

        const btn = document.getElementById('btn-zavrsi-dnevni');
        if(btn) btn.disabled = false;

        this.prikaziZadatke();
        UIManager.prikaziEkran('dnevni-izazov-screen');

        // Pokretanje tajmera na tačno 60 sekundi
        this.pokreniTajmer(60);
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
        
        // Fokusiraj odmah prvo polje
        setTimeout(() => {
            const prvoPolje = document.getElementById('dnevni-input-0');
            if (prvoPolje) prvoPolje.focus();
        }, 100);
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

        const btn = document.getElementById('btn-zavrsi-dnevni');
        if(btn) btn.disabled = true;

        let ukupnoTacnih = 0;

        this.dnevniPodaci.zadaci.forEach((zadatak, index) => {
            const inputEl = document.getElementById(`dnevni-input-${index}`);
            const odgovor = inputEl.value.trim();
            
            const isCorrect = BazaPodataka.proveriPojam(zadatak.kategorija, odgovor, zadatak.slovo);
            UIManager.zakljucajIObojiPolje(inputEl, isCorrect);

            if (isCorrect) {
                ukupnoTacnih++;
            }
        });

        let osvojenoDukata = ukupnoTacnih * 100;
        
        // Još jedan sigurnosni snimak (iako je već zabeleženo na početku)
        this.dnevniPodaci.odigrano = true;
        this.snimiStanje();

        if (osvojenoDukata > 0 && typeof RiznicaManager !== 'undefined') {
            RiznicaManager.dukati += osvojenoDukata;
            RiznicaManager.snimiStanje();
        }

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