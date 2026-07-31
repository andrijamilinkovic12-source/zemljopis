import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { maskirajNeprimerenTekst } = require('../www/chat-filter.js');

function filtriraj(tekst, dodatniIzrazi = []) {
    return maskirajNeprimerenTekst(tekst, dodatniIzrazi);
}

const latinica = filtriraj('Ovo je jebote poruka.');
assert.equal(latinica.tekst, 'Ovo je *** poruka.');
assert.equal(latinica.maskirano, true);

const cirilica = filtriraj('Ово је јеботе порука.');
assert.equal(cirilica.tekst, 'Ово је *** порука.');
assert.equal(cirilica.maskirano, true);
assert.equal(filtriraj('То је срање.').tekst, 'То је ***.');

assert.equal(filtriraj('f.u.c.k nije dozvoljen').tekst, '*** nije dozvoljen');
assert.equal(filtriraj('f*ck nije dozvoljen').tekst, '*** nije dozvoljen');
assert.equal(filtriraj('J 3 B 0 T E nije dozvoljeno').tekst, '*** nije dozvoljeno');
assert.equal(filtriraj('Ovo je zabranjenatest izraz.', ['zabranjenatest']).tekst, 'Ovo je *** izraz.');
assert.equal(filtriraj('Razred ima class zadatak.').tekst, 'Razred ima class zadatak.');

assert.equal(filtriraj('IDIOT nije dozvoljen.').tekst, '*** nije dozvoljen.');
assert.equal(filtriraj('Ti si majmun.').tekst, 'Ti si ***.');
assert.equal(filtriraj('Ти си МАЈМУН.').tekst, 'Ти си ***.');
assert.equal(filtriraj('Nemoj biti peder.').tekst, 'Nemoj biti ***.');
assert.equal(filtriraj('Немој бити ПЕДЕР.').tekst, 'Немој бити ***.');
assert.equal(filtriraj('Jebi se, smrade!').tekst, '***, ***!');
assert.equal(filtriraj('Ти си КУРВИН СИН.').tekst, 'Ти си ***.');
assert.equal(filtriraj('Nemoj biti seronja.').tekst, 'Nemoj biti ***.');
assert.equal(filtriraj('You are an idiot and a dumbass.').tekst, 'You are an *** and a ***.');
assert.equal(filtriraj('You are a moron.').tekst, 'You are a ***.');
assert.equal(filtriraj('You are a scumbag and a wanker.').tekst, 'You are a *** and a ***.');

console.log('Chat filter test je uspešno prošao.');
