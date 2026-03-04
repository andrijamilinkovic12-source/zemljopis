// riznica.js - Upravljanje prodavnicom, trofejima i dukatima

const RiznicaManager = {
    dukati: 500, // Početni poklon dukati za testiranje
    aktivnaKategorija: 'trofeji',

    // Baza svih predmeta i zadataka u riznici
    podaci: {
        trofeji: [
            // KATEGORIJA: Odigrane partije
            { id: 't1', naziv: 'Prvi koraci', opis: 'Odigraj svoju prvu igru.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 50 },
            { id: 't2', naziv: 'Igrač u usponu', opis: 'Odigraj ukupno 10 partija.', uslov: 10, napredak: 0, preuzeto: false, nagrada: 200 },
            { id: 't3', naziv: 'Veteran', opis: 'Odigraj ukupno 50 partija.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 800 },

            // KATEGORIJA: Pronađeni pojmovi
            { id: 't4', naziv: 'Sveznalica', opis: 'Pronađi ukupno 50 tačnih pojmova.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 150 },
            { id: 't5', naziv: 'Živi leksikon', opis: 'Pronađi ukupno 500 tačnih pojmova.', uslov: 500, napredak: 0, preuzeto: false, nagrada: 600 },
            { id: 't6', naziv: 'Enciklopedija', opis: 'Pronađi ukupno 2000 tačnih pojmova.', uslov: 2000, napredak: 0, preuzeto: false, nagrada: 1500 },

            // KATEGORIJA: Multiplayer pobede
            { id: 't7', naziv: 'Šampion', opis: 'Osvoji 1. mesto u multiplayer meču.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 300 },
            { id: 't8', naziv: 'Dominacija', opis: 'Osvoji 1. mesto u 10 multiplayer mečeva.', uslov: 10, napredak: 0, preuzeto: false, nagrada: 1000 },
            { id: 't9', naziv: 'Nepobediv', opis: 'Osvoji 1. mesto u 50 multiplayer mečeva.', uslov: 50, napredak: 0, preuzeto: false, nagrada: 3000 },

            // KATEGORIJA: Specijalna dostignuća
            { id: 't10', naziv: 'Perfekcionista', opis: 'Pronađi svih 7 pojmova u jednoj rundi.', uslov: 1, napredak: 0, preuzeto: false, nagrada: 500 },
            
            // KATEGORIJA: Skupljanje Dukata
            { id: 't11', naziv: 'Štediša', opis: 'Sakupi ukupno 1.000 dukata.', uslov: 1000, napredak: 500, preuzeto: false, nagrada: 200 },
            { id: 't12', naziv: 'Tajkun', opis: 'Sakupi ukupno 10.000 dukata.', uslov: 10000, napredak: 500, preuzeto: false, nagrada: 2000 }
        ],
        teme: [
            { id: 'tema_tamna', naziv: 'Tamna (Standard)', cena: 0, kupljeno: true, opremljeno: true, ikona: 'fa-moon' },
            { id: 'tema_svetla', naziv: 'Svetla', cena: 0, kupljeno: true, opremljeno: false, ikona: 'fa-sun' },
            { id: 'tema_neon', naziv: 'Neon Cyber', cena: 1000, kupljeno: false, opremljeno: false, ikona: 'fa-bolt' },
            { id: 'tema_zlatna', naziv: 'Kraljevsko Zlato', cena: 2500, kupljeno: false, opremljeno: false, ikona: 'fa-crown' },
            { id: 'tema_okean', naziv: 'Plavi Okean', cena: 800, kupljeno: false, opremljeno: false, ikona: 'fa-water' }
        ],
        efekti: [
            { id: 'ef_nista', naziv: 'Bez efekta', cena: 0, kupljeno: true, opremljeno: true, ikona: 'fa-ban' },
            { id: 'ef_konfete', naziv: 'Konfete pobede', cena: 300, kupljeno: false, opremljeno: false, ikona: 'fa-wand-magic-sparkles' },
            { id: 'ef_vatromet', naziv: 'Vatromet', cena: 800, kupljeno: false, opremljeno: false, ikona: 'fa-fire' }
        ],
        vauceri: [] // Nedefinisano za sada
    },

    init: function() {
        // Učitavanje sačuvanog stanja iz lokalne memorije
        const sacuvano = localStorage.getItem('zemljopis_riznica');
        if (sacuvano) {
            const parsirano = JSON.parse(sacuvano);
            this.dukati = parsirano.dukati !== undefined ? parsirano.dukati : this.dukati;
            
            // Oprezno spajanje podataka da ne prebrišemo nove stavke ako dodamo u kodu
            if (parsirano.podaci) {
                ['trofeji', 'teme', 'efekti'].forEach(kat => {
                    if (parsirano.podaci[kat]) {
                        parsirano.podaci[kat].forEach(sacuvanaStavka => {
                            let orgStavka = this.podaci[kat].find(s => s.id === sacuvanaStavka.id);
                            if (orgStavka) {
                                Object.assign(orgStavka, sacuvanaStavka);
                            }
                        });
                    }
                });
            }
        }
    },

    snimiStanje: function() {
        localStorage.setItem('zemljopis_riznica', JSON.stringify({
            dukati: this.dukati,
            podaci: this.podaci
        }));
        this.azurirajPrikazDukata();
    },

    otvoriEkran: function() {
        UIManager.prikaziEkran('riznica-screen');
        this.azurirajPrikazDukata();
        this.promeniKategoriju('trofeji'); 
    },

    azurirajPrikazDukata: function() {
        const el = document.getElementById('riznica-dukati-stanje');
        if (el) {
            el.innerText = this.dukati;
        }
    },

    promeniKategoriju: function(novaKategorija) {
        this.aktivnaKategorija = novaKategorija;

        // Ažuriranje izgleda tabova
        const tabovi = ['trofeji', 'teme', 'efekti', 'vauceri'];
        tabovi.forEach(tab => {
            const btn = document.getElementById('tab-' + tab);
            if (btn) {
                if (tab === novaKategorija) {
                    btn.style.background = 'rgba(245, 175, 25, 0.2)'; // Zlatna za riznicu
                    btn.style.borderColor = '#f5af19';
                    btn.style.color = '#f5af19';
                } else {
                    btn.style.background = 'rgba(255,255,255,0.05)';
                    btn.style.borderColor = 'transparent';
                    btn.style.color = '#a0aec0';
                }
            }
        });

        this.osveziPrikaz();
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('riznica-sadrzaj');
        if (!kontejner) return;

        let html = '';

        if (this.aktivnaKategorija === 'trofeji') {
            html = this.generisiHTMLTrofeja();
        } else if (this.aktivnaKategorija === 'teme' || this.aktivnaKategorija === 'efekti') {
            html = this.generisiHTMLTrgovine(this.aktivnaKategorija);
        } else if (this.aktivnaKategorija === 'vauceri') {
            html = `
                <div style="text-align:center; padding: 2rem 1rem; color: #a0aec0;">
                    <i class="fa-solid fa-ticket" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>Vaučeri stižu uskoro!</h3>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">Ovde ćeš moći da uneseš promo kodove za specijalne nagrade i dukate.</p>
                </div>
            `;
        }

        kontejner.innerHTML = html;
    },

    generisiHTMLTrofeja: function() {
        let html = '';
        this.podaci.trofeji.forEach(trofej => {
            let procenat = Math.min((trofej.napredak / trofej.uslov) * 100, 100);
            let zavrsen = trofej.napredak >= trofej.uslov;
            
            let akcijaHtml = '';
            if (zavrsen && !trofej.preuzeto) {
                akcijaHtml = `<button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer; background: #f5af19; font-weight: 800; color: #000;" onclick="RiznicaManager.preuzmiNagradu('${trofej.id}')">Pokupi +${trofej.nagrada}</button>`;
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
        return html;
    },

    generisiHTMLTrgovine: function(kategorija) {
        let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">';
        
        this.podaci[kategorija].forEach(artikal => {
            let statusHtml = '';
            let okvirBoja = artikal.opremljeno ? '#38ef7d' : 'rgba(255,255,255,0.1)';
            let bgBoja = artikal.opremljeno ? 'rgba(56,239,125,0.1)' : 'rgba(0,0,0,0.4)';

            if (!artikal.kupljeno) {
                statusHtml = `<button class="menu-btn" style="margin: 0; padding: 0.5rem; font-size: 0.8rem; width: 100%; background: rgba(245,175,25,0.2); color: #f5af19; border: 1px solid #f5af19;" onclick="RiznicaManager.kupiPredmet('${kategorija}', '${artikal.id}')"><i class="fa-solid fa-coins"></i> ${artikal.cena}</button>`;
            } else if (artikal.opremljeno) {
                statusHtml = `<div style="text-align: center; color: #38ef7d; font-size: 0.8rem; font-weight: 800; padding: 0.5rem;"><i class="fa-solid fa-circle-check"></i> Opremljeno</div>`;
            } else {
                statusHtml = `<button class="menu-btn" style="margin: 0; padding: 0.5rem; font-size: 0.8rem; width: 100%;" onclick="RiznicaManager.opremiPredmet('${kategorija}', '${artikal.id}')">Opremi</button>`;
            }

            html += `
                <div style="background: ${bgBoja}; border: 1px solid ${okvirBoja}; border-radius: 12px; padding: 1rem 0.5rem; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <i class="fa-solid ${artikal.ikona}" style="font-size: 2rem; color: ${artikal.kupljeno ? '#fff' : '#a0aec0'}; margin-bottom: 0.8rem;"></i>
                        <h4 style="color: #fff; font-size: 0.85rem; margin-bottom: 1rem;">${artikal.naziv}</h4>
                    </div>
                    ${statusHtml}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    },

    preuzmiNagradu: function(trofejId) {
        let trofej = this.podaci.trofeji.find(t => t.id === trofejId);
        if (trofej && trofej.napredak >= trofej.uslov && !trofej.preuzeto) {
            trofej.preuzeto = true;
            this.dukati += trofej.nagrada;
            this.snimiStanje();
            this.osveziPrikaz();
            UIManager.prikaziObavestenje("Nagrada preuzeta!", `Osvojio si <b style="color:#f5af19;">${trofej.nagrada} dukata</b>!`, null, "Super");
        }
    },

    kupiPredmet: function(kategorija, predmetId) {
        let artikal = this.podaci[kategorija].find(p => p.id === predmetId);
        
        if (artikal && !artikal.kupljeno) {
            if (this.dukati >= artikal.cena) {
                this.dukati -= artikal.cena;
                artikal.kupljeno = true;
                
                // Automatski opremi nakon kupovine
                this.opremiPredmet(kategorija, predmetId, true);
                
                UIManager.prikaziObavestenje("Uspešna kupovina!", `Uspešno si kupio: <b>${artikal.naziv}</b>`, null, "Odlično");
            } else {
                UIManager.prikaziObavestenje("Nemate dovoljno dukata", `Ovaj predmet košta ${artikal.cena} dukata, a vi imate ${this.dukati}. Odigrajte još partija!`, null, "U redu");
            }
        }
    },

    opremiPredmet: function(kategorija, predmetId, preskociOsvezavanje = false) {
        // Skini opremu sa svih ostalih u toj kategoriji
        this.podaci[kategorija].forEach(p => p.opremljeno = false);
        
        // Postavi novu opremu
        let artikal = this.podaci[kategorija].find(p => p.id === predmetId);
        if (artikal) {
            artikal.opremljeno = true;
            
            // Tiha sinhronizacija sa Podešavanjima (bez duplih obaveštenja)
            if (kategorija === 'teme' && typeof PodesavanjaManager !== 'undefined') {
                let imeTeme = artikal.id.split('_')[1]; // "tema_tamna" -> "tamna"
                PodesavanjaManager.postavke.tema = imeTeme;
                PodesavanjaManager.snimiULokalnuMemoriju();
                PodesavanjaManager.azurirajDugmadTeme();
                document.body.setAttribute('data-tema', imeTeme);
            }
        }
        
        this.snimiStanje();
        if (!preskociOsvezavanje) {
            this.osveziPrikaz();
        }
    }
};

// Inicijalizacija pri učitavanju skripte
document.addEventListener('DOMContentLoaded', () => {
    RiznicaManager.init();
});