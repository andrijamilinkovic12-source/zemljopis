// sobaprijatelja.js - Upravljanje prijateljima, zahtevima i oflajn dodavanjem

const SobaPrijateljaManager = {
    aktivniTab: 'lista',
    prijatelji: [], 
    zahtevi: [], 

    init: function() {
        const sacuvaniPrijatelji = localStorage.getItem('zemljopis_prijatelji_detalji');
        if (sacuvaniPrijatelji) this.prijatelji = JSON.parse(sacuvaniPrijatelji);
        
        const sacuvaniZahtevi = localStorage.getItem('zemljopis_zahtevi');
        if (sacuvaniZahtevi) this.zahtevi = JSON.parse(sacuvaniZahtevi);
    },

    otvoriEkran: function() {
        if (!Game.socket || !Game.socket.connected) {
            UIManager.prikaziObavestenje("Nema konekcije", "Moraš biti povezan na server.", null, "U redu");
            return;
        }
        UIManager.prikaziEkran('soba-prijatelja-screen');
        this.promeniTab('lista');
        Game.socket.emit('traziOsvezenjePrijatelja'); 
    },

    promeniTab: function(tab) {
        this.aktivniTab = tab;
        document.getElementById('tab-lista-prijatelja').style.background = tab === 'lista' ? 'rgba(56, 239, 125, 0.2)' : 'rgba(255,255,255,0.05)';
        document.getElementById('tab-lista-prijatelja').style.color = tab === 'lista' ? '#38ef7d' : '#a0aec0';
        
        document.getElementById('tab-zahtevi-prijatelja').style.background = tab === 'zahtevi' ? 'rgba(245, 175, 25, 0.2)' : 'rgba(255,255,255,0.05)';
        document.getElementById('tab-zahtevi-prijatelja').style.color = tab === 'zahtevi' ? '#f5af19' : '#a0aec0';
        
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
                html = '<p style="text-align:center; color:#a0aec0; margin-top:2rem;">Još uvek nemaš dodatih prijatelja. Potraži ih po nadimku!</p>';
            } else {
                this.prijatelji.forEach(p => {
                    let isOnline = p.online ? '<span class="prijatelj-status online">🟢 Na mreži</span>' : '<span class="prijatelj-status">🔴 Van mreže</span>';
                    html += `
                        <div class="prijatelj-kartica">
                            <div class="prijatelj-header">
                                <div class="prijatelj-avatar"><i class="fa-solid fa-user-ninja"></i></div>
                                <div style="flex:1;">
                                    <div class="prijatelj-ime">${p.ime}</div>
                                    ${isOnline}
                                </div>
                                <button class="circle-btn" style="width:38px; height:38px; font-size:0.9rem;" onclick="Game.kreirajPrivatnuSobu(2)" title="Pozovi u igru"><i class="fa-solid fa-gamepad"></i></button>
                            </div>
                            <div class="prijatelj-stats">
                                <div class="stat-box"><span>Uspešnost</span><strong>${p.indeks || '0%'}</strong></div>
                                <div class="stat-box"><span>Top Poeni</span><strong>${p.poeni || 0}</strong></div>
                                <div class="stat-box" style="grid-column: span 2;"><span>Ukupno pogođenih pojmova</span><strong>${p.pojmovi || 0}</strong></div>
                            </div>
                        </div>
                    `;
                });
            }
        } else {
            if (this.zahtevi.length === 0) {
                html = '<p style="text-align:center; color:#a0aec0; margin-top:2rem;">Nemaš novih zahteva na čekanju.</p>';
            } else {
                this.zahtevi.forEach(ime => {
                    html += `
                        <div class="online-igrac-red" style="margin-bottom:0.8rem; background:rgba(245,175,25,0.1); border-color:rgba(245,175,25,0.3);">
                            <div class="online-igrac-info">
                                <i class="fa-solid fa-user-clock" style="color:#f5af19;"></i>
                                <span>${ime}</span>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn-prijatelj" style="color:#ff416c; border-color:#ff416c; background:rgba(255,65,108,0.1);" onclick="SobaPrijateljaManager.odgovoriNaZahtev('${ime}', false)"><i class="fa-solid fa-xmark"></i></button>
                                <button class="btn-prijatelj" style="color:#38ef7d; border-color:#38ef7d; background:rgba(56,239,125,0.1);" onclick="SobaPrijateljaManager.odgovoriNaZahtev('${ime}', true)"><i class="fa-solid fa-check"></i></button>
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
        
        Game.socket.emit('posaljiOfflineZahtev', ime);
        input.value = '';
        UIManager.prikaziObavestenje("Poslato", `Zahtev za prijateljstvo poslat igraču: <b>${ime}</b>.<br><br>Kada uđe u igru dobiće obaveštenje.`, null, "Super");
    },

    odgovoriNaZahtev: function(imePosiljaoca, prihvaceno) {
        Game.socket.emit('odgovorNaOfflineZahtev', { imePosiljaoca: imePosiljaoca, prihvaceno: prihvaceno });
        
        this.zahtevi = this.zahtevi.filter(z => z !== imePosiljaoca);
        localStorage.setItem('zemljopis_zahtevi', JSON.stringify(this.zahtevi));
        
        this.osveziPrikaz();
        if (prihvaceno) {
            UIManager.prikaziObavestenje("Uspešno", `Prihvatio si zahtev od <b>${imePosiljaoca}</b>! On je sada na tvojoj listi.`, null, "U redu");
            Game.socket.emit('traziOsvezenjePrijatelja'); 
        }
    },
    
    primiSinhronizaciju: function(podaci) {
        this.prijatelji = podaci.prijatelji || [];
        this.zahtevi = podaci.zahtevi || [];
        
        localStorage.setItem('zemljopis_prijatelji_detalji', JSON.stringify(this.prijatelji));
        localStorage.setItem('zemljopis_zahtevi', JSON.stringify(this.zahtevi));
        
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