import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BazaPodataka = require('../www/bazapodataka.js');

// Svaka grupa predstavlja odgovore igrača iz različitih delova bivše Jugoslavije.
// Svi unosi u jednoj grupi moraju da se standardizuju na isti grad pre bodovanja.
const scenariji = [
    { grad: 'SKOPLJE', slovo: 'S', unosi: ['Skoplje', 'Skopje', 'Скопље', 'Скопје'] },
    { grad: 'BITOLJ', slovo: 'B', unosi: ['Bitolj', 'Bitola', 'Битољ', 'Битола'] },
    { grad: 'ŠTIP', slovo: 'Š', unosi: ['Štip', 'Stip', 'Shtip', 'Штип'] },
    { grad: 'KIČEVO', slovo: 'K', unosi: ['Kičevo', 'Kicevo', 'Кичево'] },
    { grad: 'KOPAR', slovo: 'K', unosi: ['Kopar', 'Koper', 'Копар', 'Копер'] },
    { grad: 'BANJA LUKA', slovo: 'B', unosi: ['Banja Luka', 'Banjaluka', 'Бања Лука'] },
    { grad: 'BIJELO POLJE', slovo: 'B', unosi: ['Bijelo Polje', 'BijeloPolje', 'Belo Polje', 'Бијело Поље'] },
    { grad: 'NIKŠIĆ', slovo: 'N', unosi: ['Nikšić', 'Niksic', 'Никшић'] },
    { grad: 'LJUBLJANA', slovo: 'LJ', unosi: ['Ljubljana', 'Љубљана'] },
    { grad: 'KRŠKO', slovo: 'K', unosi: ['Krško', 'Krsko', 'Кршко'] },
    { grad: 'PULA-POLA', slovo: 'P', unosi: ['Pula', 'Pula-Pola'] },
    { grad: 'ČAČAK', slovo: 'Č', unosi: ['Čačak', 'Cacak', 'Чачак'] },
    { grad: 'NIŠ', slovo: 'N', unosi: ['Niš', 'Nis', 'Ниш'] },
    { grad: 'ČRNOMELJ', slovo: 'Č', unosi: ['Črnomelj', 'Crnomelj', 'Чрномељ'] }
];

for (const { grad, slovo, unosi } of scenariji) {
    const kanonskiNazivi = new Set();

    for (const unos of unosi) {
        assert.equal(
            BazaPodataka.proveriPojam('grad', unos, slovo),
            true,
            `${unos} mora biti priznat kao grad za slovo ${slovo}.`
        );
        kanonskiNazivi.add(BazaPodataka.standardizujPojam('grad', unos, slovo));
    }

    assert.deepEqual(
        kanonskiNazivi,
        new Set([grad]),
        `Varijante za ${grad} moraju imati isti naziv za bodovanje.`
    );
}

console.log('Ex-Yu varijante gradova se standardizuju na iste odgovore za bodovanje.');
