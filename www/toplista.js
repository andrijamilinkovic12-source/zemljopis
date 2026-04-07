// toplista.js - Upravljanje podacima i prikazom Top liste sa MongoDB integracijom

const TopListaManager = {
    // Podaci su sada prazni jer ih čekamo sa servera
    podaci: {
        prijatelji: { najboljiMec: [], nedeljni: [], mesecni: [], svaVremena: [] },
        multiplayer: { najboljiMec: [], nedeljni: [], mesecni: [], svaVremena: [] }
    },

    aktivnaGrupa: 'multiplayer', // Početni tab (Globalno)
    aktivnaKategorija: 'svaVremena', // Početna kategorija
    listenerPostavljen: false,

    init: function() {
        console.log("TopListaManager je učitan.");
    },

    // Prikazuje glavni ekran za top listu i povlači podatke iz baze
    otvoriEkran: function() {
        UIManager.prikaziEkran('toplista-screen');

        // --- TRAŽENJE NOVIH PODATAKA SA SERVERA ---
        if (typeof Game !== 'undefined' && Game.socket) {
            Game.socket.emit('traziTopListu');

            // Postavljamo osluškivač samo jednom
            if (!this.listenerPostavljen) {
                Game.socket.on('topListaOdgovor', (data) => {
                    
                    // Formatiranje podataka za "Sva Vremena"
                    let globalSvaVremena = data.svaVremena.map((igrac, index) => ({
                        mesto: index + 1,
                        ime: igrac.nadimak,
                        poeni: igrac.svaVremenaPojmovi
                    }));

                    // Formatiranje podataka za "Mesečno/Sezonski"
                    let globalSezona = data.sezona.map((igrac, index) => ({
                        mesto: index + 1,
                        ime: igrac.nadimak,
                        poeni: igrac.sezonskiPojmovi
                    }));

                    // Upisujemo sveže podatke iz baze u menadžer
                    this.podaci.multiplayer.svaVremena = globalSvaVremena;
                    this.podaci.multiplayer.mesecni = globalSezona;
                    this.podaci.multiplayer.nedeljni = globalSezona; // Za sada dele istu statistiku

                    // Osvežavamo prikaz ako je korisnik na ovom ekranu
                    if(document.getElementById('toplista-screen').classList.contains('active')) {
                        this.osveziPrikaz();
                    }
                });
                this.listenerPostavljen = true;
            }
        }

        this.promeniGrupu('multiplayer');
        this.promeniKategoriju('svaVremena');
    },

    promeniGrupu: function(novaGrupa) {
        this.aktivnaGrupa = novaGrupa;
        
        const tabPrijatelji = document.getElementById('tab-prijatelji');
        const tabMulti = document.getElementById('tab-multiplayer');

        if(tabPrijatelji && tabMulti) {
            tabPrijatelji.style.background = (novaGrupa === 'prijatelji') ? 'rgba(56,239,125,0.3)' : 'rgba(255,255,255,0.08)';
            tabPrijatelji.style.color = (novaGrupa === 'prijatelji') ? '#38ef7d' : '#fff';
            
            tabMulti.style.background = (novaGrupa === 'multiplayer') ? 'rgba(56,239,125,0.3)' : 'rgba(255,255,255,0.08)';
            tabMulti.style.color = (novaGrupa === 'multiplayer') ? '#38ef7d' : '#fff';
        }

        this.osveziPrikaz();
    },

    promeniKategoriju: function(novaKat) {
        this.aktivnaKategorija = novaKat;
        
        const kategorije = ['najboljiMec', 'nedeljni', 'mesecni', 'svaVremena'];
        kategorije.forEach(kat => {
            const btn = document.getElementById('subtab-' + kat);
            if (btn) {
                if (kat === novaKat) {
                    btn.style.background = 'rgba(56,239,125,0.2)';
                    btn.style.borderColor = '#38ef7d';
                    btn.style.color = '#38ef7d';
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
        const kontejner = document.getElementById('toplista-sadrzaj');
        const lista = this.podaci[this.aktivnaGrupa][this.aktivnaKategorija];

        // Čitamo koji je igračev pravi nadimak
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        if (!lista || lista.length === 0) {
            kontejner.innerHTML = '<div style="text-align:center; color:#a0aec0; margin-top:2rem;">Još uvek nema podataka. Odigraj partiju i upiši se prvi na listu!</div>';
            return;
        }

        let html = '';
        lista.forEach((igrac, index) => {
            let medalja = "";
            if (index === 0) medalja = "🥇";
            else if (index === 1) medalja = "🥈";
            else if (index === 2) medalja = "🥉";
            else medalja = `<span style="display:inline-block; width:24px; text-align:center; color:#a0aec0; font-size: 0.9rem;">${index + 1}.</span>`;

            // Ako si to ti, sistem prepoznaje tvoj nadimak i boji te u zeleno!
            let isMe = (igrac.ime === mojNadimak);
            let bojaIme = isMe ? "#38ef7d" : "#fff";
            let fontIme = isMe ? "800" : "600";
            let bgRed = isMe ? "rgba(56,239,125,0.05)" : "transparent";

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