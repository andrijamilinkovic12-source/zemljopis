// tokeni.js - Menadžer za tokene i AdMob reklame

const TokeniManager = {
    tokeni: 3,
    maxTokena: 3,
    reklamaUToku: false,
    adapterReklama: null,
    
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
            btnReklama.classList.remove('is-loading', 'is-maxed');
            if (this.reklamaUToku) {
                btnReklama.disabled = true;
                btnReklama.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Reklama se prikazuje...';
                btnReklama.classList.add('is-loading');
            } else if (this.tokeni >= this.maxTokena) {
                btnReklama.disabled = true;
                btnReklama.innerHTML = '<i class="fa-solid fa-check"></i> Maksimalan broj tokena';
                btnReklama.classList.add('is-maxed');
            } else {
                btnReklama.disabled = false;
                btnReklama.innerHTML = '<i class="fa-solid fa-play"></i> Gledaj reklamu (+1)';
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

    postaviAdapterReklama: function(adapter) {
        this.adapterReklama = adapter || null;
    },

    prikaziReklamu: function(tip, opcije = {}) {
        if (this.reklamaUToku) return false;

        const dozvoljeniTipovi = ['interstitial', 'rewarded'];
        if (!dozvoljeniTipovi.includes(tip)) return false;

        const metoda = tip === 'rewarded' ? 'prikaziRewarded' : 'prikaziInterstitial';
        if (this.adapterReklama && typeof this.adapterReklama[metoda] === 'function') {
            this.reklamaUToku = true;
            this.azurirajPrikaz();

            Promise.resolve(this.adapterReklama[metoda]())
                .then(rezultat => {
                    this.reklamaUToku = false;
                    this.azurirajPrikaz();

                    if (tip === 'rewarded' && rezultat && rezultat.nagradaDodeljena === false) {
                        if (typeof opcije.onNeuspeh === 'function') opcije.onNeuspeh('Reklama nije odgledana do kraja.');
                        return;
                    }

                    if (typeof opcije.onUspeh === 'function') opcije.onUspeh();
                })
                .catch(() => {
                    this.reklamaUToku = false;
                    this.azurirajPrikaz();
                    if (typeof opcije.onNeuspeh === 'function') opcije.onNeuspeh('Reklama trenutno nije dostupna.');
                });

            return true;
        }

        return this.prikaziTestReklamu(tip, opcije);
    },

    prikaziTestReklamu: function(tip, opcije = {}) {
        const overlay = document.getElementById('ad-preview-overlay');
        const naslov = document.getElementById('ad-preview-title');
        const opis = document.getElementById('ad-preview-description');
        const vreme = document.getElementById('ad-preview-time');
        const traka = document.getElementById('ad-preview-progress-fill');

        if (!overlay || !naslov || !opis || !vreme || !traka) {
            if (typeof opcije.onNeuspeh === 'function') opcije.onNeuspeh('Prikaz reklame nije spreman.');
            return false;
        }

        const trajanje = tip === 'rewarded' ? 5 : 3;
        let preostalo = trajanje;

        this.reklamaUToku = true;
        this.azurirajPrikaz();

        naslov.textContent = opcije.naslov || (tip === 'rewarded' ? 'NAGRAĐENA REKLAMA' : 'INTERSTICIJALNA REKLAMA');
        opis.textContent = opcije.opis || (tip === 'rewarded'
            ? 'Odgledaj reklamu do kraja da preuzmeš 10x nagradu.'
            : 'Po završetku reklame preuzimaš 5x nagradu.');
        vreme.textContent = `${preostalo}s`;
        traka.style.transition = 'none';
        traka.style.transform = 'scaleX(0)';

        overlay.classList.remove('closing');
        overlay.setAttribute('aria-hidden', 'false');
        void overlay.offsetWidth;
        overlay.classList.add('active');

        requestAnimationFrame(() => {
            traka.style.transition = `transform ${trajanje}s linear`;
            traka.style.transform = 'scaleX(1)';
        });

        const interval = setInterval(() => {
            preostalo--;
            vreme.textContent = preostalo > 0 ? `${preostalo}s` : 'ZAVRŠENO';
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            overlay.classList.add('closing');

            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
                this.reklamaUToku = false;
                this.azurirajPrikaz();
                if (typeof opcije.onUspeh === 'function') opcije.onUspeh();
            }, 360);
        }, trajanje * 1000);

        return true;
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

        this.prikaziReklamu('rewarded', {
            naslov: 'TOKEN REKLAMA',
            opis: 'Odgledaj reklamu do kraja da dobiješ +1 token za igru.',
            onUspeh: () => {
                this.dodajToken(1);

                UIManager.prikaziObavestenje(
                    "Čestitamo!",
                    "Uspešno si odgledao reklamu i dobio <b style='color:#38ef7d; font-size:1.2rem;'>+1 token</b>!",
                    null,
                    "Zatvori"
                );
            },
            onNeuspeh: poruka => {
                UIManager.prikaziObavestenje(
                    "Reklama nije završena",
                    poruka || "Pokušaj ponovo malo kasnije.",
                    null,
                    "U redu"
                );
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TokeniManager.init();
});
