// server.js - Backend za Zemljopis Multiplayer sa MongoDB Integracijom
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// ==========================================
// 1. MONGODB BAZA PODATAKA (Povezivanje)
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ Kriticna greska: MONGO_URI nije definisan u .env fajlu!');
    process.exit(1); 
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Uspesno povezan na MongoDB bazu: zemljopis_db!'))
    .catch((err) => console.error('❌ Greska pri povezivanju na MongoDB:', err));

// ==========================================
// 2. MODEL IGRAČA U BAZI
// ==========================================
const IgracSchema = new mongoose.Schema({
    nadimak: { type: String, required: true, unique: true },
    dukati: { type: Number, default: 500 },
    tokeni: { type: Number, default: 3 },
    sezonskiPojmovi: { type: Number, default: 0 },
    svaVremenaPojmovi: { type: Number, default: 0 },
    pobede: { type: Number, default: 0 },
    poslednjaPrijava: { type: Date, default: Date.now }
});

const Igrac = mongoose.model('Igrac', IgracSchema);


// ==========================================
// 3. GLOBALNE VARIJABLE (Sobe, Chat, Prijatelji)
// ==========================================
const sobe = {}; 
const svaSlova = ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","LJ","M","N","NJ","O","P","R","S","T","Ć","U","F","H","C","Č","DŽ","Š"];

const MAX_PORUKA_ISTORIJA = 50;
let istorijaChata = [];
const onlineIgraci = {}; 
const bazaPrijatelja = {};

function osigurajBazu(ime) {
    if (!bazaPrijatelja[ime]) {
        bazaPrijatelja[ime] = { prijatelji: [], zahtevi: [] };
    }
}

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

// Pomoćne funkcije za igru
function zapocniRunduUSobi(soba, io) {
    soba.status = 'u_igri';
    soba.trenutnaRunda++;
    soba.odgovoriOveRunde = [];

    soba.igraci.forEach(i => {
        i.spremniOdgovori = false;
        i.spremniZaSledecuRundu = false;
    });

    let dostupnaSlova = svaSlova.filter(s => !soba.iskoriscenaSlova.includes(s));
    if (dostupnaSlova.length === 0) dostupnaSlova = svaSlova;
    
    const zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
    soba.iskoriscenaSlova.push(zadatoSlovo);

    if (soba.trenutnaRunda === 1) {
        io.to(soba.id).emit('igraPocela', { slovo: zadatoSlovo, runda: soba.trenutnaRunda });
    } else {
        io.to(soba.id).emit('sledecaRundaPocinje', { slovo: zadatoSlovo, runda: soba.trenutnaRunda });
    }

    console.log(`Runda ${soba.trenutnaRunda} u sobi ${soba.id} počela. Slovo: ${zadatoSlovo}`);

    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    soba.timeoutRunde = setTimeout(() => {
        console.log(`⏳ Istekao sigurnosni tajmer za sobu ${soba.id}. Forsiram prosleđivanje odgovora.`);
        io.to(soba.id).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
    }, 125000);
}

function proveriIPokreniSledecuRundu(soba) {
    if (soba.igraci.length === 0) return;
    const sviSpremni = soba.igraci.every(i => i.spremniZaSledecuRundu);
    if (sviSpremni && soba.status === 'u_igri') {
        zapocniRunduUSobi(soba, io);
    }
}


// ==========================================
// 4. GLAVNA SOCKET.IO LOGIKA
// ==========================================
io.on('connection', (socket) => {
    console.log(`🟢 Novi igrač se povezao: ${socket.id}`);

    // --- PRIJAVA IGRAČA I ČITANJE IZ BAZE ---
    socket.on('prijavaNadimka', async (ime) => {
        const cistoIme = escapeHTML(ime).substring(0, 20);
        try {
            let igrac = await Igrac.findOneAndUpdate(
                { nadimak: cistoIme },
                { $setOnInsert: { dukati: 500, tokeni: 3, sezonskiPojmovi: 0, svaVremenaPojmovi: 0, pobede: 0 } },
                { upsert: true, returnDocument: 'after' }
            );

            onlineIgraci[socket.id] = { id: socket.id, ime: igrac.nadimak, bazaId: igrac._id };
            io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
            
            socket.emit('podaciProfila', {
                dukati: igrac.dukati,
                tokeni: igrac.tokeni,
                sezonskiPojmovi: igrac.sezonskiPojmovi,
                svaVremenaPojmovi: igrac.svaVremenaPojmovi
            });

            console.log(`👤 Igrač ${cistoIme} je povezan i učitan iz baze.`);
        } catch (error) {
            console.error("Greška pri prijavi igrača (Baza):", error);
            onlineIgraci[socket.id] = { id: socket.id, ime: cistoIme };
            io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
        }
    });

    // --- ČUVANJE POENA U BAZI KADA SE ZAVRŠI RUNDA/IGRA ---
    socket.on('dodajPojmove', async (brojPojmova) => {
        if (onlineIgraci[socket.id]) {
            try {
                await Igrac.findOneAndUpdate(
                    { nadimak: onlineIgraci[socket.id].ime },
                    { $inc: { sezonskiPojmovi: brojPojmova, svaVremenaPojmovi: brojPojmova } },
                    { returnDocument: 'after' }
                );
            } catch (err) {
                console.error("Greška pri čuvanju pojmova:", err);
            }
        }
    });

    socket.on('upisiPobedu', async () => {
        if (onlineIgraci[socket.id]) {
            try {
                await Igrac.findOneAndUpdate(
                    { nadimak: onlineIgraci[socket.id].ime },
                    { $inc: { pobede: 1 } },
                    { returnDocument: 'after' }
                );
            } catch (err) {
                console.error("Greška pri čuvanju pobede:", err);
            }
        }
    });

    // --- TRAŽENJE TOP LISTE IZ BAZE ---
    socket.on('traziTopListu', async () => {
        try {
            const topSezona = await Igrac.find().sort({ sezonskiPojmovi: -1 }).limit(50).select('nadimak sezonskiPojmovi');
            const topSvaVremena = await Igrac.find().sort({ svaVremenaPojmovi: -1 }).limit(50).select('nadimak svaVremenaPojmovi');
            
            socket.emit('topListaOdgovor', { sezona: topSezona, svaVremena: topSvaVremena });
        } catch (err) {
            console.error("Greška pri povlačenju top liste:", err);
        }
    });


    // --- 1. KREIRANJE PRIVATNE SOBE ---
    socket.on('kreirajSobu', (brojIgraca, callback) => {
        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

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
        console.log(`🏠 Soba kreirana: ${kodSobe} (Host: ${socket.id})`);
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // --- 1b. KREIRANJE PRIVATNE SOBE I POZIVANJE PRIJATELJA ---
    socket.on('kreirajSobuIPozovi', (podaci, callback) => {
        let brojIgraca = podaci.pozvani.length + 1;
        if (brojIgraca === 1) brojIgraca = 5; 

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        // ISPRAVLJENO: Koristimo karakteri.length umesto calculations.length
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

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
        
        const hostIme = onlineIgraci[socket.id] ? onlineIgraci[socket.id].ime : "Tvoj prijatelj";
        podaci.pozvani.forEach(imePrijatelja => {
            const ciljSocket = Object.values(onlineIgraci).find(oi => oi.ime.toLowerCase() === imePrijatelja.toLowerCase());
            if (ciljSocket) {
                io.to(ciljSocket.id).emit('pozivUSobu', { kodSobe: kodSobe, hostIme: hostIme });
            }
        });

        callback({ uspeh: true, kodSobe: kodSobe, brojIgraca: brojIgraca });
    });

    // --- 2. PRIDRUŽIVANJE SOBI ---
    socket.on('pridruziSeSobi', (podaci, callback) => {
        const kodSobe = podaci.kodSobe.toUpperCase();
        const soba = sobe[kodSobe];

        if (!soba) return callback({ uspeh: false, poruka: "Soba ne postoji!" });
        if (soba.status !== 'cekanje') return callback({ uspeh: false, poruka: "Igra u ovoj sobi je već počela!" });
        if (soba.igraci.length >= soba.maxIgraca) return callback({ uspeh: false, poruka: "Soba je puna!" });

        soba.igraci.push({ id: socket.id, ime: podaci.ime || `Igrač ${soba.igraci.length + 1}`, spremniOdgovori: false, spremniZaSledecuRundu: false });
        socket.join(kodSobe);

        io.to(kodSobe).emit('noviIgracUSobi', { brojIgraca: soba.igraci.length, max: soba.maxIgraca });
        callback({ uspeh: true, poruka: "Uspešno povezan!" });
    });

    // --- 3. POKRETANJE IGRE (Privatna soba) ---
    socket.on('pokreniIgru', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba && soba.host === socket.id && soba.status === 'cekanje') {
            zapocniRunduUSobi(soba, io);
        }
    });

    // --- 4. ODGOVORI I SLEDEĆA RUNDA ---
    socket.on('posaljiOdgovore', (podaci) => {
        const { kodSobe, odgovori } = podaci;
        const soba = sobe[kodSobe];

        if (soba) {
            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac && !igrac.spremniOdgovori) {
                igrac.spremniOdgovori = true;
                soba.odgovoriOveRunde.push({ idIgraca: socket.id, ime: igrac.ime, odgovori: odgovori });

                const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                if (sviPoslali) {
                    if (soba.timeoutRunde) { clearTimeout(soba.timeoutRunde); soba.timeoutRunde = null; }
                    io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                }
            }
        }
    });

    socket.on('spremanZaSledecuRundu', (kodSobe) => {
        const soba = sobe[kodSobe];
        if (soba) {
            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac) {
                igrac.spremniZaSledecuRundu = true;
                proveriIPokreniSledecuRundu(soba);
            }
        }
    });

    // --- 5. MATCHMAKING JAVNE SOBE ---
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

            io.to(nadjenaSoba.id).emit('azuriranjeJavneSobe', { brojIgraca: nadjenaSoba.igraci.length, max: nadjenaSoba.maxIgraca });

            if (nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca) {
                setTimeout(() => zapocniRunduUSobi(nadjenaSoba, io), 1500);
            }
            callback({ uspeh: true, kodSobe: nadjenaSoba.id, isHost: false });
        } else {
            const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let kodSobe = "";
            for (let i = 0; i < 5; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

            sobe[kodSobe] = {
                id: kodSobe, host: socket.id, maxIgraca: brojIgraca,
                igraci: [{ id: socket.id, ime: ime || "Igrač 1", spremniOdgovori: false, spremniZaSledecuRundu: false }],
                status: 'cekanje', iskoriscenaSlova: [], trenutnaRunda: 0, odgovoriOveRunde: [], javna: true, timeoutRunde: null
            };

            socket.join(kodSobe);
            callback({ uspeh: true, kodSobe: kodSobe, isHost: true });
        }
    });

    // --- 6. NAPUŠTANJE I DISCONNECT ---
    socket.on('napustiSobu', () => ukloniIgracaIzSoba(socket));

    socket.on('disconnect', () => {
        ukloniIgracaIzSoba(socket);
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
                        if (soba.timeoutRunde) { clearTimeout(soba.timeoutRunde); soba.timeoutRunde = null; }
                        io.to(kodSobe).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde);
                    }
                    proveriIPokreniSledecuRundu(soba);
                }
                break;
            }
        }
    }

    // --- 7. CHAT LOGIKA ---
    socket.on('traziIstorijuChata', () => socket.emit('istorijaChata', istorijaChata));

    socket.on('posaljiGlobalnuPoruku', (podaci) => {
        const poruka = { id: socket.id, ime: escapeHTML(podaci.ime).substring(0, 20), tekst: escapeHTML(podaci.tekst).substring(0, 200) };
        istorijaChata.push(poruka);
        if (istorijaChata.length > MAX_PORUKA_ISTORIJA) istorijaChata.shift(); 
        io.emit('novaGlobalnaPoruka', poruka);
    });

    // --- 8. OFLAJN PRIJATELJI I ZAHTEVI ---
    socket.on('traziOnlineIgrace', () => {
        const lista = Object.values(onlineIgraci).filter(igrac => igrac.id !== socket.id);
        socket.emit('listaOnlineIgraca', lista);
    });

    socket.on('posaljiZahtevZaPrijateljstvo', (podaci) => {
        const posiljalac = onlineIgraci[socket.id];
        if (posiljalac && onlineIgraci[podaci.ciljId]) {
            io.to(podaci.ciljId).emit('zahtevZaPrijateljstvo', { idPosiljaoca: socket.id, imePosiljaoca: posiljalac.ime });
        }
    });

    socket.on('odgovorNaZahtev', (podaci) => {
        const primalac = onlineIgraci[socket.id];
        if (primalac && onlineIgraci[podaci.ciljId]) {
            io.to(podaci.ciljId).emit('odgovorPrijateljstvo', { prihvaceno: podaci.prihvaceno, idPrijatelja: socket.id, imePrijatelja: primalac.ime });
        }
    });

    socket.on('traziOsvezenjePrijatelja', () => {
        const ja = onlineIgraci[socket.id];
        if (ja) {
            osigurajBazu(ja.ime);
            let mojiPodaci = bazaPrijatelja[ja.ime];
            mojiPodaci.prijatelji.forEach(p => p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase()));
            socket.emit('sinhronizacijaPrijatelja', mojiPodaci);
        }
    });

    socket.on('posaljiOfflineZahtev', (ciljIme) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) return;
        const cistoCiljIme = escapeHTML(ciljIme).substring(0, 20);
        osigurajBazu(cistoCiljIme);

        if (!bazaPrijatelja[cistoCiljIme].zahtevi.includes(ja.ime) && !bazaPrijatelja[cistoCiljIme].prijatelji.some(p => p.ime === ja.ime)) {
            bazaPrijatelja[cistoCiljIme].zahtevi.push(ja.ime);
            const ciljSocket = Object.values(onlineIgraci).find(oi => oi.ime.toLowerCase() === cistoCiljIme.toLowerCase());
            if (ciljSocket) io.to(ciljSocket.id).emit('noviOfflineZahtev', ja.ime);
        }
    });

    socket.on('odgovorNaOfflineZahtev', (podaci) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) return;

        osigurajBazu(ja.ime);
        const { imePosiljaoca, prihvaceno } = podaci;
        bazaPrijatelja[ja.ime].zahtevi = bazaPrijatelja[ja.ime].zahtevi.filter(z => z !== imePosiljaoca);

        if (prihvaceno) {
            osigurajBazu(imePosiljaoca);
            if (!bazaPrijatelja[ja.ime].prijatelji.some(p => p.ime === imePosiljaoca)) bazaPrijatelja[ja.ime].prijatelji.push({ ime: imePosiljaoca, poeni: 0, pojmovi: 0, indeks: '0%' });
            if (!bazaPrijatelja[imePosiljaoca].prijatelji.some(p => p.ime === ja.ime)) bazaPrijatelja[imePosiljaoca].prijatelji.push({ ime: ja.ime, poeni: 0, pojmovi: 0, indeks: '0%' });

            const posiljalacSocket = Object.values(onlineIgraci).find(oi => oi.ime === imePosiljaoca);
            if (posiljalacSocket) {
                let podaciPosiljaoca = bazaPrijatelja[imePosiljaoca];
                podaciPosiljaoca.prijatelji.forEach(p => p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase()));
                io.to(posiljalacSocket.id).emit('sinhronizacijaPrijatelja', podaciPosiljaoca);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});