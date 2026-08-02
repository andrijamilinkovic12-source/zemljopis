import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const zivotinje = BazaPodataka.reci.zivotinja;
const alijasi = BazaPodataka.alijasi.zivotinja;
const dozvoljeniOblici = BazaPodataka.dozvoljeniKanonskiOblici.zivotinja;

assert.ok(zivotinje.length >= 800, 'Globalna baza životinja mora imati najmanje 800 kanonskih pojmova.');
assert.equal(
    new Set(zivotinje).size,
    zivotinje.length,
    'Kategorija Životinje ne sme imati duplirane kanonske pojmove.'
);

const normalizovani = new Map();
for (const pojam of zivotinje) {
    const kljuc = BazaPodataka.normalizujBezDijakritika(pojam);
    assert.ok(!normalizovani.has(kljuc), `Normalizovani duplikat: ${normalizovani.get(kljuc)} / ${pojam}.`);
    normalizovani.set(kljuc, pojam);

    const slovo = BazaPodataka.pocetnoSlovoPojma(pojam);
    assert.equal(BazaPodataka.proveriPojam('zivotinja', pojam, slovo), true, `${pojam} mora biti prihvaćen.`);
    assert.equal(BazaPodataka.standardizujPojam('zivotinja', pojam, slovo), pojam);
}

for (const [alijas, kanonski] of Object.entries(alijasi)) {
    assert.ok(zivotinje.includes(kanonski), `${alijas} mora voditi do postojećeg pojma ${kanonski}.`);
    assert.equal(
        dozvoljeniOblici[alijas],
        kanonski,
        `${alijas} mora biti dostupan u strogom kanonskom režimu.`
    );

    const slovo = BazaPodataka.pocetnoSlovoPojma(alijas);
    assert.equal(BazaPodataka.proveriPojam('zivotinja', alijas, slovo), true, `${alijas} mora biti prihvaćen.`);
    assert.equal(BazaPodataka.standardizujPojam('zivotinja', alijas, slovo), kanonski);
}

// Reprezentativni pojmovi čuvaju pokriće svih kontinenata.
for (const pojam of [
    'ALPSKI KOZOROG',      // Evropa
    'AFRIČKI SLON',        // Afrika
    'AMURSKI LEOPARD',     // Azija
    'AMERIČKI BIZON',      // Severna Amerika
    'ANDSKI KONDOR',       // Južna Amerika
    'KUKABURA',            // Australija/Okeanija
    'CARSKI PINGVIN'       // Antarktik
]) {
    assert.ok(zivotinje.includes(pojam), `Nedostaje reprezentativna životinja: ${pojam}.`);
}

const pokrivenaSlova = new Set(
    [...zivotinje, ...Object.keys(alijasi)].map(pojam => BazaPodataka.pocetnoSlovoPojma(pojam))
);
for (const slovo of [
    'A', 'B', 'C', 'Č', 'Ć', 'D', 'DŽ', 'Đ', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'LJ', 'M', 'N', 'NJ', 'O', 'P', 'R', 'S', 'Š', 'T', 'U', 'V', 'Z', 'Ž'
]) {
    assert.ok(pokrivenaSlova.has(slovo), `Nedostaje životinja ili sinonim za slovo ${slovo}.`);
}

for (const [unos, kanonski, slovo] of [
    ['ORNITORINKO', 'ČUDNOKLJUNAŠ', 'O'],
    ['PANDA CRVENA', 'CRVENA PANDA', 'P'],
    ['KUGUAR', 'PUMA', 'K'],
    ['KORNJAČA ZELENA', 'ZELENA KORNJAČA', 'K'],
    ['KER', 'PAS', 'K']
]) {
    assert.equal(BazaPodataka.proveriPojam('zivotinja', unos, slovo), true, `${unos} mora biti prihvaćen.`);
    assert.equal(BazaPodataka.standardizujPojam('zivotinja', unos, slovo), kanonski);
}

console.log(`✓ Globalna baza životinja: ${zivotinje.length} kanonskih pojmova, ${Object.keys(alijasi).length} sinonima.`);
