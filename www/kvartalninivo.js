// kvartalninivo.js - Liga takmičenje i Dvorana Slavnih

const KvartalniNivoManager = {
    // Tvoja lična statistika (čuva se lokalno dok ne povežeš bazu)
    statistika: {
        sezonskiPojmovi: 0,
        svaVremenaPojmovi: 0
    },

    nivoi: [
        { id: 0, ime: "Istraživač", min: 0, max: 999, ikona: "fa-compass", boja: "#a0aec0" },
        { id: 1, ime: "Bronza", min: 1000, max: 2499, ikona: "fa-medal", boja: "#cd7f32" },
        { id: 2, ime: "Srebro", min: 2500, max: 4999, ikona: "fa-trophy", boja: "#c0c0c0" },
        { id: 3, ime: "Zlato", min: 5000, max: 8999, ikona: "fa-crown", boja: "#f5af19" },
        { id: 4, ime: "Legenda", min: 9000, max: Infinity, ikona: "fa-gem", boja: "#38bdf8" }
    ],

    // UI Stanje
    aktivniTab: 'sezona', // 'sezona', 'svaVremena', 'slavni'
    aktivniNivoTab: 0,    // 0-4 indeks nivoa
    aktivniSlavniTab: 'medalje', // 'medalje', 'sampioni'

    // --- LAŽNI PODACI (MOCK) ZA PRIKAZ DIZAJNA ---
    // Kada povežeš bazu, ovo ćeš vući preko socket-a ili fetch API-ja
    mockPodaci: {
        sezona: [
            // Nivo 0
            [ { ime: "Marko", avatar: "fa-user-ninja", pojmovi: 850 }, { ime: "Ana", avatar: "fa-user-astronaut", pojmovi: 720 }, { ime: "Jovan", avatar: "fa-user-tie", pojmovi: 150 } ],
            // Nivo 1
            [ { ime: "Zika", avatar: "fa-user-secret", pojmovi: 2400 }, { ime: "Pera", avatar: "fa-user-graduate", pojmovi: 1800 } ],
            // Nivo 2
            [ { ime: "Mika", avatar: "fa-user-shield", pojmovi: 4800 }, { ime: "Laza", avatar: "fa-user-astronaut", pojmovi: 3100 } ],
            // Nivo 3
            [ { ime: "Nemanja", avatar: "fa-user-ninja", pojmovi: 8500 }, { ime: "Sara", avatar: "fa-user-tie", pojmovi: 6200 } ],
            // Nivo 4
            [ { ime: "Kralj_Igre", avatar: "fa-crown", pojmovi: 12450 }, { ime: "Geograf", avatar: "fa-earth-europe", pojmovi: 10100 } ]
        ],
        svaVremena: [
            { ime: "Kralj_Igre", avatar: "fa-crown", pojmovi: 45200 },
            { ime: "Nemanja", avatar: "fa-user-ninja", pojmovi: 38150 },
            { ime: "Geograf", avatar: "fa-earth-europe", pojmovi: 35000 },
            { ime: "Mika", avatar: "fa-user-shield", pojmovi: 29000 },
            { ime: "Zika", avatar: "fa-user-secret", pojmovi: 15000 }
        ],
        medalje: [
            { ime: "Kralj_Igre", avatar: "fa-crown", zlato: 4, srebro: 1, bronza: 0 },
            { ime: "Nemanja", avatar: "fa-user-ninja", zlato: 2, srebro: 3, bronza: 1 },
            { ime: "Geograf", avatar: "fa-earth-europe", zlato: 1, srebro: 2, bronza: 4 },
            { ime: "Ana", avatar: "fa-user-astronaut", zlato: 0, srebro: 1, bronza: 2 }
        ],
        sampioni: [
            { ciklus: "I Ciklus (2024)", ime: "Nemanja", avatar: "fa-user-ninja", poeni: 12500 },
            { ciklus: "II Ciklus (2024)", ime: "Kralj_Igre", avatar: "fa-crown", poeni: 14200 },
            { ciklus: "III Ciklus (2024)", ime: "Geograf", avatar: "fa-earth-europe", poeni: 13800 },
            { ciklus: "I Ciklus (2025)", ime: "Kralj_Igre", avatar: "fa-crown", poeni: 15100 }
        ]
    },

    init: function() {
        let sacuvano = localStorage.getItem('zemljopis_kvartal');
        if (sacuvano) {
            this.statistika = JSON.parse(sacuvano);
        }
        this.azurirajBedzUMeniju();
    },

    dodajPojmove: function(broj) {
        this.statistika.sezonskiPojmovi += broj;
        this.statistika.svaVremenaPojmovi += broj;
        localStorage.setItem('zemljopis_kvartal', JSON.stringify(this.statistika));
        this.azurirajBedzUMeniju();
    },

    odrediTrenutniNivo: function() {
        let pojmovi = this.statistika.sezonskiPojmovi;
        let trenutni = this.nivoi[0];
        let sledeci = this.nivoi[1];
        let nivoIndex = 1;

        for (let i = 0; i < this.nivoi.length; i++) {
            if (pojmovi >= this.nivoi[i].min && pojmovi <= (this.nivoi[i].max || Infinity)) {
                trenutni = this.nivoi[i];
                sledeci = this.nivoi[i + 1] || null;
                nivoIndex = i + 1;
                break;
            }
        }
        return { trenutni, sledeci, nivoIndex };
    },

    azurirajBedzUMeniju: function() {
        const info = this.odrediTrenutniNivo();
        const span = document.querySelector('.rank-btn span');
        const btn = document.querySelector('.rank-btn');
        if (span) span.innerText = info.nivoIndex;
        if (btn) {
            btn.style.borderColor = info.trenutni.boja;
            btn.style.color = info.trenutni.boja;
            btn.style.boxShadow = `0 0 20px ${info.trenutni.boja}40`;
            const label = btn.querySelector('.rank-label');
            if (label) {
                label.style.background = info.trenutni.boja;
                label.style.color = (info.nivoIndex === 1 || info.nivoIndex === 5) ? '#fff' : '#000';
            }
        }
    },

    otvoriEkran: function() {
        // Resetuj na početne tabove pri ulasku
        this.aktivniTab = 'sezona';
        const info = this.odrediTrenutniNivo();
        this.aktivniNivoTab = info.trenutni.id; // Automatski fokusira nivo na kom si trenutno
        
        this.renderEkran();
        UIManager.prikaziEkran('kvartalni-nivo-screen');
    },

    // --- LOGIKA ZA MENJANJE TABOVA ---
    promeniTab: function(tab) {
        this.aktivniTab = tab;
        this.renderEkran();
    },
    promeniNivoTab: function(nivoId) {
        this.aktivniNivoTab = nivoId;
        this.renderEkran();
    },
    promeniSlavniTab: function(tab) {
        this.aktivniSlavniTab = tab;
        this.renderEkran();
    },

    // --- GLAVNI RENDER EKRANA ---
    renderEkran: function() {
        const sadrzaj = document.getElementById('kvartalni-nivo-sadrzaj');
        
        // Render Glavnih Tabova
        let html = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                <button class="menu-btn" style="margin: 0; padding: 0.6rem; font-size: 0.8rem; flex: 1; transition: all 0.2s; ${this.aktivniTab === 'sezona' ? 'background: rgba(245, 175, 25, 0.2); border: 1px solid #f5af19; color: #f5af19;' : 'background: rgba(0,0,0,0.5);'}" onclick="KvartalniNivoManager.promeniTab('sezona')">Liga</button>
                <button class="menu-btn" style="margin: 0; padding: 0.6rem; font-size: 0.8rem; flex: 1; transition: all 0.2s; ${this.aktivniTab === 'svaVremena' ? 'background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8;' : 'background: rgba(0,0,0,0.5);'}" onclick="KvartalniNivoManager.promeniTab('svaVremena')">Sva Vremena</button>
                <button class="menu-btn" style="margin: 0; padding: 0.6rem; font-size: 0.8rem; flex: 1; transition: all 0.2s; ${this.aktivniTab === 'slavni' ? 'background: rgba(177, 34, 229, 0.2); border: 1px solid #b122e5; color: #b122e5;' : 'background: rgba(0,0,0,0.5);'}" onclick="KvartalniNivoManager.promeniTab('slavni')">Slavni</button>
            </div>
        `;

        if (this.aktivniTab === 'sezona') {
            html += this.renderSezonaHTML();
        } else if (this.aktivniTab === 'svaVremena') {
            html += this.renderSvaVremenaHTML();
        } else if (this.aktivniTab === 'slavni') {
            html += this.renderSlavniHTML();
        }

        sadrzaj.innerHTML = html;
    },

    // --- POD-RENDERERI ---

    renderSezonaHTML: function() {
        const info = this.odrediTrenutniNivo();
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Ti";
        
        // Prikaz tvog ličnog statusa na vrhu
        let html = `
            <div style="background: rgba(0,0,0,0.4); border: 1px solid ${info.trenutni.boja}40; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <span style="font-size: 0.7rem; color: #a0aec0; text-transform: uppercase;">Tvoj Trenutni Nivo</span><br>
                    <span style="font-size: 1.1rem; color: ${info.trenutni.boja}; font-weight: 800;">${info.trenutni.ime}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 1.2rem; color: #fff; font-weight: 800;">${this.statistika.sezonskiPojmovi} <i class="fa-solid fa-check-double" style="font-size: 0.9rem; color: #38ef7d;"></i></span>
                </div>
            </div>
        `;

        // Tabovi za biranje Nivoa Top Liste
        html += `<div style="display: flex; justify-content: space-between; gap: 0.3rem; margin-bottom: 1rem;">`;
        this.nivoi.forEach(nivo => {
            let aktivan = this.aktivniNivoTab === nivo.id;
            html += `
                <div onclick="KvartalniNivoManager.promeniNivoTab(${nivo.id})" style="flex: 1; text-align: center; cursor: pointer; padding: 0.5rem 0; border-radius: 8px; background: ${aktivan ? nivo.boja+'20' : 'rgba(0,0,0,0.4)'}; border: 1px solid ${aktivan ? nivo.boja : 'rgba(255,255,255,0.1)'}; transition: all 0.2s;">
                    <i class="fa-solid ${nivo.ikona}" style="color: ${nivo.boja}; font-size: ${aktivan ? '1.4rem' : '1.1rem'}; text-shadow: ${aktivan ? '0 0 10px '+nivo.boja : 'none'};"></i>
                </div>
            `;
        });
        html += `</div>`;

        // Sama Top Lista za izabrani Nivo
        let izabraniNivo = this.nivoi[this.aktivniNivoTab];
        let listaIgraca = this.mockPodaci.sezona[this.aktivniNivoTab];

        html += `<div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 0.5rem;">`;
        html += `<h4 style="text-align: center; color: ${izabraniNivo.boja}; margin: 0.5rem 0; font-size: 0.9rem; text-transform: uppercase;">Top lista: ${izabraniNivo.ime}</h4>`;
        
        listaIgraca.forEach((igrac, index) => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); margin-bottom: 0.3rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <b style="color: #a0aec0; width: 20px;">${index + 1}.</b>
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.5); border: 1px solid ${izabraniNivo.boja}; display: flex; justify-content: center; align-items: center; color: ${izabraniNivo.boja}; font-size: 1.1rem;">
                            <i class="fa-solid ${igrac.avatar}"></i>
                        </div>
                        <span style="color: #fff; font-weight: 600; font-size: 0.95rem;">${igrac.ime}</span>
                    </div>
                    <span style="color: #38ef7d; font-weight: 800;">${igrac.pojmovi}</span>
                </div>
            `;
        });
        html += `</div>`;

        return html;
    },

    renderSvaVremenaHTML: function() {
        let html = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <i class="fa-solid fa-infinity" style="font-size: 3rem; color: #38bdf8; filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.5)); margin-bottom: 0.5rem;"></i>
                <h3 style="color: #38bdf8; font-size: 1.2rem; text-transform: uppercase;">Apsolutni Vladari</h3>
                <p style="font-size: 0.75rem; color: #a0aec0;">Najviše pogođenih pojmova u istoriji igre.</p>
            </div>
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 0.5rem;">
        `;

        this.mockPodaci.svaVremena.forEach((igrac, index) => {
            let kruna = "";
            if (index === 0) kruna = `<i class="fa-solid fa-crown" style="color: #ffd700; position: absolute; top: -8px; right: -5px; font-size: 0.8rem; transform: rotate(15deg);"></i>`;
            
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${index===0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)'}; margin-bottom: 0.3rem; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <b style="color: ${index < 3 ? '#38bdf8' : '#a0aec0'}; width: 20px;">${index + 1}.</b>
                        <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); border: 2px solid ${index < 3 ? '#38bdf8' : '#cbd5e0'}; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 1.2rem;">
                            <i class="fa-solid ${igrac.avatar}"></i>
                            ${kruna}
                        </div>
                        <span style="color: #fff; font-weight: 600; font-size: 1rem;">${igrac.ime}</span>
                    </div>
                    <span style="color: #38bdf8; font-weight: 800;">${igrac.pojmovi}</span>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    },

    renderSlavniHTML: function() {
        let html = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <button class="menu-btn" style="margin: 0; padding: 0.5rem; font-size: 0.8rem; flex: 1; border-radius: 8px; transition: all 0.2s; ${this.aktivniSlavniTab === 'medalje' ? 'background: rgba(177, 34, 229, 0.3); border: 1px solid #b122e5; color: #fff;' : 'background: rgba(255,255,255,0.05);'}" onclick="KvartalniNivoManager.promeniSlavniTab('medalje')">🏅 Kolekcija Medalja</button>
                <button class="menu-btn" style="margin: 0; padding: 0.5rem; font-size: 0.8rem; flex: 1; border-radius: 8px; transition: all 0.2s; ${this.aktivniSlavniTab === 'sampioni' ? 'background: rgba(177, 34, 229, 0.3); border: 1px solid #b122e5; color: #fff;' : 'background: rgba(255,255,255,0.05);'}" onclick="KvartalniNivoManager.promeniSlavniTab('sampioni')">🏆 Šampioni Ciklusa</button>
            </div>
        `;

        if (this.aktivniSlavniTab === 'medalje') {
            html += `<p style="text-align: center; font-size: 0.75rem; color: #a0aec0; margin-bottom: 1rem;">Igrači koji su završili u TOP 3 u bilo kom kvartalnom ciklusu.</p>`;
            this.mockPodaci.medalje.forEach((igrac, index) => {
                html += `
                    <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.4); border: 1px solid rgba(177, 34, 229, 0.2); border-radius: 12px; padding: 0.8rem; margin-bottom: 0.8rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                            <b style="color: #b122e5;">${index + 1}.</b>
                            <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(177, 34, 229, 0.1); border: 2px solid #b122e5; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 1.4rem;">
                                <i class="fa-solid ${igrac.avatar}"></i>
                            </div>
                            <span style="color: #fff; font-weight: 800; font-size: 1.1rem; flex: 1;">${igrac.ime}</span>
                        </div>
                        <div style="display: flex; justify-content: space-around; background: rgba(255,255,255,0.02); padding: 0.5rem; border-radius: 8px;">
                            <div style="text-align: center;"><i class="fa-solid fa-medal" style="color: #ffd700; font-size: 1.5rem; filter: drop-shadow(0 0 5px rgba(255,215,0,0.5));"></i><br><b style="font-size: 1.1rem;">${igrac.zlato}</b></div>
                            <div style="text-align: center;"><i class="fa-solid fa-medal" style="color: #c0c0c0; font-size: 1.5rem; filter: drop-shadow(0 0 5px rgba(192,192,192,0.5));"></i><br><b style="font-size: 1.1rem;">${igrac.srebro}</b></div>
                            <div style="text-align: center;"><i class="fa-solid fa-medal" style="color: #cd7f32; font-size: 1.5rem; filter: drop-shadow(0 0 5px rgba(205,127,50,0.5));"></i><br><b style="font-size: 1.1rem;">${igrac.bronza}</b></div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p style="text-align: center; font-size: 0.75rem; color: #a0aec0; margin-bottom: 1rem;">Osvajači prvog mesta na kraju svakog ciklusa lige.</p>`;
            this.mockPodaci.sampioni.forEach(igrac => {
                html += `
                    <div style="display: flex; align-items: center; background: linear-gradient(135deg, rgba(177, 34, 229, 0.15), rgba(0,0,0,0.5)); border: 1px solid rgba(177, 34, 229, 0.4); border-radius: 12px; padding: 1rem; margin-bottom: 0.8rem; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                        <div style="margin-right: 1rem; text-align: center;">
                            <i class="fa-solid fa-trophy" style="color: #ffd700; font-size: 2rem; filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); margin-bottom: 5px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 0.7rem; color: #b122e5; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px;">${igrac.ciklus}</div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fa-solid ${igrac.avatar}" style="color: #fff;"></i>
                                <span style="color: #fff; font-weight: 800; font-size: 1.2rem;">${igrac.ime}</span>
                            </div>
                            <div style="font-size: 0.8rem; color: #38ef7d; margin-top: 3px;"><b>${igrac.poeni}</b> pojmova ukupno</div>
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }
};

// Inicijalizuj po učitavanju
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { KvartalniNivoManager.init(); }, 500);
});