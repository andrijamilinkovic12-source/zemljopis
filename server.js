// server.js - Backend za Zemljopis Multiplayer
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const sobe = {}; 
const svaSlova = ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","LJ","M","N","NJ","O","P","R","S","T","Ć","U","F","H","C","Č","DŽ","Š"];

// --- GLOBAL CHAT I ONLINE IGRAČI ---
const MAX_PORUKA_ISTORIJA = 50;
let istorijaChata = [];
const onlineIgraci = {}; // Beležimo sve koji su online: { socket.id: { id, ime } }

// --- PRIVREMENA BAZA ZA PRIJATELJE I ZAHTEVE ---
// Format: { "Nadimak": { prijatelji: [{ime, poeni, pojmovi...}], zahtevi: ["Nadimak2"] } }
const bazaPrijatelja = {};

function osigurajBazu(ime) {
    if (!bazaPrijatelja[ime]) {
        bazaPrijatelja[ime] = { prijatelji: [], zahtevi: [] };
    }
}

// Pomoćna funkcija za zaštitu od XSS napada (hakovanja preko chata)
function escapeHTML(str) {
    if (!str) return "";
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Pomoćna funkcija koja hendluje početak runde, izvlačenje slova i SIGURNOSNI TAJMER
 */
function zapocniRunduUSobi(soba, io) {
    soba.status = 'u_igri';
    soba.trenutnaRunda++;
    soba.odgovoriOveRunde = [];

    // Resetujemo statuse igrača
    soba.igraci.forEach(i => {
        i.spremniOdgovori = false;
        i.spremniZaSledecuRundu = false;
    });

    // Izvlačenje novog slova
    let dostupnaSlova = svaSlova.filter(s => !soba.iskoriscenaSlova.includes(s));
    if (dostupnaSlova.length === 0) dostupnaSlova = svaSlova;
    
    const zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
    soba.iskoriscenaSlova.push(zadatoSlovo);

    // Šaljemo različit signal zavisno od toga da li je prva runda ili neka naredna
    if (soba.trenutnaRunda === 1) {
        io.to(soba.id).emit('igraPocela', { slovo: zadatoSlovo, runda: soba.trenutnaRunda });
    } else {
        io.to(soba.id).emit('sledecaRundaPocinje', { slovo: zadatoSlovo, runda: soba.trenutnaRunda });
    }

    console.log(`Runda ${soba.trenutnaRunda} u sobi ${soba.id} počela. Slovo: ${zadatoSlovo}`);

    // SIGURNOSNI TAJMER: 125 sekundi (120s igra + 5s tolerancija za kašnjenje mreže)
    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    soba.timeoutRunde = setTimeout(() => {
        console.log(`⏳ Istekao sigurnosni tajmer za sobu ${soba.id}. Forsiram prosleđivanje odgovora.`);
        io.to(soba.id).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
    }, 125000);
}

// Pomoćna funkcija za pokretanje sledeće runde kad klijenti kliknu "Sledeća runda"
function proveriIPokreniSledecuRundu(soba) {
    if (soba.igraci.length === 0) return;
    
    const sviSpremni = soba.igraci.every(i => i.spremniZaSledecuRundu);
    if (sviSpremni && soba.status === 'u_igri') {
        zapocniRunduUSobi(soba, io);
    }
}

io.on('connection', (socket) => {
    console.log(`🟢 Novi igrač se povezao: ${socket.id}`);

    // IGRAČ JAVLJA SVOJ NADIMAK KADA UĐE
    socket.on('prijavaNadimka', (ime) => {
        onlineIgraci[socket.id] = { id: socket.id, ime: escapeHTML(ime).substring(0, 20) };
        io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    });

    // 1. KREIRANJE PRIVATNE SOBE
    socket.on('kreirajSobu', (brojIgraca, callback) => {
        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) { 
            kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 
        }

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: brojIgraca,
            igraci: [{ id: socket.id, ime: "Host", spremniOdgovori: false, spremniZaSledecuRundu: false }],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            timeoutRunde: null
        };

        socket.join(kodSobe);
        console.log(`🏠 Soba kreirana: ${kodSobe} (Host: ${socket.id})`);
        
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // 1b. KREIRANJE PRIVATNE SOBE I DIREKTNO SLANJE POZIVNICA PRIJATELJIMA
    socket.on('kreirajSobuIPozovi', (podaci, callback) => {
        let brojIgraca = podaci.pozvani.length + 1;
        if (brojIgraca === 1) brojIgraca = 5; // Pravi max 5 ako je kliknuo samo START

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) { 
            kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 
        }

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: brojIgraca,
            igraci: [{ id: socket.id, ime: onlineIgraci[socket.id] ? onlineIgraci[socket.id].ime : "Host", spremniOdgovori: false, spremniZaSledecuRundu: false }],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            timeoutRunde: null
        };

        socket.join(kodSobe);
        console.log(`🏠 Soba kreirana (poziv): ${kodSobe} (Host: ${socket.id})`);
        
        // Magija: Direktno gađamo Socket.IO onih prijatelja koji su označeni!
        const hostIme = onlineIgraci[socket.id] ? onlineIgraci[socket.id].ime : "Tvoj prijatelj";
        podaci.pozvani.forEach(imePrijatelja => {
            const ciljSocket = Object.values(onlineIgraci).find(oi => oi.ime.toLowerCase() === imePrijatelja.toLowerCase());
            if (ciljSocket) {
                io.to(ciljSocket.id).emit('pozivUSobu', {
                    kodSobe: kodSobe,
                    hostIme: hostIme
                });
            }
        });

        callback({ uspeh: true, kodSobe: kodSobe, brojIgraca: brojIgraca });
    });

    // 2. PRIDRUŽIVANJE SOBI (PRIVATNE SOBE)
    socket.on('pridruziSeSobi', (podaci, callback) => {
        const kodSobe = podaci.kodSobe.toUpperCase();
        const soba = sobe[kodSobe];

        if (!soba) return callback({ uspeh: false, poruka: "Soba ne postoji!" });
        if (soba.status !== 'cekanje') return callback({ uspeh: false, poruka: "Igra u ovoj sobi je već počela!" });
        if (soba.igraci.length >= soba.maxIgraca) return callback({ uspeh: false, poruka: "Soba je puna!" });

        soba.igraci.push({ id: socket.id, ime: podaci.ime || `Igrač ${soba.igraci.length + 1}`, spremniOdgovori: false, spremniZaSledecuRundu: false });
        socket.join(kodSobe);

        console.log(`👤 Igrač ${socket.id} (${podaci.ime}) je ušao u sobu ${kodSobe}`);
        io.to(kodSobe).emit('noviIgracUSobi', { brojIgraca: soba.igraci.length, max: soba.maxIgraca });

        callback({ uspeh: true, poruka: "Uspešno povezan!" });
    });

    // 3. POKRETANJE IGRE (Host pokreće privatnu sobu)
    socket.on('pokreniIgru', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba && soba.host === socket.id && soba.status === 'cekanje') {
            zapocniRunduUSobi(soba, io);
        }
    });

    // 4. PRIJEM ODGOVORA OD IGRACA KADA ISTEKNE VREME
    socket.on('posaljiOdgovore', (podaci) => {
        const { kodSobe, odgovori } = podaci;
        const soba = sobe[kodSobe];

        if (soba) {
            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac && !igrac.spremniOdgovori) {
                igrac.spremniOdgovori = true;
                
                soba.odgovoriOveRunde.push({
                    idIgraca: socket.id,
                    ime: igrac.ime,
                    odgovori: odgovori 
                });

                console.log(`📩 Igrač ${igrac.ime} poslao odgovore za sobu ${kodSobe}.`);

                const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                if (sviPoslali) {
                    console.log(`✅ Svi igrači u sobi ${kodSobe} su poslali odgovore. Šaljem nazad klijentima na bodovanje.`);
                    
                    if (soba.timeoutRunde) {
                        clearTimeout(soba.timeoutRunde);
                        soba.timeoutRunde = null;
                    }

                    io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                }
            }
        }
    });

    // Prijem signala da je igrač pregledao rezultate i spreman je za sledeću rundu
    socket.on('spremanZaSledecuRundu', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba) {
            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac) {
                igrac.spremniZaSledecuRundu = true;
                console.log(`👍 Igrač ${igrac.ime} u sobi ${kodSobe} je spreman za sledeću rundu.`);
                proveriIPokreniSledecuRundu(soba);
            }
        }
    });

    // 5. BRISANJE I NAPUŠTANJE SOBE
    socket.on('napustiSobu', () => {
        ukloniIgracaIzSoba(socket);
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Igrač otišao: ${socket.id}`);
        ukloniIgracaIzSoba(socket);
        
        // Brišemo igrača iz globalne liste online igrača
        delete onlineIgraci[socket.id]; 
        io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    });

    function ukloniIgracaIzSoba(socket) {
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            const index = soba.igraci.findIndex(i => i.id === socket.id);
            
            if (index !== -1) {
                soba.igraci.splice(index, 1);
                io.to(kodSobe).emit('igracNapustioSobu', { ostaloIgraca: soba.igraci.length });
                
                if (soba.host === socket.id && !soba.javna) {
                    io.to(kodSobe).emit('hostJeNapustioSobu');
                    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
                    delete sobe[kodSobe];
                } else if (soba.igraci.length === 0) {
                    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
                    delete sobe[kodSobe]; 
                } else {
                    const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                    if (sviPoslali && soba.status === 'u_igri' && soba.igraci.length > 0) {
                        if (soba.timeoutRunde) {
                            clearTimeout(soba.timeoutRunde);
                            soba.timeoutRunde = null;
                        }
                        io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                    }
                    proveriIPokreniSledecuRundu(soba);
                }
                break;
            }
        }
    }

    // 6. TRAŽENJE JAVNE SOBE (MATCHMAKING)
    socket.on('traziJavnuSobu', (podaci, callback) => {
        const { brojIgraca, ime } = podaci;
        let nadjenaSoba = null;

        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            if (soba.javna && soba.status === 'cekanje' && soba.maxIgraca === brojIgraca && soba.igraci.length < soba.maxIgraca) {
                nadjenaSoba = soba;
                break;
            }
        }

        if (nadjenaSoba) {
            nadjenaSoba.igraci.push({ id: socket.id, ime: ime || `Igrač ${nadjenaSoba.igraci.length + 1}`, spremniOdgovori: false, spremniZaSledecuRundu: false });
            socket.join(nadjenaSoba.id);
            console.log(`🌍 Igrač ${socket.id} ušao u JAVNU sobu ${nadjenaSoba.id}`);

            io.to(nadjenaSoba.id).emit('azuriranjeJavneSobe', {
                brojIgraca: nadjenaSoba.igraci.length,
                max: nadjenaSoba.maxIgraca
            });

            if (nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca) {
                setTimeout(() => {
                    zapocniRunduUSobi(nadjenaSoba, io);
                }, 1500);
            }

            callback({ uspeh: true, kodSobe: nadjenaSoba.id, isHost: false });
        } else {
            const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let kodSobe = "";
            for (let i = 0; i < 5; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

            sobe[kodSobe] = {
                id: kodSobe,
                host: socket.id, 
                maxIgraca: brojIgraca,
                igraci: [{ id: socket.id, ime: ime || "Igrač 1", spremniOdgovori: false, spremniZaSledecuRundu: false }],
                status: 'cekanje',
                iskoriscenaSlova: [],
                trenutnaRunda: 0,
                odgovoriOveRunde: [],
                javna: true,
                timeoutRunde: null
            };

            socket.join(kodSobe);
            console.log(`🌍 Nova JAVNA soba kreirana: ${kodSobe} od strane ${socket.id}`);
            
            callback({ uspeh: true, kodSobe: kodSobe, isHost: true });
        }
    });

    // --- 7. GLOBAL CHAT LOGIKA ---
    
    // Kada neko otvori chat, pošalji mu istoriju
    socket.on('traziIstorijuChata', () => {
        socket.emit('istorijaChata', istorijaChata);
    });

    // Kada neko pošalje poruku u globalni chat
    socket.on('posaljiGlobalnuPoruku', (podaci) => {
        // Dodato escapeHTML za zaštitu od skripti
        const poruka = {
            id: socket.id,
            ime: escapeHTML(podaci.ime).substring(0, 20), 
            tekst: escapeHTML(podaci.tekst).substring(0, 200) 
        };

        // Čuvamo u istoriji
        istorijaChata.push(poruka);
        if (istorijaChata.length > MAX_PORUKA_ISTORIJA) {
            istorijaChata.shift(); // Brišemo najstariju poruku ako pređemo limit
        }

        // Šaljemo SVIM povezanim korisnicima (uključujući i pošiljaoca)
        io.emit('novaGlobalnaPoruka', poruka);
    });

    // --- 8. ONLINE IGRAČI I PRIJATELJSTVA ---
    
    // Klijent traži listu svih online igrača
    socket.on('traziOnlineIgrace', () => {
        // Vraćamo sve igrače OSIM onog koji traži
        const lista = Object.values(onlineIgraci).filter(igrac => igrac.id !== socket.id);
        socket.emit('listaOnlineIgraca', lista);
    });

    // Slanje zahteva
    socket.on('posaljiZahtevZaPrijateljstvo', (podaci) => {
        const posiljalac = onlineIgraci[socket.id];
        if (posiljalac && onlineIgraci[podaci.ciljId]) {
            io.to(podaci.ciljId).emit('zahtevZaPrijateljstvo', {
                idPosiljaoca: socket.id,
                imePosiljaoca: posiljalac.ime
            });
        }
    });

    // Odgovor na zahtev
    socket.on('odgovorNaZahtev', (podaci) => {
        const primalac = onlineIgraci[socket.id];
        if (primalac && onlineIgraci[podaci.ciljId]) {
            io.to(podaci.ciljId).emit('odgovorPrijateljstvo', {
                prihvaceno: podaci.prihvaceno,
                idPrijatelja: socket.id,
                imePrijatelja: primalac.ime
            });
        }
    });

    // --- 9. SOBA PRIJATELJA (OFLAJN SISTEM) ---
    
    // Klijent traži svoje trenutne prijatelje i zahteve
    socket.on('traziOsvezenjePrijatelja', () => {
        const ja = onlineIgraci[socket.id];
        if (ja) {
            osigurajBazu(ja.ime);
            
            let mojiPodaci = bazaPrijatelja[ja.ime];
            // Proveravamo ko je od prijatelja trenutno online pre slanja
            mojiPodaci.prijatelji.forEach(p => {
                p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase());
            });

            socket.emit('sinhronizacijaPrijatelja', mojiPodaci);
        }
    });

    // Slanje zahteva po nadimku (igrač može biti i oflajn)
    socket.on('posaljiOfflineZahtev', (ciljIme) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) return;

        const cistoCiljIme = escapeHTML(ciljIme).substring(0, 20);
        osigurajBazu(cistoCiljIme);

        // Dodajemo zahtev ako već nismo prijatelji i ako zahtev već ne postoji
        if (!bazaPrijatelja[cistoCiljIme].zahtevi.includes(ja.ime) &&
            !bazaPrijatelja[cistoCiljIme].prijatelji.some(p => p.ime === ja.ime)) {
            
            bazaPrijatelja[cistoCiljIme].zahtevi.push(ja.ime);

            // Ako je taj igrač slučajno trenutno online, odmah mu iskače notifikacija!
            const ciljSocket = Object.values(onlineIgraci).find(oi => oi.ime.toLowerCase() === cistoCiljIme.toLowerCase());
            if (ciljSocket) {
                io.to(ciljSocket.id).emit('noviOfflineZahtev', ja.ime);
            }
        }
    });

    // Odgovor na oflajn zahtev (Prihvati / Odbij)
    socket.on('odgovorNaOfflineZahtev', (podaci) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) return;

        osigurajBazu(ja.ime);
        const { imePosiljaoca, prihvaceno } = podaci;

        // Brišemo zahtev sa liste
        bazaPrijatelja[ja.ime].zahtevi = bazaPrijatelja[ja.ime].zahtevi.filter(z => z !== imePosiljaoca);

        if (prihvaceno) {
            osigurajBazu(imePosiljaoca);
            
            // Spajamo ih kao prijatelje
            if (!bazaPrijatelja[ja.ime].prijatelji.some(p => p.ime === imePosiljaoca)) {
                bazaPrijatelja[ja.ime].prijatelji.push({ ime: imePosiljaoca, poeni: 0, pojmovi: 0, indeks: '0%' });
            }
            if (!bazaPrijatelja[imePosiljaoca].prijatelji.some(p => p.ime === ja.ime)) {
                bazaPrijatelja[imePosiljaoca].prijatelji.push({ ime: ja.ime, poeni: 0, pojmovi: 0, indeks: '0%' });
            }

            // Ako je pošiljalac online u ovom trenutku, osvežavamo i njegov ekran
            const posiljalacSocket = Object.values(onlineIgraci).find(oi => oi.ime === imePosiljaoca);
            if (posiljalacSocket) {
                let podaciPosiljaoca = bazaPrijatelja[imePosiljaoca];
                podaciPosiljaoca.prijatelji.forEach(p => {
                    p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase());
                });
                io.to(posiljalacSocket.id).emit('sinhronizacijaPrijatelja', podaciPosiljaoca);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});