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
const spoljasnjiServer = process.env.TEST_SERVER_URL || "";
let sledeciPort = 4500 + Math.floor(Math.random() * 300);

function sacekaj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function proveri(uslov, poruka) {
    if (!uslov) throw new Error(poruka);
}

function pokreniServer() {
    if (spoljasnjiServer) {
        return { proces: null, url: spoljasnjiServer, izlaz: [] };
    }

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
            reject(new Error(`Dogadjaj ${dogadjaj} nije stigao.`));
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

function sacekajSobniDogadjaj(socket, tip, provera = () => true) {
    return sacekajDogadjaj(
        socket,
        "dogadjajSobe",
        podaci => podaci
            && podaci.tip === tip
            && podaci.soba
            && provera(podaci)
    );
}

async function registruj(socket, profil) {
    const odgovor = await emitAck(socket, "registrujProfil", profil);
    proveri(odgovor.uspeh, `Profil ${profil.nadimak} nije registrovan.`);
}

async function napusti(socket, razlog = "napustio") {
    socket.emit("napustiSobu", razlog);
    await sacekaj(250);
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

    const pozivZaOdbijanje = sacekajDogadjaj(
        socketC,
        "pozivUSobu",
        podaci => podaci.hostIme === profili[0].nadimak
    );
    const sobaOdbijanje = await emitAck(socketA, "kreirajSobuIPozovi", {
        pozvani: [profili[2].nadimak]
    });
    proveri(sobaOdbijanje.uspeh, "Soba sa pozivom nije kreirana.");
    const hostVidiZatvaranjePosleOdbijanja = sacekajSobniDogadjaj(
        socketA,
        "soba_zatvorena",
        dogadjaj => dogadjaj.kodSobe === sobaOdbijanje.kodSobe
            && dogadjaj.ime === profili[2].nadimak
            && dogadjaj.razlogZatvaranja === "poziv_odbijen"
    );
    const poziv = await pozivZaOdbijanje;
    socketC.emit("odbijPozivUSobu", { kodSobe: poziv.kodSobe });
    await hostVidiZatvaranjePosleOdbijanja;

    const pozivZaNestanak = sacekajDogadjaj(
        socketC,
        "pozivUSobu",
        podaci => podaci.hostIme === profili[0].nadimak
    );
    const sobaNestanak = await emitAck(socketA, "kreirajSobuIPozovi", {
        pozvani: [profili[2].nadimak]
    });
    proveri(sobaNestanak.uspeh, "Soba za nestanak pozvanog igraca nije kreirana.");
    await pozivZaNestanak;
    const hostVidiZatvaranjePosleNestanka = sacekajSobniDogadjaj(
        socketA,
        "soba_zatvorena",
        dogadjaj => dogadjaj.kodSobe === sobaNestanak.kodSobe
            && dogadjaj.ime === profili[2].nadimak
            && dogadjaj.razlog === "diskonekt"
            && dogadjaj.razlogZatvaranja === "pozvani_nedostupan"
    );
    socketC.disconnect();
    await hostVidiZatvaranjePosleNestanka;
    await sacekaj(300);

    socketC = await povezi(io, server.url);
    await registruj(socketC, profili[2]);

    const pozivZaB = sacekajDogadjaj(
        socketB,
        "pozivUSobu",
        podaci => podaci.hostIme === profili[0].nadimak
    );
    const pozivZaC = sacekajDogadjaj(
        socketC,
        "pozivUSobu",
        podaci => podaci.hostIme === profili[0].nadimak
    );
    const sobaVisePozvanih = await emitAck(socketA, "kreirajSobuIPozovi", {
        pozvani: [profili[1].nadimak, profili[2].nadimak]
    });
    proveri(sobaVisePozvanih.uspeh, "Soba sa vise pozvanih nije kreirana.");
    const pozivB = await pozivZaB;
    const pozivC = await pozivZaC;
    const hostVidiOdbijanjeBezZatvaranja = sacekajSobniDogadjaj(
        socketA,
        "poziv_odbijen",
        dogadjaj => dogadjaj.kodSobe === sobaVisePozvanih.kodSobe
            && dogadjaj.ime === profili[2].nadimak
            && dogadjaj.soba.max === 2
            && dogadjaj.soba.brojIgraca === 1
            && dogadjaj.sobaSpremna === false
    );
    socketC.emit("odbijPozivUSobu", { kodSobe: pozivC.kodSobe });
    await hostVidiOdbijanjeBezZatvaranja;

    const hostVidiPopunjenuSobu = sacekajSobniDogadjaj(
        socketA,
        "igrac_usao",
        dogadjaj => dogadjaj.kodSobe === sobaVisePozvanih.kodSobe
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.soba.max === 2
            && dogadjaj.soba.brojIgraca === 2
            && dogadjaj.popunjena
    );
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: pozivB.kodSobe });
    await hostVidiPopunjenuSobu;
    const bVidiHostZatvaranje = sacekajSobniDogadjaj(
        socketB,
        "host_zatvorio_sobu",
        dogadjaj => dogadjaj.kodSobe === sobaVisePozvanih.kodSobe
            && dogadjaj.ime === profili[0].nadimak
    );
    socketA.emit("napustiSobu", "odustao");
    await bVidiHostZatvaranje;

    const pozivBZaIzlazak = sacekajDogadjaj(
        socketB,
        "pozivUSobu",
        podaci => podaci.hostIme === profili[0].nadimak
    );
    const sobaIzlazakPreStarta = await emitAck(socketA, "kreirajSobuIPozovi", {
        pozvani: [profili[1].nadimak]
    });
    proveri(sobaIzlazakPreStarta.uspeh, "Soba za izlazak pre starta nije kreirana.");
    await pozivBZaIzlazak;
    const hostVidiUlazakB = sacekajSobniDogadjaj(
        socketA,
        "igrac_usao",
        dogadjaj => dogadjaj.kodSobe === sobaIzlazakPreStarta.kodSobe
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.soba.brojIgraca === 2
    );
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: sobaIzlazakPreStarta.kodSobe });
    await hostVidiUlazakB;
    const hostVidiZatvaranjePosleIzlaska = sacekajSobniDogadjaj(
        socketA,
        "soba_zatvorena",
        dogadjaj => dogadjaj.kodSobe === sobaIzlazakPreStarta.kodSobe
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.razlogZatvaranja === "igrac_napustio"
    );
    socketB.emit("napustiSobu", "odustao");
    await hostVidiZatvaranjePosleIzlaska;

    const sobaBezTokena = await emitAckBroj(socketA, "kreirajSobu", 2);
    proveri(sobaBezTokena.uspeh, "Soba za proveru tokena nije kreirana.");
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: sobaBezTokena.kodSobe });
    const bezTokena = sacekajSobniDogadjaj(
        socketA,
        "igrac_napustio",
        dogadjaj => dogadjaj.kodSobe === sobaBezTokena.kodSobe
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.razlog === "bez_tokena"
            && !dogadjaj.soba.uIgri
    );
    socketB.emit("napustiSobu", "bez_tokena");
    await bezTokena;
    await napusti(socketA, "odustao");

    const privatna = await emitAckBroj(socketA, "kreirajSobu", 2);
    proveri(privatna.uspeh, "Privatna soba nije kreirana.");
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: privatna.kodSobe });
    const hostOdlazi = sacekajSobniDogadjaj(
        socketB,
        "host_zatvorio_sobu",
        dogadjaj => dogadjaj.kodSobe === privatna.kodSobe
            && dogadjaj.ime === profili[0].nadimak
            && dogadjaj.soba.brojIgraca === 1
    );
    socketA.emit("napustiSobu", "odustao");
    await hostOdlazi;

    const javnaA = await emitAck(socketA, "traziJavnuSobu", { brojIgraca: 3 });
    proveri(javnaA.uspeh, "Javna soba nije kreirana.");
    const cekanje = sacekajSobniDogadjaj(
        socketA,
        "igrac_napustio",
        dogadjaj => dogadjaj.kodSobe === javnaA.kodSobe
            && !dogadjaj.soba.uIgri
            && dogadjaj.soba.javna
            && dogadjaj.soba.brojIgraca === 1
            && dogadjaj.soba.max === 3
            && dogadjaj.razlog === "odustao"
    );
    await emitAck(socketB, "traziJavnuSobu", { brojIgraca: 3 });
    socketB.emit("napustiSobu", "odustao");
    await cekanje;
    await napusti(socketA, "odustao");

    const mec = await emitAckBroj(socketA, "kreirajSobu", 3);
    proveri(mec.uspeh, "Soba za mec nije kreirana.");
    await emitAck(socketB, "pridruziSeSobi", { kodSobe: mec.kodSobe });
    await emitAck(socketC, "pridruziSeSobi", { kodSobe: mec.kodSobe });

    const pocetak = sacekajDogadjaj(socketA, "igraPocela", podaci => Boolean(podaci.slovo));
    socketA.emit("pokreniIgru", mec.kodSobe);
    await pocetak;

    const antiCitZaA = sacekajSobniDogadjaj(
        socketA,
        "igrac_napustio",
        dogadjaj => dogadjaj.kodSobe === mec.kodSobe
            && dogadjaj.soba.uIgri
            && dogadjaj.soba.brojIgraca === 2
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.razlog === "anti_cit"
    );
    const antiCitZaC = sacekajSobniDogadjaj(
        socketC,
        "igrac_napustio",
        dogadjaj => dogadjaj.kodSobe === mec.kodSobe
            && dogadjaj.soba.uIgri
            && dogadjaj.soba.brojIgraca === 2
            && dogadjaj.ime === profili[1].nadimak
            && dogadjaj.razlog === "anti_cit"
    );
    socketB.emit("napustiSobu", "anti_cit");
    await Promise.all([antiCitZaA, antiCitZaC]);

    const automatskaPobeda = sacekajSobniDogadjaj(
        socketA,
        "automatska_pobeda",
        dogadjaj => dogadjaj.kodSobe === mec.kodSobe
            && dogadjaj.pobednikIme === profili[0].nadimak
            && dogadjaj.napustioIme === profili[2].nadimak
            && dogadjaj.razlog === "diskonekt"
            && dogadjaj.soba.brojIgraca === 1
    );
    socketC.emit("napustiSobu", "diskonekt");
    await automatskaPobeda;

    console.log("OK: real-time obavestenja sobe pokrivaju pozive, automatsko zatvaranje, cekanje, anti-cheat, diskonekt i automatsku pobedu.");
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
            console.error("Ciscenje test profila nije uspelo:", error.message);
        }
    }
}
