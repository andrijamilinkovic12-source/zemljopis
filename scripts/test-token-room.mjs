import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = String(3900 + Math.floor(Math.random() * 300));
const url = `http://127.0.0.1:${port}`;
const oznaka = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const imena = [`TokenA${oznaka}`, `TokenB${oznaka}`];
let serverProces;
let a;
let b;

const sacekaj = ms => new Promise(resolve => setTimeout(resolve, ms));
const proveri = (uslov, poruka) => {
    if (!uslov) throw new Error(poruka);
};

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, "node_modules", "socket.io", "client-dist", "socket.io.esm.min.js");
    const kopija = path.join(os.tmpdir(), `socket-io-token-test-${Date.now()}.mjs`);
    fs.copyFileSync(izvor, kopija);
    return import(pathToFileURL(kopija).href);
}

function povezi(io) {
    return new Promise((resolve, reject) => {
        const socket = io(url, { transports: ["websocket"], timeout: 12000, forceNew: true });
        const tajmer = setTimeout(() => reject(new Error("Socket se nije povezao.")), 15000);
        socket.on("connect", () => {
            clearTimeout(tajmer);
            resolve(socket);
        });
        socket.on("connect_error", reject);
    });
}

function ack(socket, dogadjaj, podaci) {
    return new Promise((resolve, reject) => {
        socket.timeout(12000).emit(dogadjaj, podaci, (greska, odgovor) => greska ? reject(greska) : resolve(odgovor));
    });
}

function cekajDogadjaj(socket, dogadjaj) {
    return new Promise((resolve, reject) => {
        const tajmer = setTimeout(() => reject(new Error(`Nije stigao događaj ${dogadjaj}.`)), 15000);
        socket.once(dogadjaj, podaci => {
            clearTimeout(tajmer);
            resolve(podaci);
        });
    });
}

try {
    serverProces = spawn(process.execPath, ["server.js"], {
        cwd: rootDir,
        env: { ...process.env, PORT: port, GOOGLE_AUTH_DEV_MODE: "true" },
        stdio: "inherit"
    });
    await sacekaj(3500);

    const { io } = await ucitajSocketKlijent();
    a = await povezi(io);
    b = await povezi(io);
    for (const [socket, nadimak] of [[a, imena[0]], [b, imena[1]]]) {
        const odgovor = await ack(socket, "registrujProfil", {
            nadimak,
            avatar: "atlas",
            profilKljuc: `token_soba_${nadimak}`
        });
        proveri(odgovor.uspeh, `Registracija ${nadimak} nije uspela.`);
    }

    const tokenA = cekajDogadjaj(a, "tokeniAzurirani");
    const tokenB = cekajDogadjaj(b, "tokeniAzurirani");
    const pocetakA = cekajDogadjaj(a, "igraPocela");
    const pocetakB = cekajDogadjaj(b, "igraPocela");
    proveri((await ack(a, "traziJavnuSobu", { brojIgraca: 2, ime: imena[0] })).uspeh, "Prvi igrač nije ušao u javnu sobu.");
    proveri((await ack(b, "traziJavnuSobu", { brojIgraca: 2, ime: imena[1] })).uspeh, "Drugi igrač nije ušao u javnu sobu.");

    proveri((await tokenA).stanje === 2, "Prvom igraču nije server skinuo tačno jedan token.");
    proveri((await tokenB).stanje === 2, "Drugom igraču nije server skinuo tačno jedan token.");
    proveri(Boolean((await pocetakA).partijaId), "Prvi igrač nije dobio potvrđen početak meča.");
    proveri(Boolean((await pocetakB).partijaId), "Drugi igrač nije dobio potvrđen početak meča.");
    console.log("OK: javna soba se pokreće tek posle serverske naplate jednog tokena po igraču.");
} finally {
    if (a) a.disconnect();
    if (b) b.disconnect();
    if (serverProces) serverProces.kill();
    if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
        await mongoose.connection.collection("igracs").deleteMany({ nadimak: { $in: imena } });
        await mongoose.disconnect();
    }
}
