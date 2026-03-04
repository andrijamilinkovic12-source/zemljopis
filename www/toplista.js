// toplista.js - Upravljanje podacima i prikazom Top liste (Leaderboard)

const TopListaManager = {
    // Simulirana baza podataka 
    podaci: {
        prijatelji: {
            najboljiMec: [
                { mesto: 1, ime: "Jovan", poeni: 340 },
                { mesto: 2, ime: "Ti", poeni: 310 },
                { mesto: 3, ime: "Ana", poeni: 280 },
                { mesto: 4, ime: "Marko", poeni: 150 }
            ],
            nedeljni: [
                { mesto: 1, ime: "Ana", poeni: 1540 },
                { mesto: 2, ime: "Jovan", poeni: 1420 },
                { mesto: 3, ime: "Ti", poeni: 850 }
            ],
            mesecni: [
                { mesto: 1, ime: "Jovan", poeni: 6200 },
                { mesto: 2, ime: "Ti", poeni: 5100 },
                { mesto: 3, ime: "Ana", poeni: 4800 }
            ],
            svaVremena: [
                { mesto: 1, ime: "Ti", poeni: 24500 },
                { mesto: 2, ime: "Jovan", poeni: 21200 },
                { mesto: 3, ime: "Ana", poeni: 18900 }
            ]
        },
        multiplayer: {
            najboljiMec: [
                { mesto: 1, ime: "Geograf99", poeni: 400 },
                { mesto: 2, ime: "Znalac", poeni: 385 },
                { mesto: 3, ime: "Ti", poeni: 360 },
                { mesto: 4, ime: "BrziPrsti", poeni: 340 },
                { mesto: 5, ime: "Srbija_Brate", poeni: 335 }
            ],
            nedeljni: [
                { mesto: 1, ime: "Znalac", poeni: 4500 },
                { mesto: 2, ime: "Kvizoman", poeni: 4100 },
                { mesto: 3, ime: "Geograf99", poeni: 3900 }
            ],
            mesecni: [
                { mesto: 1, ime: "Geograf99", poeni: 18500 },
                { mesto: 2, ime: "Znalac", poeni: 17200 },
                { mesto: 3, ime: "Sveznalica", poeni: 15000 }
            ],
            svaVremena: [
                { mesto: 1, ime: "Zemljopis_Master", poeni: 150400 },
                { mesto: 2, ime: "Geograf99", poeni: 142000 },
                { mesto: 3, ime: "Znalac", poeni: 138500 }
            ]
        }
    },

    aktivnaGrupa: 'prijatelji', 
    aktivnaKategorija: 'najboljiMec', 

    init: function() {
        console.log("TopListaManager je učitan.");
    },

    // Prikazuje glavni ekran za top listu
    otvoriEkran: function() {
        UIManager.prikaziEkran('toplista-screen');
        // Resetujemo na "Prijatelji" i "Najbolji meč" pri svakom ulasku
        this.promeniGrupu('prijatelji'); 
    },

    promeniGrupu: function(novaGrupa) {
        this.aktivnaGrupa = novaGrupa;
        
        // Menjamo boju dugmića da se vidi šta je selektovano
        document.getElementById('tab-prijatelji').style.background = (novaGrupa === 'prijatelji') ? 'rgba(56,239,125,0.3)' : 'rgba(255,255,255,0.08)';
        document.getElementById('tab-prijatelji').style.color = (novaGrupa === 'prijatelji') ? '#38ef7d' : '#fff';
        
        document.getElementById('tab-multiplayer').style.background = (novaGrupa === 'multiplayer') ? 'rgba(56,239,125,0.3)' : 'rgba(255,255,255,0.08)';
        document.getElementById('tab-multiplayer').style.color = (novaGrupa === 'multiplayer') ? '#38ef7d' : '#fff';

        this.promeniKategoriju('najboljiMec'); // Resetujemo na prvu potkategoriju
    },

    promeniKategoriju: function(novaKat) {
        this.aktivnaKategorija = novaKat;
        
        // Menjamo boje manjih tabova
        const kategorije = ['najboljiMec', 'nedeljni', 'mesecni', 'svaVremena'];
        kategorije.forEach(kat => {
            const btn = document.getElementById('subtab-' + kat);
            if (kat === novaKat) {
                btn.style.background = 'rgba(56,239,125,0.2)';
                btn.style.borderColor = '#38ef7d';
                btn.style.color = '#38ef7d';
            } else {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'transparent';
                btn.style.color = '#a0aec0';
            }
        });

        this.osveziPrikaz();
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('toplista-sadrzaj');
        const lista = this.podaci[this.aktivnaGrupa][this.aktivnaKategorija];

        if (!lista || lista.length === 0) {
            kontejner.innerHTML = '<div style="text-align:center; color:#a0aec0; margin-top:2rem;">Nema podataka za ovu kategoriju.</div>';
            return;
        }

        let html = '';
        lista.forEach((igrac, index) => {
            let medalja = "";
            if (index === 0) medalja = "🥇";
            else if (index === 1) medalja = "🥈";
            else if (index === 2) medalja = "🥉";
            else medalja = `<span style="display:inline-block; width:24px; text-align:center; color:#a0aec0; font-size: 0.9rem;">${index + 1}.</span>`;

            // Ako si to ti, ističemo zeleno
            let bojaIme = igrac.ime === "Ti" ? "#38ef7d" : "#fff";
            let fontIme = igrac.ime === "Ti" ? "800" : "600";
            let bgRed = igrac.ime === "Ti" ? "rgba(56,239,125,0.05)" : "transparent";

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${bgRed}; border-radius: 8px;">
                    <div style="display: flex; gap: 0.8rem; align-items: center;">
                        <span style="font-size: 1.2rem;">${medalja}</span>
                        <span style="color: ${bojaIme}; font-weight: ${fontIme}; font-size: 0.95rem;">${igrac.ime}</span>
                    </div>
                    <span style="color: #f5af19; font-weight: 800; font-size: 0.95rem;">
                        ${igrac.poeni} <span style="font-size:0.7rem; color:#a0aec0; font-weight:600;">pts</span>
                    </span>
                </div>
            `;
        });

        kontejner.innerHTML = html;
    }
};

TopListaManager.init();