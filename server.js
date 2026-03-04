// server.js - Backend za Zemljopis Multiplayer
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Inicijalizacija Socket.IO sa dozvolom za povezivanje sa bilo kog domena (CORS)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Ovde čuvamo trenutne sobe i igrače u memoriji servera
const sobe = {}; 

// Sva dostupna slova za igru (prilagođeno tvojoj abecedi)
const svaSlova = ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","LJ","M","N","NJ","O","P","R","S","T","Ć","U","F","H","C","Č","DŽ","Š"];

// Kada se neki igrač poveže na server (upali aplikaciju)
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
            igraci: [{ id: socket.id, ime: "Host" }],
            status: 'cekanje' // cekanje, u_igri
        };

        socket.join(kodSobe);
        console.log(`Soba kreirana: ${kodSobe} (Host: ${socket.id})`);
        
        // Vraćamo kod sobe nazad onome ko je tražio
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // 2. PRIDRUŽIVANJE SOBI PREKO KODA
    socket.on('pridruziSeSobi', (podaci, callback) => {
        const kodSobe = podaci.kodSobe.toUpperCase();
        const soba = sobe[kodSobe];

        if (!soba) {
            return callback({ uspeh: false, poruka: "Soba ne postoji!" });
        }
        if (soba.status !== 'cekanje') {
            return callback({ uspeh: false, poruka: "Igra u ovoj sobi je već počela!" });
        }
        if (soba.igraci.length >= soba.maxIgraca) {
            return callback({ uspeh: false, poruka: "Soba je puna!" });
        }

        // Dodaj igrača u sobu
        soba.igraci.push({ id: socket.id, ime: podaci.ime || `Igrač ${soba.igraci.length + 1}` });
        socket.join(kodSobe);

        console.log(`Igrač ${socket.id} je ušao u sobu ${kodSobe}`);

        // Javi svima u sobi da je neko novi ušao (da bi host znao)
        io.to(kodSobe).emit('noviIgracUSobi', { brojIgraca: soba.igraci.length, max: soba.maxIgraca });

        callback({ uspeh: true, poruka: "Uspešno povezan!" });
    });

    // 3. POKRETANJE IGRE (samo Host može da pozove)
    socket.on('pokreniIgru', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba && soba.host === socket.id) {
            soba.status = 'u_igri';
            
            // Nasumično biramo slovo za prvu rundu
            const zadatoSlovo = svaSlova[Math.floor(Math.random() * svaSlova.length)];
            
            // Šaljemo svim igračima u sobi signal da igra počinje i koje je slovo
            io.to(kodSobe).emit('igraPocela', { slovo: zadatoSlovo });
            console.log(`Igra u sobi ${kodSobe} je počela. Slovo: ${zadatoSlovo}`);
        }
    });

    // 4. DISKONEKCIJA (Kada neko izađe iz aplikacije)
    socket.on('disconnect', () => {
        console.log(`Igrač otišao: ${socket.id}`);
        // Logika za brisanje igrača iz soba bi išla ovde
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            const index = soba.igraci.findIndex(i => i.id === socket.id);
            if (index !== -1) {
                soba.igraci.splice(index, 1);
                io.to(kodSobe).emit('igracNapustioSobu', { ostaloIgraca: soba.igraci.length });
                
                // Ako je soba ostala prazna, brišemo je
                if (soba.igraci.length === 0) {
                    delete sobe[kodSobe];
                }
                break;
            }
        }
    });
});

// Render zahteva da server sluša na portu koji on dodeli preko process.env.PORT
// Ako ga nema (npr. testiraš na svom kompjuteru), koristiće port 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});