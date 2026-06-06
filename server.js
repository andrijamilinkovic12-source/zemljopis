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
    nadimakNormalizovan: { type: String, unique: true, sparse: true },
    profilKljuc: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: "atlas" },
    dukati: { type: Number, default: 500 },
    tokeni: { type: Number, default: 3 },
    sezonskiPojmovi: { type: Number, default: 0 },
    svaVremenaPojmovi: { type: Number, default: 0 },
    pobede: { type: Number, default: 0 },
    // POLJA ZA TOP LISTU POENA
    najboljiMecPoeni: { type: Number, default: 0 },
    nedeljniPoeni: { type: Number, default: 0 },
    mesecniPoeni: { type: Number, default: 0 },
    svaVremenaPoeni: { type: Number, default: 0 },
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
const DOZVOLJENI_AVATARI = new Set([
    "atlas", "luna", "orion", "tara", "niko", "mila",
    "sava", "zara", "vuk", "iris", "leo", "nova"
]);

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

function ocistiNadimak(vrednost) {
    return String(vrednost || "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizujNadimak(vrednost) {
    return ocistiNadimak(vrednost).toLocaleLowerCase("sr");
}

function nadimakJeIspravan(nadimak) {
    return nadimak.length >= 2
        && nadimak.length <= 20
        && /^[\p{L}\p{N}_ -]+$/u.test(nadimak);
}

function profilKljucJeIspravan(profilKljuc) {
    return typeof profilKljuc === "string"
        && profilKljuc.length >= 16
        && profilKljuc.length <= 100
        && /^[a-zA-Z0-9_-]+$/.test(profilKljuc);
}

function podaciProfilaZaKlijenta(igrac) {
    return {
        nadimak: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        dukati: igrac.dukati,
        tokeni: igrac.tokeni,
        sezonskiPojmovi: igrac.sezonskiPojmovi,
        svaVremenaPojmovi: igrac.svaVremenaPojmovi
    };
}

function prijaviOnlineIgraca(socket, igrac) {
    onlineIgraci[socket.id] = {
        id: socket.id,
        ime: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        bazaId: igrac._id
    };
    io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    socket.emit('podaciProfila', podaciProfilaZaKlijenta(igrac));
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
        if (soba.trenutnaRunda >= 6) {
            soba.status = 'zavrsena';
        }
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

    // --- REGISTRACIJA OBAVEZNOG PROFILA I REZERVACIJA NADIMKA ---
    socket.on('registrujProfil', async (podaci, callback = () => {}) => {
        const nadimak = ocistiNadimak(podaci && podaci.nadimak);
        const nadimakNormalizovan = normalizujNadimak(nadimak);
        const profilKljuc = podaci && podaci.profilKljuc;
        const avatar = podaci && podaci.avatar;

        if (!profilKljucJeIspravan(profilKljuc)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_PROFIL", poruka: "Profil nije ispravan. Ponovo pokreni aplikaciju." });
        }
        if (!nadimakJeIspravan(nadimak)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_NADIMAK", poruka: "Nadimak mora imati 2-20 slova ili brojeva." });
        }
        if (!DOZVOLJENI_AVATARI.has(avatar)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_AVATAR", poruka: "Izaberi jedan od ponuđenih avatara." });
        }

        try {
            let igrac = await Igrac.findOne({ profilKljuc });
            const zauzetiProfil = await Igrac.findOne({
                $or: [
                    { nadimakNormalizovan },
                    { nadimak: { $regex: `^${nadimak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" } }
                ]
            });

            if (zauzetiProfil && (!igrac || String(zauzetiProfil._id) !== String(igrac._id))) {
                if (zauzetiProfil.profilKljuc && zauzetiProfil.profilKljuc !== profilKljuc) {
                    return callback({ uspeh: false, kod: "NADIMAK_ZAUZET", poruka: "Ovaj nadimak je već zauzet. Izaberi drugi." });
                }

                // Jednokratna migracija profila napravljenih prije uvođenja vlasničkog ključa.
                igrac = zauzetiProfil;
            }

            if (igrac) {
                igrac.nadimak = nadimak;
                igrac.nadimakNormalizovan = nadimakNormalizovan;
                igrac.profilKljuc = profilKljuc;
                igrac.avatar = avatar;
                igrac.poslednjaPrijava = new Date();
                await igrac.save();
            } else {
                igrac = await Igrac.create({
                    nadimak,
                    nadimakNormalizovan,
                    profilKljuc,
                    avatar
                });
            }

            prijaviOnlineIgraca(socket, igrac);
            callback({ uspeh: true, profil: podaciProfilaZaKlijenta(igrac) });
            console.log(`👤 Profil ${nadimak} je registrovan i povezan.`);
        } catch (error) {
            if (error && error.code === 11000) {
                return callback({ uspeh: false, kod: "NADIMAK_ZAUZET", poruka: "Ovaj nadimak je već zauzet. Izaberi drugi." });
            }
            console.error("Greška pri registraciji profila:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA", poruka: "Profil trenutno nije moguće sačuvati. Pokušaj ponovo." });
        }
    });

    // --- AUTOMATSKA PRIJAVA VEĆ REGISTROVANOG PROFILA ---
    socket.on('prijavaProfila', async (podaci, callback = () => {}) => {
        const profilKljuc = podaci && podaci.profilKljuc;
        if (!profilKljucJeIspravan(profilKljuc)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_PROFIL" });
        }

        try {
            const igrac = await Igrac.findOne({ profilKljuc });
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRONADJEN" });
            }

            igrac.poslednjaPrijava = new Date();
            await igrac.save();
            prijaviOnlineIgraca(socket, igrac);
            callback({ uspeh: true, profil: podaciProfilaZaKlijenta(igrac) });
        } catch (error) {
            console.error("Greška pri prijavi profila:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    // Stare verzije aplikacije više ne mogu prisvojiti postojeći nadimak bez vlasničkog ključa.
    socket.on('prijavaNadimka', (ime, callback = () => {}) => {
        callback({
            uspeh: false,
            kod: "AZURIRANJE_OBAVEZNO",
            poruka: "Ažuriraj aplikaciju i kreiraj svoj zaštićeni profil."
        });
    });

    socket.on('dodajPojmove', async (brojPojmova) => {
        if (onlineIgraci[socket.id]) {
            try {
                await Igrac.findOneAndUpdate(
                    { nadimak: onlineIgraci[socket.id].ime },
                    { $inc: { sezonskiPojmovi: brojPojmova, svaVremenaPojmovi: brojPojmova } },
                    { returnDocument: 'after' }
                );
            } catch (err) {}
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
            } catch (err) {}
        }
    });

    // --- UPIS POENA U TOP LISTU NA KRAJU MEČA ---
    socket.on('upisiKrajnjiRezultat', async (poeni) => {
        if (onlineIgraci[socket.id] && poeni > 0) {
            try {
                await Igrac.findOneAndUpdate(
                    { nadimak: onlineIgraci[socket.id].ime },
                    { 
                        $inc: { nedeljniPoeni: poeni, mesecniPoeni: poeni, svaVremenaPoeni: poeni },
                        $max: { najboljiMecPoeni: poeni } // Postavlja vrednost samo ako je nova veća od stare
                    }
                );
            } catch (err) {
                console.error("Greška pri upisu poena u Top Listu:", err);
            }
        }
    });

    // --- TRAŽENJE TOP LISTE IZ BAZE (Poeni umesto broja pojmova) ---
    socket.on('traziTopListu', async () => {
        try {
            const topNajboljiMec = await Igrac.find().sort({ najboljiMecPoeni: -1 }).limit(50).select('nadimak najboljiMecPoeni');
            const topNedeljni = await Igrac.find().sort({ nedeljniPoeni: -1 }).limit(50).select('nadimak nedeljniPoeni');
            const topMesecni = await Igrac.find().sort({ mesecniPoeni: -1 }).limit(50).select('nadimak mesecniPoeni');
            const topSvaVremena = await Igrac.find().sort({ svaVremenaPoeni: -1 }).limit(50).select('nadimak svaVremenaPoeni');
            
            socket.emit('topListaOdgovor', { 
                najboljiMec: topNajboljiMec, 
                nedeljni: topNedeljni,
                mesecni: topMesecni,
                svaVremena: topSvaVremena
            });
        } catch (err) {
            console.error("Greška pri povlačenju top liste:", err);
        }
    });

    // --- 1. KREIRANJE PRIVATNE SOBE ---
    socket.on('kreirajSobu', (brojIgraca, callback) => {
        if (!onlineIgraci[socket.id]) {
            return callback({ uspeh: false, poruka: "Prvo kreiraj i potvrdi svoj profil." });
        }

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: brojIgraca,
            igraci: [{ id: socket.id, ime: onlineIgraci[socket.id].ime, spremniOdgovori: false, spremniZaSledecuRundu: false }],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            timeoutRunde: null
        };

        socket.join(kodSobe);
        callback({ uspeh: true, kodSobe: kodSobe });
    });

    // --- 1b. KREIRANJE PRIVATNE SOBE I POZIVANJE PRIJATELJA ---
    socket.on('kreirajSobuIPozovi', (podaci, callback) => {
        if (!onlineIgraci[socket.id]) {
            return callback({ uspeh: false, poruka: "Prvo kreiraj i potvrdi svoj profil." });
        }

        let brojIgraca = podaci.pozvani.length + 1;
        if (brojIgraca === 1) brojIgraca = 5; 

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: brojIgraca,
            igraci: [{ id: socket.id, ime: onlineIgraci[socket.id].ime, spremniOdgovori: false, spremniZaSledecuRundu: false }],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            timeoutRunde: null
        };

        socket.join(kodSobe);
        
        const hostIme = onlineIgraci[socket.id].ime;
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
        if (!onlineIgraci[socket.id]) {
            return callback({ uspeh: false, poruka: "Prvo kreiraj i potvrdi svoj profil." });
        }

        const kodSobe = podaci.kodSobe.toUpperCase();
        const soba = sobe[kodSobe];

        if (!soba) return callback({ uspeh: false, poruka: "Soba ne postoji!" });
        if (soba.status !== 'cekanje') return callback({ uspeh: false, poruka: "Igra u ovoj sobi je već počela!" });
        if (soba.igraci.length >= soba.maxIgraca) return callback({ uspeh: false, poruka: "Soba je puna!" });

        soba.igraci.push({ id: socket.id, ime: onlineIgraci[socket.id].ime, spremniOdgovori: false, spremniZaSledecuRundu: false });
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
                    if (soba.trenutnaRunda >= 6) {
                        soba.status = 'zavrsena';
                    }
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
        if (!onlineIgraci[socket.id]) {
            return callback({ uspeh: false, poruka: "Prvo kreiraj i potvrdi svoj profil." });
        }

        const brojIgraca = Number(podaci.brojIgraca);
        const ime = onlineIgraci[socket.id].ime;
        let nadjenaSoba = null;

        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            if (soba.javna && soba.status === 'cekanje' && soba.maxIgraca === brojIgraca && soba.igraci.length < soba.maxIgraca) {
                nadjenaSoba = soba;
                break;
            }
        }

        if (nadjenaSoba) {
            nadjenaSoba.igraci.push({ id: socket.id, ime, spremniOdgovori: false, spremniZaSledecuRundu: false });
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
                igraci: [{ id: socket.id, ime, spremniOdgovori: false, spremniZaSledecuRundu: false }],
                status: 'cekanje', iskoriscenaSlova: [], trenutnaRunda: 0, odgovoriOveRunde: [], javna: true, timeoutRunde: null
            };

            socket.join(kodSobe);
            callback({ uspeh: true, kodSobe: kodSobe, isHost: true });
        }
    });

    // --- 6. NAPUŠTANJE I DISCONNECT ---
    socket.on('napustiSobu', (razlog) => ukloniIgracaIzSoba(socket, razlog));

    socket.on('disconnect', () => {
        ukloniIgracaIzSoba(socket, 'diskonekt');
        delete onlineIgraci[socket.id]; 
        io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    });

    function ukloniIgracaIzSoba(socket, razlog = "napustio") {
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            const index = soba.igraci.findIndex(i => i.id === socket.id);
            
            if (index !== -1) {
                const igracKojiIzlazi = soba.igraci[index];
                soba.igraci.splice(index, 1);
                
                io.to(kodSobe).emit('igracNapustioSobu', { 
                    ostaloIgraca: soba.igraci.length,
                    ime: igracKojiIzlazi.ime,
                    uIgri: soba.status === 'u_igri', 
                    razlog: razlog
                });

                if (soba.status === 'u_igri' && soba.igraci.length === 1) {
                    io.to(kodSobe).emit('pobedaZbogNapustanja');
                    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
                    delete sobe[kodSobe];
                    break;
                }
                
                if (soba.host === socket.id && !soba.javna && soba.status !== 'u_igri') {
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
                        if (soba.trenutnaRunda >= 6) {
                            soba.status = 'zavrsena';
                        }
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
            
            if (podaci.prihvaceno) {
                let imePosiljaoca = onlineIgraci[podaci.ciljId].ime;
                
                osigurajBazu(primalac.ime);
                osigurajBazu(imePosiljaoca);
                
                if (!bazaPrijatelja[primalac.ime].prijatelji.some(p => p.ime === imePosiljaoca)) {
                    bazaPrijatelja[primalac.ime].prijatelji.push({ ime: imePosiljaoca, poeni: 0, pojmovi: 0, indeks: '0%' });
                }
                if (!bazaPrijatelja[imePosiljaoca].prijatelji.some(p => p.ime === primalac.ime)) {
                    bazaPrijatelja[imePosiljaoca].prijatelji.push({ ime: primalac.ime, poeni: 0, pojmovi: 0, indeks: '0%' });
                }

                let podaciPrimalac = bazaPrijatelja[primalac.ime];
                podaciPrimalac.prijatelji.forEach(p => p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase()));
                socket.emit('sinhronizacijaPrijatelja', podaciPrimalac);

                let podaciPosiljaoca = bazaPrijatelja[imePosiljaoca];
                podaciPosiljaoca.prijatelji.forEach(p => p.online = Object.values(onlineIgraci).some(oi => oi.ime.toLowerCase() === p.ime.toLowerCase()));
                io.to(podaci.ciljId).emit('sinhronizacijaPrijatelja', podaciPosiljaoca);
            }
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
