import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const zakonskiGradovi = new Set(BazaPodataka.gradoviSaStatusomGradaUSrbiji);
const ocekivaniGradovi = new Set([
    'BEOGRAD', 'BOR', 'VALJEVO', 'VRANJE', 'VRŠAC', 'ZAJEČAR', 'ZRENJANIN', 'JAGODINA',
    'KIKINDA', 'KRAGUJEVAC', 'KRALJEVO', 'KRUŠEVAC', 'LESKOVAC', 'LOZNICA', 'NIŠ', 'NOVI PAZAR',
    'NOVI SAD', 'PANČEVO', 'PIROT', 'POŽAREVAC', 'PRIŠTINA', 'PROKUPLJE', 'SMEDEREVO', 'SOMBOR',
    'SREMSKA MITROVICA', 'SUBOTICA', 'UŽICE', 'ČAČAK', 'ŠABAC'
]);

assert.equal(zakonskiGradovi.size, 29, 'Spisak mora sadržati 29 gradova sa zakonskim statusom.');
assert.deepEqual(zakonskiGradovi, ocekivaniGradovi);

for (const grad of zakonskiGradovi) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

for (const opstina of ['ARILJE', 'ĆUPRIJA', 'ĐAKOVICA', 'INĐIJA', 'PRIZREN']) {
    assert.ok(!BazaPodataka.reci.grad.includes(opstina), `${opstina} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', opstina, opstina.charAt(0)), false);
}

console.log('Gradovi Srbije: zakonski spisak i pravila prepoznavanja su provereni.');
