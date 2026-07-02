import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const koren = path.resolve(__dirname, "..");

function napraviLocalStorage() {
    const mapa = new Map();
    return {
        getItem(kljuc) {
            return mapa.has(kljuc) ? mapa.get(kljuc) : null;
        },
        setItem(kljuc, vrednost) {
            mapa.set(kljuc, String(vrednost));
        },
        removeItem(kljuc) {
            mapa.delete(kljuc);
        },
        clear() {
            mapa.clear();
        }
    };
}

function napraviElement(id) {
    return {
        id,
        innerText: "",
        innerHTML: "",
        textContent: "",
        disabled: false,
        style: {},
        classList: {
            add() {},
            remove() {}
        },
        setAttribute() {},
        get offsetWidth() {
            return 1;
        }
    };
}

function napraviDocument() {
    const elementi = new Map();
    return {
        addEventListener() {},
        getElementById(id) {
            if (!elementi.has(id)) elementi.set(id, napraviElement(id));
            return elementi.get(id);
        }
    };
}

const context = {
    console,
    Date,
    Promise,
    localStorage: napraviLocalStorage(),
    document: napraviDocument(),
    requestAnimationFrame(callback) {
        callback();
    },
    setInterval() {
        return 1;
    },
    clearInterval() {},
    setTimeout(callback, ms) {
        context.__zakazanoSlanje = ms;
        return 1;
    },
    clearTimeout() {},
    UIManager: {
        prikaziEkran() {},
        prikaziObavestenje() {}
    },
    __zakazanoSlanje: null
};
context.globalThis = context;

vm.createContext(context);

function ucitajScript(relativnaPutanja, globalnoIme) {
    const fajl = path.join(koren, relativnaPutanja);
    const kod = fs.readFileSync(fajl, "utf8");
    vm.runInContext(`${kod}\nglobalThis.${globalnoIme} = ${globalnoIme};`, context, {
        filename: relativnaPutanja
    });
    return context[globalnoIme];
}

const TokeniManager = ucitajScript("www/tokeni.js", "TokeniManager");
const danas = new Date().toLocaleDateString();

TokeniManager.init();
assert.equal(TokeniManager.tokeni, 3, "Novi igrac treba da ima 3 tokena.");
assert.equal(context.localStorage.getItem("zemljopis_datum_tokena"), danas);
assert.equal(context.document.getElementById("meni-tokeni").innerText, "3/3");

assert.equal(TokeniManager.potrosiToken(), true);
assert.equal(TokeniManager.potrosiToken(), true);
assert.equal(TokeniManager.potrosiToken(), true);
assert.equal(TokeniManager.tokeni, 0, "Tri partije treba da potrose sva 3 tokena.");
assert.equal(TokeniManager.potrosiToken(), false, "Tokeni ne smeju da odu ispod nule.");
assert.equal(TokeniManager.tokeni, 0);

TokeniManager.postaviStanje(2);
let rewardPozvan = false;
TokeniManager.postaviAdapterReklama({
    prikaziRewarded: async () => {
        rewardPozvan = true;
        return { nagradaDodeljena: true };
    }
});
TokeniManager.pogledajReklamu();
await Promise.resolve();
await Promise.resolve();
assert.equal(rewardPozvan, true, "Rewarded adapter treba da bude pozvan.");
assert.equal(TokeniManager.tokeni, 3, "Uspesan reward treba da doda +1 token do maksimuma.");

TokeniManager.postaviStanje(2);
TokeniManager.postaviAdapterReklama({
    prikaziRewarded: async () => ({ nagradaDodeljena: false })
});
TokeniManager.pogledajReklamu();
await Promise.resolve();
await Promise.resolve();
assert.equal(TokeniManager.tokeni, 2, "Nedovrsena reward reklama ne sme da doda token.");

const SinhronizacijaManager = ucitajScript("www/sinhronizacija.js", "SinhronizacijaManager");
context.__zakazanoSlanje = null;
context.localStorage.clear();

SinhronizacijaManager.obradiProfil({
    playerId: "test-player",
    sinhronizacija: {
        revizija: 1,
        imaPodatke: true,
        napredak: {
            tokeni: {
                stanje: 0,
                datum: "stari-datum"
            }
        }
    }
});

assert.equal(TokeniManager.tokeni, 3, "Cloud tokeni od starog dana moraju da prodju kroz dnevni reset.");
assert.equal(context.localStorage.getItem("zemljopis_tokeni_stanje"), "3");
assert.equal(context.localStorage.getItem("zemljopis_datum_tokena"), danas);
assert.equal(context.__zakazanoSlanje, 700, "Ispravljeno stanje tokena treba ponovo sinhronizovati.");

console.log("OK: lokalna logika tokena, reward adapter i cloud dnevni reset rade.");
