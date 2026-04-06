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

// --- GLOBAL CHAT VARIJABLE ---
const MAX_PORUKA_ISTORIJA = 50;
let istorijaChata = [];

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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});