import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = String(3900 + Math.floor(Math.random() * 400));
const url = `http://127.0.0.1:${port}`;
const oznaka = Date.now().toString(36);
const profili = [0, 1, 2, 3].map(indeks => ({
    nadimak: `Chat${oznaka}${indeks}`.slice(0, 20),
    profilKljuc: `chat_test_${oznaka}_${indeks}_${Math.random().toString(36).slice(2, 12)}`
}));
const playerIds = [];
let serverProces;
let socketi = [];

function sacekaj(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pokreniServer(moderatorPlayerId = '') {
    return spawn(process.execPath, ['server.js'], {
        cwd: rootDir,
        env: {
            ...process.env,
            PORT: port,
            CHAT_BLOKIRANI_IZRAZI: 'zabranjenatest',
            CHAT_MODERATOR_PLAYER_IDS: moderatorPlayerId
        },
        stdio: 'inherit'
    });
}

async function ucitajSocketKlijent() {
    const izvor = path.join(rootDir, 'node_modules', 'socket.io', 'client-dist', 'socket.io.esm.min.js');
    const kopija = path.join(os.tmpdir(), `socket-io-chat-test-${Date.now()}.mjs`);
    fs.copyFileSync(izvor, kopija);
    return import(pathToFileURL(kopija).href);
}

function povezi(io) {
    return new Promise((resolve, reject) => {
        const socket = io(url, { transports: ['websocket'], timeout: 12000, forceNew: true });
        const tajmer = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Socket se nije povezao.'));
        }, 15000);
        socket.on('connect', () => {
            clearTimeout(tajmer);
            resolve(socket);
        });
        socket.on('connect_error', reject);
    });
}

function emitAck(socket, dogadjaj, podaci) {
    return new Promise((resolve, reject) => {
        const callback = (greska, odgovor) => {
            if (greska) reject(greska);
            else resolve(odgovor);
        };
        if (typeof podaci === 'undefined') socket.timeout(12000).emit(dogadjaj, callback);
        else socket.timeout(12000).emit(dogadjaj, podaci, callback);
    });
}

function sacekajDogadjaj(socket, dogadjaj) {
    return new Promise((resolve, reject) => {
        const tajmer = setTimeout(() => reject(new Error(`Nije primljen događaj ${dogadjaj}.`)), 8000);
        socket.once(dogadjaj, podaci => {
            clearTimeout(tajmer);
            resolve(podaci);
        });
    });
}

try {
    serverProces = pokreniServer();
    await sacekaj(3500);
    const { io } = await ucitajSocketKlijent();

    const neprijavljen = await povezi(io);
    socketi.push(neprijavljen);
    const statusBezProfila = await emitAck(neprijavljen, 'traziChatStatus');
    assert.equal(statusBezProfila.uspeh, false);
    assert.equal(statusBezProfila.kod, 'PROFIL_NIJE_PRIJAVLJEN');

    const istorijaBezProfila = await emitAck(neprijavljen, 'traziIstorijuChata');
    assert.equal(istorijaBezProfila.uspeh, false);
    assert.equal(istorijaBezProfila.kod, 'PROFIL_NIJE_PRIJAVLJEN');

    const bezProfila = await emitAck(neprijavljen, 'posaljiGlobalnuPoruku', { tekst: 'Ne sme proći' });
    assert.equal(bezProfila.uspeh, false);
    assert.equal(bezProfila.kod, 'PROFIL_NIJE_PRIJAVLJEN');

    for (const profil of profili) {
        const socket = await povezi(io);
        socketi.push(socket);
        const registracija = await emitAck(socket, 'registrujProfil', {
            nadimak: profil.nadimak,
            avatar: 'atlas',
            profilKljuc: profil.profilKljuc
        });
        assert.equal(registracija.uspeh, true);
        playerIds.push(registracija.profil.playerId);

        if (playerIds.length === 1) {
            const statusPrePravila = await emitAck(socket, 'traziChatStatus');
            assert.equal(statusPrePravila.uspeh, true);
            assert.equal(statusPrePravila.status.pravilaPrihvacena, false);

            const istorijaPrePravila = await emitAck(socket, 'traziIstorijuChata');
            assert.equal(istorijaPrePravila.uspeh, false);
            assert.equal(istorijaPrePravila.kod, 'CHAT_PRAVILA_NISU_PRIHVACENA');

            const porukaPrePravila = await emitAck(socket, 'posaljiGlobalnuPoruku', { tekst: 'Poruka pre prihvatanja pravila' });
            assert.equal(porukaPrePravila.uspeh, false);
            assert.equal(porukaPrePravila.kod, 'CHAT_PRAVILA_NISU_PRIHVACENA');
        }

        const pravila = await emitAck(socket, 'prihvatiChatPravila');
        assert.equal(pravila.uspeh, true);
        assert.equal(pravila.status.pravilaPrihvacena, true);
    }

    const [prvi, drugi, treci, cetvrti] = socketi.slice(1);
    const sledecaPoruka = sacekajDogadjaj(drugi, 'novaGlobalnaPoruka');
    const poslato = await emitAck(prvi, 'posaljiGlobalnuPoruku', {
        tekst: 'Bezbedna poruka <bez HTML-a>',
        ime: 'Lažni nadimak koji server mora ignorisati',
        playerId: 'lažni-player-id'
    });
    const primljeno = await sledecaPoruka;
    assert.equal(poslato.uspeh, true);
    assert.equal(primljeno.playerId, playerIds[0]);
    assert.equal(primljeno.ime, profili[0].nadimak);
    assert.equal(primljeno.tekst, 'Bezbedna poruka <bez HTML-a>');
    assert.notEqual(primljeno.ime, 'Lažni nadimak koji server mora ignorisati');

    const istorijaCekanje = sacekajDogadjaj(treci, 'istorijaChata');
    const ucitanaIstorija = await emitAck(treci, 'traziIstorijuChata');
    const primljenaIstorija = await istorijaCekanje;
    assert.equal(ucitanaIstorija.uspeh, true);
    assert.equal(primljenaIstorija.some(poruka => poruka.id === primljeno.id && poruka.playerId === playerIds[0]), true);

    const predugackaPoruka = await emitAck(prvi, 'posaljiGlobalnuPoruku', { tekst: 'a'.repeat(181) });
    assert.equal(predugackaPoruka.uspeh, false);
    assert.equal(predugackaPoruka.kod, 'CHAT_NEISPRAVNA_PORUKA');

    const prebrzo = await emitAck(prvi, 'posaljiGlobalnuPoruku', { tekst: 'Druga poruka odmah' });
    assert.equal(prebrzo.uspeh, false);
    assert.equal(prebrzo.kod, 'CHAT_PREBRZO');

    await sacekaj(1250);
    const duplikat = await emitAck(prvi, 'posaljiGlobalnuPoruku', { tekst: 'Bezbedna poruka <bez HTML-a>' });
    assert.equal(duplikat.uspeh, false);
    assert.equal(duplikat.kod, 'CHAT_DUPLIKAT');

    const promenjenNadimak = `${profili[0].nadimak}Novo`.slice(0, 20);
    const promenaProfila = await emitAck(prvi, 'registrujProfil', {
        nadimak: promenjenNadimak,
        avatar: 'luna',
        profilKljuc: profili[0].profilKljuc
    });
    assert.equal(promenaProfila.uspeh, true);
    assert.equal(promenaProfila.profil.playerId, playerIds[0]);

    const porukaPoslePromeneCekanje = sacekajDogadjaj(drugi, 'novaGlobalnaPoruka');
    const porukaPoslePromene = await emitAck(prvi, 'posaljiGlobalnuPoruku', { tekst: 'Isti igrač, novo ime' });
    const primljenoPoslePromene = await porukaPoslePromeneCekanje;
    assert.equal(porukaPoslePromene.uspeh, true);
    assert.equal(primljenoPoslePromene.playerId, playerIds[0]);
    assert.equal(primljenoPoslePromene.ime, promenjenNadimak);

    const maskiranSadrzajCekanje = sacekajDogadjaj(prvi, 'novaGlobalnaPoruka');
    const maskiranSadrzaj = await emitAck(drugi, 'posaljiGlobalnuPoruku', { tekst: 'ovo je zabranjenatest izraz' });
    const primljenMaskiranSadrzaj = await maskiranSadrzajCekanje;
    assert.equal(maskiranSadrzaj.uspeh, true);
    assert.equal(maskiranSadrzaj.poruka.tekst, 'ovo je *** izraz');
    assert.equal(primljenMaskiranSadrzaj.tekst, 'ovo je *** izraz');

    const sopstvenaPrijava = await emitAck(drugi, 'prijaviChatPoruku', {
        porukaId: maskiranSadrzaj.poruka.id,
        razlog: 'drugo'
    });
    assert.equal(sopstvenaPrijava.uspeh, false);
    assert.equal(sopstvenaPrijava.kod, 'CHAT_SOPSTVENA_PORUKA');

    const prijavaMaskiranePoruke = await emitAck(prvi, 'prijaviChatPoruku', {
        porukaId: maskiranSadrzaj.poruka.id,
        razlog: 'uvrede'
    });
    assert.equal(prijavaMaskiranePoruke.uspeh, true);

    const dupliranaPrijava = await emitAck(prvi, 'prijaviChatPoruku', {
        porukaId: maskiranSadrzaj.poruka.id,
        razlog: 'uvrede'
    });
    assert.equal(dupliranaPrijava.uspeh, false);
    assert.equal(dupliranaPrijava.kod, 'CHAT_PRIJAVA_VEC_POSLATA');

    if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
        const sacuvanaPrijava = await mongoose.connection.collection('chatprijavas').findOne({
            porukaId: maskiranSadrzaj.poruka.id,
            prijaviteljPlayerId: playerIds[0]
        });
        assert.equal(sacuvanaPrijava.tekst, 'ovo je zabranjenatest izraz');
        await mongoose.disconnect();
    }

    const blokiranLink = await emitAck(drugi, 'posaljiGlobalnuPoruku', { tekst: 'Pogledaj https://primer.rs' });
    assert.equal(blokiranLink.uspeh, false);
    assert.equal(blokiranLink.kod, 'CHAT_LINK_NIJE_DOZVOLJEN');

    const neovlascenaModeracija = await emitAck(drugi, 'moderirajChatIgraca', {
        playerId: playerIds[0],
        akcija: 'ban'
    });
    assert.equal(neovlascenaModeracija.uspeh, false);
    assert.equal(neovlascenaModeracija.kod, 'CHAT_NEMA_OVLASCENJE');

    for (const prijavitelj of [drugi, treci, cetvrti]) {
        const prijava = await emitAck(prijavitelj, 'prijaviChatPoruku', {
            porukaId: primljenoPoslePromene.id,
            razlog: 'spam'
        });
        assert.equal(prijava.uspeh, true);
    }

    const statusPrvog = await emitAck(prvi, 'traziChatStatus');
    assert.equal(statusPrvog.uspeh, true);
    assert.equal(statusPrvog.status.umutan, true);

    const porukaTokomMute = await emitAck(prvi, 'posaljiGlobalnuPoruku', { tekst: 'Poruka tokom mute-a' });
    assert.equal(porukaTokomMute.uspeh, false);
    assert.equal(porukaTokomMute.kod, 'CHAT_UMUTKAN');

    for (let indeks = 0; indeks < 8; indeks += 1) {
        if (indeks > 0) await sacekaj(1250);
        const porukaZaLimit = await emitAck(treci, 'posaljiGlobalnuPoruku', { tekst: `Poruka za limit ${indeks + 1}` });
        assert.equal(porukaZaLimit.uspeh, true);
    }
    await sacekaj(1250);
    const prekoLimita = await emitAck(treci, 'posaljiGlobalnuPoruku', { tekst: 'Deveta poruka u minutu' });
    assert.equal(prekoLimita.uspeh, false);
    assert.equal(prekoLimita.kod, 'CHAT_OGRANICENJE');

    socketi.forEach(socket => socket.disconnect());
    socketi = [];
    serverProces.kill();
    await sacekaj(700);

    serverProces = pokreniServer(playerIds[0]);
    await sacekaj(3500);

    const moderatorSocket = await povezi(io);
    socketi.push(moderatorSocket);
    const prijavaModeratora = await emitAck(moderatorSocket, 'registrujProfil', {
        nadimak: promenjenNadimak,
        avatar: 'luna',
        profilKljuc: profili[0].profilKljuc
    });
    assert.equal(prijavaModeratora.uspeh, true);
    assert.equal(prijavaModeratora.profil.playerId, playerIds[0]);

    const ciljaniIgracSocket = await povezi(io);
    socketi.push(ciljaniIgracSocket);
    const prijavaCilja = await emitAck(ciljaniIgracSocket, 'registrujProfil', {
        nadimak: profili[1].nadimak,
        avatar: 'atlas',
        profilKljuc: profili[1].profilKljuc
    });
    assert.equal(prijavaCilja.uspeh, true);
    assert.equal(prijavaCilja.profil.playerId, playerIds[1]);

    const azuriranStatusCilja = sacekajDogadjaj(ciljaniIgracSocket, 'chatStatusAzuriran');
    const moderatorskiMute = await emitAck(moderatorSocket, 'moderirajChatIgraca', {
        playerId: playerIds[1],
        akcija: 'mute24h'
    });
    const primljenStatusCilja = await azuriranStatusCilja;
    assert.equal(moderatorskiMute.uspeh, true);
    assert.equal(moderatorskiMute.status.umutan, true);
    assert.equal(primljenStatusCilja.umutan, true);

    const porukaModerisanogIgraca = await emitAck(ciljaniIgracSocket, 'posaljiGlobalnuPoruku', { tekst: 'Ovo ne sme da prođe' });
    assert.equal(porukaModerisanogIgraca.uspeh, false);
    assert.equal(porukaModerisanogIgraca.kod, 'CHAT_UMUTKAN');

    const samomoderacija = await emitAck(moderatorSocket, 'moderirajChatIgraca', {
        playerId: playerIds[0],
        akcija: 'ban'
    });
    assert.equal(samomoderacija.uspeh, false);
    assert.equal(samomoderacija.kod, 'CHAT_NEISPRAVNA_MODERACIJA');

    const banovaniIgracSocket = await povezi(io);
    socketi.push(banovaniIgracSocket);
    const prijavaZaBan = await emitAck(banovaniIgracSocket, 'registrujProfil', {
        nadimak: profili[2].nadimak,
        avatar: 'atlas',
        profilKljuc: profili[2].profilKljuc
    });
    assert.equal(prijavaZaBan.uspeh, true);
    assert.equal(prijavaZaBan.profil.playerId, playerIds[2]);

    const azuriranStatusBanovanog = sacekajDogadjaj(banovaniIgracSocket, 'chatStatusAzuriran');
    const moderatorskiBan = await emitAck(moderatorSocket, 'moderirajChatIgraca', {
        playerId: playerIds[2],
        akcija: 'ban'
    });
    const primljenStatusBanovanog = await azuriranStatusBanovanog;
    assert.equal(moderatorskiBan.uspeh, true);
    assert.equal(moderatorskiBan.status.banovan, true);
    assert.equal(primljenStatusBanovanog.banovan, true);

    const porukaBanovanogIgraca = await emitAck(banovaniIgracSocket, 'posaljiGlobalnuPoruku', { tekst: 'Ovo ne sme da prođe posle bana' });
    assert.equal(porukaBanovanogIgraca.uspeh, false);
    assert.equal(porukaBanovanogIgraca.kod, 'CHAT_BANOVAN');

    console.log('Globalni chat: kompletna bezbednosna, moderatorska i funkcionalna provera je prošla.');
} finally {
    socketi.forEach(socket => socket.disconnect());
    if (serverProces) serverProces.kill();

    if (process.env.MONGO_URI && playerIds.length > 0) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            await mongoose.connection.collection('chatprijavas').deleteMany({
                $or: [
                    { prijavljeniPlayerId: { $in: playerIds } },
                    { prijaviteljPlayerId: { $in: playerIds } }
                ]
            });
            await mongoose.connection.collection('igracs').deleteMany({ playerId: { $in: playerIds } });
            await mongoose.disconnect();
        } catch (error) {
            console.error('Čišćenje test podataka globalnog četa nije uspelo:', error.message);
        }
    }
}
