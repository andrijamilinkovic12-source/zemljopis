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
            odgovoriOveRunde: [],
            javna: false // Privatna soba
        };

        socket.join(kodSobe);
        console.log(`Soba kreirana: ${kodSobe} (Host: ${socket.id})`);
        
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // 2. PRIDRUŽIVANJE SOBI (PRIVATNE SOBE)
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

    // 3. POKRETANJE IGRE ILI NOVE RUNDE (Koristi Host za privatne sobe)
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
                
                // Ako je host izašao iz privatne sobe, zatvori sobu
                if (soba.host === socket.id && !soba.javna) {
                    io.to(kodSobe).emit('hostJeNapustioSobu');
                    delete sobe[kodSobe];
                } else if (soba.igraci.length === 0) {
                    delete sobe[kodSobe]; // Soba je prazna, obriši je
                } else {
                    // Ako je igra u toku, a igrač je izašao, proveravamo da li sad svi preostali čekaju bodovanje
                    const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                    if (sviPoslali && soba.status === 'u_igri' && soba.igraci.length > 0) {
                        io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                    }
                }
                break;
            }
        }
    }

    // 6. TRAŽENJE JAVNE SOBE (MATCHMAKING)
    socket.on('traziJavnuSobu', (podaci, callback) => {
        const { brojIgraca, ime } = podaci;
        let nadjenaSoba = null;

        // Pokušaj da nađeš postojeću javnu sobu koja čeka igrače
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            // Tražimo sobu koja je javna, čeka igrače, ima isti traženi kapacitet i ima slobodnih mesta
            if (soba.javna && soba.status === 'cekanje' && soba.maxIgraca === brojIgraca && soba.igraci.length < soba.maxIgraca) {
                nadjenaSoba = soba;
                break;
            }
        }

        if (nadjenaSoba) {
            // Soba pronađena! Pridruži igrača
            nadjenaSoba.igraci.push({ id: socket.id, ime: ime || `Igrač ${nadjenaSoba.igraci.length + 1}`, spremniOdgovori: false });
            socket.join(nadjenaSoba.id);
            console.log(`Igrač ${socket.id} ušao u JAVNU sobu ${nadjenaSoba.id}`);

            // Obavesti sve u sobi (i starog i novog igrača) o novom stanju
            io.to(nadjenaSoba.id).emit('azuriranjeJavneSobe', {
                brojIgraca: nadjenaSoba.igraci.length,
                max: nadjenaSoba.maxIgraca
            });

            // AUTOMATSKO POKRETANJE IGRE KADA SE SOBA NAPUNI
            if (nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca) {
                nadjenaSoba.status = 'u_igri';
                nadjenaSoba.trenutnaRunda++;
                nadjenaSoba.odgovoriOveRunde = [];
                nadjenaSoba.igraci.forEach(i => i.spremniOdgovori = false);

                let dostupnaSlova = svaSlova.filter(s => !nadjenaSoba.iskoriscenaSlova.includes(s));
                if (dostupnaSlova.length === 0) dostupnaSlova = svaSlova;
                const zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
                nadjenaSoba.iskoriscenaSlova.push(zadatoSlovo);

                // Malo odlaganje (1.5s) da bi klijenti videli da je soba puna pre nego što krene
                setTimeout(() => {
                    io.to(nadjenaSoba.id).emit('igraPocela', { slovo: zadatoSlovo, runda: nadjenaSoba.trenutnaRunda });
                    console.log(`Javna igra automatski počela u sobi ${nadjenaSoba.id}. Slovo: ${zadatoSlovo}`);
                }, 1500);
            }

            callback({ uspeh: true, kodSobe: nadjenaSoba.id, isHost: false });
        } else {
            // Nema slobodne sobe, kreiraj novu javnu sobu
            const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let kodSobe = "";
            for (let i = 0; i < 5; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); // 5 karaktera za javne

            sobe[kodSobe] = {
                id: kodSobe,
                host: socket.id, // Kod javnih soba host nema posebnu funkciju za pokretanje igre, služi samo za evindenciju
                maxIgraca: brojIgraca,
                igraci: [{ id: socket.id, ime: ime || "Igrač 1", spremniOdgovori: false }],
                status: 'cekanje',
                iskoriscenaSlova: [],
                trenutnaRunda: 0,
                odgovoriOveRunde: [],
                javna: true // Oznaka da je ovo javna soba iz Matchmaking-a
            };

            socket.join(kodSobe);
            console.log(`Nova JAVNA soba kreirana: ${kodSobe} od strane ${socket.id}`);
            
            callback({ uspeh: true, kodSobe: kodSobe, isHost: true }); // U javnoj sobi "isHost" nije preterano bitan za korisnika
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});