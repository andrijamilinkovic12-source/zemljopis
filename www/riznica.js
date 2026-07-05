// riznica.js - Upravljanje prodavnicom i dukatima

const RiznicaManager = {
    dukati: 500, // Početni poklon dukati za testiranje
    aktivnaKategorija: 'teme', // Defaultna je sada teme
    besplatanTestRezim: true,

    podaci: {
        teme: [
            { id: 'tema_tamna', naziv: 'Tamna (Standard)', cena: 0, kupljeno: true, opremljeno: true, ikona: 'fa-moon' },
            { id: 'tema_svetla', naziv: 'Svetla', cena: 0, kupljeno: true, opremljeno: false, ikona: 'fa-sun' },
            { id: 'tema_neon', naziv: 'Neon Cyber', cena: 1000, kupljeno: false, opremljeno: false, ikona: 'fa-bolt' },
            { id: 'tema_zlatna', naziv: 'Kraljevsko Zlato', cena: 2500, kupljeno: false, opremljeno: false, ikona: 'fa-crown' },
            { id: 'tema_okean', naziv: 'Reka', cena: 800, kupljeno: false, opremljeno: false, ikona: 'fa-water' },
            { id: 'tema_aurora', naziv: 'Aurora Prime', cena: 0, kupljeno: true, opremljeno: false, ikona: 'fa-star' },
            { id: 'tema_planina', naziv: 'Planina', cena: 900, kupljeno: false, opremljeno: false, ikona: 'fa-mountain' },
            { id: 'tema_sakura', naziv: 'Sakura san', cena: 1100, kupljeno: false, opremljeno: false, ikona: 'fa-seedling' },
            { id: 'tema_noir', naziv: 'Mono Noir', cena: 1400, kupljeno: false, opremljeno: false, ikona: 'fa-circle-half-stroke' },
            { id: 'tema_tropi', naziv: 'Tropski ritam', cena: 1200, kupljeno: false, opremljeno: false, ikona: 'fa-umbrella-beach' },
            { id: 'tema_glina', naziv: 'Clay Berry', cena: 0, kupljeno: true, opremljeno: false, ikona: 'fa-shapes' }
        ],
        efekti: [
            { id: 'ef_nista', naziv: 'Bez efekta', cena: 0, kupljeno: true, opremljeno: true, ikona: 'fa-ban' },
            { id: 'ef_konfete', naziv: 'Konfete pobede', cena: 300, kupljeno: false, opremljeno: false, ikona: 'fa-wand-magic-sparkles' },
            { id: 'ef_vatromet', naziv: 'Vatromet', cena: 800, kupljeno: false, opremljeno: false, ikona: 'fa-fire' },
            { id: 'ef_zvezdana_prasina', naziv: 'Zvezdana prašina', cena: 600, kupljeno: false, opremljeno: false, ikona: 'fa-star' },
            { id: 'ef_snezna_mecava', naziv: 'Snežna mećava', cena: 750, kupljeno: false, opremljeno: false, ikona: 'fa-snowflake' },
            { id: 'ef_munje', naziv: 'Električne munje', cena: 1000, kupljeno: false, opremljeno: false, ikona: 'fa-bolt' }
        ],
        tastature: [
            { id: 'tastatura_izvorna', naziv: 'Izvorna', cena: 0, kupljeno: true, opremljeno: true, skin: 'izvorna', boje: ['#12351f', '#38ef7d', '#11998e'] },
            { id: 'tastatura_zalazak', naziv: 'Zalazak', cena: 450, kupljeno: false, opremljeno: false, skin: 'zalazak', boje: ['#32182f', '#ff8a5c', '#ff3d81'] },
            { id: 'tastatura_led', naziv: 'Polarni led', cena: 700, kupljeno: false, opremljeno: false, skin: 'led', boje: ['#071d2d', '#7de3ff', '#2797d8'] },
            { id: 'tastatura_svemir', naziv: 'Duboki svemir', cena: 950, kupljeno: false, opremljeno: false, skin: 'svemir', boje: ['#110b2e', '#b77cff', '#5c3bdb'] },
            { id: 'tastatura_kraljevska', naziv: 'Kraljevska', cena: 1200, kupljeno: false, opremljeno: false, skin: 'kraljevska', boje: ['#211804', '#ffd76a', '#b7791f'] },
            { id: 'tastatura_mahovina', naziv: 'Šumska mahovina', cena: 550, kupljeno: false, opremljeno: false, skin: 'mahovina', boje: ['#101f15', '#8fd46b', '#3d7d45'] },
            { id: 'tastatura_lava', naziv: 'Živa lava', cena: 850, kupljeno: false, opremljeno: false, skin: 'lava', boje: ['#260a08', '#ff7849', '#d92b18'] },
            { id: 'tastatura_arkada', naziv: 'Retro arkada', cena: 1000, kupljeno: false, opremljeno: false, skin: 'arkada', boje: ['#071737', '#33e6ff', '#ffcc33'] },
            { id: 'tastatura_sakura', naziv: 'Sakura', cena: 750, kupljeno: false, opremljeno: false, skin: 'sakura', boje: ['#321b2a', '#ffb4d2', '#db5f98'] },
            { id: 'tastatura_monohrom', naziv: 'Monohrom', cena: 650, kupljeno: false, opremljeno: false, skin: 'monohrom', boje: ['#111315', '#f2f2f2', '#70757c'] }
        ]
    },

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_riznica');
        if (sacuvano) {
            const parsirano = JSON.parse(sacuvano);
            this.dukati = parsirano.dukati !== undefined ? parsirano.dukati : this.dukati;
            
            if (parsirano.podaci) {
                ['teme', 'efekti', 'tastature'].forEach(kat => {
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

        this.primeniSkinTastature();
    },

    normalizujDukate: function(vrednost, podrazumevano = this.dukati) {
        const broj = Number(vrednost);
        if (!Number.isFinite(broj)) return podrazumevano;
        return Math.max(0, Math.floor(broj));
    },

    imaLokalnoStanje: function() {
        return localStorage.getItem('zemljopis_riznica') !== null;
    },

    postaviPocetneDukateAkoNemaStanja: function(dukati) {
        if (this.imaLokalnoStanje()) {
            this.init();
            this.azurirajPrikazDukata();
            return false;
        }

        this.dukati = this.normalizujDukate(dukati, this.dukati);
        this.snimiStanje();
        return true;
    },

    snimiStanje: function() {
        this.dukati = this.normalizujDukate(this.dukati, 0);
        localStorage.setItem('zemljopis_riznica', JSON.stringify({
            dukati: this.dukati,
            podaci: this.podaci
        }));
        this.azurirajPrikazDukata();
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },

    jeOtkljucano: function(artikal) {
        return this.besplatanTestRezim || artikal.kupljeno;
    },

    vratiOpremljeniEfekat: function() {
        return this.podaci.efekti.find(efekat => efekat.opremljeno) || this.podaci.efekti[0];
    },

    vratiOpremljeniEfekatId: function() {
        const efekat = this.vratiOpremljeniEfekat();
        return efekat ? efekat.id : 'ef_nista';
    },

    vratiOpremljenuTastaturu: function() {
        return this.podaci.tastature.find(tastatura => tastatura.opremljeno) || this.podaci.tastature[0];
    },

    primeniSkinTastature: function() {
        const tastatura = this.vratiOpremljenuTastaturu();
        document.body.setAttribute('data-tastatura', tastatura ? tastatura.skin : 'izvorna');
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

        const tabovi = ['teme', 'efekti', 'tastature'];
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
        } else if (this.aktivnaKategorija === 'tastature') {
            html = this.generisiHTMLTastatura();
        }
        kontejner.innerHTML = html;
    },

    generisiHTMLTrgovine: function(kategorija) {
        let html = '<div class="riznica-grid">';
        
        this.podaci[kategorija].forEach(artikal => {
            let statusHtml = '';
            const otkljucano = this.jeOtkljucano(artikal);

            if (!otkljucano) {
                statusHtml = `<button class="menu-btn riznica-akcija riznica-kupi" onclick="RiznicaManager.kupiPredmet('${kategorija}', '${artikal.id}')"><i class="fa-solid fa-coins"></i> ${artikal.cena}</button>`;
            } else if (artikal.opremljeno) {
                statusHtml = '<div class="riznica-opremljeno"><i class="fa-solid fa-circle-check"></i> Opremljeno</div>';
            } else {
                statusHtml = `<button class="menu-btn riznica-akcija" onclick="RiznicaManager.opremiPredmet('${kategorija}', '${artikal.id}')">Opremi</button>`;
            }

            html += `
                <div class="riznica-kartica${artikal.opremljeno ? ' opremljena' : ''}${!otkljucano ? ' zakljucana' : ''}">
                    <div>
                        <i class="fa-solid ${artikal.ikona} riznica-artikal-ikona"></i>
                        <h4 class="riznica-artikal-naziv">${artikal.naziv}</h4>
                    </div>
                    ${statusHtml}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    },

    generisiHTMLTastatura: function() {
        let html = '<div class="tastature-grid">';

        this.podaci.tastature.forEach(artikal => {
            const otkljucano = this.jeOtkljucano(artikal);
            let statusHtml = '';

            if (!otkljucano) {
                statusHtml = `<button class="menu-btn tastatura-akcija kupi" onclick="RiznicaManager.kupiPredmet('tastature', '${artikal.id}')"><i class="fa-solid fa-coins"></i> ${artikal.cena}</button>`;
            } else if (artikal.opremljeno) {
                statusHtml = '<div class="tastatura-opremljena"><i class="fa-solid fa-circle-check"></i> Opremljeno</div>';
            } else {
                statusHtml = `<button class="menu-btn tastatura-akcija" onclick="RiznicaManager.opremiPredmet('tastature', '${artikal.id}')">Opremi</button>`;
            }

            const boje = artikal.boje;
            html += `
                <div class="tastatura-kartica${artikal.opremljeno ? ' opremljena' : ''}">
                    <div class="tastatura-preview" style="--kb-preview-bg:${boje[0]}; --kb-preview-key:${boje[1]}; --kb-preview-enter:${boje[2]};">
                        <div class="tastatura-preview-red"><span>Q</span><span>W</span><span>E</span><span>R</span><span>T</span><span>Š</span></div>
                        <div class="tastatura-preview-red uvucen"><span>A</span><span>S</span><span>D</span><span>F</span><span>G</span></div>
                        <div class="tastatura-preview-red donji"><span></span><span></span><span class="enter">OK</span></div>
                    </div>
                    <div class="tastatura-kartica-dno">
                        <h4>${artikal.naziv}</h4>
                        ${statusHtml}
                    </div>
                </div>`;
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
        let artikal = this.podaci[kategorija].find(p => p.id === predmetId);
        if (!artikal || !this.jeOtkljucano(artikal)) return;

        this.podaci[kategorija].forEach(p => p.opremljeno = false);
        artikal.opremljeno = true;
        
        // Tiha sinhronizacija sa Podešavanjima
        if (kategorija === 'teme' && typeof PodesavanjaManager !== 'undefined') {
            let imeTeme = artikal.id.split('_')[1];
            PodesavanjaManager.postavke.tema = imeTeme;
            PodesavanjaManager.snimiULokalnuMemoriju();
            PodesavanjaManager.azurirajDugmadTeme();
            document.body.setAttribute('data-tema', imeTeme);
        }

        if (kategorija === 'tastature') {
            this.primeniSkinTastature();
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
