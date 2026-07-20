// trofeji.js - Menadžer za praćenje dostignuća i trofeja

const TrofejiManager = {
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,

    podaci: [
        // KATEGORIJA: Odigrane partije
        { id: 't1', tip: 'partije', naziv: 'Prvi koraci', opis: 'Odigraj svoju prvu igru.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 50 },
        { id: 't2', tip: 'partije', naziv: 'Igrač u usponu', opis: 'Odigraj ukupno 10 partija.', uslov: 10, napredak: 0, preuzeto: false, nagrada: 200 },
        { id: 't3', tip: 'partije', naziv: 'Veteran', opis: 'Odigraj ukupno 50 partija.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 800 },

        // KATEGORIJA: Pronađeni pojmovi
        { id: 't4', tip: 'pojmovi', naziv: 'Sveznalica', opis: 'Pronađi ukupno 50 tačnih pojmova.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 150 },
        { id: 't5', tip: 'pojmovi', naziv: 'Živi leksikon', opis: 'Pronađi ukupno 500 tačnih pojmova.', uslov: 500, napredak: 0, preuzeto: false, nagrada: 600 },
        { id: 't6', tip: 'pojmovi', naziv: 'Enciklopedija', opis: 'Pronađi ukupno 2000 tačnih pojmova.', uslov: 2000, napredak: 0, preuzeto: false, nagrada: 1500 },

        // KATEGORIJA: Multiplayer pobede
        { id: 't7', tip: 'pobede', naziv: 'Šampion', opis: 'Osvoji 1. mesto u multiplayer meču.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 300 },
        { id: 't8', tip: 'pobede', naziv: 'Dominacija', opis: 'Osvoji 1. mesto u 10 multiplayer mečeva.', uslov: 10, napredak: 0, preuzeto: false, nagrada: 1000 },
        { id: 't9', tip: 'pobede', naziv: 'Nepobediv', opis: 'Osvoji 1. mesto u 50 multiplayer mečeva.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 3000 },

        // KATEGORIJA: Specijalna dostignuća
        { id: 't10', tip: 'perfektno', naziv: 'Perfekcionista', opis: 'Pronađi svih 7 pojmova u jednoj rundi.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 500 },
        
        // KATEGORIJA: Skupljanje Dukata
        { id: 't11', tip: 'dukati', naziv: 'Štediša', opis: 'Imaj 1.000 dukata na stanju.', uslov: 1000, napredak: 0, preuzeto: false, nagrada: 200 },
        { id: 't12', tip: 'dukati', naziv: 'Tajkun', opis: 'Imaj 10.000 dukata na stanju.', uslov: 10000, napredak: 0, preuzeto: false, nagrada: 2000 }
    ],

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_trofeji');
        if (sacuvano) {
            const parsirano = JSON.parse(sacuvano);
            parsirano.forEach(sacuvanaStavka => {
                let orgStavka = this.podaci.find(s => s.id === sacuvanaStavka.id);
                if (orgStavka) {
                    Object.assign(orgStavka, sacuvanaStavka);
                }
            });
        }
    },

    snimiStanje: function() {
        localStorage.setItem('zemljopis_trofeji', JSON.stringify(this.podaci));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },

    otvoriEkran: function() {
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        // Trofeji se pripremaju dok traje uvod.
        this.proveriDukate();
        this.osveziPrikaz();
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('trofeji-main-screen');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('trofeji-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--trofeji-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            // Soba se aktivira iza zatamnjenog završetka uvoda, nikad preko menija.
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('trofeji-main-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('trofeji-entering');
        void ekran.offsetWidth;
        ekran.classList.add('trofeji-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('trofeji-entering'), 720);
    },

    azurirajNapredak: function(tip, kolicina) {
        let osvezi = false;
        
        this.podaci.forEach(t => {
            if (t.tip === tip && t.napredak < t.uslov) {
                t.napredak += kolicina;
                if (t.napredak >= t.uslov) {
                    t.napredak = t.uslov; // Zadrži na maks
                    UIManager.prikaziObavestenje("🏆 Novi Trofej!", `Otključao si trofej: <b>${t.naziv}</b>!<br>Poseti Sobu sa Trofejima da preuzmeš nagradu.`, null, "Sjajno");
                }
                osvezi = true;
            }
        });
        
        if (osvezi) {
            this.snimiStanje();
        }
    },

    proveriDukate: function() {
        if (typeof RiznicaManager === 'undefined') return;
        let trenutnoDukata = RiznicaManager.dukati;
        let promena = false;

        this.podaci.forEach(t => {
            if (t.tip === 'dukati' && !t.preuzeto) {
                if (trenutnoDukata > t.napredak) {
                    t.napredak = trenutnoDukata;
                    promena = true;
                    if (t.napredak >= t.uslov) {
                        t.napredak = t.uslov;
                    }
                }
            }
        });

        if (promena) this.snimiStanje();
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('trofeji-sadrzaj');
        if (!kontejner) return;

        let html = '';
        this.podaci.forEach(trofej => {
            let procenat = Math.min((trofej.napredak / trofej.uslov) * 100, 100);
            let zavrsen = trofej.napredak >= trofej.uslov;
            
            let akcijaHtml = '';
            if (zavrsen && !trofej.preuzeto) {
                akcijaHtml = `<button type="button" class="trofej-preuzmi" onclick="TrofejiManager.preuzmiNagradu('${trofej.id}')"><i class="fa-solid fa-coins"></i> Pokupi +${trofej.nagrada}</button>`;
            } else if (trofej.preuzeto) {
                akcijaHtml = `<span class="status-zavrseno trofej-status-zavrsen"><i class="fa-solid fa-check"></i> Završeno</span>`;
            } else {
                akcijaHtml = `<span class="trofej-nagrada"><i class="fa-solid fa-coins"></i> ${trofej.nagrada}</span>`;
            }

            html += `
                <article class="trofej-kartica${zavrsen ? ' je-otkljucan' : ''}${trofej.preuzeto ? ' je-preuzet' : ''}">
                    <div class="trofej-kartica-zaglavlje">
                        <div class="trofej-kartica-info">
                            <h4 class="trofej-naziv">${trofej.naziv}</h4>
                            <p class="trofej-opis">${trofej.opis}</p>
                        </div>
                        <div class="trofej-akcija">${akcijaHtml}</div>
                    </div>
                    
                    <div class="trofej-napredak-red">
                        <div class="trofej-napredak" role="progressbar" aria-label="Napredak: ${trofej.naziv}" aria-valuemin="0" aria-valuemax="${trofej.uslov}" aria-valuenow="${trofej.napredak}">
                            <span class="trofej-napredak-popuna${zavrsen ? ' zavrsen' : ''}" style="width: ${procenat}%;"></span>
                        </div>
                        <span class="trofej-napredak-vrednost">${trofej.napredak}/${trofej.uslov}</span>
                    </div>
                </article>
            `;
        });
        kontejner.innerHTML = html;
    },

    preuzmiNagradu: function(trofejId) {
        let trofej = this.podaci.find(t => t.id === trofejId);
        if (trofej && trofej.napredak >= trofej.uslov && !trofej.preuzeto) {
            trofej.preuzeto = true;
            
            if (typeof RiznicaManager !== 'undefined') {
                RiznicaManager.dukati += trofej.nagrada;
                RiznicaManager.snimiStanje();
                // Ažuriramo glavni meni
                let meniDukati = document.getElementById('meni-dukati');
                if(meniDukati) meniDukati.innerText = RiznicaManager.dukati;
            }

            this.snimiStanje();
            this.osveziPrikaz();
            UIManager.prikaziObavestenje("Nagrada preuzeta!", `Osvojio si <b style="color:#f5af19;">${trofej.nagrada} dukata</b>!`, null, "Super");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TrofejiManager.init();
});
