// managers.js - Zadužen za kontrolu DOM-a (HTML elemenata i CSS klasa)

const UIManager = {
    prikaziEkran: function(ekranId) {
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        document.getElementById(ekranId).classList.add('active');
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
        
        if (mod === 'solo') {
            gameBoard.classList.add('solo-mode-active');
            modeIndicator.textContent = 'SOLO TRENING';
            modeIndicator.className = 'mode-badge badge-solo';
            if (liveStatsPanel) liveStatsPanel.style.display = 'block'; 
            if (antiCheatStatus) antiCheatStatus.style.display = 'none'; 
        } else {
            gameBoard.classList.remove('solo-mode-active');
            modeIndicator.textContent = 'MULTIPLAYER';
            modeIndicator.className = 'mode-badge badge-multi';
            if (liveStatsPanel) liveStatsPanel.style.display = 'none'; 
            if (antiCheatStatus) antiCheatStatus.style.display = 'block'; 
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
        
        // OVO JE ISPRAVLJENO: innerHTML umesto innerText kako bi prihvatio stilove
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

    azurirajLiveStatistiku: function(trenutniSkor, mod, podaciProtivnika = []) {
        if (mod === 'solo') {
            document.getElementById('my-player-score').innerText = trenutniSkor + ' ✓';
        } else {
            document.getElementById('my-player-score').innerText = trenutniSkor;
        }
        
        const opponentsContainer = document.getElementById('opponents-stats');
        opponentsContainer.innerHTML = ''; 

        if (mod === 'multi') {
            if (Array.isArray(podaciProtivnika)) {
                for (let i = 0; i < podaciProtivnika.length; i++) {
                    opponentsContainer.innerHTML += `
                        <div class="player-stat opponent-player">
                            <span class="player-name">🤖 Igrač ${i+2}</span>
                            <span class="player-score">${podaciProtivnika[i]}</span>
                        </div>
                    `;
                }
            } else {
                let brojIgraca = typeof podaciProtivnika === 'number' ? podaciProtivnika : 0;
                for (let i = 1; i < brojIgraca; i++) {
                    opponentsContainer.innerHTML += `
                        <div class="player-stat opponent-player">
                            <span class="player-name">🤖 Igrač ${i+1}</span>
                            <span class="player-score">0</span>
                        </div>
                    `;
                }
            }
        } else {
            opponentsContainer.innerHTML = `
                <div class="player-stat opponent-player" style="justify-content: center; font-size: 0.75rem; font-style: italic;">
                    Trening - Prikazuje se broj tačnih odgovora
                </div>
            `;
        }
    }
};