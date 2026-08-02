import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

const { reci, alijasi } = BazaPodataka;

// Pojmovi koji označavaju pogrešan tip entiteta za kanonsku listu. Ove liste
// služe kao zaštita od vraćanja već uklonjenih administrativnih, taksonomskih
// i materijalnih pojmova u pogrešnu kategoriju.
const nepripadajuciPojmovi = {
    grad: [
        'JAREN', 'JUŽNA TARAVA', 'ZANZIBAR',
        'HAARLEMMERMEER', 'LANSINGERLAND', 'NISSEWAARD', 'SITTARD-GELEEN', 'ZAANSTAD'
    ],
    reka: ['MILJAŠIĆ JARUGA'],
    planina: [
        'ACOMA ROCK', 'AOBA ISLAND', 'ASO ROCK', 'ATLASOV ISLAND', 'CASTLETON TOWER',
        'CHIMNEY ROCK', 'FORT ROCK', 'HOLY ISLAND', 'KARKAR ISLAND', 'KASATOCHI ISLAND',
        'PAULET ISLAND', 'PILOT ROCK', 'SAKAR ISLAND', 'TIGER ISLAND', 'TORORO ROCK',
        'ULURU', 'UMBOI ISLAND', 'ZUMA ROCK'
    ],
    biljka: ['ALGA', 'LIŠAJ', 'SMEĐA ALGA', 'SUKULENT', 'ŠKROBAC', 'ŽITO'],
    zivotinja: ['ĐAVO'],
    predmet: [
        'ALAT', 'ASFALT', 'BAKAR', 'BETON', 'BILIJAR', 'BRONZA', 'CEMENT', 'ČOJA', 'ĆUMUR',
        'EMAJL', 'FARBA', 'FROTIR', 'GARDEROBA', 'GIPS', 'GLINA', 'GVOŽĐE', 'KARTON',
        'KERAMIKA', 'KOMPLET', 'LEGURA', 'MATERIJAL', 'METAL', 'MINERAL', 'NAJLON',
        'NAMIRNICA', 'NAMEŠTAJ', 'OBUĆA', 'ODEĆA', 'ORUŽJE', 'PARABOLA', 'PARAFIN',
        'PETROLEJ', 'PLASTIKA', 'PLATO', 'PLIN', 'PLIŠ', 'PORCELAN', 'POSUĐE', 'PREDIVO', 'PREMAZ'
    ]
};

for (const [kategorija, pojmovi] of Object.entries(nepripadajuciPojmovi)) {
    for (const pojam of pojmovi) {
        assert.ok(
            !reci[kategorija].includes(pojam),
            `${pojam} ne pripada kategoriji ${kategorija}.`
        );
    }
}

for (const [kategorija, pojmovi] of Object.entries(reci)) {
    assert.equal(
        new Set(pojmovi).size,
        pojmovi.length,
        `Kategorija ${kategorija} ne sme sadržati doslovne duplikate.`
    );
}

for (const [kategorija, mapaAlijasa] of Object.entries(alijasi)) {
    for (const [alijas, kanonski] of Object.entries(mapaAlijasa)) {
        assert.ok(
            reci[kategorija].includes(kanonski),
            `${kategorija}: alijas ${alijas} mora voditi do postojećeg kanonskog pojma.`
        );
    }
}

assert.ok(reci.grad.includes('ZANZIBAR SITI'), 'Kanonski naziv grada mora biti ZANZIBAR SITI.');
assert.equal(alijasi.grad.ZANZIBAR, 'ZANZIBAR SITI');
assert.equal(alijasi.grad['ZANZIBAR CITY'], 'ZANZIBAR SITI');

console.log('✓ Integritet kategorija: kanonski pojmovi i alijasi su semantički usklađeni.');
