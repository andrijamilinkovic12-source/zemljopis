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

function oznakaKvartala(datum = new Date()) {
    if (process.env.KVARTALNI_TEST_CIKLUS) return process.env.KVARTALNI_TEST_CIKLUS;
    const kvartal = Math.floor(datum.getUTCMonth() / 3) + 1;
    return `${datum.getUTCFullYear()}-Q${kvartal}`;
}

function nazivKvartala(oznaka) {
    const poklapanje = /^(\d{4})-Q([1-4])$/.exec(String(oznaka || ""));
    if (!poklapanje) return String(oznaka || "Kvartalni ciklus");
    return `${poklapanje[2]}. kvartal ${poklapanje[1]}`;
}

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
    sezonskiCiklus: { type: String, default: () => oznakaKvartala() },
    svaVremenaPojmovi: { type: Number, default: 0 },
    kvartalniObradjeniDogadjaji: { type: [String], default: [] },
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

const KvartalniCiklusSchema = new mongoose.Schema({
    ciklus: { type: String, required: true, unique: true },
    ligaKljuc: { type: String, required: true, default: "glavna" },
    naziv: { type: String, required: true },
    zavrsenAt: { type: Date, default: Date.now },
    topTri: {
        type: [{
            _id: false,
            playerId: String,
            ime: String,
            avatar: String,
            pojmovi: Number,
            pozicija: Number
        }],
        default: []
    }
});

const LigaStanjeSchema = new mongoose.Schema({
    kljuc: { type: String, required: true, unique: true },
    aktivniCiklus: { type: String, required: true }
});

const KvartalniCiklus = mongoose.model('KvartalniCiklus', KvartalniCiklusSchema);
const LigaStanje = mongoose.model('LigaStanje', LigaStanjeSchema);

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

function normalizujDukate(vrednost, podrazumevano = 500) {
    const broj = Number(vrednost);
    if (!Number.isFinite(broj)) return podrazumevano;
    return Math.max(0, Math.floor(broj));
}

function podaciProfilaZaKlijenta(igrac) {
    osigurajIdentitetIgraca(igrac);
    return {
        playerId: igrac.playerId,
        nadimak: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        profilTip: igrac.googleUid ? "google" : "lokalni",
        googlePovezan: Boolean(igrac.googleUid),
        dukati: normalizujDukate(igrac.dukati),
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
    osveziKvartalnePodatkeZaSocket(socket.id).catch(error => {
        console.error("Greška pri početnom učitavanju kvartalnih podataka:", error);
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

const KVARTALNI_LIGA_KLJUC = process.env.KVARTALNI_LIGA_KLJUC || "glavna";
const KVARTALNI_TEST_PROFIL_PREFIX = process.env.KVARTALNI_TEST_PROFIL_PREFIX || "";
const KVARTALNI_NIVOI = [
    { min: 0, max: 999 },
    { min: 1000, max: 2499 },
    { min: 2500, max: 4999 },
    { min: 5000, max: 8999 },
    { min: 9000, max: Number.MAX_SAFE_INTEGER }
];

function kvartalniOpsegIgraca() {
    if (!KVARTALNI_TEST_PROFIL_PREFIX) return {};
    const bezbedanPrefiks = KVARTALNI_TEST_PROFIL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { profilKljuc: { $regex: `^${bezbedanPrefiks}` } };
}

async function osigurajAktivniKvartal() {
    const trenutniCiklus = oznakaKvartala();
    let stanje = await LigaStanje.findOne({ kljuc: KVARTALNI_LIGA_KLJUC });

    if (!stanje) {
        try {
            stanje = await LigaStanje.create({
                kljuc: KVARTALNI_LIGA_KLJUC,
                aktivniCiklus: trenutniCiklus
            });
        } catch (error) {
            if (!error || error.code !== 11000) throw error;
            stanje = await LigaStanje.findOne({ kljuc: KVARTALNI_LIGA_KLJUC });
        }
    }

    if (stanje.aktivniCiklus !== trenutniCiklus) {
        const prethodniCiklus = stanje.aktivniCiklus;
        const najbolji = await Igrac.find({
            ...kvartalniOpsegIgraca(),
            sezonskiCiklus: prethodniCiklus,
            sezonskiPojmovi: { $gt: 0 }
        })
            .sort({ sezonskiPojmovi: -1, nadimakNormalizovan: 1 })
            .limit(3)
            .select('playerId nadimak avatar sezonskiPojmovi')
            .lean();

        await KvartalniCiklus.findOneAndUpdate(
            { ciklus: prethodniCiklus },
            {
                $setOnInsert: {
                    ciklus: prethodniCiklus,
                    ligaKljuc: KVARTALNI_LIGA_KLJUC,
                    naziv: nazivKvartala(prethodniCiklus),
                    zavrsenAt: new Date(),
                    topTri: najbolji.map((igrac, indeks) => ({
                        playerId: igrac.playerId,
                        ime: igrac.nadimak,
                        avatar: igrac.avatar || "atlas",
                        pojmovi: igrac.sezonskiPojmovi || 0,
                        pozicija: indeks + 1
                    }))
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        await Igrac.updateMany(
            {
                ...kvartalniOpsegIgraca(),
                sezonskiCiklus: prethodniCiklus
            },
            {
                $set: {
                    sezonskiPojmovi: 0,
                    sezonskiCiklus: trenutniCiklus,
                    kvartalniObradjeniDogadjaji: []
                }
            }
        );

        await LigaStanje.updateOne(
            { _id: stanje._id, aktivniCiklus: prethodniCiklus },
            { $set: { aktivniCiklus: trenutniCiklus } }
        );
        stanje.aktivniCiklus = trenutniCiklus;
    }

    await Igrac.updateMany(
        {
            ...kvartalniOpsegIgraca(),
            $or: [
                { sezonskiCiklus: { $exists: false } },
                { sezonskiCiklus: null },
                { sezonskiCiklus: "" }
            ]
        },
        { $set: { sezonskiCiklus: trenutniCiklus } }
    );

    return trenutniCiklus;
}

function igracZaKvartalnuListu(igrac, polje) {
    return {
        playerId: igrac.playerId,
        ime: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        pojmovi: igrac[polje] || 0
    };
}

async function napraviKvartalneListe() {
    const ciklus = await osigurajAktivniKvartal();

    const sezona = await Promise.all(KVARTALNI_NIVOI.map(async nivo => {
        const igraci = await Igrac.find({
            ...kvartalniOpsegIgraca(),
            sezonskiCiklus: ciklus,
            sezonskiPojmovi: { $gte: Math.max(1, nivo.min), $lte: nivo.max }
        })
            .sort({ sezonskiPojmovi: -1, nadimakNormalizovan: 1 })
            .limit(100)
            .select('playerId nadimak avatar sezonskiPojmovi')
            .lean();
        return igraci.map(igrac => igracZaKvartalnuListu(igrac, 'sezonskiPojmovi'));
    }));

    const svaVremenaIgraci = await Igrac.find({
        ...kvartalniOpsegIgraca(),
        svaVremenaPojmovi: { $gt: 0 }
    })
        .sort({ svaVremenaPojmovi: -1, nadimakNormalizovan: 1 })
        .limit(100)
        .select('playerId nadimak avatar svaVremenaPojmovi')
        .lean();

    const istorijaFilter = KVARTALNI_LIGA_KLJUC === "glavna"
        ? {
            $or: [
                { ligaKljuc: KVARTALNI_LIGA_KLJUC },
                { ligaKljuc: { $exists: false } }
            ]
        }
        : { ligaKljuc: KVARTALNI_LIGA_KLJUC };
    const zavrseniCiklusi = await KvartalniCiklus.find(istorijaFilter)
        .sort({ zavrsenAt: -1 })
        .lean();
    const medaljePoIgracu = new Map();

    zavrseniCiklusi.forEach(zavrseniCiklus => {
        (zavrseniCiklus.topTri || []).forEach(osvajac => {
            if (!osvajac.playerId) return;
            const postojeci = medaljePoIgracu.get(osvajac.playerId) || {
                playerId: osvajac.playerId,
                ime: osvajac.ime,
                avatar: osvajac.avatar || "atlas",
                zlato: 0,
                srebro: 0,
                bronza: 0
            };
            if (osvajac.pozicija === 1) postojeci.zlato++;
            else if (osvajac.pozicija === 2) postojeci.srebro++;
            else if (osvajac.pozicija === 3) postojeci.bronza++;
            medaljePoIgracu.set(osvajac.playerId, postojeci);
        });
    });

    const medalje = [...medaljePoIgracu.values()];
    const aktuelniProfili = medalje.length > 0
        ? await Igrac.find({ playerId: { $in: medalje.map(igrac => igrac.playerId) } })
            .select('playerId nadimak avatar')
            .lean()
        : [];
    const profiliPoId = new Map(aktuelniProfili.map(igrac => [igrac.playerId, igrac]));

    medalje.forEach(igrac => {
        const profil = profiliPoId.get(igrac.playerId);
        if (profil) {
            igrac.ime = profil.nadimak;
            igrac.avatar = profil.avatar || "atlas";
        }
    });
    medalje.sort((a, b) => {
        const ukupnoA = a.zlato + a.srebro + a.bronza;
        const ukupnoB = b.zlato + b.srebro + b.bronza;
        return ukupnoB - ukupnoA
            || b.zlato - a.zlato
            || b.srebro - a.srebro
            || a.ime.localeCompare(b.ime, 'sr');
    });

    const sampioni = zavrseniCiklusi
        .map(zavrseniCiklus => {
            const sampion = (zavrseniCiklus.topTri || []).find(igrac => igrac.pozicija === 1);
            if (!sampion) return null;
            const profil = profiliPoId.get(sampion.playerId);
            return {
                playerId: sampion.playerId,
                ime: profil ? profil.nadimak : sampion.ime,
                avatar: profil ? (profil.avatar || "atlas") : (sampion.avatar || "atlas"),
                ciklus: zavrseniCiklus.naziv,
                poeni: sampion.pojmovi || 0
            };
        })
        .filter(Boolean);

    return {
        ciklus,
        sezona,
        svaVremena: svaVremenaIgraci.map(igrac => igracZaKvartalnuListu(igrac, 'svaVremenaPojmovi')),
        medalje,
        sampioni
    };
}

async function osveziKvartalnePodatkeZaSocket(socketId) {
    const onlineIgrac = onlineIgraci[socketId];
    if (!onlineIgrac) return;

    const ciklus = await osigurajAktivniKvartal();
    const igrac = await Igrac.findById(onlineIgrac.bazaId)
        .select('sezonskiPojmovi svaVremenaPojmovi')
        .lean();
    if (!igrac) return;

    io.to(socketId).emit('osveziMojeKvartalnePodatke', {
        ciklus,
        sezonskiPojmovi: igrac.sezonskiPojmovi || 0,
        svaVremenaPojmovi: igrac.svaVremenaPojmovi || 0
    });
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

function opisRazlogaNapustanja(razlog = "napustio") {
    const kod = razlog === "varanje" ? "anti_cit" : razlog;
    if (kod === "anti_cit") {
        return {
            kod,
            naslov: "Anti-Cheat izbacivanje",
            tekst: "je izbačen Anti-Cheat sistemom zbog napuštanja aplikacije tokom runde."
        };
    }
    if (kod === "diskonekt") {
        return {
            kod,
            naslov: "Igrač je izgubio vezu",
            tekst: "je izgubio konekciju sa serverom."
        };
    }
    if (kod === "odustao") {
        return {
            kod,
            naslov: "Igrač je odustao",
            tekst: "je odustao od čekanja."
        };
    }
    if (kod === "zavrsio") {
        return {
            kod,
            naslov: "Igrač je završio",
            tekst: "je završio meč."
        };
    }
    if (kod === "bez_tokena") {
        return {
            kod,
            naslov: "Igrač nema token",
            tekst: "nije imao token za početak meča."
        };
    }
    return {
        kod: "napustio",
        naslov: "Igrač je napustio meč",
        tekst: "je napustio meč."
    };
}

function snimakSobe(soba) {
    return {
        kodSobe: soba.id,
        javna: Boolean(soba.javna),
        status: soba.status,
        uIgri: soba.status === "u_igri",
        brojIgraca: soba.igraci.length,
        max: soba.maxIgraca,
        runda: soba.trenutnaRunda || 0,
        igraci: soba.igraci.map(igrac => ({
            id: igrac.id,
            ime: igrac.ime
        }))
    };
}

function napraviDogadjajSobe(soba, tip, detalji = {}) {
    return {
        tip,
        vreme: Date.now(),
        soba: snimakSobe(soba),
        kodSobe: soba.id,
        ...detalji
    };
}

function posaljiDogadjajSobe(soba, tip, detalji = {}) {
    const dogadjaj = napraviDogadjajSobe(soba, tip, detalji);
    io.to(soba.id).emit('dogadjajSobe', dogadjaj);
    return dogadjaj;
}

function zatvoriSobuZbogNeuspesnogPoziva(soba, detalji = {}) {
    const dogadjaj = posaljiDogadjajSobe(soba, 'soba_zatvorena', {
        naslov: detalji.naslov || "Soba je zatvorena",
        poruka: detalji.poruka || "Soba je zatvorena jer nema više pozvanih igrača koji mogu da uđu.",
        ...detalji
    });

    (soba.pozvaniSocketIds || []).forEach(socketId => {
        io.to(socketId).emit('pozivUSobuOtkazan', dogadjaj);
    });
    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    delete sobe[soba.id];
    return dogadjaj;
}

function smanjiPozivnuSobuIliZatvori(soba, tip, detalji = {}) {
    if (!soba || soba.tipSobe !== "poziv" || soba.status !== "cekanje") return null;

    soba.maxIgraca = Math.max(1, soba.maxIgraca - 1);
    if (soba.maxIgraca <= 1) {
        return {
            zatvorena: true,
            dogadjaj: zatvoriSobuZbogNeuspesnogPoziva(soba, {
                ...detalji,
                razlogZatvaranja: tip,
                naslov: detalji.naslov || "Poziv nije prihvaćen",
                poruka: detalji.poruka || "Soba je zatvorena jer nema drugih pozvanih igrača."
            })
        };
    }

    const sobaSpremna = soba.igraci.length >= soba.maxIgraca;
    return {
        zatvorena: false,
        sobaSpremna,
        dogadjaj: posaljiDogadjajSobe(soba, tip, {
            ...detalji,
            sobaSpremna
        })
    };
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

            const ocisceniNapredak = sanitizujCloudNapredak(podaci && podaci.napredak);
            igrac.cloudNapredak = ocisceniNapredak;
            if (
                ocisceniNapredak.riznica
                && typeof ocisceniNapredak.riznica.dukati !== "undefined"
            ) {
                igrac.dukati = normalizujDukate(ocisceniNapredak.riznica.dukati, igrac.dukati || 500);
            }
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

    socket.on('dodajPojmove', async (podaci, callback = () => {}) => {
        const prijavljeniIgrac = onlineIgraci[socket.id];
        if (!prijavljeniIgrac) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        const brojPojmova = Number(typeof podaci === "number" ? podaci : podaci && podaci.broj);
        const dogadjajId = typeof podaci === "object" && typeof podaci.dogadjajId === "string"
            ? podaci.dogadjajId.trim()
            : "";

        if (!Number.isInteger(brojPojmova) || brojPojmova < 1 || brojPojmova > 7) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_BROJ_POJMOVA" });
        }
        if (dogadjajId && (dogadjajId.length > 120 || !/^[a-zA-Z0-9:_-]+$/.test(dogadjajId))) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_DOGADJAJ" });
        }

        try {
            const ciklus = await osigurajAktivniKvartal();
            const filter = { _id: prijavljeniIgrac.bazaId };
            if (dogadjajId) {
                filter.kvartalniObradjeniDogadjaji = { $ne: dogadjajId };
            }

            const azuriranje = {
                $inc: {
                    sezonskiPojmovi: brojPojmova,
                    svaVremenaPojmovi: brojPojmova
                },
                $set: { sezonskiCiklus: ciklus }
            };
            if (dogadjajId) {
                azuriranje.$push = {
                    kvartalniObradjeniDogadjaji: {
                        $each: [dogadjajId],
                        $slice: -300
                    }
                };
            }

            let igrac = await Igrac.findOneAndUpdate(filter, azuriranje, {
                returnDocument: 'after'
            });
            const duplikat = !igrac;
            if (!igrac) {
                igrac = await Igrac.findById(prijavljeniIgrac.bazaId);
            }
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRONADJEN" });
            }

            const statistika = {
                ciklus,
                sezonskiPojmovi: igrac.sezonskiPojmovi || 0,
                svaVremenaPojmovi: igrac.svaVremenaPojmovi || 0
            };
            socket.emit('osveziMojeKvartalnePodatke', statistika);
            callback({ uspeh: true, duplikat, statistika });
        } catch (error) {
            console.error("Greška pri upisu kvartalnih pojmova:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
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

    socket.on('traziKvartalneListe', async (callback = () => {}) => {
        try {
            const podaci = await napraviKvartalneListe();
            socket.emit('kvartalnaTopListaServer', podaci);
            await osveziKvartalnePodatkeZaSocket(socket.id);
            callback({ uspeh: true, ciklus: podaci.ciklus });
        } catch (error) {
            console.error("Greška pri učitavanju kvartalnih lista:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
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
            tipSobe: "kod",
            hostIme: onlineIgraci[socket.id].ime,
            pozvaniSocketIds: [],
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

        const pozvani = Array.isArray(podaci && podaci.pozvani) ? podaci.pozvani : [];
        const jedinstveniPozvani = [...new Set(
            pozvani
                .map(ime => ocistiNadimak(ime))
                .filter(Boolean)
        )];
        const ciljeviPoziva = [];
        const nedostupniPozvani = [];

        jedinstveniPozvani.forEach(imePrijatelja => {
            const ciljSocket = Object.values(onlineIgraci).find(oi =>
                oi.id !== socket.id
                && oi.ime.toLowerCase() === imePrijatelja.toLowerCase()
            );
            if (ciljSocket && !ciljeviPoziva.some(cilj => cilj.id === ciljSocket.id)) {
                ciljeviPoziva.push(ciljSocket);
            } else {
                nedostupniPozvani.push(imePrijatelja);
            }
        });

        if (ciljeviPoziva.length === 0) {
            return callback({
                uspeh: false,
                kod: "NEMA_DOSTUPNIH_POZVANIH",
                poruka: "Pozvani prijatelj trenutno nije na mreži. Izaberi drugog igrača ili pokušaj kasnije."
            });
        }

        let brojIgraca = ciljeviPoziva.length + 1;

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
            tipSobe: "poziv",
            hostIme: onlineIgraci[socket.id].ime,
            pozvaniSocketIds: ciljeviPoziva.map(cilj => cilj.id),
            timeoutRunde: null
        };

        socket.join(kodSobe);
        
        const hostIme = onlineIgraci[socket.id].ime;
        ciljeviPoziva.forEach(ciljSocket => {
            io.to(ciljSocket.id).emit('pozivUSobu', { kodSobe: kodSobe, hostIme: hostIme });
        });

        callback({
            uspeh: true,
            kodSobe: kodSobe,
            brojIgraca: brojIgraca,
            nedostupniPozvani
        });
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

        const imeIgraca = onlineIgraci[socket.id].ime;
        soba.igraci.push({ id: socket.id, ime: imeIgraca, spremniOdgovori: false, spremniZaSledecuRundu: false });
        soba.pozvaniSocketIds = (soba.pozvaniSocketIds || []).filter(id => id !== socket.id);
        socket.join(kodSobe);

        posaljiDogadjajSobe(soba, 'igrac_usao', {
            ime: imeIgraca,
            popunjena: soba.igraci.length === soba.maxIgraca
        });
        io.to(kodSobe).emit('noviIgracUSobi', { brojIgraca: soba.igraci.length, max: soba.maxIgraca, _dogadjajSobe: true });
        callback({ uspeh: true, poruka: "Uspešno povezan!" });
    });

    socket.on('odbijPozivUSobu', (podaci = {}) => {
        const kodSobe = String(podaci.kodSobe || "").toUpperCase();
        const soba = sobe[kodSobe];
        const igrac = onlineIgraci[socket.id];
        if (!soba || !igrac || soba.status !== 'cekanje') return;

        const bioPozvan = (soba.pozvaniSocketIds || []).includes(socket.id);
        if (!bioPozvan) return;

        soba.pozvaniSocketIds = (soba.pozvaniSocketIds || []).filter(id => id !== socket.id);
        smanjiPozivnuSobuIliZatvori(soba, 'poziv_odbijen', {
            ime: igrac.ime,
            razlog: "odbijen",
            razlogTekst: "je odbio poziv.",
            naslov: "Poziv je odbijen",
            poruka: `${igrac.ime} je odbio poziv. Soba je zatvorena jer nema drugih pozvanih igrača.`
        });
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

            posaljiDogadjajSobe(nadjenaSoba, 'igrac_usao', {
                ime,
                popunjena: nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca
            });
            io.to(nadjenaSoba.id).emit('azuriranjeJavneSobe', { brojIgraca: nadjenaSoba.igraci.length, max: nadjenaSoba.maxIgraca, _dogadjajSobe: true });

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
                status: 'cekanje', iskoriscenaSlova: [], trenutnaRunda: 0, odgovoriOveRunde: [], javna: true, tipSobe: "javna", hostIme: ime, pozvaniSocketIds: [], timeoutRunde: null
            };

            socket.join(kodSobe);
            callback({ uspeh: true, kodSobe: kodSobe, isHost: true });
        }
    });

    // --- 6. NAPUŠTANJE I DISCONNECT ---
    socket.on('napustiSobu', (razlog) => ukloniIgracaIzSoba(socket, razlog));

    socket.on('disconnect', () => {
        ukloniIgracaIzSoba(socket, 'diskonekt');
        ukloniPozivIzSoba(socket, 'diskonekt');
        delete onlineIgraci[socket.id]; 
        io.emit('azurirajBrojOnline', Object.keys(onlineIgraci).length);
    });

    function ukloniPozivIzSoba(socket, razlog = "diskonekt") {
        const igrac = onlineIgraci[socket.id];
        if (!igrac) return;

        const opisRazloga = opisRazlogaNapustanja(razlog);
        Object.values(sobe).forEach(soba => {
            if (!(soba.pozvaniSocketIds || []).includes(socket.id)) return;

            soba.pozvaniSocketIds = (soba.pozvaniSocketIds || []).filter(id => id !== socket.id);
            smanjiPozivnuSobuIliZatvori(soba, 'pozvani_nedostupan', {
                ime: igrac.ime,
                razlog: opisRazloga.kod,
                razlogTekst: opisRazloga.tekst,
                naslov: "Pozvani igrač nije dostupan",
                poruka: `${igrac.ime} je izgubio konekciju. Soba je zatvorena jer nema drugih pozvanih igrača.`
            });
        });
    }

    function ukloniIgracaIzSoba(socket, razlog = "napustio") {
        for (let kodSobe in sobe) {
            let soba = sobe[kodSobe];
            const index = soba.igraci.findIndex(i => i.id === socket.id);
            
            if (index !== -1) {
                const igracKojiIzlazi = soba.igraci[index];
                soba.igraci.splice(index, 1);

                socket.leave(kodSobe);
                const opisRazloga = opisRazlogaNapustanja(razlog);

                if (soba.host === socket.id && !soba.javna && soba.status !== 'u_igri') {
                    const dogadjaj = posaljiDogadjajSobe(soba, 'host_zatvorio_sobu', {
                        ime: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        razlogTekst: opisRazloga.tekst
                    });
                    io.to(kodSobe).emit('hostJeNapustioSobu', {
                        kodSobe,
                        ime: igracKojiIzlazi.ime,
                        _dogadjajSobe: true
                    });
                    (soba.pozvaniSocketIds || []).forEach(socketId => {
                        io.to(socketId).emit('pozivUSobuOtkazan', dogadjaj);
                    });
                    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
                    delete sobe[kodSobe];
                    break;
                }

                if (soba.tipSobe === "poziv" && soba.status === "cekanje") {
                    const rezultatPoziva = smanjiPozivnuSobuIliZatvori(soba, 'igrac_napustio', {
                        ime: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        razlogNaslov: opisRazloga.naslov,
                        razlogTekst: opisRazloga.tekst,
                        naslov: opisRazloga.naslov,
                        poruka: `${igracKojiIzlazi.ime} ${opisRazloga.tekst} Soba je zatvorena jer nema drugih pozvanih igrača.`
                    });
                    if (!rezultatPoziva || !rezultatPoziva.zatvorena) {
                        io.to(kodSobe).emit('igracNapustioSobu', {
                            kodSobe,
                            ostaloIgraca: soba.igraci.length,
                            max: soba.maxIgraca,
                            ime: igracKojiIzlazi.ime,
                            uIgri: false,
                            javna: false,
                            razlog: opisRazloga.kod,
                            _dogadjajSobe: true
                        });
                    }
                    break;
                }

                posaljiDogadjajSobe(soba, 'igrac_napustio', {
                    ime: igracKojiIzlazi.ime,
                    razlog: opisRazloga.kod,
                    razlogNaslov: opisRazloga.naslov,
                    razlogTekst: opisRazloga.tekst
                });
                io.to(kodSobe).emit('igracNapustioSobu', {
                    kodSobe,
                    ostaloIgraca: soba.igraci.length,
                    max: soba.maxIgraca,
                    ime: igracKojiIzlazi.ime,
                    uIgri: soba.status === 'u_igri',
                    javna: Boolean(soba.javna),
                    razlog: opisRazloga.kod,
                    _dogadjajSobe: true
                });

                if (soba.status === 'u_igri' && soba.igraci.length === 1) {
                    posaljiDogadjajSobe(soba, 'automatska_pobeda', {
                        pobednikIme: soba.igraci[0].ime,
                        napustioIme: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        razlogTekst: opisRazloga.tekst
                    });
                    io.to(kodSobe).emit('pobedaZbogNapustanja', {
                        kodSobe,
                        pobednikIme: soba.igraci[0].ime,
                        napustioIme: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        _dogadjajSobe: true
                    });
                    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
                    delete sobe[kodSobe];
                    break;
                }

                if (soba.igraci.length === 0) {
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
