// managers.js - Zadužen za kontrolu DOM-a (HTML elemenata i CSS klasa)

const UIManager = {
    prikaziEkran: function(ekranId) {
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        document.getElementById(ekranId).classList.add('active');
        
        // Uvek sakrij tastaturu kada se menja ekran da ne bi blokirala UI
        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        // --- OSIGURAČ: Resetuje zaglavljeni glavni skrol ekrana ---
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    },

    pokreniTranzicijuVrata: function(callback) {
        const overlay = document.getElementById('door-transition');
        overlay.classList.add('active');
        
        setTimeout(() => {
            if (typeof callback === 'function') callback();
            
            setTimeout(() => {
                overlay.classList.remove('active');
            }, 50); 
        }, 1000); 
    },

    podesiTabluZaIgru: function(mod, slovo) {
        const gameBoard = document.getElementById('game-board');
        const modeIndicator = document.getElementById('mode-indicator');
        const liveStatsPanel = document.getElementById('live-stats-panel'); 
        const antiCheatStatus = document.getElementById('anti-cheat-status'); 
        const statsHeader = document.querySelector('.stats-header'); // Selektovanje naslova panela
        
        if (mod === 'solo') {
            gameBoard.classList.add('solo-mode-active');
            modeIndicator.textContent = 'SOLO TRENING';
            modeIndicator.className = 'mode-badge badge-solo';
            if (liveStatsPanel) liveStatsPanel.style.display = 'block'; 
            if (antiCheatStatus) antiCheatStatus.style.display = 'none'; 
            // Dinamički menjamo naslov za Solo
            if (statsHeader) statsHeader.innerHTML = '<i class="fa-solid fa-check-double"></i> TAČNI ODGOVORI'; 
        } else {
            gameBoard.classList.remove('solo-mode-active');
            modeIndicator.textContent = 'MULTIPLAYER';
            modeIndicator.className = 'mode-badge badge-multi';
            if (liveStatsPanel) liveStatsPanel.style.display = 'none'; 
            if (antiCheatStatus) antiCheatStatus.style.display = 'block'; 
            // Vraćamo naslov za Multiplayer
            if (statsHeader) statsHeader.innerHTML = '<i class="fa-solid fa-chart-simple"></i> Uživo rezultati'; 
        }

        document.getElementById('target-letter').innerText = slovo;
    },

    azurirajRundu: function(brojRunde) {
        const roundEl = document.getElementById('round-number');
        if (roundEl) {
            roundEl.innerText = brojRunde;
        }
    },

    azurirajTajmer: function(sekunde) {
        const display = document.getElementById('timer-display');
        let m = parseInt(sekunde / 60, 10);
        let s = parseInt(sekunde % 60, 10);

        m = m < 10 ? "0" + m : m;
        s = s < 10 ? "0" + s : s;

        display.textContent = m + ":" + s;

        display.style.color = "#ff416c";
        if (sekunde <= 10 && sekunde > 0) {
            display.style.color = "#ff0000";
        }
    },

    pripremiPolja: function() {
        const inputs = document.querySelectorAll('#game-board .game-input');
        inputs.forEach(input => {
            input.value = '';
            input.disabled = false;
            input.classList.remove('input-correct', 'input-wrong');
        });
    },

    zakljucajIObojiPolje: function(inputElement, isCorrect) {
        inputElement.disabled = true;
        if (isCorrect) {
            inputElement.classList.add('input-correct');
        } else {
            inputElement.classList.add('input-wrong');
        }
    },

    prikaziObavestenje: function(naslov, poruka, akcijaNakonKlika, tekstDugmeta = "U redu") {
        const modal = document.getElementById('custom-modal');
        
        document.getElementById('modal-title').innerHTML = naslov; 
        document.getElementById('modal-message').innerHTML = poruka;

        const btn = document.getElementById('modal-btn');
        
        const novoDugme = btn.cloneNode(true);
        novoDugme.innerText = tekstDugmeta; 
        btn.parentNode.replaceChild(novoDugme, btn);

        novoDugme.addEventListener('click', () => {
            this.zatvoriObavestenje();
            if (typeof akcijaNakonKlika === 'function') {
                akcijaNakonKlika(); 
            }
        });

        modal.classList.add('active');
    },

    zatvoriObavestenje: function() {
        document.getElementById('custom-modal').classList.remove('active');
    },

    prikaziPotvrdu: function(naslov, poruka, akcijaPotvrde) {
        const modal = document.getElementById('confirm-modal');
        if (!modal) return;

        document.getElementById('confirm-title').innerHTML = naslov;
        document.getElementById('confirm-message').innerHTML = poruka;

        const btnPotvrdi = document.getElementById('btn-confirm-yes');
        const btnOdustani = document.getElementById('btn-confirm-no');

        // Kloniramo dugmiće da bismo očistili stare Event Listenere
        const novoDugmePotvrdi = btnPotvrdi.cloneNode(true);
        btnPotvrdi.parentNode.replaceChild(novoDugmePotvrdi, btnPotvrdi);

        const novoDugmeOdustani = btnOdustani.cloneNode(true);
        btnOdustani.parentNode.replaceChild(novoDugmeOdustani, btnOdustani);

        // Akcija za DA
        novoDugmePotvrdi.addEventListener('click', () => {
            modal.classList.remove('active');
            if (typeof akcijaPotvrde === 'function') akcijaPotvrde();
        });

        // Akcija za NE
        novoDugmeOdustani.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.classList.add('active');
    },

    azurirajLiveStatistiku: function(trenutniSkor, mod, podaciProtivnika = []) {
        // Prikaz tvog skora (sa kvačicom za Solo, samo poeni za Multi)
        if (mod === 'solo') {
            document.getElementById('my-player-score').innerText = trenutniSkor + ' ✓';
        } else {
            document.getElementById('my-player-score').innerText = trenutniSkor;
        }
        
        const opponentsContainer = document.getElementById('opponents-stats');
        opponentsContainer.innerHTML = ''; // Resetujemo sadržaj

        // MULTIPLAYER PRIKAZ
        if (mod === 'multi') {
            // Nova logika: podaciProtivnika je niz objekata { ime: "Pera", poeni: 20 }
            if (Array.isArray(podaciProtivnika) && podaciProtivnika.length > 0 && typeof podaciProtivnika[0] === 'object') {
                podaciProtivnika.forEach(protivnik => {
                    opponentsContainer.innerHTML += `
                        <div class="player-stat opponent-player">
                            <span class="player-name">🌍 ${protivnik.ime}</span>
                            <span class="player-score">${protivnik.poeni}</span>
                        </div>
                    `;
                });
            } else {
                // Odbrojavanje praznih mesta (dok se igra ne učita / ako je poslat samo broj igrača)
                let brojIgraca = typeof podaciProtivnika === 'number' ? podaciProtivnika : (typeof Game !== 'undefined' ? Game.brojIgracaUSobi : 0);
                for (let i = 1; i < brojIgraca; i++) {
                    opponentsContainer.innerHTML += `
                        <div class="player-stat opponent-player">
                            <span class="player-name">Čeka se igrač...</span>
                            <span class="player-score">0</span>
                        </div>
                    `;
                }
            }
        // SOLO TRENING PRIKAZ
        } else {
            opponentsContainer.innerHTML = '';
        }
    }
};