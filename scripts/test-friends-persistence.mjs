import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testOznaka = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const profilA = `profil_friend_a_${testOznaka}`;
const profilB = `profil_friend_b_${testOznaka}`;
const imeA = `PrijA${testOznaka.slice(-5)}`;
const novoImeA = `${imeA}X`;
const imeB = `PrijB${testOznaka.slice(-5)}`;
const spoljasnjiServer = process.env.TEST_SERVER_URL || "";
let sledeciPort = 3900 + Math.floor(Math.random() * 300);

function sacekaj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function proveri(uslov, poruka) {
    if (!uslov) throw new Error(poruka);
}

function pokreniServer() {
    if (spoljasnjiServer) {
        return { proces: null, url: spoljasnjiServer };
    }

    const port = String(sledeciPort++);
    const proces = spawn(process.execPath, ["server.js"], {
        cwd: rootDir,
        env: { ...process.env, PORT: port },
        stdio: ["ignore", "pipe", "pipe"]
    });
    return { proces, url: `http://127.0.0.1:${port}` };
}

async function zaustaviServer(server) {
    if (!server || !server.proces) return;
    server.proces.kill();
    await sacekaj(1200);
}

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, "node_modules", "socket.io", "client-dist", "socket.io.esm.min.js");
    const kopija = path.join(os.tmpdir(), `socket-io-friends-${Date.now()}.mjs`);
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

let server;
let socketA;
let socketB;

try {
    const { io } = await ucitajSocketKlijent();

    server = pokreniServer();
    await sacekaj(3500);
    socketA = await povezi(io, server.url);
    socketB = await povezi(io, server.url);

    const registracijaA = await emitAck(socketA, "registrujProfil", {
        nadimak: imeA,
        avatar: "atlas",
        profilKljuc: profilA
    });
    const registracijaB = await emitAck(socketB, "registrujProfil", {
        nadimak: imeB,
        avatar: "luna",
        profilKljuc: profilB
    });
    proveri(registracijaA.uspeh && registracijaB.uspeh, "Test profili nisu registrovani.");

    const trenutniZahtev = sacekajDogadjaj(
        socketB,
        "zahtevZaPrijateljstvo",
        podaci => podaci.playerIdPosiljaoca === registracijaA.profil.playerId
    );
    const zahtev = await emitAck(socketA, "posaljiZahtevZaPrijateljstvo", {
        ciljId: socketB.id
    });
    proveri(zahtev.uspeh && zahtev.kod === "ZAHTEV_POSLAT", "Zahtev nije trajno poslat.");
    await trenutniZahtev;

    socketA.disconnect();
    socketB.disconnect();
    await zaustaviServer(server);

    server = pokreniServer();
    await sacekaj(3500);
    socketB = await povezi(io, server.url);
    const syncZahteva = sacekajDogadjaj(
        socketB,
        "sinhronizacijaPrijatelja",
        podaci => Array.isArray(podaci.zahtevi) && podaci.zahtevi.some(z => z.playerId === registracijaA.profil.playerId)
    );
    const prijavaB = await emitAck(socketB, "prijavaProfila", { profilKljuc: profilB });
    proveri(prijavaB.uspeh, "Prijava primaoca posle restarta nije uspela.");
    const podaciZahteva = await syncZahteva;
    const sacuvaniZahtev = podaciZahteva.zahtevi.find(z => z.playerId === registracijaA.profil.playerId);
    proveri(sacuvaniZahtev.ime === imeA, "Zahtev nije vraćen sa tačnim pošiljaocem.");

    const syncPoslePrihvatanja = sacekajDogadjaj(
        socketB,
        "sinhronizacijaPrijatelja",
        podaci => Array.isArray(podaci.prijatelji) && podaci.prijatelji.some(p => p.playerId === registracijaA.profil.playerId)
    );
    const prihvatanje = await emitAck(socketB, "odgovorNaOfflineZahtev", {
        playerIdPosiljaoca: registracijaA.profil.playerId,
        prihvaceno: true
    });
    proveri(prihvatanje.uspeh, "Zahtev nije prihvaćen.");
    await syncPoslePrihvatanja;

    socketB.disconnect();
    await zaustaviServer(server);

    server = pokreniServer();
    await sacekaj(3500);
    socketA = await povezi(io, server.url);
    socketB = await povezi(io, server.url);

    const syncA = sacekajDogadjaj(
        socketA,
        "sinhronizacijaPrijatelja",
        podaci => podaci.prijatelji.some(p => p.playerId === registracijaB.profil.playerId)
    );
    const syncB = sacekajDogadjaj(
        socketB,
        "sinhronizacijaPrijatelja",
        podaci => podaci.prijatelji.some(p => p.playerId === registracijaA.profil.playerId)
    );
    await Promise.all([
        emitAck(socketA, "prijavaProfila", { profilKljuc: profilA }),
        emitAck(socketB, "prijavaProfila", { profilKljuc: profilB })
    ]);
    await Promise.all([syncA, syncB]);

    const promenaImena = await emitAck(socketA, "registrujProfil", {
        nadimak: novoImeA,
        avatar: "atlas",
        profilKljuc: profilA
    });
    proveri(promenaImena.uspeh, "Promena nadimka prijatelja nije uspela.");

    const osvezenoIme = sacekajDogadjaj(
        socketB,
        "sinhronizacijaPrijatelja",
        podaci => podaci.prijatelji.some(p => p.playerId === registracijaA.profil.playerId && p.ime === novoImeA)
    );
    socketB.emit("traziOsvezenjePrijatelja");
    await osvezenoIme;

    console.log("OK: zahtevi i prijateljstva su trajni i vezani za playerId.");
} finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await zaustaviServer(server);

    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            await mongoose.connection.collection("igracs").deleteMany({
                profilKljuc: { $in: [profilA, profilB] }
            });
            await mongoose.disconnect();
        } catch (error) {
            console.error("Čišćenje test profila nije uspelo:", error.message);
        }
    }
}
