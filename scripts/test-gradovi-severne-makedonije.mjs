import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const ocekivaniGradovi = new Set([
    'SKOPLJE', 'KUMANOVO', 'BITOLJ', 'PRILEP', 'TETOVO', 'ŠTIP', 'VELES', 'OHRID', 'STRUMICA',
    'GOSTIVAR', 'KAVADARCI', 'KOČANI', 'KIČEVO', 'GEVGELIJA', 'STRUGA', 'RADOVIŠ', 'KRIVA PALANKA',
    'NEGOTINO', 'DEBAR', 'SVETI NIKOLE', 'PROBIŠTIP', 'DELČEVO', 'VINICA', 'RESEN', 'BEROVO', 'KRATOVO', 'BOGDANCI'
]);

const urbanaSedista = new Set(BazaPodataka.gradoviSeverneMakedonije);
assert.equal(urbanaSedista.size, 27, 'Spisak mora sadržati 27 većih urbanih sedišta.');
assert.deepEqual(urbanaSedista, ocekivaniGradovi);

for (const grad of urbanaSedista) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

for (const nazivKojiNijeGrad of [
    'AERODROM', 'BUTEL', 'GAZI BABA', 'KARPOŠ', 'KISELA VODA', 'SARAJ', 'ČAIR', 'ŠUTO ORIZARI',
    'MAVROVO I ROSTUŠA', 'CENTAR ŽUPA', 'POLOG', 'PELAGONIJA', 'VARDAR'
]) {
    assert.ok(!BazaPodataka.reci.grad.includes(nazivKojiNijeGrad), `${nazivKojiNijeGrad} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', nazivKojiNijeGrad, nazivKojiNijeGrad.charAt(0)), false);
}

assert.equal(BazaPodataka.standardizujPojam('grad', 'Skopje', 'S'), 'SKOPLJE');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Kicevo', 'K'), 'KIČEVO');

console.log('Severna Makedonija: urbana sedišta i pravila prepoznavanja su provereni.');
