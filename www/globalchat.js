// globalchat.js - Menadžer za Globalni Chat

const GlobalChatManager = {
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,

    init: function() {
        // Slušamo "Enter" taster za slanje poruke
        const input = document.getElementById('chat-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.posaljiPoruku();
                }
            });
        }
    },

    poveziSokete: function(socket) {
        if (!socket) return;

        // BRISANJE STARIH KOMANDI (Sprečava dupliranje i blokiranje)
        socket.off('istorijaChata');
        socket.off('novaGlobalnaPoruka');

        // Prijem istorije chata kada prvi put otvorimo chat
        socket.on('istorijaChata', (poruke) => {
            const container = document.getElementById('chat-messages');
            if(!container) return;
            container.innerHTML = ''; // Očisti pre učitavanja
            if (!Array.isArray(poruke) || poruke.length === 0) {
                container.innerHTML = '<p class="global-chat-empty">Još uvek nema poruka. Započni razgovor!</p>';
                return;
            }
            poruke.forEach(p => this.prikaziPorukuUUI(p));
            this.skrolujDole();
        });

        // Prijem nove pojedinačne poruke
        socket.on('novaGlobalnaPoruka', (poruka) => {
            this.prikaziPorukuUUI(poruka);
            this.skrolujDole();
        });
    },

    proveriIPrikazi: function() {
        if (!Game.socket || !Game.socket.connected) {
            UIManager.prikaziObavestenje("Nema konekcije", "Povezivanje na server je u toku, molim te sačekaj par sekundi...", null, "Zatvori");
            return;
        }

        const pravilaPrihvacena = localStorage.getItem('chatPravilaPrihvacena');
        
        if (pravilaPrihvacena) {
            this.otvoriChat();
        } else {
            document.getElementById('chat-rules-modal').classList.add('active');
        }
    },

    prihvatiPravila: function() {
        localStorage.setItem('chatPravilaPrihvacena', 'true');
        document.getElementById('chat-rules-modal').classList.remove('active');
        this.otvoriChat();
    },

    otvoriChat: function() {
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        // Istorija se učitava za vreme uvoda, pa je chat spreman pri ulasku.
        Game.socket.emit('traziIstorijuChata');
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('global-chat-screen');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('global-chat-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

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
            // Soba postaje aktivna dok je uvod još potpuno iznad nje.
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
        if (!input) return;
        
        const tekst = input.value.trim();
        if (tekst.length === 0) return;
        
        // Preuzimanje nadimka
        let nadimak = "Igrač";
        const inputNadimak = document.getElementById('postavke-nadimak');
        if (inputNadimak && inputNadimak.value.trim() !== '') {
            nadimak = inputNadimak.value.trim();
        } else {
            try {
                const podesavanja = JSON.parse(localStorage.getItem('zemljopis_podesavanja'));
                if (podesavanja && podesavanja.nadimak) {
                    nadimak = podesavanja.nadimak;
                }
            } catch(e) {}
        }
        
        // Šaljemo poruku serveru
        Game.socket.emit('posaljiGlobalnuPoruku', {
            ime: nadimak,
            tekst: tekst
        });

        input.value = ''; // Očisti polje za unos
        input.focus();
    },

    prikaziPorukuUUI: function(poruka) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const praznoStanje = container.querySelector('.global-chat-empty');
        if (praznoStanje) praznoStanje.remove();

        const jeMoja = poruka.id === Game.socket.id; 
        
        const div = document.createElement('div');
        div.className = `chat-msg ${jeMoja ? 'mojna' : 'tudja'}`;
        
        div.innerHTML = `
            <span class="chat-ime">${poruka.ime} ${jeMoja ? '<span style="opacity:0.6; font-size:0.55rem;">(TI)</span>' : ''}</span>
            <span class="chat-tekst">${poruka.tekst}</span>
        `;
        
        container.appendChild(div);
    },

    skrolujDole: function() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
};

// Pokreni inicijalizaciju kada se stranica učita
document.addEventListener('DOMContentLoaded', () => {
    GlobalChatManager.init();
});
