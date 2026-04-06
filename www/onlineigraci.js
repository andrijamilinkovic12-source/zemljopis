// onlineigraci.js - Menadžer za prikaz igrača na mreži i dodavanje prijatelja

const OnlineIgraciManager = {
    prijatelji: [],

    init: function() {
        // Učitavamo sačuvane prijatelje (kako bismo znali ko je već dodat)
        const sacuvano = localStorage.getItem('zemljopis_prijatelji');
        if (sacuvano) {
            this.prijatelji = JSON.parse(sacuvano);
        }
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

        igraci.forEach(igrac => {
            // Proveravamo da li nam je ovaj igrač već prijatelj
            const vecPrijatelj = this.prijatelji.some(p => p.id === igrac.id || p.ime === igrac.ime);
            
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
        Game.socket.emit('posaljiZahtevZaPrijateljstvo', { ciljId: ciljId });
        
        // Menjamo izgled dugmeta u "na čekanju"
        const btn = document.getElementById(`btn-add-${ciljId}`);
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
            btn.classList.add('pending');
            btn.disabled = true;
        }
        UIManager.prikaziObavestenje("Zahtev poslat", `Uspešno si poslao zahtev igraču: <b style="color:#38bdf8;">${ime}</b>.`, null, "U redu");
    },

    prikaziZahtev: function(podaci) {
        // Prikazujemo modal kada NAMA neko pošalje zahtev
        const modal = document.getElementById('friend-request-modal');
        const nameEl = document.getElementById('friend-request-name');
        if (nameEl) nameEl.innerText = podaci.imePosiljaoca;
        
        const btnPrihvati = document.getElementById('btn-prihvati-zahtev');
        const btnOdbij = document.getElementById('btn-odbij-zahtev');
        
        btnPrihvati.onclick = () => {
            this.odgovoriNaZahtev(podaci.idPosiljaoca, podaci.imePosiljaoca, true);
            modal.classList.remove('active');
        };
        
        btnOdbij.onclick = () => {
            this.odgovoriNaZahtev(podaci.idPosiljaoca, podaci.imePosiljaoca, false);
            modal.classList.remove('active');
        };

        modal.classList.add('active');
    },

    odgovoriNaZahtev: function(idPosiljaoca, imePosiljaoca, prihvaceno) {
        Game.socket.emit('odgovorNaZahtev', { ciljId: idPosiljaoca, prihvaceno: prihvaceno });
        
        if (prihvaceno) {
            this.dodajPrijatelja(idPosiljaoca, imePosiljaoca);
            UIManager.prikaziObavestenje("Novi prijatelj!", `Ti i <b style="color:#38ef7d;">${imePosiljaoca}</b> ste sada prijatelji!`, null, "Super");
            
            // Osveži listu ako je ekran trenutno otvoren
            if (document.getElementById('online-igraci-screen').classList.contains('active')) {
                Game.socket.emit('traziOnlineIgrace');
            }
        }
    },

    uspesnoDodatPrijatelj: function(podaci) {
        // Poziva se kada neko PRIHVATI naš zahtev
        this.dodajPrijatelja(podaci.idPrijatelja, podaci.imePrijatelja);
        UIManager.prikaziObavestenje("Zahtev prihvaćen", `<b style="color:#38ef7d;">${podaci.imePrijatelja}</b> je prihvatio/la tvoj zahtev za prijateljstvo!`, null, "Odlično");
        
        if (document.getElementById('online-igraci-screen').classList.contains('active')) {
            Game.socket.emit('traziOnlineIgrace');
        }
    },

    dodajPrijatelja: function(id, ime) {
        // Sprečavamo duplikate
        if (!this.prijatelji.some(p => p.ime === ime)) {
            this.prijatelji.push({ id: id, ime: ime });
            localStorage.setItem('zemljopis_prijatelji', JSON.stringify(this.prijatelji));
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OnlineIgraciManager.init();
});