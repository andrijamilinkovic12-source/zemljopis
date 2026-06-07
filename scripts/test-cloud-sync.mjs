import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = String(3400 + Math.floor(Math.random() * 500));
const url = `http://127.0.0.1:${port}`;
const profilKljuc = `profil_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
const nadimak = `Test${Date.now().toString(36).slice(-6)}`;
const promenjenNadimak = `${nadimak}X`;

function sacekaj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pokreniServer() {
    return spawn(process.execPath, ["server.js"], {
        cwd: rootDir,
        env: { ...process.env, PORT: port },
        stdio: ["ignore", "pipe", "pipe"]
    });
}

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, "node_modules", "socket.io", "client-dist", "socket.io.esm.min.js");
    const kopija = path.join(os.tmpdir(), `socket-io-client-${Date.now()}.mjs`);
    fs.copyFileSync(izvor, kopija);
    return import(pathToFileURL(kopija).href);
}

function povezi(io) {
    return new Promise((resolve, reject) => {
        const socket = io(url, {
            transports: ["websocket"],
            timeout: 12000,
            forceNew: true
        });

        const tajmer = setTimeout(() => {
            socket.disconnect();
            reject(new Error("Socket se nije povezao."));
        }, 15000);

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

function proveri(uslov, poruka) {
    if (!uslov) throw new Error(poruka);
}

let serverProces;
let socket;
let drugiSocket;

try {
    serverProces = pokreniServer();
    await sacekaj(3500);

    const { io } = await ucitajSocketKlijent();
    socket = await povezi(io);

    const registracija = await emitAck(socket, "registrujProfil", {
        nadimak,
        avatar: "atlas",
        profilKljuc
    });

    proveri(registracija.uspeh === true, "Registracija profila nije uspela.");
    proveri(Boolean(registracija.profil.playerId), "Profil nije dobio playerId.");
    proveri(registracija.profil.googlePovezan === false, "Lokalni profil ne sme biti Google profil.");

    const playerId = registracija.profil.playerId;
    const prviNapredak = await emitAck(socket, "sacuvajCloudNapredak", {
        revizija: registracija.profil.sinhronizacija.revizija,
        napredak: {
            verzija: 1,
            podesavanja: { zvuk: true, tema: "neon", pismo: "latinica" },
            riznica: { dukati: 777, podaci: { teme: [], efekti: [] } },
            trofeji: [{ id: "t1", napredak: 1, preuzeto: false }],
            tokeni: { stanje: 2, datum: "test" },
            kvartal: { sezonskiPojmovi: 12, svaVremenaPojmovi: 12 },
            prijatelji: { lista: [], zahtevi: [] }
        }
    });

    proveri(prviNapredak.uspeh === true, "Prva sinhronizacija nije uspela.");
    proveri(prviNapredak.sinhronizacija.revizija === 1, "Revizija nije uvećana posle prve sinhronizacije.");

    const konflikt = await emitAck(socket, "sacuvajCloudNapredak", {
        revizija: 0,
        napredak: { verzija: 1, podesavanja: { tema: "zlatna" } }
    });

    proveri(konflikt.uspeh === false && konflikt.kod === "SUKOB_REVIZIJE", "Server nije odbio zastarelu reviziju.");

    const promenaImena = await emitAck(socket, "registrujProfil", {
        nadimak: promenjenNadimak,
        avatar: "luna",
        profilKljuc
    });

    proveri(promenaImena.uspeh === true, "Promena nadimka nije uspela.");
    proveri(promenaImena.profil.playerId === playerId, "Promena nadimka je promenila playerId.");

    socket.disconnect();
    drugiSocket = await povezi(io);

    const prijava = await emitAck(drugiSocket, "prijavaProfila", { profilKljuc });
    proveri(prijava.uspeh === true, "Ponovna prijava nije uspela.");
    proveri(prijava.profil.playerId === playerId, "Ponovna prijava nije vratila isti playerId.");
    proveri(prijava.profil.sinhronizacija.napredak.podesavanja.tema === "neon", "Cloud napredak nije učitan.");

    console.log("OK: cloud sync, playerId i promena nadimka rade.");
} finally {
    if (socket) socket.disconnect();
    if (drugiSocket) drugiSocket.disconnect();

    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            await mongoose.connection.collection("igracs").deleteMany({ profilKljuc });
            await mongoose.disconnect();
        } catch (error) {
            console.error("Čišćenje test profila nije uspelo:", error.message);
        }
    }

    if (serverProces) {
        serverProces.kill();
    }
}
