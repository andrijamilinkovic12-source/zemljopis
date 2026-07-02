// server.js - Backend za Zemljopis Multiplayer sa MongoDB Integracijom
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const crypto = require('crypto');
const https = require('https');
const BazaPodataka = require('./www/bazapodataka.js');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const DOZVOLJENI_EFEKTI_RUNDE = new Set(['ef_nista', 'ef_konfete', 'ef_vatromet']);
const VREMENSKA_ZONA_IGRE = "Europe/Belgrade";
const DNEVNI_TRAJANJE_MS = 60 * 1000;
const DNEVNI_INTRO_MS = 5200;
const DNEVNI_GRACE_MS = 10 * 1000;
const DNEVNI_KATEGORIJE = [
    { id: 'drzava', ikona: '🌍', naziv: 'Država' },
    { id: 'grad', ikona: '🏙️', naziv: 'Grad' },
    { id: 'reka', ikona: '🏞️', naziv: 'Reka' },
    { id: 'planina', ikona: '⛰️', naziv: 'Planina' },
    { id: 'biljka', ikona: '🌿', naziv: 'Biljka' },
    { id: 'zivotinja', ikona: '🦁', naziv: 'Životinja' },
    { id: 'predmet', ikona: '📦', naziv: 'Predmet' }
];
const GOOGLE_CLIENT_IDS = String(process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);
const GOOGLE_AUTH_DEV_MODE = process.env.GOOGLE_AUTH_DEV_MODE === "true";
let googleJwksCache = {
    keys: null,
    expiresAt: 0
};

function normalizujEfekatRunde(efekatId) {
    const vrednost = String(efekatId || 'ef_nista');
    return DOZVOLJENI_EFEKTI_RUNDE.has(vrednost) ? vrednost : 'ef_nista';
}

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
    povezaniProfilKljucevi: { type: [String], default: [] },
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
    odigraniOnlineMecevi: { type: Number, default: 0 },
    onlinePobede: { type: Number, default: 0 },
    onlineObradjeniMecevi: { type: [String], default: [] },
    onlineObradjenePobede: { type: [String], default: [] },
    // POLJA ZA TOP LISTU POENA
    najboljiMecPoeni: { type: Number, default: 0 },
    nedeljniPoeni: { type: Number, default: 0 },
    mesecniPoeni: { type: Number, default: 0 },
    svaVremenaPoeni: { type: Number, default: 0 },
    cloudNapredak: { type: mongoose.Schema.Types.Mixed, default: {} },
    dnevniIzazov: { type: mongoose.Schema.Types.Mixed, default: {} },
    dnevniNiz: { type: mongoose.Schema.Types.Mixed, default: {} },
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

function googleUidJeIspravan(googleUid) {
    return typeof googleUid === "string"
        && googleUid.length >= 6
        && googleUid.length <= 128
        && /^[a-zA-Z0-9_.:-]+$/.test(googleUid);
}

function greskaSaKodom(kod, poruka) {
    const greska = new Error(poruka || kod);
    greska.kod = kod;
    return greska;
}

function base64UrlBuffer(deo) {
    const vrednost = String(deo || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = vrednost.length % 4 === 0 ? "" : "=".repeat(4 - (vrednost.length % 4));
    return Buffer.from(vrednost + padding, "base64");
}

function procitajJwt(idToken) {
    const delovi = String(idToken || "").split(".");
    if (delovi.length !== 3) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google token nije ispravan.");
    }

    try {
        return {
            header: JSON.parse(base64UrlBuffer(delovi[0]).toString("utf8")),
            payload: JSON.parse(base64UrlBuffer(delovi[1]).toString("utf8")),
            potpis: base64UrlBuffer(delovi[2]),
            potpisaniDeo: `${delovi[0]}.${delovi[1]}`
        };
    } catch (error) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google token nije moguće pročitati.");
    }
}

function preuzmiGoogleJwks() {
    if (googleJwksCache.keys && googleJwksCache.expiresAt > Date.now()) {
        return Promise.resolve(googleJwksCache.keys);
    }

    return new Promise((resolve, reject) => {
        const zahtev = https.get(
            "https://www.googleapis.com/oauth2/v3/certs",
            { headers: { Accept: "application/json" } },
            odgovor => {
                let telo = "";
                odgovor.setEncoding("utf8");
                odgovor.on("data", deo => { telo += deo; });
                odgovor.on("end", () => {
                    if (odgovor.statusCode < 200 || odgovor.statusCode >= 300) {
                        reject(greskaSaKodom("GOOGLE_CERTIFIKATI_NEDOSTUPNI", "Google certifikati trenutno nisu dostupni."));
                        return;
                    }

                    try {
                        const podaci = JSON.parse(telo);
                        const cacheControl = odgovor.headers["cache-control"] || "";
                        const maxAge = /max-age=(\d+)/.exec(cacheControl);
                        const trajanje = maxAge ? Number(maxAge[1]) * 1000 : 60 * 60 * 1000;
                        googleJwksCache = {
                            keys: Array.isArray(podaci.keys) ? podaci.keys : [],
                            expiresAt: Date.now() + Math.max(5 * 60 * 1000, trajanje)
                        };
                        resolve(googleJwksCache.keys);
                    } catch (error) {
                        reject(greskaSaKodom("GOOGLE_CERTIFIKATI_NEDOSTUPNI", "Google certifikati nisu ispravni."));
                    }
                });
            }
        );

        zahtev.setTimeout(8000, () => {
            zahtev.destroy(greskaSaKodom("GOOGLE_CERTIFIKATI_NEDOSTUPNI", "Google certifikati trenutno nisu dostupni."));
        });
        zahtev.on("error", reject);
    });
}

async function verifikujGoogleIdToken(idToken) {
    if (GOOGLE_CLIENT_IDS.length === 0) {
        throw greskaSaKodom("GOOGLE_AUTH_NIJE_PODESEN", "Na serveru nije podešen GOOGLE_CLIENT_ID.");
    }

    const jwt = procitajJwt(idToken);
    if (jwt.header.alg !== "RS256" || !jwt.header.kid) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google token ima neispravan potpis.");
    }

    const kljucevi = await preuzmiGoogleJwks();
    const jwk = kljucevi.find(kljuc => kljuc.kid === jwt.header.kid);
    if (!jwk) {
        googleJwksCache.expiresAt = 0;
        throw greskaSaKodom("GOOGLE_KLJUC_NIJE_PRONADJEN", "Google ključ za proveru tokena nije pronađen.");
    }

    const javniKljuc = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const potpisValidan = crypto.verify(
        "RSA-SHA256",
        Buffer.from(jwt.potpisaniDeo),
        javniKljuc,
        jwt.potpis
    );
    if (!potpisValidan) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google token nije prošao proveru potpisa.");
    }

    const sada = Math.floor(Date.now() / 1000);
    if (!["accounts.google.com", "https://accounts.google.com"].includes(jwt.payload.iss)) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google izdavalac tokena nije ispravan.");
    }
    if (!GOOGLE_CLIENT_IDS.includes(jwt.payload.aud)) {
        throw greskaSaKodom("POGRESAN_GOOGLE_CLIENT", "Google token nije izdat za ovu aplikaciju.");
    }
    if (!jwt.payload.sub || !googleUidJeIspravan(jwt.payload.sub)) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_UID", "Google UID nije ispravan.");
    }
    if (!Number.isFinite(Number(jwt.payload.exp)) || Number(jwt.payload.exp) <= sada) {
        throw greskaSaKodom("GOOGLE_TOKEN_ISTEKAO", "Google prijava je istekla. Prijavi se ponovo.");
    }
    if (jwt.payload.iat && Number(jwt.payload.iat) > sada + 300) {
        throw greskaSaKodom("NEISPRAVAN_GOOGLE_TOKEN", "Google token još nije važeći.");
    }

    return jwt.payload.sub;
}

async function potvrdiGoogleIdentitet(podaci = {}) {
    const trazeniUid = String(podaci.googleUid || "").trim();
    const idToken = String(podaci.idToken || podaci.googleIdToken || "").trim();

    if (idToken && GOOGLE_CLIENT_IDS.length > 0) {
        const verifikovanUid = await verifikujGoogleIdToken(idToken);
        if (trazeniUid && trazeniUid !== verifikovanUid) {
            throw greskaSaKodom("GOOGLE_UID_SE_NE_POKLAPA", "Google UID se ne poklapa sa tokenom.");
        }
        return verifikovanUid;
    }

    if (googleUidJeIspravan(trazeniUid) && GOOGLE_AUTH_DEV_MODE) {
        return trazeniUid;
    }

    if (!idToken && GOOGLE_CLIENT_IDS.length > 0) {
        throw greskaSaKodom("GOOGLE_TOKEN_OBAVEZAN", "Za Google nalog je potreban ID token.");
    }

    throw greskaSaKodom(
        "GOOGLE_AUTH_NIJE_PODESEN",
        "Google prijava nije podešena. Dodaj GOOGLE_CLIENT_ID ili uključi GOOGLE_AUTH_DEV_MODE za lokalno testiranje."
    );
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

function normalizujTokeni(vrednost, podrazumevano = 3) {
    const broj = Number(vrednost);
    if (!Number.isFinite(broj)) return podrazumevano;
    return Math.max(0, Math.min(3, Math.floor(broj)));
}

function deloviDatumaBeograd(datum = new Date()) {
    const delovi = new Intl.DateTimeFormat("en-CA", {
        timeZone: VREMENSKA_ZONA_IGRE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(datum);

    const mapa = {};
    delovi.forEach(deo => {
        if (deo.type !== "literal") mapa[deo.type] = deo.value;
    });
    return mapa;
}

function datumIdBeograd(datum = new Date()) {
    const delovi = deloviDatumaBeograd(datum);
    return `${delovi.year}-${delovi.month}-${delovi.day}`;
}

function datumLabelaBeograd(datum = new Date()) {
    const delovi = deloviDatumaBeograd(datum);
    return `${delovi.day}.${delovi.month}.${delovi.year}.`;
}

function datumLabelaIzId(datumId) {
    const poklapanje = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datumId || ""));
    if (!poklapanje) return datumLabelaBeograd();
    return `${poklapanje[3]}.${poklapanje[2]}.${poklapanje[1]}.`;
}

function pomeriDatumId(datumId, brojDana) {
    const poklapanje = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datumId || ""));
    if (!poklapanje) return datumIdBeograd();

    const datum = new Date(Date.UTC(
        Number(poklapanje[1]),
        Number(poklapanje[2]) - 1,
        Number(poklapanje[3])
    ));
    datum.setUTCDate(datum.getUTCDate() + brojDana);
    return [
        datum.getUTCFullYear(),
        String(datum.getUTCMonth() + 1).padStart(2, "0"),
        String(datum.getUTCDate()).padStart(2, "0")
    ].join("-");
}

function napraviGenerator(seed) {
    const hash = crypto.createHash("sha256").update(String(seed)).digest();
    let stanje = hash.readUInt32LE(0) || 1;
    return function sledeciBroj() {
        stanje += 0x6D2B79F5;
        let t = stanje;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function promesajDeterministicki(niz, random) {
    const kopija = [...niz];
    for (let i = kopija.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [kopija[i], kopija[j]] = [kopija[j], kopija[i]];
    }
    return kopija;
}

function napraviDnevneZadatke(datumId) {
    const random = napraviGenerator(`zemljopis:dnevni:${datumId}`);
    const kategorije = promesajDeterministicki(DNEVNI_KATEGORIJE, random).slice(0, 4);
    const slova = promesajDeterministicki(svaSlova, random).slice(0, 4);

    return kategorije.map((kategorija, index) => ({
        kategorija: kategorija.id,
        ikona: kategorija.ikona,
        naziv: kategorija.naziv,
        slovo: slova[index]
    }));
}

function bonusZaDnevniNiz(brojDana) {
    if (brojDana > 0 && brojDana % 14 === 0) return 300;
    if (brojDana > 0 && brojDana % 7 === 0) return 150;
    if (brojDana > 0 && brojDana % 3 === 0) return 50;
    return 0;
}

function izracunajDnevniNiz(igrac, datumId) {
    const prethodni = igrac.dnevniNiz && typeof igrac.dnevniNiz === "object"
        ? igrac.dnevniNiz
        : {};

    if (prethodni.poslednjiDatum === datumId) {
        const brojDana = Math.max(1, Number(prethodni.brojDana) || 1);
        return { poslednjiDatum: datumId, brojDana, bonusDukata: bonusZaDnevniNiz(brojDana) };
    }

    const juce = pomeriDatumId(datumId, -1);
    const prethodniBroj = Math.max(0, Number(prethodni.brojDana) || 0);
    const brojDana = prethodni.poslednjiDatum === juce ? prethodniBroj + 1 : 1;
    return { poslednjiDatum: datumId, brojDana, bonusDukata: bonusZaDnevniNiz(brojDana) };
}

function napraviDnevniOdgovor(stanje, dodatno = {}) {
    return {
        datumId: stanje.datumId,
        datum: stanje.datum || datumLabelaIzId(stanje.datumId),
        vremenskaZona: VREMENSKA_ZONA_IGRE,
        zadaci: stanje.zadaci || napraviDnevneZadatke(stanje.datumId),
        status: stanje.status || "dostupan",
        zapoceto: Boolean(stanje.zapoceto),
        odigrano: Boolean(stanje.odigrano),
        pocetakIgreAt: stanje.pocetakIgreAt || null,
        rokAt: stanje.rokAt || null,
        introMs: DNEVNI_INTRO_MS,
        trajanjeMs: DNEVNI_TRAJANJE_MS,
        rezultat: stanje.rezultat || null,
        serverVreme: Date.now(),
        ...dodatno
    };
}

function prenesiCloudDnevniAkoTreba(igrac, datumId, datumLabela, zadaci) {
    const postojece = igrac.dnevniIzazov && typeof igrac.dnevniIzazov === "object"
        ? igrac.dnevniIzazov
        : {};
    if (postojece.datumId === datumId) return false;

    const cloudDnevni = igrac.cloudNapredak
        && igrac.cloudNapredak.dnevniIzazov
        && typeof igrac.cloudNapredak.dnevniIzazov === "object"
        ? igrac.cloudNapredak.dnevniIzazov
        : null;

    if (!cloudDnevni || cloudDnevni.datumId !== datumId || !cloudDnevni.odigrano) {
        return false;
    }

    igrac.dnevniIzazov = {
        datumId,
        datum: cloudDnevni.datum || datumLabela,
        zadaci: Array.isArray(cloudDnevni.zadaci) ? cloudDnevni.zadaci : zadaci,
        status: "odigrano",
        zapoceto: true,
        odigrano: true,
        rezultat: {
            tacniPojmovi: Math.max(0, Number(cloudDnevni.tacniPojmovi) || 0),
            osvojenoDukata: Math.max(0, Number(cloudDnevni.osvojenoDukata) || 0),
            x2Preuzet: Boolean(cloudDnevni.x2Preuzet),
            x2BonusDukata: Math.max(0, Number(cloudDnevni.x2BonusDukata) || 0),
            ukupnoDukata: Math.max(
                0,
                Number(cloudDnevni.ukupnoDukata)
                || ((Number(cloudDnevni.osvojenoDukata) || 0) + (Number(cloudDnevni.x2BonusDukata) || 0))
            ),
            dnevniNiz: Math.max(0, Number(cloudDnevni.dnevniNiz) || 0),
            izvor: "cloud-migracija"
        },
        migriranoIzCloudNapretka: true
    };
    return true;
}

function normalizujSnimljenoDnevnoStanje(stanje) {
    if (!stanje || typeof stanje !== "object" || !stanje.datumId) return null;
    const zadaci = Array.isArray(stanje.zadaci) && stanje.zadaci.length === 4
        ? stanje.zadaci
        : napraviDnevneZadatke(stanje.datumId);
    return {
        ...stanje,
        datum: stanje.datum || datumLabelaIzId(stanje.datumId),
        vremenskaZona: VREMENSKA_ZONA_IGRE,
        zadaci,
        status: stanje.status || (stanje.odigrano ? "odigrano" : "dostupan"),
        zapoceto: Boolean(stanje.zapoceto),
        odigrano: Boolean(stanje.odigrano),
        pocetakIgreAt: stanje.pocetakIgreAt || null,
        rokAt: stanje.rokAt || null,
        rezultat: stanje.rezultat || null,
        odgovori: stanje.odgovori || null
    };
}

function vratiAktivniDnevniAkoTraje(igrac, sada = Date.now()) {
    const stanje = normalizujSnimljenoDnevnoStanje(igrac.dnevniIzazov);
    if (
        stanje
        && stanje.zapoceto
        && stanje.status === "u_toku"
        && !stanje.odigrano
        && Number(stanje.rokAt) > sada
    ) {
        return stanje;
    }
    return null;
}

function vratiDnevnoStanjeZaZavrsetak(igrac, trazeniDatumId) {
    const stanje = normalizujSnimljenoDnevnoStanje(igrac.dnevniIzazov);
    if (
        stanje
        && trazeniDatumId
        && stanje.datumId === trazeniDatumId
        && (
            stanje.zapoceto
            || stanje.odigrano
            || stanje.status === "u_toku"
            || stanje.status === "odigrano"
        )
    ) {
        return stanje;
    }
    return osigurajDnevnoStanje(igrac);
}

function osigurajDnevnoStanje(igrac, sada = new Date()) {
    const datumId = datumIdBeograd(sada);
    const datum = datumLabelaBeograd(sada);
    const zadaci = napraviDnevneZadatke(datumId);
    prenesiCloudDnevniAkoTreba(igrac, datumId, datum, zadaci);

    const stanje = igrac.dnevniIzazov && typeof igrac.dnevniIzazov === "object"
        ? igrac.dnevniIzazov
        : {};

    if (stanje.datumId !== datumId) {
        return {
            datumId,
            datum,
            vremenskaZona: VREMENSKA_ZONA_IGRE,
            zadaci,
            status: "dostupan",
            zapoceto: false,
            odigrano: false
        };
    }

    return {
        datumId,
        datum: stanje.datum || datum,
        vremenskaZona: VREMENSKA_ZONA_IGRE,
        zadaci: Array.isArray(stanje.zadaci) && stanje.zadaci.length === 4 ? stanje.zadaci : zadaci,
        status: stanje.status || (stanje.odigrano ? "odigrano" : "dostupan"),
        zapoceto: Boolean(stanje.zapoceto),
        odigrano: Boolean(stanje.odigrano),
        pocetakIgreAt: stanje.pocetakIgreAt || null,
        rokAt: stanje.rokAt || null,
        rezultat: stanje.rezultat || null,
        odgovori: stanje.odgovori || null
    };
}

function ocistiDnevniOdgovor(vrednost) {
    return String(vrednost || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60);
}

function normalizujDnevneOdgovore(odgovori) {
    const rezultat = {};
    if (!odgovori || typeof odgovori !== "object") return rezultat;

    Object.keys(odgovori).forEach(kljuc => {
        if (/^[a-zA-Z0-9_-]+$/.test(kljuc)) {
            rezultat[kljuc] = ocistiDnevniOdgovor(odgovori[kljuc]);
        }
    });
    return rezultat;
}

function napraviCloudNapredakSaDnevnim(igrac, stanje, dukati, kvartalStatistika = null) {
    const napredak = igrac.cloudNapredak && typeof igrac.cloudNapredak === "object"
        ? { ...igrac.cloudNapredak }
        : {};
    const rezultat = stanje.rezultat || {};

    napredak.dnevniIzazov = {
        datum: stanje.datum,
        datumId: stanje.datumId,
        odigrano: Boolean(stanje.odigrano),
        zadaci: stanje.zadaci,
        tacniPojmovi: Math.max(0, Number(rezultat.tacniPojmovi) || 0),
        osvojenoDukata: Math.max(0, Number(rezultat.osvojenoDukata) || 0),
        x2Preuzet: Boolean(rezultat.x2Preuzet),
        x2BonusDukata: Math.max(0, Number(rezultat.x2BonusDukata) || 0),
        ukupnoDukata: Math.max(
            0,
            Number(rezultat.ukupnoDukata)
            || ((Number(rezultat.osvojenoDukata) || 0) + (Number(rezultat.x2BonusDukata) || 0))
        ),
        dnevniNiz: Math.max(0, Number(rezultat.dnevniNiz) || 0)
    };
    napredak.riznica = {
        ...(napredak.riznica && typeof napredak.riznica === "object" ? napredak.riznica : {}),
        dukati: normalizujDukate(dukati)
    };
    if (kvartalStatistika) {
        napredak.kvartal = {
            sezonskiPojmovi: kvartalStatistika.sezonskiPojmovi || 0,
            svaVremenaPojmovi: kvartalStatistika.svaVremenaPojmovi || 0
        };
    }

    return napredak;
}

function upisiDnevniUCloudNapredak(igrac, stanje, kvartalStatistika = null) {
    igrac.cloudNapredak = napraviCloudNapredakSaDnevnim(
        igrac,
        stanje,
        igrac.dukati,
        kvartalStatistika
    );
    igrac.markModified("cloudNapredak");
}

function napraviIstekliDnevniRezultat(stanje) {
    return {
        tacniPojmovi: 0,
        osnovnaNagrada: 0,
        bonusPerfektno: 0,
        bonusDnevniNiz: 0,
        osvojenoDukata: 0,
        x2Preuzet: false,
        x2BonusDukata: 0,
        ukupnoDukata: 0,
        dnevniNiz: 0,
        odgovori: {},
        provera: (stanje.zadaci || []).map((zadatak, index) => ({
            index,
            kategorija: zadatak.kategorija,
            odgovor: "",
            tacno: false
        })),
        razlog: "isteklo_vreme"
    };
}

async function pronadjiIgracaPoProfilKljucu(profilKljuc) {
    if (!profilKljucJeIspravan(profilKljuc)) return null;
    return Igrac.findOne({
        $or: [
            { profilKljuc },
            { povezaniProfilKljucevi: profilKljuc }
        ]
    });
}

function dodajPovezaniProfilKljuc(igrac, profilKljuc) {
    if (!igrac || !profilKljucJeIspravan(profilKljuc)) return false;
    if (igrac.profilKljuc === profilKljuc) return false;

    const postojeci = Array.isArray(igrac.povezaniProfilKljucevi)
        ? igrac.povezaniProfilKljucevi
        : [];
    if (postojeci.includes(profilKljuc)) return false;

    igrac.povezaniProfilKljucevi = [...postojeci, profilKljuc].slice(-12);
    return true;
}

function objektIliPrazan(vrednost) {
    return vrednost && typeof vrednost === "object" && !Array.isArray(vrednost)
        ? vrednost
        : {};
}

function spojiArtiklePoId(postojeci = [], dolazni = []) {
    const mapa = new Map();
    const dodaj = (artikal, prednostDolaznog = false) => {
        if (!artikal || typeof artikal !== "object" || !artikal.id) return;
        const prethodni = mapa.get(artikal.id) || {};
        mapa.set(artikal.id, {
            ...prethodni,
            ...artikal,
            kupljeno: Boolean(prethodni.kupljeno) || Boolean(artikal.kupljeno),
            opremljeno: prednostDolaznog
                ? Boolean(artikal.opremljeno)
                : Boolean(prethodni.opremljeno || artikal.opremljeno)
        });
    };

    if (Array.isArray(postojeci)) postojeci.forEach(artikal => dodaj(artikal, false));
    if (Array.isArray(dolazni)) dolazni.forEach(artikal => dodaj(artikal, true));
    return Array.from(mapa.values());
}

function spojiRiznicu(postojeca, dolazna) {
    const stara = objektIliPrazan(postojeca);
    const nova = objektIliPrazan(dolazna);
    if (!Object.keys(stara).length) return nova;
    if (!Object.keys(nova).length) return stara;

    const stariPodaci = objektIliPrazan(stara.podaci);
    const noviPodaci = objektIliPrazan(nova.podaci);
    const podaci = { ...stariPodaci, ...noviPodaci };

    ["teme", "efekti", "vauceri"].forEach(kategorija => {
        if (Array.isArray(stariPodaci[kategorija]) || Array.isArray(noviPodaci[kategorija])) {
            podaci[kategorija] = spojiArtiklePoId(stariPodaci[kategorija], noviPodaci[kategorija]);
        }
    });

    return {
        ...stara,
        ...nova,
        dukati: Math.max(
            normalizujDukate(stara.dukati, 0),
            normalizujDukate(nova.dukati, 0)
        ),
        podaci
    };
}

function spojiTrofeje(postojeci = [], dolazni = []) {
    const mapa = new Map();
    const dodaj = trofej => {
        if (!trofej || typeof trofej !== "object" || !trofej.id) return;
        const prethodni = mapa.get(trofej.id) || {};
        mapa.set(trofej.id, {
            ...prethodni,
            ...trofej,
            napredak: Math.max(Number(prethodni.napredak) || 0, Number(trofej.napredak) || 0),
            preuzeto: Boolean(prethodni.preuzeto) || Boolean(trofej.preuzeto)
        });
    };

    if (Array.isArray(postojeci)) postojeci.forEach(dodaj);
    if (Array.isArray(dolazni)) dolazni.forEach(dodaj);
    return Array.from(mapa.values());
}

function spojiTokeni(postojeci, dolazni) {
    const stari = objektIliPrazan(postojeci);
    const novi = objektIliPrazan(dolazni);
    if (!Object.keys(stari).length) return novi;
    if (!Object.keys(novi).length) return stari;

    return {
        ...stari,
        ...novi,
        stanje: Math.max(
            normalizujTokeni(stari.stanje, 0),
            normalizujTokeni(novi.stanje, 0)
        ),
        datum: novi.datum || stari.datum || null
    };
}

function spojiKvartal(postojeci, dolazni) {
    const stari = objektIliPrazan(postojeci);
    const novi = objektIliPrazan(dolazni);
    return {
        ...stari,
        ...novi,
        sezonskiPojmovi: Math.max(Number(stari.sezonskiPojmovi) || 0, Number(novi.sezonskiPojmovi) || 0),
        svaVremenaPojmovi: Math.max(Number(stari.svaVremenaPojmovi) || 0, Number(novi.svaVremenaPojmovi) || 0)
    };
}

function spojiListuPoPlayerId(stara = [], nova = []) {
    const mapa = new Map();
    const dodaj = stavka => {
        if (!stavka || typeof stavka !== "object") return;
        const playerId = stavka.playerId || stavka.id;
        if (!playerId) return;
        mapa.set(playerId, { ...(mapa.get(playerId) || {}), ...stavka, playerId });
    };

    if (Array.isArray(stara)) stara.forEach(dodaj);
    if (Array.isArray(nova)) nova.forEach(dodaj);
    return Array.from(mapa.values());
}

function spojiPrijatelje(postojeci, dolazni) {
    const stari = objektIliPrazan(postojeci);
    const novi = objektIliPrazan(dolazni);
    return {
        lista: spojiListuPoPlayerId(stari.lista, novi.lista),
        zahtevi: spojiListuPoPlayerId(stari.zahtevi, novi.zahtevi)
    };
}

function spojiCloudNapredak(postojeci, dolazni) {
    const stari = objektIliPrazan(postojeci);
    const novi = objektIliPrazan(dolazni);
    const spojeno = { ...stari, ...novi };

    spojeno.verzija = Math.max(Number(stari.verzija) || 1, Number(novi.verzija) || 1);
    spojeno.podesavanja = {
        ...objektIliPrazan(stari.podesavanja),
        ...objektIliPrazan(novi.podesavanja)
    };
    spojeno.riznica = spojiRiznicu(stari.riznica, novi.riznica);
    spojeno.trofeji = spojiTrofeje(stari.trofeji, novi.trofeji);
    spojeno.tokeni = spojiTokeni(stari.tokeni, novi.tokeni);
    spojeno.kvartal = spojiKvartal(stari.kvartal, novi.kvartal);
    spojeno.prijatelji = spojiPrijatelje(stari.prijatelji, novi.prijatelji);

    if (novi.dnevniIzazov || stari.dnevniIzazov) {
        spojeno.dnevniIzazov = novi.dnevniIzazov || stari.dnevniIzazov;
    }

    return spojeno;
}

function primeniNapredakNaBrojkeProfila(igrac, napredak) {
    if (
        napredak.riznica
        && typeof napredak.riznica.dukati !== "undefined"
    ) {
        igrac.dukati = normalizujDukate(napredak.riznica.dukati, igrac.dukati || 500);
    }
    if (
        napredak.tokeni
        && typeof napredak.tokeni.stanje !== "undefined"
    ) {
        igrac.tokeni = normalizujTokeni(napredak.tokeni.stanje, igrac.tokeni || 3);
    }
    if (napredak.kvartal) {
        if (typeof napredak.kvartal.sezonskiPojmovi !== "undefined") {
            igrac.sezonskiPojmovi = Math.max(
                Number(igrac.sezonskiPojmovi) || 0,
                Number(napredak.kvartal.sezonskiPojmovi) || 0
            );
        }
        if (typeof napredak.kvartal.svaVremenaPojmovi !== "undefined") {
            igrac.svaVremenaPojmovi = Math.max(
                Number(igrac.svaVremenaPojmovi) || 0,
                Number(napredak.kvartal.svaVremenaPojmovi) || 0
            );
        }
    }
}

function podaciProfilaZaKlijenta(igrac) {
    osigurajIdentitetIgraca(igrac);
    return {
        playerId: igrac.playerId,
        nadimak: igrac.nadimak,
        avatar: igrac.avatar || "atlas",
        profilTip: igrac.googleUid ? "google" : "lokalni",
        googlePovezan: Boolean(igrac.googleUid),
        googleUid: igrac.googleUid || null,
        dukati: normalizujDukate(igrac.dukati),
        tokeni: normalizujTokeni(igrac.tokeni),
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

async function ucitajPrijavljenogIgraca(socket) {
    const prijavljeniIgrac = onlineIgraci[socket.id];
    if (!prijavljeniIgrac) return null;
    return Igrac.findById(prijavljeniIgrac.bazaId);
}

function pronadjiOnlineIgracaPoPlayerId(playerId) {
    return Object.values(onlineIgraci).find(igrac => igrac.playerId === playerId);
}

function izracunajOnlineUspeh(profil = {}) {
    const odigraniMecevi = Math.max(0, Number(profil.odigraniOnlineMecevi) || 0);
    const pobede = Math.max(0, Number(profil.onlinePobede) || 0);
    const procenat = odigraniMecevi > 0
        ? Math.min(100, Math.round((pobede / odigraniMecevi) * 100))
        : 0;
    return {
        odigraniMecevi,
        pobede,
        indeks: `${procenat}%`
    };
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
            .select('playerId nadimak avatar svaVremenaPoeni svaVremenaPojmovi odigraniOnlineMecevi onlinePobede')
            .lean()
        : [];
    const profiliPoId = new Map(profili.map(profil => [profil.playerId, profil]));

    const prijatelji = prijateljIds
        .map(playerId => profiliPoId.get(playerId))
        .filter(Boolean)
        .map(profil => ({
            ...izracunajOnlineUspeh(profil),
            playerId: profil.playerId,
            ime: profil.nadimak,
            avatar: profil.avatar || "atlas",
            poeni: profil.svaVremenaPoeni || 0,
            pojmovi: profil.svaVremenaPojmovi || 0,
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

async function obrisiTrajnoPrijateljstvo(igracOnline, playerIdPrijatelja) {
    if (typeof playerIdPrijatelja !== "string" || playerIdPrijatelja.length < 10) {
        return {
            uspeh: false,
            kod: "NEISPRAVAN_PRIJATELJ",
            poruka: "Prijatelj nije pronađen."
        };
    }

    const igrac = await Igrac.findById(igracOnline.bazaId);
    const prijatelj = await Igrac.findOne({ playerId: playerIdPrijatelja });
    if (!igrac || !prijatelj) {
        return {
            uspeh: false,
            kod: "PROFIL_NIJE_PRONADJEN",
            poruka: "Profil prijatelja više nije dostupan."
        };
    }

    osigurajIdentitetIgraca(igrac);
    osigurajIdentitetIgraca(prijatelj);

    const prijateljstvoPostoji = (igrac.prijatelji || []).includes(prijatelj.playerId)
        || (prijatelj.prijatelji || []).includes(igrac.playerId);
    if (!prijateljstvoPostoji) {
        return {
            uspeh: false,
            kod: "NIJE_PRIJATELJ",
            poruka: "Ovaj igrač više nije na tvojoj listi prijatelja."
        };
    }

    await Igrac.bulkWrite([
        {
            updateOne: {
                filter: { _id: igrac._id },
                update: { $pull: { prijatelji: prijatelj.playerId } }
            }
        },
        {
            updateOne: {
                filter: { _id: prijatelj._id },
                update: { $pull: { prijatelji: igrac.playerId } }
            }
        }
    ]);

    return {
        uspeh: true,
        igrac,
        prijatelj
    };
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
const TRAJANJE_RUNDE_MS = 120000;
const PRIPREMA_PRVE_RUNDE_MS = 6200;
const PRIPREMA_SLEDECE_RUNDE_MS = 4000;
const MREZNA_REZERVA_NAKON_RUNDE_MS = 2500;
const TRAJANJE_PRELAZA_DO_PREGLEDA_MS = 6000;
const TRAJANJE_PREGLEDA_RUNDE_MS = 10000;
const MAKSIMALNO_SACUVANIH_ONLINE_MECEVA = 300;

function ocistiTajmereSobe(soba) {
    if (!soba) return;
    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    if (soba.timeoutCekanjaSledeceRunde) clearTimeout(soba.timeoutCekanjaSledeceRunde);
    soba.timeoutRunde = null;
    soba.timeoutCekanjaSledeceRunde = null;
}

function igracZaSobu(socketId) {
    const onlineIgrac = onlineIgraci[socketId];
    if (!onlineIgrac) return null;
    return {
        id: socketId,
        playerId: onlineIgrac.playerId,
        bazaId: onlineIgrac.bazaId,
        ime: onlineIgrac.ime,
        spremniOdgovori: false,
        spremniZaSledecuRundu: false
    };
}

function pripremiIdentitetOnlineMeca(soba) {
    if (!soba.partijaId) {
        soba.partijaId = `online_${soba.id}_${Date.now()}_${crypto.randomUUID()}`;
    }
    if (!Array.isArray(soba.ucesniciMeca) || soba.ucesniciMeca.length === 0) {
        soba.ucesniciMeca = soba.igraci
            .filter(igrac => igrac.playerId)
            .map(igrac => ({
                playerId: igrac.playerId,
                ime: igrac.ime
            }));
    }
}

async function upisiOdigranOnlineMec(soba, pobednikPlayerIds = []) {
    if (!soba || !soba.partijaId || !Array.isArray(soba.ucesniciMeca)) return;
    if (soba.statistikaMecaPromise) return soba.statistikaMecaPromise;

    const ucesnici = [...new Set(
        soba.ucesniciMeca.map(igrac => igrac.playerId).filter(Boolean)
    )];
    const pobednici = [...new Set(
        pobednikPlayerIds.filter(playerId => ucesnici.includes(playerId))
    )];

    soba.statistikaMecaPromise = (async () => {
        const operacije = ucesnici.map(playerId => ({
            updateOne: {
                filter: {
                    playerId,
                    onlineObradjeniMecevi: { $ne: soba.partijaId }
                },
                update: {
                    $inc: { odigraniOnlineMecevi: 1 },
                    $push: {
                        onlineObradjeniMecevi: {
                            $each: [soba.partijaId],
                            $slice: -MAKSIMALNO_SACUVANIH_ONLINE_MECEVA
                        }
                    }
                }
            }
        }));

        pobednici.forEach(playerId => {
            operacije.push({
                updateOne: {
                    filter: {
                        playerId,
                        onlineObradjenePobede: { $ne: soba.partijaId }
                    },
                    update: {
                        $inc: { onlinePobede: 1, pobede: 1 },
                        $push: {
                            onlineObradjenePobede: {
                                $each: [soba.partijaId],
                                $slice: -MAKSIMALNO_SACUVANIH_ONLINE_MECEVA
                            }
                        }
                    }
                }
            });
        });

        if (operacije.length > 0) {
            await Igrac.bulkWrite(operacije);
        }
    })();

    try {
        await soba.statistikaMecaPromise;
    } catch (error) {
        soba.statistikaMecaPromise = null;
        throw error;
    }
}

async function upisiPobeduOnlineMeca(playerId, partijaId) {
    if (!playerId || !partijaId) return false;
    const rezultat = await Igrac.updateOne(
        {
            playerId,
            onlineObradjenePobede: { $ne: partijaId }
        },
        {
            $inc: { onlinePobede: 1, pobede: 1 },
            $push: {
                onlineObradjenePobede: {
                    $each: [partijaId],
                    $slice: -MAKSIMALNO_SACUVANIH_ONLINE_MECEVA
                }
            }
        }
    );
    return rezultat.modifiedCount > 0;
}

async function dodajKvartalnePojmoveZaIgraca(bazaId, brojPojmova, dogadjajId = "") {
    brojPojmova = Number(brojPojmova);
    if (!Number.isInteger(brojPojmova) || brojPojmova < 1 || brojPojmova > 7) {
        return null;
    }

    const ciklus = await osigurajAktivniKvartal();
    const filter = { _id: bazaId };
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
        igrac = await Igrac.findById(bazaId);
    }
    if (!igrac) return null;

    return {
        igrac,
        duplikat,
        statistika: {
            ciklus,
            sezonskiPojmovi: igrac.sezonskiPojmovi || 0,
            svaVremenaPojmovi: igrac.svaVremenaPojmovi || 0
        }
    };
}

function zavrsiRunduUSobi(soba, razlog = "svi_odgovorili") {
    if (!soba || soba.rundaZakljucena) return;

    soba.rundaZakljucena = true;
    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    soba.timeoutRunde = null;

    const poslaliOdgovore = new Set(soba.odgovoriOveRunde.map(odgovor => odgovor.idIgraca));
    soba.igraci.forEach(igrac => {
        if (poslaliOdgovore.has(igrac.id)) return;
        igrac.spremniOdgovori = true;
        soba.odgovoriOveRunde.push({
            idIgraca: igrac.id,
            ime: igrac.ime,
            odgovori: {},
            efekat: 'ef_nista'
        });
    });

    if (soba.trenutnaRunda >= 6) {
        soba.status = 'zavrsena';
        upisiOdigranOnlineMec(soba).catch(error => {
            console.error(`Greška pri upisu završenog online meča ${soba.partijaId}:`, error);
        });
        io.to(soba.id).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde, {
            serverVreme: Date.now(),
            runda: soba.trenutnaRunda,
            rundaId: soba.rundaId,
            partijaId: soba.partijaId,
            poslednjaRunda: true
        });
    } else {
        const serverVreme = Date.now();
        soba.sledecaRundaPocinjeAt = serverVreme
            + TRAJANJE_PRELAZA_DO_PREGLEDA_MS
            + TRAJANJE_PREGLEDA_RUNDE_MS;

        io.to(soba.id).emit('sviOdgovoriPrikupjeni', soba.odgovoriOveRunde, {
            serverVreme,
            runda: soba.trenutnaRunda,
            rundaId: soba.rundaId,
            partijaId: soba.partijaId,
            poslednjaRunda: false,
            sledecaRundaPocinjeAt: soba.sledecaRundaPocinjeAt
        });

        if (soba.timeoutCekanjaSledeceRunde) clearTimeout(soba.timeoutCekanjaSledeceRunde);
        soba.timeoutCekanjaSledeceRunde = setTimeout(() => {
            if (
                sobe[soba.id] !== soba
                || soba.status !== 'u_igri'
                || !soba.rundaZakljucena
            ) {
                return;
            }

            console.log(`⏭️ Serverski raspored pokreće sledeću rundu u sobi ${soba.id}.`);
            zapocniRunduUSobi(soba, io, soba.sledecaRundaPocinjeAt);
        }, Math.max(
            0,
            soba.sledecaRundaPocinjeAt - PRIPREMA_SLEDECE_RUNDE_MS - Date.now()
        ));
    }

    console.log(`Runda ${soba.trenutnaRunda} u sobi ${soba.id} zaključena (${razlog}).`);
}

function zapocniRunduUSobi(soba, io, planiraniPocetakAt = null) {
    if (!soba || sobe[soba.id] !== soba || soba.igraci.length === 0) return;

    if (soba.timeoutCekanjaSledeceRunde) {
        clearTimeout(soba.timeoutCekanjaSledeceRunde);
        soba.timeoutCekanjaSledeceRunde = null;
    }

    if (soba.trenutnaRunda === 0) {
        if (soba.igraci.length < 2) return;
        pripremiIdentitetOnlineMeca(soba);
    }

    soba.status = 'u_igri';
    soba.trenutnaRunda++;
    soba.odgovoriOveRunde = [];
    soba.rundaZakljucena = false;

    soba.igraci.forEach(i => {
        i.spremniOdgovori = false;
        i.spremniZaSledecuRundu = false;
    });

    let dostupnaSlova = svaSlova.filter(s => !soba.iskoriscenaSlova.includes(s));
    if (dostupnaSlova.length === 0) dostupnaSlova = svaSlova;
    
    const zadatoSlovo = dostupnaSlova[Math.floor(Math.random() * dostupnaSlova.length)];
    soba.iskoriscenaSlova.push(zadatoSlovo);

    const serverVreme = Date.now();
    const pripremaMs = soba.trenutnaRunda === 1
        ? PRIPREMA_PRVE_RUNDE_MS
        : PRIPREMA_SLEDECE_RUNDE_MS;
    const najranijiBezbedanPocetak = serverVreme + 1200;
    soba.pocetakRundeAt = Number.isFinite(Number(planiraniPocetakAt))
        ? Math.max(Number(planiraniPocetakAt), najranijiBezbedanPocetak)
        : serverVreme + pripremaMs;
    soba.krajRundeAt = soba.pocetakRundeAt + TRAJANJE_RUNDE_MS;
    soba.rundaId = `${soba.id}:${soba.trenutnaRunda}:${soba.pocetakRundeAt}`;

    const podaciRunde = {
        slovo: zadatoSlovo,
        runda: soba.trenutnaRunda,
        rundaId: soba.rundaId,
        partijaId: soba.partijaId,
        serverVreme,
        pocetakRundeAt: soba.pocetakRundeAt,
        krajRundeAt: soba.krajRundeAt
    };

    if (soba.trenutnaRunda === 1) {
        io.to(soba.id).emit('igraPocela', podaciRunde);
    } else {
        io.to(soba.id).emit('sledecaRundaPocinje', podaciRunde);
    }

    console.log(`Runda ${soba.trenutnaRunda} u sobi ${soba.id} zakazana za ${new Date(soba.pocetakRundeAt).toISOString()}. Slovo: ${zadatoSlovo}`);

    if (soba.timeoutRunde) clearTimeout(soba.timeoutRunde);
    soba.timeoutRunde = setTimeout(() => {
        console.log(`⏳ Istekao autoritativni tajmer za sobu ${soba.id}. Zaključujem rundu.`);
        zavrsiRunduUSobi(soba, "istek_vremena");
    }, Math.max(0, soba.krajRundeAt - Date.now() + MREZNA_REZERVA_NAKON_RUNDE_MS));
}

function proveriIPokreniSledecuRundu(soba) {
    if (soba.igraci.length === 0) return;
    const sviSpremni = soba.igraci.every(i => i.spremniZaSledecuRundu);
    if (sviSpremni && soba.status === 'u_igri' && soba.rundaZakljucena) {
        console.log(`✅ Svi igrači u sobi ${soba.id} spremni su za već zakazani zajednički start.`);
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
    ocistiTajmereSobe(soba);
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

    socket.on('sinhronizujVreme', (callback = () => {}) => {
        callback({
            serverVreme: Date.now(),
            vremenskaZona: VREMENSKA_ZONA_IGRE,
            datumId: datumIdBeograd()
        });
    });

    socket.on('dnevniIzazovStanje', async (callback = () => {}) => {
        try {
            let igrac = await ucitajPrijavljenogIgraca(socket);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
            }

            const stanje = osigurajDnevnoStanje(igrac);
            if (igrac.isModified("dnevniIzazov")) {
                igrac.markModified("dnevniIzazov");
                await igrac.save();
            }

            callback({ uspeh: true, ...napraviDnevniOdgovor(stanje) });
        } catch (error) {
            console.error("Greška pri čitanju dnevnog izazova:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    socket.on('dnevniIzazovPokreni', async (callback = () => {}) => {
        try {
            const igrac = await ucitajPrijavljenogIgraca(socket);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
            }

            const sada = Date.now();
            const aktivnoStanje = vratiAktivniDnevniAkoTraje(igrac, sada);
            if (aktivnoStanje) {
                return callback({ uspeh: true, ...napraviDnevniOdgovor(aktivnoStanje, { nastavak: true }) });
            }

            let stanje = osigurajDnevnoStanje(igrac, new Date(sada));

            if (stanje.odigrano || stanje.status === "odigrano") {
                return callback({
                    uspeh: false,
                    kod: "VEC_ODIGRANO",
                    poruka: "Dnevni izazov možeš igrati samo jednom dnevno.",
                    ...napraviDnevniOdgovor(stanje)
                });
            }

            if (
                stanje.zapoceto
                && stanje.status === "u_toku"
                && Number(stanje.rokAt) > sada
            ) {
                return callback({ uspeh: true, ...napraviDnevniOdgovor(stanje, { nastavak: true }) });
            }

            if (
                stanje.zapoceto
                && stanje.status === "u_toku"
                && Number(stanje.rokAt) > 0
                && Number(stanje.rokAt) <= sada
            ) {
                stanje.status = "odigrano";
                stanje.odigrano = true;
                stanje.zavrsenoAt = sada;
                stanje.rezultat = napraviIstekliDnevniRezultat(stanje);
                igrac.dnevniIzazov = stanje;
                igrac.markModified("dnevniIzazov");
                upisiDnevniUCloudNapredak(igrac, stanje);
                await igrac.save();
                return callback({
                    uspeh: false,
                    kod: "VEC_ODIGRANO",
                    poruka: "Dnevni izazov za danas je već istekao.",
                    ...napraviDnevniOdgovor(stanje)
                });
            }

            const pocetakIgreAt = sada + DNEVNI_INTRO_MS;
            stanje = {
                datumId: stanje.datumId,
                datum: stanje.datum,
                vremenskaZona: VREMENSKA_ZONA_IGRE,
                zadaci: stanje.zadaci,
                status: "u_toku",
                zapoceto: true,
                odigrano: false,
                zapocetoAt: sada,
                pocetakIgreAt,
                rokAt: pocetakIgreAt + DNEVNI_TRAJANJE_MS
            };

            igrac.dnevniIzazov = stanje;
            igrac.markModified("dnevniIzazov");
            upisiDnevniUCloudNapredak(igrac, stanje);
            await igrac.save();

            callback({ uspeh: true, ...napraviDnevniOdgovor(stanje) });
        } catch (error) {
            console.error("Greška pri pokretanju dnevnog izazova:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    socket.on('dnevniIzazovZavrsi', async (podaci = {}, callback = () => {}) => {
        try {
            let igrac = await ucitajPrijavljenogIgraca(socket);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
            }

            let stanje = vratiDnevnoStanjeZaZavrsetak(igrac, podaci && podaci.datumId);
            if (stanje.odigrano || stanje.status === "odigrano") {
                return callback({ uspeh: true, duplikat: true, ...napraviDnevniOdgovor(stanje) });
            }
            if (!stanje.zapoceto || stanje.status !== "u_toku") {
                return callback({ uspeh: false, kod: "DNEVNI_NIJE_POKRENUT" });
            }

            const sada = Date.now();
            const rokAt = Number(stanje.rokAt) || 0;
            const prekasno = rokAt > 0 && sada > rokAt + DNEVNI_GRACE_MS;
            const odgovori = prekasno ? {} : normalizujDnevneOdgovore(podaci && podaci.odgovori);

            let ukupnoTacnih = 0;
            const provera = (stanje.zadaci || []).map((zadatak, index) => {
                const odgovor = odgovori[zadatak.kategorija] || "";
                const tacno = !prekasno && BazaPodataka.proveriPojam(zadatak.kategorija, odgovor, zadatak.slovo);
                if (tacno) ukupnoTacnih++;
                return {
                    index,
                    kategorija: zadatak.kategorija,
                    odgovor,
                    tacno
                };
            });

            const osnovnaNagrada = ukupnoTacnih * 100;
            const bonusPerfektno = ukupnoTacnih === (stanje.zadaci || []).length && ukupnoTacnih > 0 ? 200 : 0;
            const dnevniNiz = ukupnoTacnih > 0
                ? izracunajDnevniNiz(igrac, stanje.datumId)
                : { poslednjiDatum: igrac.dnevniNiz?.poslednjiDatum || null, brojDana: Number(igrac.dnevniNiz?.brojDana) || 0, bonusDukata: 0 };
            const osvojenoDukata = osnovnaNagrada + bonusPerfektno + dnevniNiz.bonusDukata;

            stanje.status = "odigrano";
            stanje.odigrano = true;
            stanje.zavrsenoAt = sada;
            stanje.odgovori = odgovori;
            stanje.rezultat = {
                tacniPojmovi: ukupnoTacnih,
                osnovnaNagrada,
                bonusPerfektno,
                bonusDnevniNiz: dnevniNiz.bonusDukata,
                osvojenoDukata,
                x2Preuzet: false,
                x2BonusDukata: 0,
                ukupnoDukata: osvojenoDukata,
                dnevniNiz: dnevniNiz.brojDana,
                odgovori,
                provera,
                razlog: prekasno ? "isteklo_vreme" : "predato"
            };

            const noviDukati = normalizujDukate((igrac.dukati || 0) + osvojenoDukata, osvojenoDukata);
            const dnevniSet = {
                dnevniIzazov: stanje,
                cloudNapredak: napraviCloudNapredakSaDnevnim(igrac, stanje, noviDukati)
            };
            if (ukupnoTacnih > 0) {
                dnevniSet.dnevniNiz = {
                    poslednjiDatum: dnevniNiz.poslednjiDatum,
                    brojDana: dnevniNiz.brojDana
                };
            }

            const dnevniUpdate = { $set: dnevniSet };
            if (osvojenoDukata > 0) {
                dnevniUpdate.$inc = { dukati: osvojenoDukata };
            }

            let azuriranIgrac = await Igrac.findOneAndUpdate(
                {
                    _id: igrac._id,
                    "dnevniIzazov.datumId": stanje.datumId,
                    "dnevniIzazov.status": "u_toku",
                    "dnevniIzazov.odigrano": { $ne: true }
                },
                dnevniUpdate,
                { returnDocument: 'after' }
            );

            if (!azuriranIgrac) {
                const osvezenIgrac = await Igrac.findById(igrac._id);
                const zakljucanoStanje = osvezenIgrac ? osigurajDnevnoStanje(osvezenIgrac) : stanje;
                return callback({
                    uspeh: true,
                    duplikat: true,
                    ...napraviDnevniOdgovor(zakljucanoStanje, {
                        dukati: osvezenIgrac ? normalizujDukate(osvezenIgrac.dukati) : normalizujDukate(igrac.dukati),
                        kvartal: null
                    })
                });
            }

            igrac = azuriranIgrac;

            let kvartalRezultat = null;
            if (ukupnoTacnih > 0) {
                kvartalRezultat = await dodajKvartalnePojmoveZaIgraca(
                    igrac._id,
                    ukupnoTacnih,
                    `dnevni:${stanje.datumId}`
                );
                if (kvartalRezultat && kvartalRezultat.statistika) {
                    await Igrac.updateOne(
                        { _id: igrac._id },
                        { $set: { "cloudNapredak.kvartal": {
                            sezonskiPojmovi: kvartalRezultat.statistika.sezonskiPojmovi,
                            svaVremenaPojmovi: kvartalRezultat.statistika.svaVremenaPojmovi
                        } } }
                    );
                    socket.emit('osveziMojeKvartalnePodatke', kvartalRezultat.statistika);
                }
            }

            const odgovor = napraviDnevniOdgovor(stanje, {
                dukati: normalizujDukate(igrac.dukati),
                kvartal: kvartalRezultat ? kvartalRezultat.statistika : null
            });
            callback({ uspeh: true, ...odgovor });
        } catch (error) {
            console.error("Greška pri završetku dnevnog izazova:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    socket.on('dnevniIzazovDuplirajNagradu', async (podaci = {}, callback = () => {}) => {
        try {
            let igrac = await ucitajPrijavljenogIgraca(socket);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
            }

            const datumId = podaci && podaci.datumId;
            if (!datumId) {
                return callback({ uspeh: false, kod: "DNEVNI_DATUM_NEDOSTAJE" });
            }

            const stanje = vratiDnevnoStanjeZaZavrsetak(igrac, datumId);
            if (stanje.datumId !== datumId || !stanje.odigrano || stanje.status !== "odigrano") {
                return callback({ uspeh: false, kod: "DNEVNI_NIJE_ZAVRSEN" });
            }

            const rezultat = stanje.rezultat || {};
            const osnovnaNagrada = Math.max(0, Number(rezultat.osvojenoDukata) || 0);
            if (osnovnaNagrada < 1) {
                return callback({ uspeh: false, kod: "NEMA_NAGRADE_ZA_X2" });
            }

            if (rezultat.x2Preuzet) {
                return callback({
                    uspeh: true,
                    duplikat: true,
                    ...napraviDnevniOdgovor(stanje, {
                        dukati: normalizujDukate(igrac.dukati),
                        x2BonusDukata: Math.max(0, Number(rezultat.x2BonusDukata) || 0)
                    })
                });
            }

            const x2BonusDukata = osnovnaNagrada;
            const novoStanje = {
                ...stanje,
                rezultat: {
                    ...rezultat,
                    x2Preuzet: true,
                    x2BonusDukata,
                    ukupnoDukata: osnovnaNagrada + x2BonusDukata,
                    x2PreuzetoAt: Date.now()
                }
            };
            const noviDukati = normalizujDukate((igrac.dukati || 0) + x2BonusDukata, x2BonusDukata);

            const azuriranIgrac = await Igrac.findOneAndUpdate(
                {
                    _id: igrac._id,
                    "dnevniIzazov.datumId": datumId,
                    "dnevniIzazov.odigrano": true,
                    "dnevniIzazov.status": "odigrano",
                    "dnevniIzazov.rezultat.x2Preuzet": { $ne: true }
                },
                {
                    $set: {
                        dnevniIzazov: novoStanje,
                        cloudNapredak: napraviCloudNapredakSaDnevnim(igrac, novoStanje, noviDukati)
                    },
                    $inc: { dukati: x2BonusDukata }
                },
                { returnDocument: 'after' }
            );

            if (!azuriranIgrac) {
                const osvezenIgrac = await Igrac.findById(igrac._id);
                const osvezenoStanje = osvezenIgrac
                    ? vratiDnevnoStanjeZaZavrsetak(osvezenIgrac, datumId)
                    : stanje;
                return callback({
                    uspeh: Boolean(osvezenoStanje.rezultat && osvezenoStanje.rezultat.x2Preuzet),
                    duplikat: Boolean(osvezenoStanje.rezultat && osvezenoStanje.rezultat.x2Preuzet),
                    kod: osvezenoStanje.rezultat && osvezenoStanje.rezultat.x2Preuzet ? undefined : "DNEVNI_X2_NIJE_UPISAN",
                    ...napraviDnevniOdgovor(osvezenoStanje, {
                        dukati: osvezenIgrac ? normalizujDukate(osvezenIgrac.dukati) : normalizujDukate(igrac.dukati)
                    })
                });
            }

            callback({
                uspeh: true,
                ...napraviDnevniOdgovor(novoStanje, {
                    dukati: normalizujDukate(azuriranIgrac.dukati),
                    x2BonusDukata
                })
            });
        } catch (error) {
            console.error("Greška pri x2 dnevnoj nagradi:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

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
            let igrac = await pronadjiIgracaPoProfilKljucu(profilKljuc);
            const zauzetiProfil = await Igrac.findOne({
                $or: [
                    { nadimakNormalizovan },
                    { nadimak: { $regex: `^${nadimak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" } }
                ]
            });

            if (zauzetiProfil && (!igrac || String(zauzetiProfil._id) !== String(igrac._id))) {
                const kljucPripadaZauzetomProfilu = zauzetiProfil.profilKljuc === profilKljuc
                    || (Array.isArray(zauzetiProfil.povezaniProfilKljucevi)
                        && zauzetiProfil.povezaniProfilKljucevi.includes(profilKljuc));
                if (!kljucPripadaZauzetomProfilu && (zauzetiProfil.profilKljuc || zauzetiProfil.googleUid)) {
                    return callback({ uspeh: false, kod: "NADIMAK_ZAUZET", poruka: "Ovaj nadimak je već zauzet. Izaberi drugi." });
                }

                // Jednokratna migracija profila napravljenih pre uvođenja vlasničkog ključa.
                igrac = zauzetiProfil;
            }

            if (igrac) {
                igrac.nadimak = nadimak;
                igrac.nadimakNormalizovan = nadimakNormalizovan;
                if (!igrac.profilKljuc) {
                    igrac.profilKljuc = profilKljuc;
                } else if (igrac.profilKljuc !== profilKljuc) {
                    dodajPovezaniProfilKljuc(igrac, profilKljuc);
                }
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
            const igrac = await pronadjiIgracaPoProfilKljucu(profilKljuc);
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

    socket.on('poveziProfilKljuc', async (podaci = {}, callback = () => {}) => {
        const prijavljeniIgrac = onlineIgraci[socket.id];
        const profilKljuc = podaci && podaci.profilKljuc;
        if (!prijavljeniIgrac) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }
        if (!profilKljucJeIspravan(profilKljuc)) {
            return callback({ uspeh: false, kod: "NEISPRAVAN_PROFIL" });
        }

        try {
            const igrac = await Igrac.findById(prijavljeniIgrac.bazaId);
            if (!igrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRONADJEN" });
            }

            const vlasnikKljuca = await pronadjiIgracaPoProfilKljucu(profilKljuc);
            if (vlasnikKljuca && String(vlasnikKljuca._id) !== String(igrac._id)) {
                return callback({ uspeh: false, kod: "PROFIL_KLJUC_ZAUZET" });
            }

            if (!igrac.profilKljuc) {
                igrac.profilKljuc = profilKljuc;
            } else if (igrac.profilKljuc !== profilKljuc) {
                dodajPovezaniProfilKljuc(igrac, profilKljuc);
            }
            igrac.poslednjaPrijava = new Date();
            await igrac.save();
            prijaviOnlineIgraca(socket, igrac);
            callback({ uspeh: true, profil: podaciProfilaZaKlijenta(igrac) });
        } catch (error) {
            console.error("Greška pri povezivanju profil ključa:", error);
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
            primeniNapredakNaBrojkeProfila(igrac, ocisceniNapredak);
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

    // --- POVEZIVANJE GOST PROFILA SA GOOGLE UID NALOGOM ---
    socket.on('poveziGoogleNalog', async (podaci = {}, callback = () => {}) => {
        const profilKljuc = podaci && podaci.profilKljuc;
        const prijavljeniIgrac = onlineIgraci[socket.id];

        if (!prijavljeniIgrac && !profilKljucJeIspravan(profilKljuc)) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN", poruka: "Prvo napravi lokalni profil." });
        }

        try {
            const googleUid = await potvrdiGoogleIdentitet(podaci);
            const lokalniNapredak = sanitizujCloudNapredak(podaci && podaci.napredak);
            let lokalniIgrac = prijavljeniIgrac
                ? await Igrac.findById(prijavljeniIgrac.bazaId)
                : await pronadjiIgracaPoProfilKljucu(profilKljuc);

            if (!lokalniIgrac) {
                return callback({ uspeh: false, kod: "PROFIL_NIJE_PRONADJEN", poruka: "Lokalni profil nije pronađen." });
            }

            osigurajIdentitetIgraca(lokalniIgrac);
            let googleIgrac = await Igrac.findOne({ googleUid });
            const istiProfil = googleIgrac && String(googleIgrac._id) === String(lokalniIgrac._id);
            const ciljniIgrac = googleIgrac || lokalniIgrac;
            const prethodniCloud = googleIgrac
                ? (googleIgrac.cloudNapredak || {})
                : (lokalniIgrac.cloudNapredak || {});
            const spojeniNapredak = sanitizujCloudNapredak(spojiCloudNapredak(prethodniCloud, lokalniNapredak));

            if (googleIgrac && !istiProfil) {
                if (profilKljucJeIspravan(lokalniIgrac.profilKljuc)) {
                    dodajPovezaniProfilKljuc(googleIgrac, lokalniIgrac.profilKljuc);
                    lokalniIgrac.profilKljuc = undefined;
                }
                if (profilKljucJeIspravan(profilKljuc)) {
                    dodajPovezaniProfilKljuc(googleIgrac, profilKljuc);
                }

                googleIgrac.dukati = Math.max(
                    normalizujDukate(googleIgrac.dukati, 500),
                    normalizujDukate(lokalniIgrac.dukati, 500)
                );
                googleIgrac.tokeni = Math.max(
                    normalizujTokeni(googleIgrac.tokeni, 3),
                    normalizujTokeni(lokalniIgrac.tokeni, 3)
                );
                googleIgrac.sezonskiPojmovi = Math.max(
                    Number(googleIgrac.sezonskiPojmovi) || 0,
                    Number(lokalniIgrac.sezonskiPojmovi) || 0
                );
                googleIgrac.svaVremenaPojmovi = Math.max(
                    Number(googleIgrac.svaVremenaPojmovi) || 0,
                    Number(lokalniIgrac.svaVremenaPojmovi) || 0
                );

                lokalniIgrac.lokalnaMigracijaZavrsena = true;
                lokalniIgrac.poslednjaPrijava = new Date();
                await lokalniIgrac.save();
            } else if (profilKljucJeIspravan(profilKljuc)) {
                dodajPovezaniProfilKljuc(ciljniIgrac, profilKljuc);
            }

            ciljniIgrac.googleUid = googleUid;
            ciljniIgrac.cloudNapredak = spojeniNapredak;
            ciljniIgrac.cloudRevizija = (ciljniIgrac.cloudRevizija || 0) + 1;
            ciljniIgrac.lokalnaMigracijaZavrsena = true;
            ciljniIgrac.cloudAzuriranAt = new Date();
            ciljniIgrac.poslednjaPrijava = new Date();
            primeniNapredakNaBrojkeProfila(ciljniIgrac, spojeniNapredak);
            await ciljniIgrac.save();

            prijaviOnlineIgraca(socket, ciljniIgrac);
            callback({
                uspeh: true,
                googleUid,
                migracija: {
                    spojenoSaPostojecimGoogleProfilom: Boolean(googleIgrac && !istiProfil),
                    sacuvanLokalniNapredak: true
                },
                profil: podaciProfilaZaKlijenta(ciljniIgrac)
            });
        } catch (error) {
            if (error && error.code === 11000) {
                return callback({ uspeh: false, kod: "GOOGLE_NALOG_VEC_POSTOJI", poruka: "Ovaj Google nalog je već povezan sa drugim profilom." });
            }
            console.error("Greška pri povezivanju Google naloga:", error);
            callback({
                uspeh: false,
                kod: error && error.kod ? error.kod : "GRESKA_SERVERA",
                poruka: error && error.message ? error.message : "Google nalog trenutno nije moguće povezati."
            });
        }
    });

    // --- DIREKTNA PRIJAVA POSTOJEĆEG GOOGLE PROFILA ---
    socket.on('prijavaGoogleNaloga', async (podaci = {}, callback = () => {}) => {
        try {
            const googleUid = await potvrdiGoogleIdentitet(podaci);
            const igrac = await Igrac.findOne({ googleUid });
            if (!igrac) {
                return callback({ uspeh: false, kod: "GOOGLE_PROFIL_NIJE_PRONADJEN", poruka: "Za ovaj Google nalog još ne postoji Zemljopis profil." });
            }

            if (profilKljucJeIspravan(podaci.profilKljuc)) {
                const vlasnikKljuca = await pronadjiIgracaPoProfilKljucu(podaci.profilKljuc);
                if (!vlasnikKljuca || String(vlasnikKljuca._id) === String(igrac._id)) {
                    dodajPovezaniProfilKljuc(igrac, podaci.profilKljuc);
                }
            }

            osigurajIdentitetIgraca(igrac);
            igrac.poslednjaPrijava = new Date();
            await igrac.save();
            prijaviOnlineIgraca(socket, igrac);
            callback({ uspeh: true, googleUid, profil: podaciProfilaZaKlijenta(igrac) });
        } catch (error) {
            console.error("Greška pri Google prijavi:", error);
            callback({
                uspeh: false,
                kod: error && error.kod ? error.kod : "GRESKA_SERVERA",
                poruka: error && error.message ? error.message : "Google prijava trenutno nije dostupna."
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

    socket.on('upisiPobedu', async (callback = () => {}) => {
        const onlineIgrac = onlineIgraci[socket.id];
        if (!onlineIgrac) {
            return callback({ uspeh: false, kod: "PROFIL_NIJE_PRIJAVLJEN" });
        }

        const zavrsenaSoba = Object.values(sobe).find(soba =>
            soba.status === 'zavrsena'
            && soba.igraci.some(igrac => igrac.playerId === onlineIgrac.playerId)
            && (soba.ucesniciMeca || []).some(igrac => igrac.playerId === onlineIgrac.playerId)
        );
        if (!zavrsenaSoba) {
            return callback({ uspeh: false, kod: "MEC_NIJE_PRONADJEN" });
        }

        try {
            await upisiOdigranOnlineMec(zavrsenaSoba);
            await upisiPobeduOnlineMeca(onlineIgrac.playerId, zavrsenaSoba.partijaId);
            callback({ uspeh: true });
        } catch (error) {
            console.error("Greška pri kompatibilnom upisu pobede:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
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

        const maksimalnoIgraca = Number(brojIgraca);
        if (!Number.isInteger(maksimalnoIgraca) || maksimalnoIgraca < 2 || maksimalnoIgraca > 5) {
            return callback({ uspeh: false, poruka: "Soba može imati od 2 do 5 igrača." });
        }

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: maksimalnoIgraca,
            igraci: [igracZaSobu(socket.id)],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            tipSobe: "kod",
            hostIme: onlineIgraci[socket.id].ime,
            pozvaniSocketIds: [],
            timeoutRunde: null,
            timeoutCekanjaSledeceRunde: null,
            rundaZakljucena: false
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
        if (jedinstveniPozvani.length > 4) {
            return callback({
                uspeh: false,
                kod: "PREVISE_POZVANIH",
                poruka: "Možeš pozvati najviše četiri prijatelja."
            });
        }

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

        const brojIgraca = ciljeviPoziva.length + 1;

        const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let kodSobe = "";
        for (let i = 0; i < 4; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

        sobe[kodSobe] = {
            id: kodSobe,
            host: socket.id,
            maxIgraca: brojIgraca,
            igraci: [igracZaSobu(socket.id)],
            status: 'cekanje',
            iskoriscenaSlova: [],
            trenutnaRunda: 0,
            odgovoriOveRunde: [],
            javna: false,
            tipSobe: "poziv",
            hostIme: onlineIgraci[socket.id].ime,
            pozvaniSocketIds: ciljeviPoziva.map(cilj => cilj.id),
            timeoutRunde: null,
            timeoutCekanjaSledeceRunde: null,
            rundaZakljucena: false
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

        const noviIgrac = igracZaSobu(socket.id);
        const imeIgraca = noviIgrac.ime;
        soba.igraci.push(noviIgrac);
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
        const { kodSobe, odgovori, efekat, runda, rundaId } = podaci;
        const soba = sobe[kodSobe];

        if (soba && !soba.rundaZakljucena) {
            if (runda !== undefined && Number(runda) !== soba.trenutnaRunda) return;
            if (rundaId && rundaId !== soba.rundaId) return;

            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac && !igrac.spremniOdgovori) {
                igrac.spremniOdgovori = true;
                const provereniEfekat = normalizujEfekatRunde(efekat || odgovori?.__efekat);
                const ocisceniOdgovori = { ...(odgovori || {}) };
                delete ocisceniOdgovori.__efekat;

                soba.odgovoriOveRunde.push({
                    idIgraca: socket.id,
                    ime: igrac.ime,
                    odgovori: ocisceniOdgovori,
                    efekat: provereniEfekat
                });

                const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                if (sviPoslali) {
                    zavrsiRunduUSobi(soba, "svi_odgovorili");
                }
            }
        }
    });

    socket.on('spremanZaSledecuRundu', (prviArgument, dodatniPodaci = {}) => {
        const podaci = typeof prviArgument === 'string'
            ? { ...dodatniPodaci, kodSobe: prviArgument }
            : (prviArgument || {});
        const kodSobe = podaci.kodSobe;
        const soba = sobe[kodSobe];
        if (soba) {
            if (podaci.runda !== undefined && Number(podaci.runda) !== soba.trenutnaRunda) return;
            if (podaci.rundaId && podaci.rundaId !== soba.rundaId) return;

            const igrac = soba.igraci.find(i => i.id === socket.id);
            if (igrac) {
                igrac.spremniZaSledecuRundu = true;
                proveriIPokreniSledecuRundu(soba);
            }
        }
    });

    socket.on('upisiIshodOnlineMeca', async (podaci = {}, callback = () => {}) => {
        const onlineIgrac = onlineIgraci[socket.id];
        const kodSobe = String(podaci.kodSobe || "").toUpperCase();
        const partijaId = String(podaci.partijaId || "");
        const soba = sobe[kodSobe];

        if (!onlineIgrac || !soba || soba.status !== 'zavrsena' || soba.partijaId !== partijaId) {
            return callback({ uspeh: false, kod: "MEC_NIJE_PRONADJEN" });
        }

        const ucesnik = (soba.ucesniciMeca || [])
            .some(igrac => igrac.playerId === onlineIgrac.playerId);
        const zavrsioMec = soba.igraci
            .some(igrac => igrac.playerId === onlineIgrac.playerId);
        if (!ucesnik || !zavrsioMec) {
            return callback({ uspeh: false, kod: "IGRAC_NIJE_ZAVRSIO_MEC" });
        }

        try {
            await upisiOdigranOnlineMec(soba);
            if (Boolean(podaci.pobeda)) {
                await upisiPobeduOnlineMeca(onlineIgrac.playerId, partijaId);
            }
            callback({ uspeh: true });
        } catch (error) {
            console.error("Greška pri upisu ishoda online meča:", error);
            callback({ uspeh: false, kod: "GRESKA_SERVERA" });
        }
    });

    // --- 5. MATCHMAKING JAVNE SOBE ---
    socket.on('traziJavnuSobu', (podaci, callback) => {
        if (!onlineIgraci[socket.id]) {
            return callback({ uspeh: false, poruka: "Prvo kreiraj i potvrdi svoj profil." });
        }

        const brojIgraca = Number(podaci.brojIgraca);
        if (!Number.isInteger(brojIgraca) || brojIgraca < 2 || brojIgraca > 5) {
            return callback({ uspeh: false, poruka: "Soba može imati od 2 do 5 igrača." });
        }

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
            nadjenaSoba.igraci.push(igracZaSobu(socket.id));
            socket.join(nadjenaSoba.id);

            posaljiDogadjajSobe(nadjenaSoba, 'igrac_usao', {
                ime,
                popunjena: nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca
            });
            io.to(nadjenaSoba.id).emit('azuriranjeJavneSobe', { brojIgraca: nadjenaSoba.igraci.length, max: nadjenaSoba.maxIgraca, _dogadjajSobe: true });

            if (nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca) {
                setTimeout(() => {
                    if (
                        sobe[nadjenaSoba.id] === nadjenaSoba
                        && nadjenaSoba.status === 'cekanje'
                        && nadjenaSoba.igraci.length === nadjenaSoba.maxIgraca
                    ) {
                        zapocniRunduUSobi(nadjenaSoba, io);
                    }
                }, 1500);
            }
            callback({ uspeh: true, kodSobe: nadjenaSoba.id, isHost: false });
        } else {
            const karakteri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let kodSobe = "";
            for (let i = 0; i < 5; i++) kodSobe += karakteri.charAt(Math.floor(Math.random() * karakteri.length)); 

            sobe[kodSobe] = {
                id: kodSobe, host: socket.id, maxIgraca: brojIgraca,
                igraci: [igracZaSobu(socket.id)],
                status: 'cekanje', iskoriscenaSlova: [], trenutnaRunda: 0, odgovoriOveRunde: [], javna: true, tipSobe: "javna", hostIme: ime, pozvaniSocketIds: [], timeoutRunde: null, timeoutCekanjaSledeceRunde: null, rundaZakljucena: false
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
                    ocistiTajmereSobe(soba);
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
                    const pobednik = soba.igraci[0];
                    posaljiDogadjajSobe(soba, 'automatska_pobeda', {
                        pobednikIme: pobednik.ime,
                        napustioIme: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        razlogTekst: opisRazloga.tekst
                    });
                    upisiOdigranOnlineMec(soba, [pobednik.playerId]).catch(error => {
                        console.error(`Greška pri upisu automatske pobede ${soba.partijaId}:`, error);
                    });
                    io.to(kodSobe).emit('pobedaZbogNapustanja', {
                        kodSobe,
                        pobednikIme: pobednik.ime,
                        napustioIme: igracKojiIzlazi.ime,
                        razlog: opisRazloga.kod,
                        _dogadjajSobe: true
                    });
                    ocistiTajmereSobe(soba);
                    delete sobe[kodSobe];
                    break;
                }

                if (soba.igraci.length === 0) {
                    ocistiTajmereSobe(soba);
                    delete sobe[kodSobe]; 
                } else {
                    const sviPoslali = soba.igraci.every(i => i.spremniOdgovori);
                    if (sviPoslali && soba.status === 'u_igri' && soba.igraci.length > 0) {
                        zavrsiRunduUSobi(soba, "igrac_napustio");
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

    socket.on('obrisiPrijatelja', async (podaci = {}, callback = () => {}) => {
        const ja = onlineIgraci[socket.id];
        if (!ja) {
            return callback({
                uspeh: false,
                kod: "PROFIL_NIJE_PRIJAVLJEN",
                poruka: "Profil nije povezan sa serverom."
            });
        }

        try {
            const rezultat = await obrisiTrajnoPrijateljstvo(
                ja,
                podaci.playerIdPrijatelja
            );
            if (!rezultat.uspeh) {
                await osveziPrijateljeZaSocket(socket.id);
                return callback(rezultat);
            }

            await osveziPrijateljeZaSocket(socket.id);

            const prijateljOnline = pronadjiOnlineIgracaPoPlayerId(
                rezultat.prijatelj.playerId
            );
            if (prijateljOnline) {
                await osveziPrijateljeZaSocket(prijateljOnline.id);
            }

            callback({
                uspeh: true,
                imePrijatelja: rezultat.prijatelj.nadimak
            });
        } catch (error) {
            console.error("Greška pri brisanju prijatelja:", error);
            callback({
                uspeh: false,
                kod: "GRESKA_SERVERA",
                poruka: "Prijatelja trenutno nije moguće izbrisati."
            });
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
