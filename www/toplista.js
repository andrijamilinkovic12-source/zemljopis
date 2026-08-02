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
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,

    init: function() {
        console.log("TopListaManager je učitan.");
    },

    // Prikazuje glavni ekran za top listu i povlači podatke iz baze
    otvoriEkran: function() {
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        this.prikaziIntro(() => {
            this.otvoriSadrzaj();
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    otvoriSadrzaj: function() {
        UIManager.prikaziEkran('toplista-screen');

        // --- TRAŽENJE NOVIH PODATAKA SA SERVERA ---
        if (typeof Game !== 'undefined' && Game.socket) {
            // Postavljamo osluškivač samo jednom
            if (!this.listenerPostavljen) {
                Game.socket.on('topListaOdgovor', (data) => {
                    
                    const formatiraj = (niz = [], polje) => niz.map((igrac, index) => ({
                        mesto: index + 1,
                        playerId: igrac.playerId,
                        ime: igrac.nadimak,
                        avatar: igrac.avatar || 'atlas',
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

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('toplista-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--toplista-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            // Soba se priprema ispod završnog fade-a, bez vraćanja na glavni meni.
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('toplista-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('toplista-entering');
        void ekran.offsetWidth;
        ekran.classList.add('toplista-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('toplista-entering'), 720);
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

    prikaziMojPlasman: function(lista, mojPlayerId, mojNadimak) {
        const plasman = document.getElementById('toplista-moj-plasman');
        if (!plasman) return;

        const mojIndex = lista.findIndex(igrac => (
            (mojPlayerId && igrac.playerId === mojPlayerId)
            || (!igrac.playerId && igrac.ime === mojNadimak)
        ));
        const formatirajBroj = vrednost => new Intl.NumberFormat('sr-RS').format(vrednost);

        plasman.replaceChildren();
        plasman.hidden = false;
        plasman.classList.toggle('nije-na-listi', mojIndex === -1);

        const ikona = document.createElement('i');
        ikona.className = mojIndex === -1 ? 'fa-solid fa-chart-line' : 'fa-solid fa-ranking-star';
        ikona.setAttribute('aria-hidden', 'true');

        const sadrzaj = document.createElement('span');
        sadrzaj.className = 'toplista-moj-plasman-sadrzaj';
        const naslov = document.createElement('small');
        naslov.textContent = 'Tvoj plasman';
        sadrzaj.append(naslov);

        if (mojIndex === -1) {
            const poruka = document.createElement('strong');
            poruka.textContent = 'Još nemaš bodove na ovoj listi';
            sadrzaj.append(poruka);
        } else {
            const opis = document.createElement('strong');
            const mojiPoeni = Number.isFinite(Number(lista[mojIndex].poeni)) ? Number(lista[mojIndex].poeni) : 0;
            opis.textContent = `#${mojIndex + 1} od ${formatirajBroj(lista.length)} · ${formatirajBroj(mojiPoeni)} poena`;
            sadrzaj.append(opis);
        }

        plasman.append(ikona, sadrzaj);
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('toplista-sadrzaj');
        const lista = this.podaci[this.aktivnaGrupa][this.aktivnaKategorija];

        // Čitamo identitet lokalnog igrača da bi njegova kartica bila jasno označena.
        const mojePostavke = typeof PodesavanjaManager !== 'undefined'
            ? PodesavanjaManager.postavke
            : {};
        const mojPlayerId = mojePostavke.playerId;
        const mojNadimak = mojePostavke.nadimak || "Igrač";

        this.prikaziMojPlasman(lista || [], mojPlayerId, mojNadimak);

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

        const avatarHtml = (avatarId) => {
            if (typeof PodesavanjaManager === 'undefined') {
                return '<i class="fa-solid fa-user" aria-hidden="true"></i>';
            }

            const avatar = PodesavanjaManager.avatari.find(a => a.id === avatarId)
                || PodesavanjaManager.avatari.find(a => a.id === 'atlas')
                || PodesavanjaManager.avatari[0];
            return PodesavanjaManager.napraviAvatarSvg(avatar);
        };

        let html = '';
        lista.forEach((igrac, index) => {
            let medalja = "";
            if (index < medalje.length) {
                const medaljaPodaci = medalje[index];
                medalja = `<img class="toplista-medalja" src="${medaljaPodaci.src}" alt="${medaljaPodaci.alt}" decoding="async">`;
            }
            else medalja = `<span class="toplista-redni-broj">${index + 1}.</span>`;

            // Za stare zapise bez playerId-a zadržavamo prepoznavanje po nadimku.
            const isMe = (mojPlayerId && igrac.playerId === mojPlayerId)
                || (!igrac.playerId && igrac.ime === mojNadimak);
            const poeni = Number.isFinite(Number(igrac.poeni)) ? Number(igrac.poeni) : 0;
            html += `
                <article class="toplista-red${isMe ? ' ja' : ''}" style="--toplista-red-delay: ${Math.min(index, 10) * 55}ms;">
                    <span class="toplista-medalja-slot">${medalja}</span>
                    <span class="toplista-avatar" aria-hidden="true">${avatarHtml(igrac.avatar)}</span>
                    <div class="toplista-igrac-podaci">
                        <span class="toplista-pozicija">${index + 1}. mesto${isMe ? ' · Ti' : ''}</span>
                        <span class="toplista-igrac" data-zadrzi-izvorno-pismo="true">${escapeHtml(igrac.ime)}</span>
                    </div>
                    <span class="toplista-poeni" aria-label="${poeni} poena">
                        <b>${poeni}</b>
                        <span class="toplista-poeni-oznaka">poena</span>
                    </span>
                </article>
            `;
        });

        kontejner.innerHTML = html;
    }
};

TopListaManager.init();
