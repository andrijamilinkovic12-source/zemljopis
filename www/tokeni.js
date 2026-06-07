// tokeni.js - Menadžer za tokene i AdMob reklame

const TokeniManager = {
    tokeni: 3,
    maxTokena: 3,
    reklamaUToku: false,
    
    init: function() {
        this.proveriDnevniReset();
    },

    normalizujTokeni: function(vrednost) {
        const broj = parseInt(vrednost, 10);
        if (Number.isNaN(broj)) return this.maxTokena;
        return Math.max(0, Math.min(this.maxTokena, broj));
    },

    postaviStanje: function(vrednost) {
        this.tokeni = this.normalizujTokeni(vrednost);
        this.snimiStanje();
    },
    
    proveriDnevniReset: function() {
        const danas = new Date().toLocaleDateString();
        const sacuvanDatum = localStorage.getItem('zemljopis_datum_tokena');
        
        if (sacuvanDatum !== danas) {
            // Novi dan - dodeli 3 besplatna tokena!
            this.tokeni = this.maxTokena;
            localStorage.setItem('zemljopis_datum_tokena', danas);
            this.snimiStanje();
        } else {
            // Isti dan - samo pročitaj stanje iz memorije
            const sacuvaniTokeni = localStorage.getItem('zemljopis_tokeni_stanje');
            if (sacuvaniTokeni !== null) {
                this.tokeni = this.normalizujTokeni(sacuvaniTokeni);
            }
        }
        this.azurirajPrikaz();
    },
    
    snimiStanje: function() {
        this.tokeni = this.normalizujTokeni(this.tokeni);
        localStorage.setItem('zemljopis_tokeni_stanje', this.tokeni);
        this.azurirajPrikaz();
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },
    
    azurirajPrikaz: function() {
        // Ažuriranje status bara
        const meniTokeni = document.getElementById('meni-tokeni');
        if (meniTokeni) meniTokeni.innerText = `${this.tokeni}/${this.maxTokena}`;
        
        // Ažuriranje brojke na velikom ekranu
        const velikoStanje = document.getElementById('tokeni-stanje-veliko');
        if (velikoStanje) velikoStanje.innerText = this.tokeni;
        
        // Ažuriranje dugmeta za gledanje reklame
        const btnReklama = document.getElementById('btn-gledaj-reklamu');
        if (btnReklama) {
            if (this.reklamaUToku) {
                btnReklama.disabled = true;
                btnReklama.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Reklama se prikazuje...';
                btnReklama.style.background = 'rgba(255,255,255,0.1)';
                btnReklama.style.color = '#a0aec0';
                btnReklama.style.boxShadow = 'none';
            } else if (this.tokeni >= this.maxTokena) {
                btnReklama.disabled = true;
                btnReklama.innerHTML = '<i class="fa-solid fa-check"></i> Maksimalan broj tokena';
                btnReklama.style.background = 'rgba(255,255,255,0.1)';
                btnReklama.style.color = '#a0aec0';
                btnReklama.style.boxShadow = 'none';
            } else {
                btnReklama.disabled = false;
                btnReklama.innerHTML = '<i class="fa-solid fa-play"></i> Gledaj reklamu (+1)';
                btnReklama.style.background = 'linear-gradient(45deg, #11998e, #38ef7d)';
                btnReklama.style.color = '#000';
                btnReklama.style.boxShadow = '0 4px 15px rgba(56, 239, 125, 0.4)';
            }
        }
    },
    
    imaTokena: function() {
        return this.tokeni > 0;
    },
    
    potrosiToken: function() {
        if (!this.imaTokena()) {
            this.azurirajPrikaz();
            return false;
        }

        this.tokeni--;
        this.snimiStanje();
        return true;
    },

    dodajToken: function(kolicina = 1) {
        const prethodno = this.tokeni;
        this.tokeni = this.normalizujTokeni(this.tokeni + kolicina);
        this.snimiStanje();
        return this.tokeni > prethodno;
    },
    
    otvoriEkran: function() {
        this.proveriDnevniReset();
        UIManager.prikaziEkran('tokeni-screen');
    },
    
    pogledajReklamu: function() {
        if (this.reklamaUToku || this.tokeni >= this.maxTokena) {
            this.azurirajPrikaz();
            return;
        }
        
        /* =========================================================
           OVDJE INTEGRISATI PRAVI ADMOB KOD (npr. showRewardVideo)
           ========================================================= 
        */

        // Za sada pokrećemo MOCK (Simulaciju) učitavanja reklame:
        this.reklamaUToku = true;
        this.azurirajPrikaz();
        UIManager.prikaziObavestenje("Učitavanje reklame...", "Molim te sačekaj, reklama se prikazuje...", null, "...");
        
        const modalBtn = document.getElementById('modal-btn');
        if(modalBtn) modalBtn.style.display = 'none'; // Sakrijemo dugme da igrač ne prekine reklamu
        
        setTimeout(() => {
            // Po završetku reklame:
            this.reklamaUToku = false;
            this.dodajToken(1);
            
            if(modalBtn) modalBtn.style.display = 'block'; // Vraćamo dugme
            UIManager.prikaziObavestenje(
                "Čestitamo!", 
                "Uspešno si odgledao reklamu i dobio <b style='color:#38ef7d; font-size:1.2rem;'>+1 Token</b>!", 
                null, 
                "Zatvori"
            );
        }, 3000); // Simulacija "trajanja reklame" od 3 sekunde
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TokeniManager.init();
});
