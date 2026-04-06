// trofeji.js - Menadžer za praćenje dostignuća i trofeja

const TrofejiManager = {
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
    },

    otvoriEkran: function() {
        UIManager.prikaziEkran('trofeji-main-screen');
        this.proveriDukate(); // Osveži dukate pre prikaza
        this.osveziPrikaz();
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
                akcijaHtml = `<button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer; background: #f5af19; font-weight: 800; color: #000;" onclick="TrofejiManager.preuzmiNagradu('${trofej.id}')">Pokupi +${trofej.nagrada}</button>`;
            } else if (trofej.preuzeto) {
                akcijaHtml = `<span style="color: #38ef7d; font-size: 0.9rem; font-weight: 800;"><i class="fa-solid fa-check"></i> Završeno</span>`;
            } else {
                akcijaHtml = `<span style="color: #f5af19; font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-coins"></i> ${trofej.nagrada}</span>`;
            }

            html += `
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 1rem; margin-bottom: 0.8rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <div>
                            <h4 style="color: #fff; margin-bottom: 0.2rem; font-size: 0.95rem;">${trofej.naziv}</h4>
                            <p style="color: #a0aec0; font-size: 0.75rem;">${trofej.opis}</p>
                        </div>
                        <div>${akcijaHtml}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.8rem;">
                        <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${procenat}%; height: 100%; background: ${zavrsen ? '#38ef7d' : '#f5af19'}; transition: width 0.5s;"></div>
                        </div>
                        <span style="font-size: 0.7rem; color: #a0aec0; min-width: 40px; text-align: right;">${trofej.napredak}/${trofej.uslov}</span>
                    </div>
                </div>
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