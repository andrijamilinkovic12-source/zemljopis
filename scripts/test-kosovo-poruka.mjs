import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');
const KosovoPorukaManager = require('../www/kosovo-poruka.js');

assert.ok(!BazaPodataka.reci.drzava.includes('KOSOVO'), 'Kosovo ne sme biti u bazi prihvaćenih država.');

const visejezicniOblici = [
    'Kosovo', 'Kosova', 'Kosovë', 'Kosowo', 'Koszovó', 'Косово', 'Κοσσυφοπέδιο',
    '科索沃', 'コソボ', '코소보', 'كوسوفو', 'קוסובו', 'კოსოვო', 'Կոսովո', 'कोसोवो', 'โคโซโว'
];

for (const unos of visejezicniOblici) {
    assert.equal(KosovoPorukaManager.jeKosovoOdgovor(unos), true, `${unos} mora pokrenuti posebnu poruku.`);
    assert.equal(BazaPodataka.proveriPojam('drzava', unos, 'K'), false, `${unos} ne sme biti tačan odgovor za slovo K.`);
}

assert.equal(KosovoPorukaManager.jeKosovoOdgovor('Kostarika'), false);
assert.equal(KosovoPorukaManager.jeKosovoOdgovor('Kongo'), false);

const gameKod = readFileSync(new URL('../www/game.js', import.meta.url), 'utf8');
const dnevniKod = readFileSync(new URL('../www/dnevniizazov.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const kosovoPorukaKod = readFileSync(new URL('../www/kosovo-poruka.js', import.meta.url), 'utf8');
const stilovi = readFileSync(new URL('../www/style.css', import.meta.url), 'utf8');

assert.equal((gameKod.match(/KosovoPorukaManager\.ponoviURedu/g) || []).length, 2, 'Solo i multiplayer moraju ponoviti poruku nakon runde.');
assert.match(dnevniKod, /prikaziKosovoPorukuAkoTreba/, 'Dnevni izazov mora pozivati animaciju.');
assert.match(index, /src="kosovo-poruka\.js\?v=3"/, 'Zajednički kod animacije mora biti učitan bez starog keša.');
assert.match(kosovoPorukaKod, /document\.addEventListener\('input'/, 'Poruka mora reagovati odmah pri unosu.');
assert.match(kosovoPorukaKod, /jeKosovoOdgovor/, 'Poruka mora prepoznati unos Kosovo bez priznavanja odgovora.');
assert.match(kosovoPorukaKod, /Intl\.DisplayNames/, 'Lokalizovani nazivi moraju dolaziti iz jezičkih podataka uređaja.');
assert.match(kosovoPorukaKod, /--kosovo-let-x/, 'Animacija mora imati smer ka unetoj reči.');
assert.match(kosovoPorukaKod, /izmeriUnosSaRazmakom/, 'Poruka mora doći iza unosa i jednog pravilnog razmaka.');
assert.match(kosovoPorukaKod, /postaviPosleUnosa/, 'Poruka ne sme prekriti igračev unos.');
assert.match(stilovi, /100%\s*\{\s*opacity:\s*1;\s*transform:\s*translate\(0, -50%\) scale\(1\)/, 'Poruka mora ostati vidljiva kada se animacija završi.');

console.log('Kosovo: poruka dolazi posle jednog razmaka, ne prekriva unos i ostaje vidljiva.');
