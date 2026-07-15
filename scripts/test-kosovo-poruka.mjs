import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

assert.ok(!BazaPodataka.reci.drzava.includes('KOSOVO'), 'Kosovo ne sme biti u bazi prihvaćenih država.');

for (const unos of ['Kosovo', 'KOSOVO', 'КОСОВО']) {
    assert.equal(BazaPodataka.proveriPojam('drzava', unos, 'K'), false, `${unos} ne sme biti tačan odgovor za slovo K.`);
}

const gameKod = readFileSync(new URL('../www/game.js', import.meta.url), 'utf8');
const dnevniKod = readFileSync(new URL('../www/dnevniizazov.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const kosovoPorukaKod = readFileSync(new URL('../www/kosovo-poruka.js', import.meta.url), 'utf8');

assert.equal((gameKod.match(/KosovoPorukaManager\.ponoviURedu/g) || []).length, 2, 'Solo i multiplayer moraju ponoviti poruku nakon runde.');
assert.match(dnevniKod, /prikaziKosovoPorukuAkoTreba/, 'Dnevni izazov mora pozivati animaciju.');
assert.match(index, /src="kosovo-poruka\.js"/, 'Zajednički kod animacije mora biti učitan.');
assert.match(kosovoPorukaKod, /document\.addEventListener\('input'/, 'Poruka mora reagovati odmah pri unosu.');
assert.match(kosovoPorukaKod, /jeKosovoOdgovor/, 'Poruka mora prepoznati unos Kosovo bez priznavanja odgovora.');

console.log('Kosovo: odgovor nije priznat, a poruka se prikazuje u redu unosa u svim režimima.');
