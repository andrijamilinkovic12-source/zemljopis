import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.ZEMLJOPIS_TEST_MODE = 'true';
process.env.MONGO_URI ||= 'mongodb://127.0.0.1/zemljopis-test';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');
const { kvizTestApi: kviz } = require('../server.js');

const primeri = [
    {
        naziv: 'DŽ',
        kategorija: 'drzava',
        slovo: 'DŽ',
        latinica: 'DŽIBUTI',
        cirilicaSpojeno: 'ЏИБУТИ',
        cirilicaRastavljeno: 'ДЖИБУТИ'
    },
    {
        naziv: 'LJ',
        kategorija: 'grad',
        slovo: 'LJ',
        latinica: 'LJUBLJANA',
        cirilicaSpojeno: 'ЉУБЉАНА',
        cirilicaRastavljeno: 'ЛЈУБЛЈАНА'
    },
    {
        naziv: 'NJ',
        kategorija: 'grad',
        slovo: 'NJ',
        latinica: 'NJUKASL NA TAJNU',
        cirilicaSpojeno: 'ЊУКАСЛ НА ТАЈНУ',
        cirilicaRastavljeno: 'НЈУКАСЛ НА ТАЈНУ'
    }
];

for (const primer of primeri) {
    const latinicaOdvojeno = [...primer.latinica].join('');
    assert.equal(latinicaOdvojeno, primer.latinica, `${primer.naziv}: odvojeni latinični tasteri moraju dati isti tekst.`);

    for (const unos of [primer.latinica, latinicaOdvojeno, primer.cirilicaSpojeno]) {
        assert.equal(
            BazaPodataka.proveriPojam(primer.kategorija, unos, primer.slovo),
            true,
            `${primer.naziv}: ${unos} mora biti prihvaćen u svim standardnim modovima.`
        );
        assert.equal(
            kviz.normalizujKvizTekst(unos),
            kviz.normalizujKvizTekst(primer.latinica),
            `${primer.naziv}: kviz mora jednako normalizovati ${unos}.`
        );
        assert.equal(
            kviz.proceniKvizOdgovor('emoji', { prihvaceni: [primer.latinica], poeni: 1 }, { tekst: unos }).tacno,
            true,
            `${primer.naziv}: ${unos} mora biti tačan odgovor u kvizu.`
        );
    }

    assert.equal(
        BazaPodataka.proveriPojam(primer.kategorija, primer.cirilicaRastavljeno, primer.slovo),
        false,
        `${primer.naziv}: ${primer.cirilicaRastavljeno} ne sme zameniti jedno ćirilično slovo.`
    );
    assert.equal(
        kviz.normalizujKvizTekst(primer.cirilicaRastavljeno),
        '',
        `${primer.naziv}: rastavljeni ćirilični oblik mora biti nevažeći u kvizu.`
    );
    assert.equal(
        kviz.proceniKvizOdgovor('emoji', { prihvaceni: [primer.latinica], poeni: 1 }, { tekst: primer.cirilicaRastavljeno }).tacno,
        false,
        `${primer.naziv}: rastavljeni ćirilični oblik ne sme biti tačan odgovor u kvizu.`
    );
}

for (const [kategorija, pojam, osnovnoSlovo, slozenoSlovo] of [
    ['drzava', 'DŽIBUTI', 'D', 'DŽ'],
    ['grad', 'LJUBLJANA', 'L', 'LJ'],
    ['grad', 'NJUKASL NA TAJNU', 'N', 'NJ']
]) {
    assert.equal(BazaPodataka.proveriPojam(kategorija, pojam, osnovnoSlovo), false, `${pojam} ne sme važiti za slovo ${osnovnoSlovo}.`);
    assert.equal(BazaPodataka.proveriPojam(kategorija, pojam, slozenoSlovo), true, `${pojam} mora važiti za slovo ${slozenoSlovo}.`);
}

const dupliOdgovor = kviz.proceniKvizOdgovor(
    'brzopotezne',
    { trazeno: 3, prihvaceni: ['DŽIBUTI', 'LJUBLJANA', 'NJUKASL NA TAJNU'] },
    { grupe: [['ЏИБУТИ', 'ДЖИБУТИ', 'ЛЈУБЛЈАНА']] }
);
assert.equal(dupliOdgovor.tacnih, 1, 'Rastavljeni ćirilični oblici ne smeju doneti bod.');

console.log('Latinica prihvata DŽ, LJ i NJ; ćirilica prihvata samo Џ, Љ i Њ.');
