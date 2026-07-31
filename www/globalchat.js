// globalchat.js - Menadžer za bezbedni Globalni Chat

const GlobalChatManager = {
    introTrajanjeMs: 640,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,
    slanjeUToku: false,
    status: null,
    poruke: [],
    utisaniPlayerIds: new Set(),

    init: function() {
        this.ucitajUtisaneIgrace();
        const input = document.getElementById('chat-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.posaljiPoruku();
                }
            });
            input.addEventListener('input', () => this.azurirajBrojacZnakova());
        }
        this.azurirajBrojacZnakova();
        this.azurirajStanjePisanja();
    },

    poveziSokete: function(socket) {
        if (!socket) return;

        socket.off('istorijaChata');
        socket.off('novaGlobalnaPoruka');
        socket.off('chatStatusAzuriran');

        socket.on('istorijaChata', (poruke) => {
            this.poruke = Array.isArray(poruke) ? poruke : [];
            this.prikaziSvePoruke();
        });

        socket.on('novaGlobalnaPoruka', (poruka) => {
            if (!poruka || !poruka.id || !poruka.playerId) return;
            if (!this.poruke.some(postojeca => postojeca.id === poruka.id)) {
                this.poruke.push(poruka);
                this.poruke = this.poruke.slice(-50);
            }
            if (!this.jeIgracUtisan(poruka.playerId)) this.prikaziPorukuUUI(poruka);
        });

        socket.on('chatStatusAzuriran', (status) => {
            this.status = status || null;
            this.azurirajStanjePisanja();
            if (status && (status.banovan || status.umutan) && this.jeChatOtvoren()) {
                UIManager.prikaziObavestenje('Globalni chat', status.poruka || 'Slanje poruka je trenutno onemogućeno.', null, 'U redu');
            }
        });
    },

    proveriIPrikazi: function() {
        if (!Game.socket || !Game.socket.connected) {
            UIManager.prikaziObavestenje('Nema konekcije', 'Povezivanje na server je u toku, molim te sačekaj par sekundi...', null, 'Zatvori');
            return;
        }

        Game.socket.timeout(8000).emit('traziChatStatus', (greska, odgovor) => {
            if (greska || !odgovor || !odgovor.uspeh) {
                UIManager.prikaziObavestenje('Globalni chat', odgovor?.poruka || 'Sačekaj da se tvoj profil prijavi, pa pokušaj ponovo.', null, 'U redu');
                return;
            }

            this.status = odgovor.status || null;
            this.azurirajStanjePisanja();
            if (this.status?.banovan || this.status?.umutan) {
                UIManager.prikaziObavestenje('Globalni chat', this.status.poruka || 'Slanje poruka je trenutno onemogućeno.', null, 'U redu');
                return;
            }
            if (this.status?.pravilaPrihvacena) {
                this.otvoriChat();
            } else {
                const modal = document.getElementById('chat-rules-modal');
                if (modal) modal.classList.add('active');
            }
        });
    },

    prihvatiPravila: function() {
        if (!Game.socket || !Game.socket.connected) return;
        Game.socket.timeout(8000).emit('prihvatiChatPravila', (greska, odgovor) => {
            if (greska || !odgovor || !odgovor.uspeh) {
                UIManager.prikaziObavestenje('Pravila chata', odgovor?.poruka || 'Pravila trenutno nije moguće sačuvati.', null, 'U redu');
                return;
            }
            this.status = odgovor.status || null;
            this.azurirajStanjePisanja();
            const modal = document.getElementById('chat-rules-modal');
            if (modal) modal.classList.remove('active');
            this.otvoriChat();
        });
    },

    otvoriChat: function() {
        if (this.otvaranjeUToku || !Game.socket || !Game.socket.connected) return;
        this.otvaranjeUToku = true;

        if (typeof KeyboardManager !== 'undefined') KeyboardManager.hideKeyboard();

        Game.socket.timeout(8000).emit('traziIstorijuChata', (greska, odgovor) => {
            if (!greska && odgovor?.status) {
                this.status = odgovor.status;
                this.azurirajStanjePisanja();
            }
            if (greska || !odgovor?.uspeh) {
                this.otvaranjeUToku = false;
                UIManager.prikaziObavestenje('Globalni chat', odgovor?.poruka || 'Istoriju poruka trenutno nije moguće učitati.', null, 'U redu');
                return;
            }
            this.prikaziIntro(() => {
                UIManager.prikaziEkran('global-chat-screen');
                this.pokreniBlagiUlazakUSobu();
                this.azurirajStanjePisanja();
                requestAnimationFrame(() => this.azurirajBrojacZnakova());
                this.otvaranjeUToku = false;
            });
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('global-chat-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 120 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 80 : Math.min(220, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--global-chat-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('global-chat-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('global-chat-entering');
        void ekran.offsetWidth;
        ekran.classList.add('global-chat-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('global-chat-entering'), 720);
    },

    posaljiPoruku: function() {
        const input = document.getElementById('chat-input');
        if (!input || this.slanjeUToku || this.status?.banovan || this.status?.umutan) return;

        const tekst = input.value.trim();
        if (!tekst || !Game.socket || !Game.socket.connected) return;

        this.slanjeUToku = true;
        this.azurirajStanjePisanja();
        Game.socket.timeout(8000).emit('posaljiGlobalnuPoruku', { tekst }, (greska, odgovor) => {
            this.slanjeUToku = false;
            this.azurirajStanjePisanja();
            if (greska || !odgovor || !odgovor.uspeh) {
                UIManager.prikaziObavestenje('Poruka nije poslata', odgovor?.poruka || 'Pokušaj ponovo malo kasnije.', null, 'U redu');
                return;
            }
            input.value = '';
            this.azurirajBrojacZnakova();
            input.focus();
        });
    },

    prikaziSvePoruke: function() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.setAttribute('aria-live', 'off');
        container.replaceChildren();
        const vidljivePoruke = this.poruke.filter(poruka => !this.jeIgracUtisan(poruka.playerId));
        if (vidljivePoruke.length === 0) {
            const prazno = document.createElement('p');
            prazno.className = 'global-chat-empty';
            prazno.textContent = this.poruke.length
                ? 'Sve dostupne poruke su utišane.'
                : 'Još uvek nema poruka. Započni razgovor!';
            container.appendChild(prazno);
        } else {
            vidljivePoruke.forEach(poruka => this.prikaziPorukuUUI(poruka, { bezSkrola: true }));
        }
        container.setAttribute('aria-live', 'polite');
        this.skrolujDole();
    },

    prikaziPorukuUUI: function(poruka, opcije = {}) {
        const container = document.getElementById('chat-messages');
        if (!container || !poruka || this.jeIgracUtisan(poruka.playerId)) return;

        const praznoStanje = container.querySelector('.global-chat-empty');
        if (praznoStanje) praznoStanje.remove();

        const pratiDno = container.scrollHeight - container.scrollTop - container.clientHeight < 44;
        const jeMoja = poruka.playerId === this.mojPlayerId();
        const porukaEl = document.createElement('article');
        porukaEl.className = `chat-msg ${jeMoja ? 'mojna' : 'tudja'}`;
        porukaEl.dataset.messageId = poruka.id;
        porukaEl.dataset.playerId = poruka.playerId;

        const zaglavlje = document.createElement('div');
        zaglavlje.className = 'chat-msg-header';
        const ime = document.createElement('span');
        ime.className = 'chat-ime';
        ime.textContent = poruka.ime || 'Igrač';
        zaglavlje.appendChild(ime);
        if (jeMoja) {
            const mojaOznaka = document.createElement('span');
            mojaOznaka.className = 'chat-self-label';
            mojaOznaka.textContent = '(TI)';
            zaglavlje.appendChild(mojaOznaka);
        }
        porukaEl.appendChild(zaglavlje);

        const tekst = document.createElement('span');
        tekst.className = 'chat-tekst';
        tekst.textContent = poruka.tekst || '';
        porukaEl.appendChild(tekst);

        if (!jeMoja) {
            const akcije = document.createElement('div');
            akcije.className = 'chat-msg-actions';
            akcije.appendChild(this.napraviAkcijuPoruke('Prijavi', 'chat-report-btn', () => this.potvrdiPrijavuPoruke(poruka)));
            akcije.appendChild(this.napraviAkcijuPoruke('Utišaj', 'chat-mute-btn', () => this.utisajIgraca(poruka)));
            if (this.status?.moderator) {
                akcije.appendChild(this.napraviAkcijuPoruke('Utišaj 24 h', 'chat-moderate-btn', () => this.potvrdiModeraciju(poruka, 'mute24h')));
                akcije.appendChild(this.napraviAkcijuPoruke('Blokiraj trajno', 'chat-moderate-btn chat-ban-btn', () => this.potvrdiModeraciju(poruka, 'ban')));
            }
            porukaEl.appendChild(akcije);
        }

        container.appendChild(porukaEl);
        if (!opcije.bezSkrola && (jeMoja || pratiDno)) this.skrolujDole();
    },

    napraviAkcijuPoruke: function(tekst, klasa, akcija) {
        const dugme = document.createElement('button');
        dugme.type = 'button';
        dugme.className = `chat-msg-action ${klasa}`;
        dugme.textContent = tekst;
        dugme.addEventListener('click', akcija);
        return dugme;
    },

    potvrdiPrijavuPoruke: function(poruka) {
        UIManager.prikaziPotvrdu(
            'Prijavi poruku',
            `Da li želiš da prijaviš poruku igrača ${this.escapeTekstZaPotvrdu(poruka.ime)}?`,
            () => this.prijaviPoruku(poruka),
            'Prijavi',
            'Odustani'
        );
    },

    prijaviPoruku: function(poruka) {
        if (!Game.socket || !Game.socket.connected || !poruka?.id) return;
        Game.socket.timeout(8000).emit('prijaviChatPoruku', { porukaId: poruka.id, razlog: 'drugo' }, (greska, odgovor) => {
            UIManager.prikaziObavestenje(
                odgovor?.uspeh ? 'Prijava je poslata' : 'Prijava nije poslata',
                odgovor?.uspeh ? 'Hvala što pomažeš da chat ostane bezbedan.' : (odgovor?.poruka || 'Pokušaj ponovo malo kasnije.'),
                null,
                'U redu'
            );
        });
    },

    utisajIgraca: function(poruka) {
        if (!poruka?.playerId) return;
        this.utisaniPlayerIds.add(poruka.playerId);
        this.sacuvajUtisaneIgrace();
        this.prikaziSvePoruke();
        UIManager.prikaziObavestenje('Igrač je utišan', `Više nećeš videti poruke igrača ${this.escapeTekstZaPotvrdu(poruka.ime)} na ovom uređaju.`, null, 'U redu');
    },

    potvrdiModeraciju: function(poruka, akcija) {
        const trajno = akcija === 'ban';
        UIManager.prikaziPotvrdu(
            trajno ? 'Trajna blokada' : 'Utišavanje na 24 sata',
            trajno
                ? `Trajno blokirati igrača ${this.escapeTekstZaPotvrdu(poruka.ime)} iz globalnog četa?`
                : `Utišati igrača ${this.escapeTekstZaPotvrdu(poruka.ime)} na 24 sata?`,
            () => this.moderirajIgraca(poruka.playerId, akcija),
            trajno ? 'Blokiraj' : 'Utišaj',
            'Odustani'
        );
    },

    moderirajIgraca: function(playerId, akcija) {
        if (!Game.socket || !Game.socket.connected) return;
        Game.socket.timeout(8000).emit('moderirajChatIgraca', { playerId, akcija }, (greska, odgovor) => {
            UIManager.prikaziObavestenje(
                odgovor?.uspeh ? 'Moderacija je primenjena' : 'Moderacija nije uspela',
                odgovor?.uspeh ? 'Igrač je obavešten o ograničenju četa.' : (odgovor?.poruka || 'Pokušaj ponovo malo kasnije.'),
                null,
                'U redu'
            );
        });
    },

    ucitajUtisaneIgrace: function() {
        try {
            const sacuvano = JSON.parse(localStorage.getItem('zemljopis_chat_utisani_v1'));
            if (Array.isArray(sacuvano)) {
                this.utisaniPlayerIds = new Set(sacuvano.filter(playerId => typeof playerId === 'string' && playerId.length <= 100).slice(-200));
            }
        } catch (error) {
            this.utisaniPlayerIds = new Set();
        }
    },

    sacuvajUtisaneIgrace: function() {
        localStorage.setItem('zemljopis_chat_utisani_v1', JSON.stringify([...this.utisaniPlayerIds].slice(-200)));
    },

    jeIgracUtisan: function(playerId) {
        return Boolean(playerId && this.utisaniPlayerIds.has(playerId));
    },

    mojPlayerId: function() {
        return typeof PodesavanjaManager !== 'undefined'
            ? PodesavanjaManager.postavke.playerId
            : null;
    },

    azurirajStanjePisanja: function() {
        const input = document.getElementById('chat-input');
        const dugme = document.querySelector('.global-chat-send');
        const zakljucano = this.slanjeUToku || Boolean(this.status?.banovan || this.status?.umutan);
        if (input) {
            input.disabled = zakljucano;
            input.placeholder = this.status?.banovan || this.status?.umutan
                ? (this.status.poruka || 'Slanje poruka je trenutno onemogućeno.')
                : 'Unesi poruku...';
        }
        if (dugme) dugme.disabled = zakljucano;
    },

    azurirajBrojacZnakova: function() {
        const input = document.getElementById('chat-input');
        const brojac = document.getElementById('chat-character-count');
        if (!input) return;

        const maksimum = Number(input.maxLength) > 0 ? Number(input.maxLength) : 180;
        if (brojac) brojac.textContent = `${input.value.length}/${maksimum}`;

        if (input.getClientRects().length === 0) {
            input.style.height = '';
            input.style.overflowY = 'hidden';
            return;
        }

        input.style.height = 'auto';
        const maksimalnaVisina = 128;
        input.style.height = `${Math.min(input.scrollHeight, maksimalnaVisina)}px`;
        input.style.overflowY = input.scrollHeight > maksimalnaVisina ? 'auto' : 'hidden';
    },

    jeChatOtvoren: function() {
        return document.getElementById('global-chat-screen')?.classList.contains('active');
    },

    escapeTekstZaPotvrdu: function(tekst) {
        return String(tekst || 'ovog igrača').replace(/[&<>'"]/g, znak => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[znak]);
    },

    skrolujDole: function() {
        const container = document.getElementById('chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GlobalChatManager.init();
});
