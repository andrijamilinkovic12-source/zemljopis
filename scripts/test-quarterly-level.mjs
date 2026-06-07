import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const oznaka = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const ligaKljuc = `kvartal_test_${oznaka}`;
const stariCiklus = `test_${oznaka}_Q1`;
const noviCiklus = `test_${oznaka}_Q2`;
const profilPrefiks = `profil_kvartal_${oznaka}_`;
const profili = [
    { profilKljuc: `${profilPrefiks}a`, nadimak: `Kva${oznaka.slice(-5)}A`, avatar: "atlas", sezona: 120, svaVremena: 120 },
    { profilKljuc: `${profilPrefiks}b`, nadimak: `Kva${oznaka.slice(-5)}B`, avatar: "luna", sezona: 80, svaVremena: 90 },
    { profilKljuc: `${profilPrefiks}c`, nadimak: `Kva${oznaka.slice(-5)}C`, avatar: "orion", sezona: 40, svaVremena: 50 }
];
let sledeciPort = 4200 + Math.floor(Math.random() * 300);

function sacekaj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function proveri(uslov, poruka) {
    if (!uslov) throw new Error(poruka);
}

function pokreniServer() {
    const port = String(sledeciPort++);
    const izlaz = [];
    const proces = spawn(process.execPath, ["server.js"], {
        cwd: rootDir,
        env: {
            ...process.env,
            PORT: port,
            KVARTALNI_LIGA_KLJUC: ligaKljuc,
            KVARTALNI_TEST_CIKLUS: noviCiklus,
            KVARTALNI_TEST_PROFIL_PREFIX: profilPrefiks
        },
        stdio: ["ignore", "pipe", "pipe"]
    });
    proces.stdout.on("data", podatak => izlaz.push(podatak.toString()));
    proces.stderr.on("data", podatak => izlaz.push(podatak.toString()));
    return { proces, url: `http://127.0.0.1:${port}`, izlaz };
}

async function zaustaviServer(server) {
    if (!server || !server.proces) return;
    server.proces.kill();
    await sacekaj(1200);
}

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, "node_modules", "socket.io", "client-dist", "socket.io.esm.min.js");
    const kopija = path.join(os.tmpdir(), `socket-io-quarterly-${Date.now()}.mjs`);
    fs.copyFileSync(izvor, kopija);
    return import(pathToFileURL(kopija).href);
}

function povezi(io, url) {
    return new Promise((resolve, reject) => {
        const socket = io(url, {
            transports: ["websocket"],
            timeout: 12000,
            forceNew: true
        });
        const tajmer = setTimeout(() => reject(new Error("Socket se nije povezao.")), 15000);
        socket.on("connect", () => {
            clearTimeout(tajmer);
            resolve(socket);
        });
        socket.on("connect_error", reject);
    });
}

function emitAck(socket, dogadjaj, podaci) {
    return new Promise((resolve, reject) => {
        socket.timeout(12000).emit(dogadjaj, podaci, (greska, odgovor) => {
            if (greska) reject(greska);
            else resolve(odgovor);
        });
    });
}

function emitAckBezPodataka(socket, dogadjaj) {
    return new Promise((resolve, reject) => {
        socket.timeout(12000).emit(dogadjaj, (greska, odgovor) => {
            if (greska) reject(greska);
            else resolve(odgovor);
        });
    });
}

function sacekajDogadjaj(socket, dogadjaj, provera) {
    return new Promise((resolve, reject) => {
        const tajmer = setTimeout(() => {
            socket.off(dogadjaj, obradi);
            reject(new Error(`Događaj ${dogadjaj} nije stigao.`));
        }, 12000);

        function obradi(podaci) {
            if (!provera(podaci)) return;
            clearTimeout(tajmer);
            socket.off(dogadjaj, obradi);
            resolve(podaci);
        }

        socket.on(dogadjaj, obradi);
    });
}

async function pripremiPrethodniCiklus() {
    await mongoose.connect(process.env.MONGO_URI);
    const Igrac = mongoose.models.KvartalTestIgrac || mongoose.model(
        "KvartalTestIgrac",
        new mongoose.Schema({}, { strict: false }),
        "igracs"
    );
    const LigaStanje = mongoose.models.KvartalTestLigaStanje || mongoose.model(
        "KvartalTestLigaStanje",
        new mongoose.Schema({}, { strict: false }),
        "ligastanjes"
    );

    await Promise.all(profili.map(profil => Igrac.updateOne(
        { profilKljuc: profil.profilKljuc },
        {
            $set: {
                sezonskiCiklus: stariCiklus,
                sezonskiPojmovi: profil.sezona,
                svaVremenaPojmovi: profil.svaVremena,
                kvartalniObradjeniDogadjaji: []
            }
        }
    )));
    await LigaStanje.updateOne(
        { kljuc: ligaKljuc },
        { $set: { aktivniCiklus: stariCiklus } },
        { upsert: true }
    );
    await mongoose.disconnect();
}

async function ocistiTestPodatke() {
    if (!process.env.MONGO_URI) return;
    await mongoose.connect(process.env.MONGO_URI);
    await mongoose.connection.collection("igracs").deleteMany({
        profilKljuc: { $in: profili.map(profil => profil.profilKljuc) }
    });
    await mongoose.connection.collection("ligastanjes").deleteMany({ kljuc: ligaKljuc });

    const kolekcije = await mongoose.connection.db.listCollections().toArray();
    const istorija = kolekcije.find(kolekcija => kolekcija.name.startsWith("kvartalniciklus"));
    if (istorija) {
        await mongoose.connection.collection(istorija.name).deleteMany({
            ciklus: { $in: [stariCiklus, noviCiklus] }
        });
    }
    await mongoose.disconnect();
}

let server;
let socket;

try {
    proveri(Boolean(process.env.MONGO_URI), "MONGO_URI nije podešen.");
    const { io } = await ucitajSocketKlijent();

    server = pokreniServer();
    await sacekaj(3500);
    socket = await povezi(io, server.url);

    for (const profil of profili) {
        const odgovor = await emitAck(socket, "registrujProfil", {
            nadimak: profil.nadimak,
            avatar: profil.avatar,
            profilKljuc: profil.profilKljuc
        });
        proveri(odgovor.uspeh, `Profil ${profil.nadimak} nije registrovan.`);
    }

    await sacekaj(800);
    await pripremiPrethodniCiklus();

    const listaPoslePreseka = sacekajDogadjaj(
        socket,
        "kvartalnaTopListaServer",
        podaci => podaci && podaci.ciklus === noviCiklus
    );
    const odgovorListe = await emitAckBezPodataka(socket, "traziKvartalneListe");
    proveri(odgovorListe.uspeh, "Kvartalne liste nisu učitane.");
    const presek = await listaPoslePreseka;

    proveri(
        presek.sezona.every(nivo => nivo.length === 0),
        `Sezonski poeni nisu resetovani: ${JSON.stringify(presek.sezona)}`
    );
    proveri(presek.svaVremena[0].ime === profili[0].nadimak, "Lista svih vremena nije sačuvala rezultate.");
    proveri(presek.medalje.length === 3, "Medalje za TOP 3 nisu formirane.");
    proveri(presek.medalje[0].zlato === 1, "Zlatna medalja nije upisana.");
    proveri(presek.sampioni.length === 1, "Šampion ciklusa nije upisan.");
    proveri(presek.sampioni[0].ime === profili[0].nadimak, "Pogrešan igrač je sačuvan kao šampion.");

    socket.disconnect();
    socket = await povezi(io, server.url);
    const prijava = await emitAck(socket, "prijavaProfila", {
        profilKljuc: profili[0].profilKljuc
    });
    proveri(prijava.uspeh, "Test profil nije ponovo prijavljen.");

    const dogadjajId = `test_${oznaka}:r1`;
    const prviUpis = await emitAck(socket, "dodajPojmove", { broj: 5, dogadjajId });
    const ponovljeniUpis = await emitAck(socket, "dodajPojmove", { broj: 5, dogadjajId });
    proveri(prviUpis.uspeh && !prviUpis.duplikat, "Prvi upis pojmova nije prihvaćen.");
    proveri(ponovljeniUpis.uspeh && ponovljeniUpis.duplikat, "Dupli upis nije prepoznat.");
    proveri(prviUpis.statistika.sezonskiPojmovi === 5, "Sezonski rezultat nije tačno upisan.");
    proveri(ponovljeniUpis.statistika.svaVremenaPojmovi === 125, "Isti rezultat je upisan više puta.");

    const listaPosleUpisa = sacekajDogadjaj(
        socket,
        "kvartalnaTopListaServer",
        podaci => podaci
            && podaci.sezona[0]
            && podaci.sezona[0].some(igrac => igrac.ime === profili[0].nadimak)
    );
    await emitAckBezPodataka(socket, "traziKvartalneListe");
    const aktuelneListe = await listaPosleUpisa;
    const ligaIgrac = aktuelneListe.sezona[0].find(igrac => igrac.ime === profili[0].nadimak);
    const svaVremenaIgrac = aktuelneListe.svaVremena.find(igrac => igrac.ime === profili[0].nadimak);
    proveri(ligaIgrac.pojmovi === 5, "Liga nije sinhronizovana sa novim upisom.");
    proveri(svaVremenaIgrac.pojmovi === 125, "Sva vremena nisu sinhronizovana sa novim upisom.");

    socket.disconnect();
    await zaustaviServer(server);
    server = pokreniServer();
    await sacekaj(3500);
    socket = await povezi(io, server.url);

    const sinhronizacija = sacekajDogadjaj(
        socket,
        "osveziMojeKvartalnePodatke",
        podaci => podaci
            && podaci.sezonskiPojmovi === 5
            && podaci.svaVremenaPojmovi === 125
    );
    const ponovnaPrijava = await emitAck(socket, "prijavaProfila", {
        profilKljuc: profili[0].profilKljuc
    });
    proveri(ponovnaPrijava.uspeh, "Ponovna prijava posle restarta nije uspela.");
    await sinhronizacija;

    console.log("OK: kvartalna liga, sva vremena, medalje i šampioni su trajno sinhronizovani.");
} catch (error) {
    if (server && server.izlaz.length > 0) {
        console.error(server.izlaz.join("").slice(-4000));
    }
    throw error;
} finally {
    if (socket) socket.disconnect();
    await zaustaviServer(server);
    try {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        await ocistiTestPodatke();
    } catch (error) {
        console.error("Čišćenje kvartalnih test podataka nije uspelo:", error.message);
    }
}
