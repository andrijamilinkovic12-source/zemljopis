// globalchat.js - Menadžer za Globalni Chat

const GlobalChatManager = {
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
        UIManager.prikaziEkran('global-chat-screen');
        // Tražimo poslednje poruke sa servera
        Game.socket.emit('traziIstorijuChata');
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