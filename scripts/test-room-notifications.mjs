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
const profili = [
    { profilKljuc: `profil_room_a_${oznaka}`, nadimak: `SobA${oznaka.slice(-5)}`, avatar: "atlas" },
    { profilKljuc: `profil_room_b_${oznaka}`, nadimak: `SobB${oznaka.slice(-5)}`, avatar: "luna" },
    { profilKljuc: `profil_room_c_${oznaka}`, nadimak: `SobC${oznaka.slice(-5)}`, avatar: "orion" }
];
let sledeciPort = 4500 + Math.floor(Math.random() * 300);

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
        env: { ...process.env, PORT: port },
        stdio: ["ignore", "pipe", "pipe"]
    });
    proces.stdout.on("data", podatak => izlaz.push(podatak.toString()));
    proces.stderr.on("data", podatak => izlaz.push(podatak.toString()));
    return { proces, url: `http://127.0.0.1:${port}`, izlaz };
}

async function zaustaviServer(server) {
    if (!server || !server.proces) return;
    server.proces.kill();
    await sacekaj(1000);
}

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, "node_modules", "socket.io", "client-dist", "socket.io.esm.min.js");
    const kopija = path.join(os.tmpdir(), `socket-io-room-${Date.now()}.mjs`);
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

function emitAckBroj(socket, dogadjaj, broj) {
    return new Promise((resolve, reject) => {
        socket.timeout(12000).emit(dogadjaj, broj, (greska, odgovor) => {
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

async function registruj(socket, profil) {
    const odgovor = await emitAck(socket, "registrujProfil", profil);
    proveri(odgovor.uspeh, `Profil ${profil.nadimak} nije registrovan.`);
}

let server;
let socketA;
let socketB;
let socketC;

try {
    const { io } = await ucitajSocketKlijent();
    server = pokreniServer();
    await sacekaj(3500);

    socketA = await povezi(io, server.url);
    socketB = await povezi(io, server.url);
    socketC = await povezi(io, server.url);

    await registruj(socketA, profili[0]);
    await registruj(socketB, profili[1]);
    await registruj(socketC, profili[2]);

    const privatna = await emitAckBroj(socketA, "kreirajSobu", 2);
    proveri(privatna.uspeh, "Privatna soba nije kreirana.");
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: privatna.kodSobe });

    const hostOdlazi = sacekajDogadjaj(
        socketB,
        "hostJeNapustioSobu",
        podaci => podaci.kodSobe === privatna.kodSobe && podaci.ime === profili[0].nadimak
    );
    socketA.emit("napustiSobu");
    await hostOdlazi;

    const javnaA = await emitAck(socketA, "traziJavnuSobu", { brojIgraca: 3 });
    proveri(javnaA.uspeh, "Javna soba nije kreirana.");
    const cekanje = sacekajDogadjaj(
        socketA,
        "igracNapustioSobu",
        podaci => podaci.kodSobe === javnaA.kodSobe
            && !podaci.uIgri
            && podaci.javna
            && podaci.ostaloIgraca === 1
            && podaci.max === 3
    );
    await emitAck(socketB, "traziJavnuSobu", { brojIgraca: 3 });
    socketB.emit("napustiSobu");
    await cekanje;
    socketA.emit("napustiSobu");

    const mec = await emitAckBroj(socketA, "kreirajSobu", 3);
    proveri(mec.uspeh, "Soba za meč nije kreirana.");
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: mec.kodSobe });
    await emitAck(socketC, "pridruziSeSobi", { kodSobe: mec.kodSobe });

    const pocetak = sacekajDogadjaj(socketA, "igraPocela", podaci => Boolean(podaci.slovo));
    socketA.emit("pokreniIgru", mec.kodSobe);
    await pocetak;

    const prviIzlazak = sacekajDogadjaj(
        socketA,
        "igracNapustioSobu",
        podaci => podaci.kodSobe === mec.kodSobe
            && podaci.uIgri
            && podaci.ostaloIgraca === 2
            && podaci.ime === profili[1].nadimak
    );
    socketB.emit("napustiSobu");
    await prviIzlazak;

    const automatskaPobeda = sacekajDogadjaj(
        socketA,
        "pobedaZbogNapustanja",
        podaci => podaci.kodSobe === mec.kodSobe
            && podaci.pobednikIme === profili[0].nadimak
            && podaci.napustioIme === profili[2].nadimak
    );
    socketC.emit("napustiSobu");
    await automatskaPobeda;

    console.log("OK: obaveštenja za hosta, čekanje i automatsku pobedu rade.");
} catch (error) {
    if (server && server.izlaz.length > 0) {
        console.error(server.izlaz.join("").slice(-4000));
    }
    throw error;
} finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    if (socketC) socketC.disconnect();
    await zaustaviServer(server);

    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            await mongoose.connection.collection("igracs").deleteMany({
                profilKljuc: { $in: profili.map(profil => profil.profilKljuc) }
            });
            await mongoose.disconnect();
        } catch (error) {
            console.error("Čišćenje test profila nije uspelo:", error.message);
        }
    }
}
