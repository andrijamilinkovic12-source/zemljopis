// toplista.js - Upravljanje podacima i prikazom Top liste sa MongoDB integracijom

const TopListaManager = {
    // Podaci su sada prazni jer ih čekamo sa servera
    podaci: {
        globalno: { nedeljni: [], mesecni: [], svaVremena: [] },
        prijatelji: { nedeljni: [], mesecni: [], svaVremena: [] }
    },

    aktivnaGrupa: 'globalno',
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
            // Postavljamo osluškivač samo jednom
            if (!this.listenerPostavljen) {
                Game.socket.on('topListaOdgovor', (data) => {
                    
                    const formatiraj = (niz = [], polje) => niz.map((igrac, index) => ({
                        mesto: index + 1,
                        ime: igrac.nadimak,
                        poeni: igrac[polje]
                    }));

                    ['globalno', 'prijatelji'].forEach(grupa => {
                        const izvor = data[grupa] || {};
                        this.podaci[grupa].nedeljni = formatiraj(izvor.nedeljni, 'nedeljniPoeni');
                        this.podaci[grupa].mesecni = formatiraj(izvor.mesecni, 'mesecniPoeni');
                        this.podaci[grupa].svaVremena = formatiraj(izvor.svaVremena, 'svaVremenaPoeni');
                    });

                    // Osvežavamo prikaz ako je korisnik na ovom ekranu
                    if(document.getElementById('toplista-screen').classList.contains('active')) {
                        this.osveziPrikaz();
                    }
                });
                this.listenerPostavljen = true;
            }

            Game.socket.emit('traziTopListu');
        }

        this.promeniGrupu('globalno');
        this.promeniKategoriju('svaVremena');
    },

    promeniGrupu: function(novaGrupa) {
        this.aktivnaGrupa = novaGrupa;
        
        const tabPrijatelji = document.getElementById('tab-prijatelji');
        const tabGlobalno = document.getElementById('tab-globalno');

        if (tabPrijatelji) tabPrijatelji.classList.toggle('active', novaGrupa === 'prijatelji');
        if (tabGlobalno) tabGlobalno.classList.toggle('active', novaGrupa === 'globalno');

        this.osveziPrikaz();
    },

    promeniKategoriju: function(novaKat) {
        this.aktivnaKategorija = novaKat;
        
        const kategorije = ['nedeljni', 'mesecni', 'svaVremena'];
        kategorije.forEach(kat => {
            const btn = document.getElementById('subtab-' + kat);
            if (btn) btn.classList.toggle('active', kat === novaKat);
        });

        this.osveziPrikaz();
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('toplista-sadrzaj');
        const lista = this.podaci[this.aktivnaGrupa][this.aktivnaKategorija];

        // Čitamo koji je igračev pravi nadimak
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";

        if (!lista || lista.length === 0) {
            kontejner.innerHTML = '<div class="toplista-empty">Još uvek nema podataka. Odigraj partiju i upiši se prvi na listu!</div>';
            return;
        }

        const escapeHtml = vrednost => String(vrednost ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const medalje = [
            { src: 'assets/toplista-medalja-zlatna-clay-soft-3d.png', alt: 'Prvo mesto' },
            { src: 'assets/toplista-medalja-srebrna-clay-soft-3d.png', alt: 'Drugo mesto' },
            { src: 'assets/toplista-medalja-bronzana-clay-soft-3d.png', alt: 'Treće mesto' }
        ];

        let html = '';
        lista.forEach((igrac, index) => {
            let medalja = "";
            if (index < medalje.length) {
                const medaljaPodaci = medalje[index];
                medalja = `<img class="toplista-medalja" src="${medaljaPodaci.src}" alt="${medaljaPodaci.alt}" decoding="async">`;
            }
            else medalja = `<span class="toplista-redni-broj">${index + 1}.</span>`;

            // Ako si to ti, sistem prepoznaje tvoj nadimak i boji te u zeleno!
            let isMe = (igrac.ime === mojNadimak);
            html += `
                <div class="toplista-red${isMe ? ' ja' : ''}">
                    <div class="toplista-red-levo">
                        <span class="toplista-medalja-slot">${medalja}</span>
                        <span class="toplista-igrac">${escapeHtml(igrac.ime)}</span>
                    </div>
                    <span class="toplista-poeni">
                        ${igrac.poeni} <span class="toplista-poeni-oznaka">pts</span>
                    </span>
                </div>
            `;
        });

        kontejner.innerHTML = html;
    }
};

TopListaManager.init();
