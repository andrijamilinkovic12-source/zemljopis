// onlineigraci.js - Menadžer za prikaz igrača na mreži i dodavanje prijatelja

const OnlineIgraciManager = {
    init: function() {
        // Više nam ne treba odvojena lokalna lista ovde, 
        // koristićemo SobaPrijateljaManager kao GLAVNU bazu!
    },

    otvoriEkran: function() {
        if (!Game.socket || !Game.socket.connected) {
            UIManager.prikaziObavestenje("Nema konekcije", "Povezivanje na server je u toku, sačekaj par sekundi...", null, "Zatvori");
            return;
        }
        UIManager.prikaziEkran('online-igraci-screen');
        // Tražimo najsvežiju listu od servera
        Game.socket.emit('traziOnlineIgrace');
    },

    renderLista: function(igraci) {
        const kontejner = document.getElementById('online-igraci-lista');
        if (!kontejner) return;

        kontejner.innerHTML = '';

        if (igraci.length === 0) {
            kontejner.innerHTML = '<p style="text-align:center; color:#a0aec0; margin-top:2rem;">Trenutno si jedini igrač na mreži.</p>';
            return;
        }

        // Uzimamo glavnu listu prijatelja direktno iz Sobe Prijatelja
        let mojiPrijatelji = [];
        if (typeof SobaPrijateljaManager !== 'undefined') {
            mojiPrijatelji = SobaPrijateljaManager.prijatelji;
        }

        igraci.forEach(igrac => {
            // Proveravamo u GLAVNOJ listi da li smo već prijatelji
            const vecPrijatelj = mojiPrijatelji.some(p => {
                if (p.playerId && igrac.playerId) return p.playerId === igrac.playerId;
                return p.ime.toLowerCase() === igrac.ime.toLowerCase();
            });
            
            let actionHtml = '';
            if (vecPrijatelj) {
                // Ako jeste, prikazujemo zelenu kvačicu
                actionHtml = `<button class="btn-prijatelj disabled" title="Već ste prijatelji" disabled><i class="fa-solid fa-user-check"></i></button>`;
            } else {
                // Ako nije, prikazujemo "plus" dugme
                actionHtml = `<button class="btn-prijatelj" id="btn-add-${igrac.id}" onclick="OnlineIgraciManager.posaljiZahtev('${igrac.id}', '${igrac.ime}')" title="Dodaj za prijatelja"><i class="fa-solid fa-user-plus"></i></button>`;
            }

            kontejner.innerHTML += `
                <div class="online-igrac-red">
                    <div class="online-igrac-info">
                        <i class="fa-solid fa-circle-user"></i>
                        <span>${igrac.ime}</span>
                    </div>
                    ${actionHtml}
                </div>
            `;
        });
    },

    posaljiZahtev: function(ciljId, ime) {
        // Menjamo izgled dugmeta u "na čekanju"
        const btn = document.getElementById(`btn-add-${ciljId}`);
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
            btn.classList.add('pending');
            btn.disabled = true;
        }

        Game.socket.timeout(10000).emit('posaljiZahtevZaPrijateljstvo', { ciljId: ciljId }, (greska, odgovor) => {
            if (greska || !odgovor || !odgovor.uspeh) {
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
                    btn.classList.remove('pending');
                    btn.disabled = false;
                }
                UIManager.prikaziObavestenje(
                    "Nije poslato",
                    (odgovor && odgovor.poruka) || "Zahtev trenutno nije moguće poslati.",
                    null,
                    "U redu"
                );
                return;
            }

            UIManager.prikaziObavestenje("Zahtev poslat", `Uspešno si poslao zahtev igraču: <b style="color:#38bdf8;">${ime}</b>.`, null, "U redu");
        });
    },

    prikaziZahtev: function(podaci) {
        // Prikazujemo modal kada NAMA neko pošalje zahtev
        const modal = document.getElementById('friend-request-modal');
        const nameEl = document.getElementById('friend-request-name');
        if (nameEl) nameEl.innerText = podaci.imePosiljaoca;
        
        const btnPrihvati = document.getElementById('btn-prihvati-zahtev');
        const btnOdbij = document.getElementById('btn-odbij-zahtev');
        
        btnPrihvati.onclick = () => {
            this.odgovoriNaZahtev(podaci.idPosiljaoca, podaci.imePosiljaoca, true, podaci.playerIdPosiljaoca);
            modal.classList.remove('active');
        };
        
        btnOdbij.onclick = () => {
            this.odgovoriNaZahtev(podaci.idPosiljaoca, podaci.imePosiljaoca, false, podaci.playerIdPosiljaoca);
            modal.classList.remove('active');
        };

        modal.classList.add('active');
    },

    odgovoriNaZahtev: function(idPosiljaoca, imePosiljaoca, prihvaceno, playerIdPosiljaoca = null) {
        Game.socket.timeout(10000).emit(
            'odgovorNaZahtev',
            {
                ciljId: idPosiljaoca,
                playerIdPosiljaoca,
                prihvaceno: prihvaceno
            },
            (greska, odgovor) => {
                if (greska || !odgovor || !odgovor.uspeh) {
                    UIManager.prikaziObavestenje(
                        "Nije sačuvano",
                        "Odgovor trenutno nije moguće sačuvati. Otvori Sobu prijatelja i pokušaj ponovo.",
                        null,
                        "U redu"
                    );
                    return;
                }

                if (prihvaceno) {
                    UIManager.prikaziObavestenje("Novi prijatelj!", `Ti i <b style="color:#38ef7d;">${imePosiljaoca}</b> ste sada prijatelji!`, null, "Super");
                    Game.socket.emit('traziOsvezenjePrijatelja');

                    if (document.getElementById('online-igraci-screen').classList.contains('active')) {
                        Game.socket.emit('traziOnlineIgrace');
                    }
                }
            }
        );
    },

    uspesnoDodatPrijatelj: function(podaci) {
        // Poziva se kada neko PRIHVATI naš zahtev
        UIManager.prikaziObavestenje("Zahtev prihvaćen", `<b style="color:#38ef7d;">${podaci.imePrijatelja}</b> je prihvatio/la tvoj zahtev za prijateljstvo!`, null, "Odlično");
        
        // ODMAH TRAŽIMO OSVEŽENJE GLAVNE SOBE PRIJATELJA
        Game.socket.emit('traziOsvezenjePrijatelja');
        
        if (document.getElementById('online-igraci-screen').classList.contains('active')) {
            Game.socket.emit('traziOnlineIgrace');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OnlineIgraciManager.init();
});
