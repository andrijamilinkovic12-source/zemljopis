// riznica.js - Upravljanje prodavnicom i dukatima

const RiznicaManager = {
    dukati: 500, // Početni poklon dukati za testiranje
    aktivnaKategorija: 'teme', // Defaultna je sada teme

    podaci: {
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
        vauceri: [] 
    },

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_riznica');
        if (sacuvano) {
            const parsirano = JSON.parse(sacuvano);
            this.dukati = parsirano.dukati !== undefined ? parsirano.dukati : this.dukati;
            
            if (parsirano.podaci) {
                ['teme', 'efekti'].forEach(kat => {
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
        this.promeniKategoriju('teme'); 
    },

    azurirajPrikazDukata: function() {
        const el = document.getElementById('riznica-dukati-stanje');
        if (el) el.innerText = this.dukati;
        const meniDukati = document.getElementById('meni-dukati');
        if (meniDukati) meniDukati.innerText = this.dukati;
    },

    promeniKategoriju: function(novaKategorija) {
        this.aktivnaKategorija = novaKategorija;

        const tabovi = ['teme', 'efekti', 'vauceri'];
        tabovi.forEach(tab => {
            const btn = document.getElementById('tab-' + tab);
            if (btn) {
                if (tab === novaKategorija) {
                    btn.style.background = 'rgba(245, 175, 25, 0.2)'; 
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

        if (this.aktivnaKategorija === 'teme' || this.aktivnaKategorija === 'efekti') {
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
        this.podaci[kategorija].forEach(p => p.opremljeno = false);
        
        let artikal = this.podaci[kategorija].find(p => p.id === predmetId);
        if (artikal) {
            artikal.opremljeno = true;
            
            // Tiha sinhronizacija sa Podešavanjima
            if (kategorija === 'teme' && typeof PodesavanjaManager !== 'undefined') {
                let imeTeme = artikal.id.split('_')[1]; 
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

document.addEventListener('DOMContentLoaded', () => {
    RiznicaManager.init();
});