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

io.on('connection', (socket) => {
    console.log(`Novi igrač se povezao: ${socket.id}`);

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
            igraci: [{ id: socket.id, ime: "Host", spremniOdgovori: false }],
            status: 'cekanje', // cekanje, u_igri
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: []
        };

        socket.join(kodSobe);
        console.log(`Soba kreirana: ${kodSobe} (Host: ${socket.id})`);
        
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // 2. PRIDRUŽIVANJE SOBI
    socket.on('pridruziSeSobi', (podaci, callback) => {
        const kodSobe = podaci.kodSobe.toUpperCase();
        const soba = sobe[kodSobe];

        if (!soba) return callback({ uspeh: false, poruka: "Soba ne postoji!" });
        if (soba.status !== 'cekanje') return callback({ uspeh: false, poruka: "Igra u ovoj sobi je već počela!" });
        if (soba.igraci.length >= soba.maxIgraca) return callback({ uspeh: false, poruka: "Soba je puna!" });

        soba.igraci.push({ id: socket.id, ime: podaci.ime || `Igrač ${soba.igraci.length + 1}`, spremniOdgovori: false });
        socket.join(kodSobe);

        console.log(`Igrač ${socket.id} (${podaci.ime}) je ušao u sobu ${kodSobe}`);
        io.to(kodSobe).emit('noviIgracUSobi', { brojIgraca: soba.igraci.length, max: soba.maxIgraca });

        callback({ uspeh: true, poruka: "Uspešno povezan!" });
    });

    // 3. POKRETANJE IGRE ILI NOVE RUNDE
    socket.on('pokreniIgru', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba && soba.host === socket.id) {
            soba.status = 'u_igri';
            soba.trenutnaRunda++;
            soba.odgovoriOveRunde = [];
            
            // Resetujemo status odgovora za sve igrače
            soba.igraci.forEach(i => i.spremniOdgovori = false);
            
            // Biramo slovo koje nije iskorišćeno
            let dostupnaSlova = svaSlova.filter(s => !soba.iskoriscenaSlova.includes(s));
            if (dostupnaSlova.length === 0) dostupnaSlova = svaSlova; // Ako nestane slova, resetuj
            
            const zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
            soba.iskoriscenaSlova.push(zadatoSlovo);
            
            io.to(kodSobe).emit('igraPocela', { slovo: zadatoSlovo, runda: soba.trenutnaRunda });
            console.log(`Runda ${soba.trenutnaRunda} u sobi ${kodSobe} počela. Slovo: ${zadatoSlovo}`);
        }
    });

    // 4. PRIJEM ODGOVORA OD IGRACA KADA ISTEKNE VREME (ILI KAD ZAVRŠE)
    socket.on('posaljiOdgovore', (podaci) => {
        const { kodSobe, odgovori } = podaci;
        const soba = sobe[kodSobe];

        if (soba) {
            // Pronađi igrača i označi ga kao spremnog
            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac && !igrac.spremniOdgovori) {
                igrac.spremniOdgovori = true;
                
                // Čuvamo odgovore (dodajemo ID igrača da znamo čiji su)
                soba.odgovoriOveRunde.push({
                    idIgraca: socket.id,
                    ime: igrac.ime,
                    odgovori: odgovori // Format: { drzava: "...", grad: "..." }
                });

                console.log(`Igrač ${igrac.ime} poslao odgovore za sobu ${kodSobe}.`);

                // Proveravamo da li su svi u sobi poslali odgovore
                const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                if (sviPoslali) {
                    // Svi su poslali! Šaljemo sve prikupljene odgovore nazad klijentima
                    console.log(`Svi igrači u sobi ${kodSobe} su poslali odgovore. Šaljem na bodovanje.`);
                    io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                }
            }
        }
    });

    // 5. BRISANJE I NAPUŠTANJE SOBE
    socket.on('napustiSobu', () => {
        ukloniIgracaIzSoba(socket);
    });

    socket.on('disconnect', () => {
        console.log(`Igrač otišao: ${socket.id}`);
        ukloniIgracaIzSoba(socket);
    });

    function ukloniIgracaIzSoba(socket) {
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            const index = soba.igraci.findIndex(i => i.id === socket.id);
            if (index !== -1) {
                soba.igraci.splice(index, 1);
                io.to(kodSobe).emit('igracNapustioSobu', { ostaloIgraca: soba.igraci.length });
                
                // Ako je host izašao, zatvori sobu (ili dodeli hosta nekom drugom)
                if (soba.host === socket.id) {
                    io.to(kodSobe).emit('hostJeNapustioSobu');
                    delete sobe[kodSobe];
                } else if (soba.igraci.length === 0) {
                    delete sobe[kodSobe];
                } else {
                    // Ako je igra u toku, a igrač je izašao, moramo proveriti da li sad svi preostali čekaju bodovanje
                    const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                    if (sviPoslali && soba.status === 'u_igri' && soba.igraci.length > 0) {
                        io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                    }
                }
                break;
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});