// managers.js - Zadužen za kontrolu DOM-a (HTML elemenata i CSS klasa)

const UIManager = {
    prikaziEkran: function(ekranId, preskociProveruProfila = false) {
        const dozvoljeniBezProfila = ['splash-screen', 'profil-setup-screen'];
        if (
            !preskociProveruProfila
            && !dozvoljeniBezProfila.includes(ekranId)
            && typeof PodesavanjaManager !== 'undefined'
            && !PodesavanjaManager.profilKompletan()
        ) {
            PodesavanjaManager.prikaziObavezniProfil();
            return;
        }

        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        const ekran = document.getElementById(ekranId);
        if (!ekran) return;
        ekran.classList.add('active');
        
        // Uvek sakrij tastaturu kada se menja ekran da ne bi blokirala UI
        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        // --- OSIGURAČ: Resetuje zaglavljeni glavni skrol ekrana ---
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    },

    pokreniTranzicijuVrata: function(callbackNaZatvaranju, callbackPoOtvaranju) {
        const overlay = document.getElementById('door-transition');
        const levaVrata = overlay ? overlay.querySelector('.door-left') : null;

        if (!overlay || !levaVrata) {
            if (typeof callbackNaZatvaranju === 'function') callbackNaZatvaranju();
            if (typeof callbackPoOtvaranju === 'function') callbackPoOtvaranju();
            return;
        }

        if (overlay.dataset.tranzicijaUToku === 'true') return;

        const cekajTransformaciju = (element, rezervnoVreme, callback) => {
            let zavrseno = false;
            let rezervniTajmer = null;

            const zavrsi = () => {
                if (zavrseno) return;
                zavrseno = true;
                element.removeEventListener('transitionend', obradiKraj);
                clearTimeout(rezervniTajmer);
                callback();
            };

            const obradiKraj = (dogadjaj) => {
                if (dogadjaj.propertyName === 'transform') zavrsi();
            };

            element.addEventListener('transitionend', obradiKraj);
            rezervniTajmer = setTimeout(zavrsi, rezervnoVreme);
        };

        overlay.dataset.tranzicijaUToku = 'true';
        overlay.setAttribute('aria-hidden', 'false');
        overlay.classList.remove('active', 'closing', 'holding', 'opening');
        void overlay.offsetWidth;
        overlay.classList.add('active', 'closing');

        cekajTransformaciju(levaVrata, 1750, () => {
            overlay.classList.remove('closing');
            overlay.classList.add('holding');

            if (typeof callbackNaZatvaranju === 'function') {
                callbackNaZatvaranju();
            }

            setTimeout(() => {
                overlay.classList.add('opening');
                overlay.classList.remove('active', 'holding');

                cekajTransformaciju(levaVrata, 1650, () => {
                    overlay.classList.remove('opening');
                    overlay.dataset.tranzicijaUToku = 'false';
                    overlay.setAttribute('aria-hidden', 'true');

                    if (typeof callbackPoOtvaranju === 'function') {
                        callbackPoOtvaranju();
                    }
                });
            }, 1700);
        });
    },

    prikaziEfekatPobednikaRunde: function(pobednici, brojRunde, callback) {
        const overlay = document.getElementById('round-winner-effect');
        const naslov = document.getElementById('round-winner-title');
        const oznakaRunde = document.getElementById('round-winner-round');
        const lista = document.getElementById('round-winner-list');

        if (!overlay || !naslov || !oznakaRunde || !lista || !Array.isArray(pobednici) || pobednici.length === 0) {
            if (typeof callback === 'function') callback();
            return;
        }

        clearTimeout(this.tajmerEfektaPobednika);
        clearTimeout(this.tajmerZatvaranjaEfektaPobednika);

        const podaciEfekata = {
            ef_nista: {
                klasa: 'winner-effect-none',
                naziv: 'PRVO MESTO',
                ikona: 'fa-trophy'
            },
            ef_konfete: {
                klasa: 'winner-effect-confetti',
                naziv: 'KONFETE POBEDE',
                ikona: 'fa-wand-magic-sparkles'
            },
            ef_vatromet: {
                klasa: 'winner-effect-fireworks',
                naziv: 'VATROMET',
                ikona: 'fa-fire'
            }
        };

        naslov.textContent = pobednici.length > 1 ? 'DELE PRVO MESTO' : 'NAJBOLJI U RUNDI';
        oznakaRunde.textContent = `RUNDA ${brojRunde}`;
        lista.replaceChildren();
        lista.dataset.brojPobednika = String(Math.min(pobednici.length, 5));
        const mnogoPobednika = pobednici.length >= 5;

        pobednici.forEach((pobednik, indeks) => {
            const podaciEfekta = podaciEfekata[pobednik.efekat] || podaciEfekata.ef_nista;
            const igrac = document.createElement('div');
            igrac.className = `round-winner-player ${podaciEfekta.klasa}${pobednik.isMe ? ' is-me' : ''}`;
            igrac.style.setProperty('--winner-delay', `${indeks * 0.12}s`);

            const animacija = document.createElement('div');
            animacija.className = 'round-winner-animation';
            animacija.setAttribute('aria-hidden', 'true');

            const brojCestica = pobednik.efekat === 'ef_konfete'
                ? (mnogoPobednika ? 12 : 22)
                : pobednik.efekat === 'ef_vatromet'
                    ? (mnogoPobednika ? 16 : 24)
                    : 0;

            for (let i = 0; i < brojCestica; i++) {
                const cestica = document.createElement('span');

                if (pobednik.efekat === 'ef_konfete') {
                    cestica.style.setProperty('--particle-x', `${5 + ((i * 17) % 90)}%`);
                    cestica.style.setProperty('--particle-delay', `${-((i * 0.13) % 1.8)}s`);
                    cestica.style.setProperty('--particle-drift', `${((i % 5) - 2) * 16}px`);
                    cestica.style.setProperty('--particle-rotation', `${(i * 47) % 180}deg`);
                } else {
                    cestica.style.setProperty('--spark-angle', `${i * 15}deg`);
                    cestica.style.setProperty('--particle-delay', `${-((i % 4) * 0.18)}s`);
                }

                animacija.appendChild(cestica);
            }

            const kruna = document.createElement('div');
            kruna.className = 'round-winner-crown';
            kruna.innerHTML = '<i class="fa-solid fa-crown" aria-hidden="true"></i>';

            const ime = document.createElement('strong');
            ime.className = 'round-winner-name';
            ime.textContent = pobednik.ime || 'Igrač';

            const poeni = document.createElement('span');
            poeni.className = 'round-winner-score';
            poeni.textContent = `+${Math.max(0, Number(pobednik.poeni) || 0)} POENA`;

            const efekat = document.createElement('span');
            efekat.className = 'round-winner-effect-name';
            const ikona = document.createElement('i');
            ikona.className = `fa-solid ${podaciEfekta.ikona}`;
            ikona.setAttribute('aria-hidden', 'true');
            efekat.append(ikona, document.createTextNode(` ${podaciEfekta.naziv}`));

            igrac.append(animacija, kruna, ime, poeni, efekat);
            lista.appendChild(igrac);
        });

        overlay.classList.remove('active', 'closing');
        overlay.setAttribute('aria-hidden', 'false');
        void overlay.offsetWidth;
        overlay.classList.add('active');

        const trajanjePrikaza = pobednici.length >= 5
            ? 4600
            : pobednici.length >= 3
                ? 4100
                : 3600;

        this.tajmerEfektaPobednika = setTimeout(() => {
            overlay.classList.add('closing');

            this.tajmerZatvaranjaEfektaPobednika = setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
                lista.replaceChildren();

                if (typeof callback === 'function') callback();
            }, 480);
        }, trajanjePrikaza);
    },

    prikaziKonacniPlasman: function(igraci, brojRundi, mojiTacniPojmovi, akcije = {}) {
        const overlay = document.getElementById('final-ranking-overlay');
        const lista = document.getElementById('final-ranking-list');
        const osnovica = document.getElementById('final-base-concepts');
        const brojRundiEl = document.getElementById('final-round-count');
        const ukupno5x = document.getElementById('final-total-5x');
        const ukupno10x = document.getElementById('final-total-10x');
        const btn5x = document.getElementById('btn-final-5x');
        const btn10x = document.getElementById('btn-final-10x');
        const btnZavrsi = document.getElementById('btn-final-finish');

        if (!overlay || !lista || !osnovica || !brojRundiEl || !ukupno5x || !ukupno10x || !btn5x || !btn10x || !btnZavrsi) {
            if (typeof akcije.onZavrsi === 'function') akcije.onZavrsi();
            return;
        }

        const podaciEfekata = {
            ef_nista: { klasa: 'winner-effect-none', naziv: 'BEZ EFEKTA', ikona: 'fa-ban' },
            ef_konfete: { klasa: 'winner-effect-confetti', naziv: 'KONFETE POBEDE', ikona: 'fa-wand-magic-sparkles' },
            ef_vatromet: { klasa: 'winner-effect-fireworks', naziv: 'VATROMET', ikona: 'fa-fire' }
        };

        const napraviCestice = (kontejner, efekatId, brojCestica) => {
            for (let i = 0; i < brojCestica; i++) {
                const cestica = document.createElement('span');

                if (efekatId === 'ef_konfete') {
                    cestica.style.setProperty('--particle-x', `${5 + ((i * 19) % 90)}%`);
                    cestica.style.setProperty('--particle-delay', `${-((i * 0.15) % 1.8)}s`);
                    cestica.style.setProperty('--particle-drift', `${((i % 5) - 2) * 12}px`);
                    cestica.style.setProperty('--particle-rotation', `${(i * 43) % 180}deg`);
                } else if (efekatId === 'ef_vatromet') {
                    cestica.style.setProperty('--spark-angle', `${i * (360 / brojCestica)}deg`);
                    cestica.style.setProperty('--particle-delay', `${-((i % 4) * 0.18)}s`);
                }

                kontejner.appendChild(cestica);
            }
        };

        lista.replaceChildren();
        lista.dataset.brojIgraca = String(Math.min(igraci.length, 5));

        let prethodniPoeni = null;
        let prethodnoMesto = 0;

        igraci.forEach((igrac, indeks) => {
            const mesto = prethodniPoeni === igrac.poeni ? prethodnoMesto : indeks + 1;
            prethodniPoeni = igrac.poeni;
            prethodnoMesto = mesto;

            const efekatId = igrac.efekat || 'ef_nista';
            const podaciEfekta = podaciEfekata[efekatId] || podaciEfekata.ef_nista;
            const kartica = document.createElement('article');
            kartica.className = `final-ranking-player ${podaciEfekta.klasa}${igrac.isMe ? ' is-me' : ''}${mesto === 1 ? ' is-winner' : ''}`;

            const animacija = document.createElement('div');
            animacija.className = 'round-winner-animation';
            animacija.setAttribute('aria-hidden', 'true');
            napraviCestice(animacija, efekatId, efekatId === 'ef_konfete' ? 14 : efekatId === 'ef_vatromet' ? 16 : 0);

            const oznakaMesta = document.createElement('div');
            oznakaMesta.className = `final-ranking-place place-${Math.min(mesto, 4)}`;
            if (mesto <= 3) {
                const ikona = document.createElement('i');
                ikona.className = mesto === 1
                    ? 'fa-solid fa-crown'
                    : mesto === 2
                        ? 'fa-solid fa-medal'
                        : 'fa-solid fa-award';
                ikona.setAttribute('aria-hidden', 'true');
                oznakaMesta.appendChild(ikona);
            }
            const brojMesta = document.createElement('span');
            brojMesta.textContent = `${mesto}.`;
            oznakaMesta.appendChild(brojMesta);

            const podaci = document.createElement('div');
            podaci.className = 'final-ranking-player-data';

            const ime = document.createElement('strong');
            ime.className = 'final-ranking-name';
            ime.textContent = igrac.ime || 'Igrač';

            const statistika = document.createElement('div');
            statistika.className = 'final-ranking-stats';

            const poeni = document.createElement('span');
            poeni.innerHTML = `<i class="fa-solid fa-star" aria-hidden="true"></i> ${Math.max(0, Number(igrac.poeni) || 0)} poena`;

            const pojmovi = document.createElement('span');
            pojmovi.innerHTML = `<i class="fa-solid fa-check-double" aria-hidden="true"></i> ${Math.max(0, Number(igrac.tacniPojmovi) || 0)} tačnih`;

            statistika.append(poeni, pojmovi);
            podaci.append(ime, statistika);

            const nazivEfekta = document.createElement('span');
            nazivEfekta.className = 'final-ranking-effect-name';
            const efekatIkona = document.createElement('i');
            efekatIkona.className = `fa-solid ${podaciEfekta.ikona}`;
            efekatIkona.setAttribute('aria-hidden', 'true');
            nazivEfekta.append(efekatIkona, document.createTextNode(` ${podaciEfekta.naziv}`));

            kartica.append(animacija, oznakaMesta, podaci, nazivEfekta);
            lista.appendChild(kartica);
        });

        const baza = Math.max(0, Math.floor(Number(mojiTacniPojmovi) || 0));
        osnovica.textContent = String(baza);
        brojRundiEl.textContent = String(Math.max(1, Number(brojRundi) || 6));
        ukupno5x.textContent = `${baza} → ${baza * 5} pojmova`;
        ukupno10x.textContent = `${baza} → ${baza * 10} pojmova`;

        btn5x.disabled = baza <= 0;
        btn10x.disabled = baza <= 0;
        btnZavrsi.disabled = false;
        btnZavrsi.textContent = baza > 0 ? 'ZAVRŠI BEZ BONUSA' : 'NAZAD U MENI';

        btn5x.onclick = () => {
            if (typeof akcije.onPomnozi === 'function') akcije.onPomnozi(5, 'interstitial');
        };
        btn10x.onclick = () => {
            if (typeof akcije.onPomnozi === 'function') akcije.onPomnozi(10, 'rewarded');
        };
        btnZavrsi.onclick = () => {
            this.sakrijKonacniPlasman();
            if (typeof akcije.onZavrsi === 'function') akcije.onZavrsi();
        };

        this.azurirajKonacniBonus({
            status: baza > 0 ? 'spreman' : 'bez_pojmova'
        });

        overlay.classList.remove('closing');
        overlay.setAttribute('aria-hidden', 'false');
        void overlay.offsetWidth;
        overlay.classList.add('active');
    },

    azurirajKonacniBonus: function(podaci = {}) {
        const status = document.getElementById('final-bonus-status');
        const btn5x = document.getElementById('btn-final-5x');
        const btn10x = document.getElementById('btn-final-10x');
        const btnZavrsi = document.getElementById('btn-final-finish');
        if (!status || !btn5x || !btn10x || !btnZavrsi) return;

        if (podaci.status === 'reklama') {
            btn5x.disabled = true;
            btn10x.disabled = true;
            btnZavrsi.disabled = true;
            status.className = 'is-loading';
            status.textContent = 'Reklama je u toku. Nagrada će biti upisana po završetku.';
            return;
        }

        if (podaci.status === 'preuzet') {
            btn5x.disabled = true;
            btn10x.disabled = true;
            btnZavrsi.disabled = false;
            btnZavrsi.textContent = 'PREUZETO - NAZAD U MENI';
            status.className = 'is-success';
            status.textContent = podaci.bonus
                ? `Uspešno: +${podaci.bonus} bonus pojmova. Ukupna vrednost meča je ${podaci.ukupno}.`
                : `Bonus je već preuzet. Ukupna vrednost meča je ${podaci.ukupno}.`;
            return;
        }

        if (podaci.status === 'greska') {
            btn5x.disabled = false;
            btn10x.disabled = false;
            btnZavrsi.disabled = false;
            status.className = 'is-error';
            status.textContent = podaci.poruka || 'Reklama nije završena. Pokušaj ponovo.';
            return;
        }

        if (podaci.status === 'bez_pojmova') {
            btn5x.disabled = true;
            btn10x.disabled = true;
            status.className = '';
            status.textContent = 'Nema tačnih pojmova za uvećanje u ovom meču.';
            return;
        }

        status.className = '';
        status.textContent = 'Izaberi jedno uvećanje. Nagrada se može preuzeti samo jednom.';
    },

    sakrijKonacniPlasman: function() {
        const overlay = document.getElementById('final-ranking-overlay');
        if (!overlay) return;

        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.remove('active', 'closing');
            overlay.setAttribute('aria-hidden', 'true');
        }, 360);
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

    prikaziPotvrdu: function(naslov, poruka, akcijaPotvrde, tekstPotvrde = "Završi rundu", tekstOdustani = "Odustani") {
        const modal = document.getElementById('confirm-modal');
        if (!modal) return;

        document.getElementById('confirm-title').innerHTML = naslov;
        document.getElementById('confirm-message').innerHTML = poruka;

        const btnPotvrdi = document.getElementById('btn-confirm-yes');
        const btnOdustani = document.getElementById('btn-confirm-no');

        // Kloniramo dugmiće da bismo očistili stare Event Listenere
        const novoDugmePotvrdi = btnPotvrdi.cloneNode(true);
        novoDugmePotvrdi.innerText = tekstPotvrde;
        btnPotvrdi.parentNode.replaceChild(novoDugmePotvrdi, btnPotvrdi);

        const novoDugmeOdustani = btnOdustani.cloneNode(true);
        novoDugmeOdustani.innerText = tekstOdustani;
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
