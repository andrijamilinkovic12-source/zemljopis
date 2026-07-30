import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(rootDir, "www", "sinhronizacija.js"), "utf8");
const storage = new Map([
    ["zemljopis_trofeji", JSON.stringify([{ id: "samo-nalog-a", napredak: 9 }])],
    ["zemljopis_riznica", JSON.stringify({ dukati: 999 })],
    ["zemljopis_tokeni_stanje", "1"],
    ["zemljopis_kvartal", JSON.stringify({ svaVremenaPojmovi: 500 })]
]);

const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
};

const context = {
    console,
    localStorage,
    setTimeout,
    clearTimeout,
    PodesavanjaManager: {
        postavke: { playerId: "nalog-a", zvuk: false, tema: "okean", pismo: "cirilica" },
        snimiULokalnuMemoriju() {},
        primeniPostavkeGlobalno() {}
    },
    RiznicaManager: { init() {}, azurirajPrikazDukata() {} },
    TrofejiManager: { init() {} },
    DnevniIzazovManager: { dnevniPodaci: null },
    TokeniManager: { tokeni: 0, azurirajPrikaz() {}, normalizujTokeni: broj => broj, proveriDnevniReset() {} },
    KvartalniNivoManager: { statistika: null, azurirajBedzUMeniju() {} },
    SobaPrijateljaManager: { prijatelji: [], zahtevi: [] }
};

vm.runInNewContext(`${source}\nglobalThis.__sinhronizacija = SinhronizacijaManager;`, context);
const sinhronizacija = context.__sinhronizacija;

sinhronizacija.obradiProfil({
    playerId: "nalog-b",
    sinhronizacija: {
        revizija: 4,
        imaPodatke: true,
        napredak: { trofeji: [{ id: "samo-nalog-b", napredak: 2 }] }
    }
}, { prethodniPlayerId: "nalog-a" });

const trofeji = JSON.parse(localStorage.getItem("zemljopis_trofeji"));
assert.deepEqual(trofeji, [{ id: "samo-nalog-b", napredak: 2 }]);
assert.equal(localStorage.getItem("zemljopis_riznica"), null);
assert.equal(localStorage.getItem("zemljopis_tokeni_stanje"), null);
assert.equal(context.PodesavanjaManager.postavke.tema, "drzava");
assert.equal(context.PodesavanjaManager.postavke.pismo, "latinica");

console.log("Izolacija profila: podaci prethodnog naloga ne prelaze na novi nalog.");
