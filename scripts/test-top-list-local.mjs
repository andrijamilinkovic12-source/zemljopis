import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.ZEMLJOPIS_TEST_MODE = 'true';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/zemljopis_test';

const require = createRequire(import.meta.url);
const { topListaTestApi: api } = require('../server.js');

assert.deepEqual(
    api.oznakePeriodaTopListe(new Date('2026-07-02T12:00:00Z')),
    { nedeljni: '2026-06-29', mesecni: '2026-07' }
);

assert.deepEqual(
    api.raspodeliPoeneZaPojmove([{ playerId: 'a', pojam: 'srbija' }]).map(x => x.poeni),
    [15]
);
assert.deepEqual(
    api.raspodeliPoeneZaPojmove([
        { playerId: 'a', pojam: 'srbija' },
        { playerId: 'b', pojam: 'slovenija' }
    ]).map(x => x.poeni),
    [10, 10]
);
assert.deepEqual(
    api.raspodeliPoeneZaPojmove([
        { playerId: 'a', pojam: 'srbija' },
        { playerId: 'b', pojam: 'srbija' }
    ]).map(x => x.poeni),
    [5, 5]
);

const ciljni = {
    playerId: 'google-player',
    topListaNedeljniPeriod: '2026-06-29',
    nedeljniPoeni: 100,
    topListaMesecniPeriod: '2026-07',
    mesecniPoeni: 200,
    svaVremenaPoeni: 1000,
    topListaObradjeniMecevi: ['m1'],
    onlineObradjeniMecevi: ['m1'],
    onlineObradjenePobede: ['m1'],
    kvartalniObradjeniDogadjaji: ['q1'],
    odigraniOnlineMecevi: 3,
    onlinePobede: 2,
    pobede: 2,
    prijatelji: ['friend-a'],
    zahteviPrijateljstva: [],
    spojeniPlayerIds: []
};
const lokalni = {
    playerId: 'guest-player',
    topListaNedeljniPeriod: '2026-06-29',
    nedeljniPoeni: 50,
    topListaMesecniPeriod: '2026-07',
    mesecniPoeni: 70,
    svaVremenaPoeni: 500,
    topListaObradjeniMecevi: ['m2'],
    onlineObradjeniMecevi: ['m2'],
    onlineObradjenePobede: [],
    kvartalniObradjeniDogadjaji: ['q2'],
    odigraniOnlineMecevi: 1,
    onlinePobede: 0,
    pobede: 0,
    prijatelji: ['friend-b'],
    zahteviPrijateljstva: [{ playerId: 'friend-c' }]
};

assert.equal(api.spojiServerskiNapredakProfila(ciljni, lokalni, new Date('2026-07-02T12:00:00Z')), true);
assert.equal(ciljni.nedeljniPoeni, 150);
assert.equal(ciljni.mesecniPoeni, 270);
assert.equal(ciljni.svaVremenaPoeni, 1500);
assert.equal(ciljni.odigraniOnlineMecevi, 4);
assert.deepEqual(ciljni.topListaObradjeniMecevi, ['m1', 'm2']);
assert.deepEqual(ciljni.prijatelji, ['friend-a', 'friend-b']);
assert.deepEqual(ciljni.spojeniPlayerIds, ['guest-player']);

assert.equal(api.spojiServerskiNapredakProfila(ciljni, lokalni, new Date('2026-07-02T12:00:00Z')), false);
assert.equal(ciljni.svaVremenaPoeni, 1500, 'Ponovljena migracija ne sme duplirati poene.');

assert.deepEqual(
    api.odrediPobednikeMeca({
        igraci: [{ playerId: 'a' }, { playerId: 'b' }],
        serverPoeni: { a: 120, b: 90, napustio: 999 }
    }),
    ['a'],
    'Igrač koji je napustio sobu ne sme biti pobednik.'
);

console.log('Top lista: periodi, bodovanje, spajanje profila i pobednik rade.');
