// server.js - Backend za Zemljopis Multiplayer sa MongoDB Integracijom
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const crypto = require('crypto');

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
    playerId: { type: String, unique: true, sparse: true, default: () => crypto.randomUUID() },
    nadimak: { type: String, required: true, unique: true },
    nadimakNormalizovan: { type: String, unique: true, sparse: true },
    profilKljuc: { type: String, unique: true, sparse: true },
    googleUid: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: "atlas" },
    prijatelji: { type: [String], default: [] },
    zahteviPrijateljstva: {
        type: [{
            _id: false,
            playerId: { type: String, required: true },
            poslatoAt: { type: Date, default: Date.now }
        }],
        default: []
    },
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
    cloudNapredak: { type: mongoose.Schema.Types.Mixed, default: {} },
    cloudRevizija: { type: Number, default: 0 },
    lokalnaMigracijaZavrsena: { type: Boolean, default: false },
    cloudAzuriranAt: { type: Date, default: null },
    poslednjaPrijava: { type: Date, default: Date.now }
}, { minimize: false });

const Igrac = mongoose.model('Igrac', IgracSchema);

// ==========================================
// 3. GLOBALNE VARIJABLE (Sobe, Chat, Prijatelji)
// ==========================================
const sobe = {}; 
const svaSlova = ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","LJ","M","N","NJ","O","P","R","S","T","Ć","U","F","H","C","Č","DŽ","Š"];

const MAX_PORUKA_ISTORIJA = 50;
let istorijaChata = [];
const onlineIgraci = {}; 
const DOZVOLJENI_AVATARI = new Set([
    "atlas", "luna", "orion", "tara", "niko", "mila",
    "sava", "zara", "vuk", "iris", "leo", "nova"
]);

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

function osigurajIdentitetIgraca(igrac) {
    if (!igrac.playerId) {
        igrac.playerId = crypto.randomUUID();
    }
    return igrac;
}

function bezbednaJSONKopija(vrednost, dubina = 0) {
    if (dubina > 8) return null;
    if (vrednost === null || typeof vrednost === "boolean") return vrednost;
    if (typeof vrednost === "number") return Number.isFinite(vrednost) ? vrednost : 0;
    if (typeof vrednost === "string") return vrednost.slice(0, 500);
    if (Array.isArray(vrednost)) {
        return vrednost.slice(0, 300).map(stavka => bezbednaJSONKopija(stavka, dubina + 1));
    }
    if (typeof vrednost === "object") {
        const kopija = {};
        Object.entries(vrednost).slice(0, 100).forEach(([kljuc, podatak]) => {
            if (
                typeof kljuc === "string"
                && kljuc.length <= 60
                && !kljuc.startsWith("$")
                && !kljuc.includes(".")
                && kljuc !== "__proto__"
                && kljuc !== "constructor"
                && kljuc !== "prototype"
            ) {
                kopija[kljuc] = bezbednaJSONKopija(podatak, dubina + 1);
            }
        });
        return kopija;
    }
    return null;
}

function sanitizujCloudNapredak(napredak) {
    const dozvoljenaPolja = [
        "verzija",
        "podesavanja",
        "riznica",
        "trofeji",
        "dnevniIzazov",
        "tokeni",
        "kvartal",
        "prijatelji"
    ];
    const velicina = Buffer.byteLength(JSON.stringify(napredak || {}), "utf8");
    if (velicina > 150000) {
        const greska = new Error("Prevelik paket napretka.");
        greska.kod = "PREVELIK_NAPREDAK";
        throw greska;
    }

    const ocisceno = {};
    dozvoljenaPolja.forEach(polje => {
        if (napredak && Object.prototype.hasOwnProperty.call(napredak, polje)) {
            ocisceno[polje] = bezbednaJSONKopija(napredak[polje]);
        }
    });
    return ocisceno;
}

function podaciSinhronizacijeZaKlijenta(igrac) {
    return {
        revizija: igrac.cloudRevizija || 0,
        imaPodatke: Boolean(igrac.lokalnaMigracijaZavrsena),
        azurirano: igrac.cloudAzuriranAt,
        napredak: igrac.cloudNapredak || {}
    };
}

function podaciProfilaZaKlijenta(igrac) {
    osigurajIdentitetIgraca(igrac);
    return {
        playerId: igrac.playerId,
        nadimak: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        profilTip: igrac.googleUid ? "google" : "lokalni",
        googlePovezan: Boolean(igrac.googleUid),
        dukati: igrac.dukati,
        tokeni: igrac.tokeni,
        sezonskiPojmovi: igrac.sezonskiPojmovi,
        svaVremenaPojmovi: igrac.svaVremenaPojmovi,
        sinhronizacija: podaciSinhronizacijeZaKlijenta(igrac)
    };
}

function prijaviOnlineIgraca(socket, igrac) {
    osigurajIdentitetIgraca(igrac);
    onlineIgraci[socket.id] = {
        id: socket.id,
        playerId: igrac.playerId,
        ime: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        bazaId: igrac._id
    };
    io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    socket.emit('podaciProfila', podaciProfilaZaKlijenta(igrac));
    osveziPrijateljeZaSocket(socket.id).catch(error => {
        console.error("Greška pri početnom učitavanju prijatelja:", error);
    });
}

function pronadjiOnlineIgracaPoPlayerId(playerId) {
    return Object.values(onlineIgraci).find(igrac => igrac.playerId === playerId);
}

async function podaciPrijateljaZaKlijenta(igrac) {
    osigurajIdentitetIgraca(igrac);

    const prijateljIds = [...new Set((igrac.prijatelji || []).filter(Boolean))];
    const zahtevIds = [...new Set(
        (igrac.zahteviPrijateljstva || [])
            .map(zahtev => zahtev && zahtev.playerId)
            .filter(Boolean)
    )];
    const sviIds = [...new Set([...prijateljIds, ...zahtevIds])];

    const profili = sviIds.length > 0
        ? await Igrac.find({ playerId: { $in: sviIds } })
            .select('playerId nadimak avatar najboljiMecPoeni svaVremenaPojmovi')
            .lean()
        : [];
    const profiliPoId = new Map(profili.map(profil => [profil.playerId, profil]));

    const prijatelji = prijateljIds
        .map(playerId => profiliPoId.get(playerId))
        .filter(Boolean)
        .map(profil => ({
            playerId: profil.playerId,
            ime: profil.nadimak,
            avatar: profil.avatar || "atlas",
            poeni: profil.najboljiMecPoeni || 0,
            pojmovi: profil.svaVremenaPojmovi || 0,
            indeks: "0%",
            online: Boolean(pronadjiOnlineIgracaPoPlayerId(profil.playerId))
        }));

    const zahtevi = zahtevIds
        .map(playerId => profiliPoId.get(playerId))
        .filter(Boolean)
        .map(profil => ({
            playerId: profil.playerId,
            ime: profil.nadimak,
            avatar: profil.avatar || "atlas"
        }));

    return { prijatelji, zahtevi };
}

async function osveziPrijateljeZaSocket(socketId) {
    const onlineIgrac = onlineIgraci[socketId];
    if (!onlineIgrac) return;

    const igrac = await Igrac.findById(onlineIgrac.bazaId);
    if (!igrac) return;

    socketId && io.to(socketId).emit(
        'sinhronizacijaPrijatelja',
        await podaciPrijateljaZaKlijenta(igrac)
    );
}

async function posaljiTrajniZahtev(posiljalacOnline, ciljIgrac) {
    const posiljalac = await Igrac.findById(posiljalacOnline.bazaId);
    if (!posiljalac || !ciljIgrac) {
        return { uspeh: false, kod: "PROFIL_NIJE_PRONADJEN", poruka: "Igrač nije pronađen." };
    }

    osigurajIdentitetIgraca(posiljalac);
    osigurajIdentitetIgraca(ciljIgrac);
    await Promise.all([posiljalac.save(), ciljIgrac.save()]);

    if (posiljalac.playerId === ciljIgrac.playerId) {
        return { uspeh: false, kod: "SOPSTVENI_PROFIL", poruka: "Ne možeš poslati zahtev samom sebi." };
    }
    if ((posiljalac.prijatelji || []).includes(ciljIgrac.playerId)) {
        return { uspeh: false, kod: "VEC_PRIJATELJI", poruka: "Ovaj igrač ti je već prijatelj." };
    }

    const rezultat = await Igrac.updateOne(
        {
            _id: ciljIgrac._id,
            prijatelji: { $ne: posiljalac.playerId },
            "zahteviPrijateljstva.playerId": { $ne: posiljalac.playerId }
        },
        {
            $push: {
                zahteviPrijateljstva: {
                    playerId: posiljalac.playerId,
                    poslatoAt: new Date()
                }
            }
        }
    );

    if (rezultat.modifiedCount === 0) {
        return { uspeh: true, kod: "ZAHTEV_VEC_POSLAT", poruka: "Zahtev je već na čekanju." };
    }

    return {
        uspeh: true,
        kod: "ZAHTEV_POSLAT",
        zahtev: {
            playerId: posiljalac.playerId,
            ime: posiljalac.nadimak,
            avatar: posiljalac.avatar || "atlas"
        }
    };
}

async function obradiTrajniZahtev(primalacOnline, playerIdPosiljaoca, prihvaceno) {
    if (typeof playerIdPosiljaoca !== "string" || playerIdPosiljaoca.length < 10) {
        return { uspeh: false, kod: "ZAHTEV_NIJE_PRONADJEN" };
    }

    const primalac = await Igrac.findById(primalacOnline.bazaId);
    const posiljalac = await Igrac.findOne({ playerId: playerIdPosiljaoca });
    if (!primalac || !posiljalac) {
        return { uspeh: false, kod: "PROFIL_NIJE_PRONADJEN" };
    }

    osigurajIdentitetIgraca(primalac);
    const zahtevPostoji = (primalac.zahteviPrijateljstva || [])
        .some(zahtev => zahtev.playerId === posiljalac.playerId);
    if (!zahtevPostoji) {
        return { uspeh: false, kod: "ZAHTEV_NIJE_PRONADJEN" };
    }

    const operacije = [{
        updateOne: {
            filter: { _id: primalac._id },
            update: {
                $pull: { zahteviPrijateljstva: { playerId: posiljalac.playerId } },
                ...(prihvaceno ? { $addToSet: { prijatelji: posiljalac.playerId } } : {})
            }
        }
    }];

    if (prihvaceno) {
        operacije.push({
            updateOne: {
                filter: { _id: posiljalac._id },
                update: { $addToSet: { prijatelji: primalac.playerId } }
            }
        });
    }

    await Igrac.bulkWrite(operacije);
    return { uspeh: true, primalac, posiljalac };
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

                // Jednokratna migracija profila napravljenih pre uvođenja vlasničkog ključa.
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

            osigurajIdentitetIgraca(igrac);
            igrac.poslednjaPrijava = new Date();
            await igrac.save();
            prijaviOnlineIgraca(socket, igrac);
            callback({ uspeh: true, profil: podaciProfilaZaKlijenta(igrac) });
        } catch (error) {
            console.error("Greška pri prijavi profila:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    // --- VERZIONISANA REZERVNA KOPIJA NAPRETKA ZA BUDUĆI GOOGLE NALOG ---
    socket.on('sacuvajCloudNapredak', async (podaci, callback = () => {}) => {
        const prijavljeniIgrac = onlineIgraci[socket.id];
        if (!prijavljeniIgrac) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        try {
            const igrac = await Igrac.findById(prijavljeniIgrac.bazaId);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRONADJEN" });
            }

            osigurajIdentitetIgraca(igrac);
            const ocekivanaRevizija = Number(podaci && podaci.revizija);
            const trenutnaRevizija = igrac.cloudRevizija || 0;

            if (
                igrac.lokalnaMigracijaZavrsena
                && (!Number.isInteger(ocekivanaRevizija) || ocekivanaRevizija !== trenutnaRevizija)
            ) {
                return callback({
                    uspeh: false,
                    kod: "SUKOB_REVIZIJE",
                    sinhronizacija: podaciSinhronizacijeZaKlijenta(igrac)
                });
            }

            igrac.cloudNapredak = sanitizujCloudNapredak(podaci && podaci.napredak);
            igrac.cloudRevizija = trenutnaRevizija + 1;
            igrac.lokalnaMigracijaZavrsena = true;
            igrac.cloudAzuriranAt = new Date();
            await igrac.save();

            callback({
                uspeh: true,
                playerId: igrac.playerId,
                sinhronizacija: podaciSinhronizacijeZaKlijenta(igrac)
            });
        } catch (error) {
            console.error("Greška pri sinhronizaciji napretka:", error);
            callback({
                uspeh: false,
                kod: error && error.kod ? error.kod : "GRESKA_SERVERA",
                poruka: "Napredak trenutno nije moguće sinhronizovati."
            });
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
                    { _id: onlineIgraci[socket.id].bazaId },
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
                    { _id: onlineIgraci[socket.id].bazaId },
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
                    { _id: onlineIgraci[socket.id].bazaId },
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
        const lista = Object.values(onlineIgraci)
            .filter(igrac => igrac.id !== socket.id)
            .map(igrac => ({
                id: igrac.id,
                playerId: igrac.playerId,
                ime: igrac.ime,
                avatar: igrac.avatar
            }));
        socket.emit('listaOnlineIgraca', lista);
    });

    socket.on('posaljiZahtevZaPrijateljstvo', async (podaci, callback = () => {}) => {
        const posiljalac = onlineIgraci[socket.id];
        const ciljOnline = podaci && onlineIgraci[podaci.ciljId];
        if (!posiljalac || !ciljOnline) {
            return callback({ uspeh: false, kod: "IGRAC_NIJE_ONLINE", poruka: "Igrač više nije na mreži." });
        }

        try {
            const ciljIgrac = await Igrac.findById(ciljOnline.bazaId);
            const rezultat = await posaljiTrajniZahtev(posiljalac, ciljIgrac);
            callback(rezultat);

            if (rezultat.kod === "ZAHTEV_POSLAT") {
                io.to(ciljOnline.id).emit('zahtevZaPrijateljstvo', {
                    idPosiljaoca: socket.id,
                    playerIdPosiljaoca: posiljalac.playerId,
                    imePosiljaoca: posiljalac.ime
                });
                await osveziPrijateljeZaSocket(ciljOnline.id);
            }
        } catch (error) {
            console.error("Greška pri slanju zahteva za prijateljstvo:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA", poruka: "Zahtev trenutno nije moguće poslati." });
        }
    });

    socket.on('odgovorNaZahtev', async (podaci, callback = () => {}) => {
        const primalac = onlineIgraci[socket.id];
        if (!primalac) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        const posiljalacOnline = podaci && onlineIgraci[podaci.ciljId];
        const playerIdPosiljaoca = podaci && (
            podaci.playerIdPosiljaoca
            || (posiljalacOnline && posiljalacOnline.playerId)
        );
        if (!playerIdPosiljaoca) {
            return callback({ uspeh: false, kod: "ZAHTEV_NIJE_PRONADJEN" });
        }

        try {
            const rezultat = await obradiTrajniZahtev(
                primalac,
                playerIdPosiljaoca,
                Boolean(podaci.prihvaceno)
            );
            callback(rezultat.uspeh ? { uspeh: true } : rezultat);
            if (!rezultat.uspeh) return;

            const aktivniPosiljalac = pronadjiOnlineIgracaPoPlayerId(playerIdPosiljaoca);
            if (aktivniPosiljalac) {
                io.to(aktivniPosiljalac.id).emit('odgovorPrijateljstvo', {
                    prihvaceno: Boolean(podaci.prihvaceno),
                    idPrijatelja: socket.id,
                    playerIdPrijatelja: primalac.playerId,
                    imePrijatelja: primalac.ime
                });
                await osveziPrijateljeZaSocket(aktivniPosiljalac.id);
            }

            await osveziPrijateljeZaSocket(socket.id);
        } catch (error) {
            console.error("Greška pri odgovoru na zahtev za prijateljstvo:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    socket.on('traziOsvezenjePrijatelja', async () => {
        try {
            await osveziPrijateljeZaSocket(socket.id);
        } catch (error) {
            console.error("Greška pri osvežavanju prijatelja:", error);
        }
    });

    socket.on('posaljiOfflineZahtev', async (ciljIme, callback = () => {}) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        const cistoCiljIme = ocistiNadimak(ciljIme);
        if (!nadimakJeIspravan(cistoCiljIme)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_NADIMAK", poruka: "Unesi ispravan nadimak." });
        }

        try {
            const ciljIgrac = await Igrac.findOne({
                nadimakNormalizovan: normalizujNadimak(cistoCiljIme)
            });
            if (!ciljIgrac) {
                return callback({ uspeh: false, kod: "IGRAC_NIJE_PRONADJEN", poruka: "Igrač sa tim nadimkom ne postoji." });
            }

            const rezultat = await posaljiTrajniZahtev(ja, ciljIgrac);
            callback(rezultat);

            if (rezultat.kod === "ZAHTEV_POSLAT") {
                const ciljOnline = pronadjiOnlineIgracaPoPlayerId(ciljIgrac.playerId);
                if (ciljOnline) {
                    io.to(ciljOnline.id).emit('noviOfflineZahtev', rezultat.zahtev);
                    await osveziPrijateljeZaSocket(ciljOnline.id);
                }
            }
        } catch (error) {
            console.error("Greška pri slanju zahteva po nadimku:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA", poruka: "Zahtev trenutno nije moguće poslati." });
        }
    });

    socket.on('odgovorNaOfflineZahtev', async (podaci, callback = () => {}) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        try {
            let playerIdPosiljaoca = podaci && podaci.playerIdPosiljaoca;
            if (!playerIdPosiljaoca && podaci && podaci.imePosiljaoca) {
                const stariPosiljalac = await Igrac.findOne({
                    nadimakNormalizovan: normalizujNadimak(podaci.imePosiljaoca)
                });
                playerIdPosiljaoca = stariPosiljalac && stariPosiljalac.playerId;
            }

            const rezultat = await obradiTrajniZahtev(
                ja,
                playerIdPosiljaoca,
                Boolean(podaci && podaci.prihvaceno)
            );
            callback(rezultat.uspeh ? { uspeh: true } : rezultat);
            if (!rezultat.uspeh) return;

            const posiljalacOnline = pronadjiOnlineIgracaPoPlayerId(playerIdPosiljaoca);
            if (posiljalacOnline) {
                io.to(posiljalacOnline.id).emit('odgovorPrijateljstvo', {
                    prihvaceno: Boolean(podaci.prihvaceno),
                    playerIdPrijatelja: ja.playerId,
                    imePrijatelja: ja.ime
                });
                await osveziPrijateljeZaSocket(posiljalacOnline.id);
            }

            await osveziPrijateljeZaSocket(socket.id);
        } catch (error) {
            console.error("Greška pri obradi zahteva iz Sobe prijatelja:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Zemljopis Server uspešno pokrenut na portu ${PORT}`);
});
