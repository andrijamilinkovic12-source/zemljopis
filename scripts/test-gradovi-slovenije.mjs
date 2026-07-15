import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const ocekivaniGradovi = new Set([
    'AJDOVŠČINA', 'BLED', 'BOVEC', 'BREŽICE', 'CELJE', 'ČRNOMELJ', 'DOMŽALE', 'GORNJA RADGONA',
    'HRASTNIK', 'IDRIJA', 'ILIRSKA BISTRICA', 'IZOLA', 'JESENICE', 'KAMNIK', 'KOČEVJE', 'KOPAR',
    'KOSTANJEVICA NA KRKI', 'KRANJ', 'KRŠKO', 'LAŠKO', 'LENDAVA', 'LITIJA', 'LJUBLJANA', 'LJUTOMER',
    'MARIBOR', 'METLIKA', 'MURSKA SOBOTA', 'NOVA GORICA', 'NOVO MESTO', 'ORMOŽ', 'PIRAN', 'POSTOJNA',
    'PTUJ', 'RADEČE', 'RADOVLJICA', 'RAVNE NA KOROŠKEM', 'SEVNICA', 'SEŽANA', 'SLOVENSKA BISTRICA',
    'SLOVENJ GRADEC', 'SLOVENSKE KONJICE', 'ŠKOFJA LOKA', 'ŠOŠTANJ', 'TOLMIN', 'TRBOVLJE', 'TRŽIČ',
    'VELENJE', 'VIŠNJA GORA', 'VRHNIKA', 'ZAGORJE OB SAVI', 'ŽALEC', 'CERKNICA', 'DRAVOGRAD', 'GROSUPLJE',
    'LOGATEC', 'MEDVODE', 'MENGEŠ', 'MEŽICA', 'PREVALJE', 'RIBNICA', 'ROGAŠKA SLATINA', 'RUŠE',
    'ŠEMPETER PRI GORICI', 'ŠENTJUR', 'TREBNJE', 'ŽELEZNIKI', 'ŽIRI', 'LENART V SLOVENSKIH GORICAH', 'ZREČE'
]);

const zakonskiGradovi = new Set(BazaPodataka.gradoviSaStatusomGradaUSloveniji);
assert.equal(zakonskiGradovi.size, 69, 'Spisak mora sadržati 69 naselja sa statusom grada.');
assert.deepEqual(zakonskiGradovi, ocekivaniGradovi);

for (const grad of zakonskiGradovi) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

const naziviKojiNisuGradovi = new Set(BazaPodataka.naziviKojiNisuGradoviUSloveniji);
assert.ok(naziviKojiNisuGradovi.has('ANKARAN'));
assert.ok(naziviKojiNisuGradovi.has('MORAVSKE TOPLICE'));
assert.ok(naziviKojiNisuGradovi.has('POMURJE'));

for (const nazivKojiNijeGrad of naziviKojiNisuGradovi) {
    assert.ok(!BazaPodataka.reci.grad.includes(nazivKojiNijeGrad), `${nazivKojiNijeGrad} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', nazivKojiNijeGrad, nazivKojiNijeGrad.charAt(0)), false);
}

assert.equal(BazaPodataka.standardizujPojam('grad', 'Koper', 'K'), 'KOPAR');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Ljubljana', 'L'), 'LJUBLJANA');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Novo mesto', 'N'), 'NOVO MESTO');

console.log('Slovenija: zakonski gradovi i pravila prepoznavanja su provereni.');
