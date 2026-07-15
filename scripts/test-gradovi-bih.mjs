import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const ocekivaniGradoviFBiH = new Set([
    'BIHAĆ', 'BOSANSKA KRUPA', 'ČAPLJINA', 'CAZIN', 'GORAŽDE', 'GRAČANICA', 'GRADAČAC', 'KONJIC',
    'LIVNO', 'LJUBUŠKI', 'LUKAVAC', 'MOSTAR', 'NOVI TRAVNIK', 'ORAŠJE', 'SARAJEVO', 'SREBRENIK',
    'STOLAC', 'ŠIROKI BRIJEG', 'TUZLA', 'VISOKO', 'ZAVIDOVIĆI', 'ZENICA', 'ŽIVINICE'
]);

const ocekivaniGradoviRS = new Set([
    'BANJA LUKA', 'BIJELJINA', 'ISTOČNO SARAJEVO', 'LAKTAŠI', 'DOBOJ', 'DERVENTA', 'PRIJEDOR',
    'PRNJAVOR', 'TREBINJE', 'ZVORNIK', 'GRADIŠKA', 'TESLIĆ'
]);

const gradoviFBiH = new Set(BazaPodataka.gradoviSaStatusomGradaUFBiH);
const gradoviRS = new Set(BazaPodataka.gradoviSaStatusomGradaURepubliciSrpskoj);
const gradoviBiH = new Set(BazaPodataka.gradoviSaStatusomGradaUBosniIHercegovini);

assert.equal(gradoviFBiH.size, 23, 'FBiH mora sadržati 23 zakonska grada.');
assert.deepEqual(gradoviFBiH, ocekivaniGradoviFBiH);
assert.equal(gradoviRS.size, 12, 'RS mora sadržati 12 zakonskih gradova, uključujući Teslić.');
assert.deepEqual(gradoviRS, ocekivaniGradoviRS);
assert.equal(gradoviBiH.size, 35, 'Kombinovani spisak BiH mora sadržati 35 zakonskih gradova.');
assert.deepEqual(gradoviBiH, new Set([...ocekivaniGradoviFBiH, ...ocekivaniGradoviRS]));

for (const grad of gradoviBiH) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

const naziviKojiNisuGradovi = new Set(BazaPodataka.naziviKojiNisuGradoviUBosniIHercegovini);
assert.ok(naziviKojiNisuGradovi.has('BRČKO'));
assert.ok(naziviKojiNisuGradovi.has('KAKANJ'));
assert.ok(naziviKojiNisuGradovi.has('ISTOČNO NOVO SARAJEVO'));
assert.ok(naziviKojiNisuGradovi.has('KANTON SARAJEVO'));

for (const nazivKojiNijeGrad of naziviKojiNisuGradovi) {
    assert.ok(!BazaPodataka.reci.grad.includes(nazivKojiNijeGrad), `${nazivKojiNijeGrad} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', nazivKojiNijeGrad, nazivKojiNijeGrad.charAt(0)), false);
}

assert.equal(BazaPodataka.standardizujPojam('grad', 'Banjaluka', 'B'), 'BANJA LUKA');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Gradacac', 'G'), 'GRADAČAC');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Teslic', 'T'), 'TESLIĆ');

console.log('BiH: zakonski gradovi po entitetima i pravila prepoznavanja su provereni.');
