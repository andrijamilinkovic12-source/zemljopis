import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const ocekivaniGradovi = new Set([
    'DUGO SELO', 'IVANIĆ-GRAD', 'JASTREBARSKO', 'SAMOBOR', 'SVETA NEDELJA', 'SVETI IVAN ZELINA', 'VELIKA GORICA', 'VRBOVEC', 'ZAPREŠIĆ',
    'DONJA STUBICA', 'KLANJEC', 'KRAPINA', 'OROSLAVJE', 'PREGRADA', 'ZABOK', 'ZLATAR',
    'GLINA', 'HRVATSKA KOSTAJNICA', 'KUTINA', 'NOVSKA', 'PETRINJA', 'POPOVAČA', 'SISAK',
    'DUGA RESA', 'KARLOVAC', 'OGULIN', 'OZALJ', 'SLUNJ',
    'GOSPIĆ', 'NOVALJA', 'OTOČAC', 'SENJ',
    'IVANEC', 'LEPOGLAVA', 'LUDBREG', 'NOVI MAROF', 'VARAŽDIN', 'VARAŽDINSKE TOPLICE',
    'ĐURĐEVAC', 'KOPRIVNICA', 'KRIŽEVCI',
    'BJELOVAR', 'ČAZMA', 'DARUVAR', 'GAREŠNICA', 'GRUBIŠNO POLJE',
    'BAKAR', 'CRES', 'CRIKVENICA', 'ČABAR', 'DELNICE', 'KASTAV', 'KRALJEVICA', 'KRK', 'MALI LOŠINJ', 'NOVI VINODOLSKI', 'OPATIJA', 'RAB', 'RIJEKA', 'VRBOVSKO',
    'ORAHOVICA', 'SLATINA', 'VIROVITICA',
    'KUTJEVO', 'LIPIK', 'PAKRAC', 'PLETERNICA', 'POŽEGA',
    'NOVA GRADIŠKA', 'SLAVONSKI BROD',
    'BENKOVAC', 'BIOGRAD NA MORU', 'NIN', 'OBROVAC', 'PAG', 'ZADAR',
    'BELI MANASTIR', 'BELIŠĆE', 'DONJI MIHOLJAC', 'ĐAKOVO', 'NAŠICE', 'OSIJEK', 'VALPOVO',
    'DUBROVNIK', 'KORČULA', 'METKOVIĆ', 'OPUZEN', 'PLOČE',
    'DRNIŠ', 'KNIN', 'SKRADIN', 'ŠIBENIK', 'VODICE',
    'ILOK', 'OTOK', 'VINKOVCI', 'VUKOVAR', 'ŽUPANJA',
    'HVAR', 'IMOTSKI', 'KAŠTELA', 'KOMIŽA', 'MAKARSKA', 'OMIŠ', 'SINJ', 'SOLIN', 'SPLIT', 'STARI GRAD', 'SUPETAR', 'TRILJ', 'TROGIR', 'VIS', 'VRGORAC', 'VRLIKA',
    'BUJE-BUIE', 'BUZET', 'LABIN', 'NOVIGRAD-CITTANOVA', 'PAZIN', 'POREČ-PARENZO', 'PULA-POLA', 'ROVINJ-ROVIGNO', 'UMAG-UMAGO', 'VODNJAN-DIGNANO',
    'ČAKOVEC', 'MURSKO SREDIŠĆE', 'PRELOG', 'ZAGREB'
]);

const zakonskiGradovi = new Set(BazaPodataka.gradoviSaStatusomGradaUHrvatskoj);
assert.equal(zakonskiGradovi.size, 128, 'Spisak mora sadržati 127 gradova i Grad Zagreb.');
assert.deepEqual(zakonskiGradovi, ocekivaniGradovi);

for (const grad of zakonskiGradovi) {
    assert.ok(BazaPodataka.reci.grad.includes(grad), `${grad} mora biti priznat u kategoriji Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', grad, grad.charAt(0)), true);
}

for (const opstina of ['KALI', 'SALI']) {
    assert.ok(!BazaPodataka.reci.grad.includes(opstina), `${opstina} ne sme biti direktno upisan kao Grad.`);
    assert.equal(BazaPodataka.proveriPojam('grad', opstina, opstina.charAt(0)), false);
}

assert.equal(BazaPodataka.standardizujPojam('grad', 'Pula', 'P'), 'PULA-POLA');
assert.equal(BazaPodataka.standardizujPojam('grad', 'Rovinj', 'R'), 'ROVINJ-ROVIGNO');

console.log('Gradovi Hrvatske: službeni spisak i pravila prepoznavanja su provereni.');
