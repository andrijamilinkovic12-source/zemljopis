import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const biljke = BazaPodataka.reci.biljka;
const alijasi = BazaPodataka.alijasi.biljka;
const dozvoljeniOblici = BazaPodataka.dozvoljeniKanonskiOblici.biljka;

// Kategorija mora ostati velika, ali nikada ne sme sadržati isti prikazani pojam.
assert.ok(biljke.length >= 1100, 'Globalna baza biljaka mora imati najmanje 1.100 kanonskih pojmova.');
assert.equal(
    new Set(biljke).size,
    biljke.length,
    'Kategorija Biljke ne sme imati duplirane kanonske pojmove.'
);

// Svaki sinonim mora voditi do kanonskog pojma iz glavne liste i biti dostupan
// u strogom režimu provere, koji se koristi tokom igre.
for (const [alijas, kanonski] of Object.entries(alijasi)) {
    assert.ok(biljke.includes(kanonski), `${alijas} mora voditi do postojećeg pojma ${kanonski}.`);
    assert.equal(
        dozvoljeniOblici[alijas],
        kanonski,
        `${alijas} mora biti dozvoljen kao sinonim u strogom kanonskom režimu.`
    );
}

// Reprezentativni pojmovi čuvaju pokrivenost svih kontinenata.
for (const pojam of [
    'ALPSKA RUŽA',             // Evropa
    'AFRIČKI LJILJAN',         // Afrika
    'JAPANSKA TREŠNJA',        // Azija
    'AMERIČKI GINSENG',        // Severna Amerika
    'BRAZILSKI ORAH',          // Južna Amerika
    'BANKSIJA',                // Australija/Okeanija
    'ANTARKTIČKA VLASULJA'     // Antarktik
]) {
    assert.ok(biljke.includes(pojam), `Nedostaje reprezentativna biljka: ${pojam}.`);
}

// Kategorija pokriva srpsku azbuku, uključujući složena početna slova.
const pokrivenaSlova = new Set(
    [...biljke, ...Object.keys(alijasi)].map(pojam => BazaPodataka.pocetnoSlovoPojma(pojam))
);
for (const slovo of [
    'A', 'B', 'C', 'Č', 'Ć', 'D', 'DŽ', 'Đ', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'LJ', 'M', 'N', 'NJ', 'O', 'P', 'R', 'S', 'Š', 'T', 'U', 'V', 'Z', 'Ž'
]) {
    assert.ok(pokrivenaSlova.has(slovo), `Nedostaje biljka ili sinonim za slovo ${slovo}.`);
}

for (const [unos, kanonski, slovo] of [
    ['BUGENVILIJA', 'BOGUMILA', 'B'],
    ['MINĐUŠICA', 'FUKSIJA', 'M'],
    ['MOLJAC ORHIDEJA', 'ORHIDEJA MOLJAC', 'M'],
    ['POTOS', 'ĐAVOLJI BRŠLJAN', 'P'],
    ['ZAMIJA', 'ZAMIOKULKAS', 'Z']
]) {
    assert.equal(BazaPodataka.proveriPojam('biljka', unos, slovo), true, `${unos} mora biti prihvaćen.`);
    assert.equal(BazaPodataka.standardizujPojam('biljka', unos, slovo), kanonski);
}

console.log(`✓ Globalna baza biljaka: ${biljke.length} kanonskih pojmova, ${Object.keys(alijasi).length} sinonima.`);
