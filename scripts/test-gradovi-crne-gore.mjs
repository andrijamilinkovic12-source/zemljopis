import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const ocekivanaUrbanaSedista = new Set([
    'PODGORICA', 'NIKŠIĆ', 'PLJEVLJA', 'BAR', 'CETINJE', 'ULCINJ', 'TIVAT', 'BERANE',
    'BIJELO POLJE', 'BUDVA', 'HERCEG NOVI', 'ROŽAJE', 'KOTOR'
]);

const urbanaSedista = new Set(BazaPodataka.gradoviCrneGore);
assert.equal(urbanaSedista.size, 13, 'Spisak mora sadržati 13 većih urbanih sedišta Crne Gore.');
assert.deepEqual(urbanaSedista, ocekivanaUrbanaSedista);

for (const grad of urbanaSedista) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

const naziviKojiNisuGradovi = new Set(BazaPodataka.naziviKojiNisuGradoviUCrnojGori);
assert.ok(naziviKojiNisuGradovi.has('PETNJICA'));
assert.ok(naziviKojiNisuGradovi.has('GOLUBOVCI'));
assert.ok(naziviKojiNisuGradovi.has('BOKA KOTORSKA'));

for (const nazivKojiNijeGrad of naziviKojiNisuGradovi) {
    assert.ok(!BazaPodataka.reci.grad.includes(nazivKojiNijeGrad), `${nazivKojiNijeGrad} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', nazivKojiNijeGrad, nazivKojiNijeGrad.charAt(0)), false);
}

assert.equal(BazaPodataka.standardizujPojam('grad', 'Niksic', 'N'), 'NIKŠIĆ');
assert.equal(BazaPodataka.standardizujPojam('grad', 'BijeloPolje', 'B'), 'BIJELO POLJE');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Rozaje', 'R'), 'ROŽAJE');

console.log('Crna Gora: veća urbana sedišta i pravila prepoznavanja su provereni.');
