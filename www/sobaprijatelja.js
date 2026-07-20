// sobaprijatelja.js - Upravljanje prijateljima, zahtevima i oflajn dodavanjem

const SobaPrijateljaManager = {
    aktivniTab: 'lista',
    prijatelji: [], 
    zahtevi: [], 
    brisanjeUToku: new Set(),
    introTrajanjeMs: 5200,
    introTajmer: null,
    ulazakTajmer: null,
    otvaranjeUToku: false,

    normalizujZahtev: function(zahtev) {
        if (typeof zahtev === "string") {
            return { playerId: null, ime: zahtev, avatar: "atlas" };
        }
        return {
            playerId: zahtev && zahtev.playerId ? zahtev.playerId : null,
            ime: zahtev && zahtev.ime ? zahtev.ime : "Igrač",
            avatar: zahtev && zahtev.avatar ? zahtev.avatar : "atlas"
        };
    },

    init: function() {
        const sacuvaniPrijatelji = localStorage.getItem('zemljopis_prijatelji_detalji');
        if (sacuvaniPrijatelji) this.prijatelji = JSON.parse(sacuvaniPrijatelji);
        
        const sacuvaniZahtevi = localStorage.getItem('zemljopis_zahtevi');
        if (sacuvaniZahtevi) {
            this.zahtevi = JSON.parse(sacuvaniZahtevi)
                .map(zahtev => this.normalizujZahtev(zahtev));
        }
    },

    napraviAvatar: function(avatarId) {
        if (typeof PodesavanjaManager !== 'undefined'
            && Array.isArray(PodesavanjaManager.avatari)
            && typeof PodesavanjaManager.napraviAvatarSvg === 'function') {
            const avatar = PodesavanjaManager.avatari.find(stavka => stavka.id === avatarId)
                || PodesavanjaManager.avatari[0];
            if (avatar) return PodesavanjaManager.napraviAvatarSvg(avatar);
        }

        return '<img src="assets/soba-prijatelja-prijatelji-clay-soft-3d.png" alt="" aria-hidden="true">';
    },

    otvoriEkran: function() {
        if (!Game.socket || !Game.socket.connected) {
            UIManager.prikaziObavestenje("Nema konekcije", "Moraš biti povezan na server.", null, "U redu");
            return;
        }
        if (this.otvaranjeUToku) return;
        this.otvaranjeUToku = true;

        if (typeof KeyboardManager !== 'undefined') {
            KeyboardManager.hideKeyboard();
        }

        // Podaci se učitavaju dok traje uvod, da ekran bude spreman pri ulasku.
        Game.socket.emit('traziOsvezenjePrijatelja');
        this.prikaziIntro(() => {
            UIManager.prikaziEkran('soba-prijatelja-screen');
            this.promeniTab('lista');
            this.pokreniBlagiUlazakUSobu();
            this.otvaranjeUToku = false;
        });
    },

    prikaziIntro: function(callback) {
        const overlay = document.getElementById('soba-prijatelja-intro-overlay');
        const smanjeniPokret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const trajanje = smanjeniPokret ? 420 : this.introTrajanjeMs;
        const trajanjeZatvaranja = smanjeniPokret ? 160 : Math.min(420, trajanje);

        if (!overlay) {
            setTimeout(callback, trajanje);
            return;
        }

        clearTimeout(this.introTajmer);
        overlay.style.setProperty('--soba-prijatelja-intro-ms', `${trajanje}ms`);
        overlay.classList.remove('closing');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        this.introTajmer = setTimeout(() => {
            // Ciljni ekran je već iza završnog fade-a, pa glavni meni ne može da bljesne.
            callback();
            requestAnimationFrame(() => overlay.classList.add('closing'));
            setTimeout(() => {
                overlay.classList.remove('active', 'closing');
                overlay.setAttribute('aria-hidden', 'true');
            }, trajanjeZatvaranja);
        }, Math.max(0, trajanje - trajanjeZatvaranja));
    },

    pokreniBlagiUlazakUSobu: function() {
        const ekran = document.getElementById('soba-prijatelja-screen');
        if (!ekran) return;

        clearTimeout(this.ulazakTajmer);
        ekran.classList.remove('soba-prijatelja-entering');
        void ekran.offsetWidth;
        ekran.classList.add('soba-prijatelja-entering');
        this.ulazakTajmer = setTimeout(() => ekran.classList.remove('soba-prijatelja-entering'), 720);
    },

    promeniTab: function(tab) {
        this.aktivniTab = tab;
        const listaTab = document.getElementById('tab-lista-prijatelja');
        const zahteviTab = document.getElementById('tab-zahtevi-prijatelja');
        if (listaTab) listaTab.classList.toggle('active', tab === 'lista');
        if (zahteviTab) zahteviTab.classList.toggle('active', tab === 'zahtevi');
        
        this.osveziPrikaz();
    },

    osveziPrikaz: function() {
        const kontejner = document.getElementById('prijatelji-sadrzaj');
        if (!kontejner) return;
        
        // Ažuriraj bedž na tabu
        const badge = document.getElementById('broj-zahteva');
        if (badge) {
            badge.innerText = this.zahtevi.length;
            badge.style.display = this.zahtevi.length > 0 ? 'inline-block' : 'none';
        }

        let html = '';

        if (this.aktivniTab === 'lista') {
            if (this.prijatelji.length === 0) {
                html = '<p class="soba-prijatelja-empty">Još uvek nemaš dodatih prijatelja. Potraži ih po nadimku!</p>';
            } else {
                this.prijatelji.forEach(p => {
                    let isOnline = p.online
                        ? '<span class="prijatelj-status online"><span class="prijatelj-status-dot"></span>Na mreži</span>'
                        : '<span class="prijatelj-status"><span class="prijatelj-status-dot"></span>Van mreže</span>';
                    const brisanje = this.brisanjeUToku.has(p.playerId);
                    html += `
                        <div class="prijatelj-kartica">
                            <div class="prijatelj-header">
                                <div class="prijatelj-avatar">${this.napraviAvatar(p.avatar)}</div>
                                <div style="flex:1;">
                                     <div class="prijatelj-ime">${p.ime}</div>
                                     ${isOnline}
                                 </div>
                                <button
                                    class="btn-prijatelj btn-obrisi-prijatelja"
                                    onclick="SobaPrijateljaManager.potvrdiBrisanjePrijatelja('${p.playerId}')"
                                    title="Izbriši prijatelja"
                                    aria-label="Izbriši prijatelja ${p.ime}"
                                    ${brisanje ? 'disabled' : ''}
                                >
                                    <i class="fa-solid ${brisanje ? 'fa-spinner fa-spin' : 'fa-trash-can'}"></i>
                                </button>
                            </div>
                            <div class="prijatelj-stats">
                                <div class="stat-box"><span>Uspešnost</span><strong>${p.indeks || '0%'}</strong></div>
                                <div class="stat-box"><span>Poeni svih vremena</span><strong>${p.poeni || 0}</strong></div>
                                <div class="stat-box" style="grid-column: span 2;"><span>Ukupno pogođenih pojmova</span><strong>${p.pojmovi || 0}</strong></div>
                            </div>
                        </div>
                    `;
                });
            }
        } else {
            if (this.zahtevi.length === 0) {
                html = '<p class="soba-prijatelja-empty">Nemaš novih zahteva na čekanju.</p>';
            } else {
                this.zahtevi.forEach((sacuvaniZahtev, indeks) => {
                    const zahtev = this.normalizujZahtev(sacuvaniZahtev);
                    html += `
                        <div class="online-igrac-red soba-prijatelja-zahtev-kartica">
                            <div class="online-igrac-info">
                                <img class="soba-prijatelja-zahtev-ikona" src="assets/soba-prijatelja-zahtevi-clay-soft-3d.png" alt="" aria-hidden="true">
                                <span>${zahtev.ime}</span>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-prijatelj btn-odbij-zahtev" onclick="SobaPrijateljaManager.odgovoriNaZahtev(${indeks}, false)"><i class="fa-solid fa-xmark"></i></button>
                                <button class="btn-prijatelj btn-prihvati-zahtev" onclick="SobaPrijateljaManager.odgovoriNaZahtev(${indeks}, true)"><i class="fa-solid fa-check"></i></button>
                            </div>
                        </div>
                    `;
                });
            }
        }
        kontejner.innerHTML = html;
    },

    posaljiZahtevPoImenu: function() {
        const input = document.getElementById('unos-novog-prijatelja');
        const ime = input.value.trim();
        
        if (ime.length === 0) return;
        
        let mojNadimak = typeof PodesavanjaManager !== 'undefined' ? PodesavanjaManager.postavke.nadimak : "Igrač";
        if (ime.toLowerCase() === mojNadimak.toLowerCase()) {
            UIManager.prikaziObavestenje("Greška", "Ne možeš poslati zahtev samom sebi!", null, "U redu");
            return;
        }

        if (this.prijatelji.some(p => p.ime.toLowerCase() === ime.toLowerCase())) {
            UIManager.prikaziObavestenje("Info", "Ovaj igrač ti je već prijatelj.", null, "U redu");
            input.value = '';
            return;
        }
        
        Game.socket.timeout(10000).emit('posaljiOfflineZahtev', ime, (greska, odgovor) => {
            if (greska || !odgovor || !odgovor.uspeh) {
                UIManager.prikaziObavestenje(
                    "Nije poslato",
                    (odgovor && odgovor.poruka) || "Zahtev trenutno nije moguće poslati.",
                    null,
                    "U redu"
                );
                return;
            }

            input.value = '';
            UIManager.prikaziObavestenje("Poslato", `Zahtev za prijateljstvo poslat igraču: <b>${ime}</b>.<br><br>Kada uđe u igru dobiće obaveštenje.`, null, "Super");
        });
    },

    odgovoriNaZahtev: function(indeks, prihvaceno) {
        const sacuvaniZahtev = this.zahtevi[indeks];
        if (!sacuvaniZahtev) return;
        const zahtev = this.normalizujZahtev(sacuvaniZahtev);

        Game.socket.timeout(10000).emit(
            'odgovorNaOfflineZahtev',
            {
                playerIdPosiljaoca: zahtev.playerId,
                imePosiljaoca: zahtev.ime,
                prihvaceno
            },
            (greska, odgovor) => {
                if (greska || !odgovor || !odgovor.uspeh) {
                    UIManager.prikaziObavestenje(
                        "Nije sačuvano",
                        "Odgovor trenutno nije moguće sačuvati. Pokušaj ponovo.",
                        null,
                        "U redu"
                    );
                    return;
                }

                this.zahtevi.splice(indeks, 1);
                this.osveziPrikaz();
                Game.socket.emit('traziOsvezenjePrijatelja');

                if (prihvaceno) {
                    UIManager.prikaziObavestenje("Uspešno", `Prihvatio si zahtev od <b>${zahtev.ime}</b>! On je sada na tvojoj listi.`, null, "U redu");
                }
            }
        );
    },

    potvrdiBrisanjePrijatelja: function(playerIdPrijatelja) {
        const prijatelj = this.prijatelji.find(p => p.playerId === playerIdPrijatelja);
        if (!prijatelj || this.brisanjeUToku.has(playerIdPrijatelja)) return;

        UIManager.prikaziPotvrdu(
            "IZBRIŠI PRIJATELJA?",
            `Da li si siguran da želiš da izbrišeš igrača <b>${prijatelj.ime}</b> iz liste prijatelja?<br><br>Bićete uklonjeni sa liste prijatelja jedno drugom.`,
            () => this.obrisiPrijatelja(playerIdPrijatelja),
            "Izbriši",
            "Odustani"
        );
    },

    obrisiPrijatelja: function(playerIdPrijatelja) {
        const prijatelj = this.prijatelji.find(p => p.playerId === playerIdPrijatelja);
        if (!prijatelj || this.brisanjeUToku.has(playerIdPrijatelja)) return;

        this.brisanjeUToku.add(playerIdPrijatelja);
        this.osveziPrikaz();
        UIManager.prikaziObavestenje(
            "Brisanje...",
            `Uklanjam igrača <b>${prijatelj.ime}</b> iz tvoje liste prijatelja.`,
            null,
            "..."
        );

        Game.socket.timeout(10000).emit(
            'obrisiPrijatelja',
            { playerIdPrijatelja },
            (greska, odgovor) => {
                this.brisanjeUToku.delete(playerIdPrijatelja);

                if (greska || !odgovor || !odgovor.uspeh) {
                    this.osveziPrikaz();
                    UIManager.prikaziObavestenje(
                        "Nije izbrisano",
                        (odgovor && odgovor.poruka)
                            || "Prijatelja trenutno nije moguće izbrisati. Pokušaj ponovo.",
                        null,
                        "U redu"
                    );
                    return;
                }

                this.prijatelji = this.prijatelji.filter(
                    p => p.playerId !== playerIdPrijatelja
                );
                localStorage.setItem(
                    'zemljopis_prijatelji_detalji',
                    JSON.stringify(this.prijatelji)
                );
                this.osveziPrikaz();
                Game.socket.emit('traziOsvezenjePrijatelja');

                UIManager.prikaziObavestenje(
                    "Prijatelj je izbrisan",
                    `<b>${odgovor.imePrijatelja || prijatelj.ime}</b> više nije na tvojoj listi prijatelja.`,
                    null,
                    "U redu"
                );
            }
        );
    },
    
    primiSinhronizaciju: function(podaci) {
        this.prijatelji = podaci.prijatelji || [];
        this.zahtevi = (podaci.zahtevi || []).map(zahtev => this.normalizujZahtev(zahtev));
        
        localStorage.setItem('zemljopis_prijatelji_detalji', JSON.stringify(this.prijatelji));
        localStorage.setItem('zemljopis_zahtevi', JSON.stringify(this.zahtevi));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
        
        if(document.getElementById('soba-prijatelja-screen').classList.contains('active')){
            this.osveziPrikaz();
        }
        
        // Ažuriranje obaveštenja na glavnom meniju
        const mainBadge = document.getElementById('main-badge-zahtevi');
        if (mainBadge) {
            mainBadge.innerText = this.zahtevi.length;
            mainBadge.style.display = this.zahtevi.length > 0 ? 'inline-block' : 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SobaPrijateljaManager.init();
});
