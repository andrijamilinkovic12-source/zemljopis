import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.ZEMLJOPIS_TEST_MODE = 'true';
process.env.MONGO_URI ||= 'mongodb://127.0.0.1/zemljopis-test';

const require = createRequire(import.meta.url);
const { dnevniTestApi: dnevni } = require('../server.js');
const BazaPodataka = require('../www/bazapodataka.js');

assert.equal(dnevni.VREMENSKA_ZONA_IGRE, 'Europe/Belgrade');

assert.equal(
    dnevni.datumIdBeograd(new Date('2026-01-01T22:59:59.000Z')),
    '2026-01-01'
);
assert.equal(
    dnevni.datumIdBeograd(new Date('2026-01-01T23:00:00.000Z')),
    '2026-01-02'
);
assert.equal(
    dnevni.datumIdBeograd(new Date('2026-07-01T21:59:59.000Z')),
    '2026-07-01'
);
assert.equal(
    dnevni.datumIdBeograd(new Date('2026-07-01T22:00:00.000Z')),
    '2026-07-02'
);

assert.equal(dnevni.pomeriDatumId('2024-03-01', -1), '2024-02-29');
assert.equal(dnevni.pomeriDatumId('2026-01-01', -1), '2025-12-31');

const datumId = '2026-07-02';
const prviZadaci = dnevni.napraviDnevneZadatke(datumId);
const drugiZadaci = dnevni.napraviDnevneZadatke(datumId);
assert.deepEqual(prviZadaci, drugiZadaci);
assert.equal(prviZadaci.length, 4);
assert.equal(new Set(prviZadaci.map(zadatak => zadatak.kategorija)).size, 4);
assert.equal(new Set(prviZadaci.map(zadatak => zadatak.slovo)).size, 4);
assert.ok(prviZadaci.every(zadatak => dnevni.DNEVNI_KATEGORIJE.some(kategorija => kategorija.id === zadatak.kategorija)));
assert.notDeepEqual(prviZadaci, dnevni.napraviDnevneZadatke('2026-07-03'));

for (
    let datum = new Date('2024-01-01T00:00:00.000Z');
    datum <= new Date('2030-12-31T00:00:00.000Z');
    datum.setUTCDate(datum.getUTCDate() + 1)
) {
    const testDatum = datum.toISOString().slice(0, 10);
    const zadaci = dnevni.napraviDnevneZadatke(testDatum);
    assert.equal(new Set(zadaci.map(zadatak => zadatak.slovo)).size, 4);
    zadaci.forEach(zadatak => {
        const reci = [
            ...(BazaPodataka.reci[zadatak.kategorija] || []),
            ...Object.keys(BazaPodataka.alijasi[zadatak.kategorija] || {})
        ];
        assert.ok(
            reci.some(rec => BazaPodataka.presloviULatinicu(rec).startsWith(zadatak.slovo)),
            `${testDatum}: ${zadatak.kategorija} nema odgovor na ${zadatak.slovo}`
        );
    });
}

assert.equal(dnevni.bonusZaDnevniNiz(2), 0);
assert.equal(dnevni.bonusZaDnevniNiz(3), 50);
assert.equal(dnevni.bonusZaDnevniNiz(7), 150);
assert.equal(dnevni.bonusZaDnevniNiz(14), 300);

assert.deepEqual(
    dnevni.izracunajDnevniNiz({ dnevniNiz: { poslednjiDatum: '2026-07-01', brojDana: 6 } }, datumId),
    { poslednjiDatum: datumId, brojDana: 7, bonusDukata: 150 }
);
assert.deepEqual(
    dnevni.izracunajDnevniNiz({ dnevniNiz: { poslednjiDatum: '2026-06-30', brojDana: 9 } }, datumId),
    { poslednjiDatum: datumId, brojDana: 1, bonusDukata: 0 }
);

assert.deepEqual(
    dnevni.normalizujDnevneOdgovore({ grad: '  Novi   Sad  ', '$los': 'test', reka: 42 }),
    { grad: 'Novi Sad', reka: '42' }
);

const isteklo = dnevni.napraviIstekliDnevniRezultat({ zadaci: prviZadaci });
assert.equal(isteklo.razlog, 'isteklo_vreme');
assert.equal(isteklo.osvojenoDukata, 0);
assert.equal(isteklo.x2Preuzet, false);
assert.equal(isteklo.provera.length, 4);

console.log('Dnevni izazov: svi lokalni testovi su prošli.');
