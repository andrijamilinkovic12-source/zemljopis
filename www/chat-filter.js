// chat-filter.js - Serverski filter neprikladnog sadržaja za Globalni Chat.
// Klijent nikada ne učitava ovaj fajl; originalni tekst ne napušta server kada se maskira.

const OSNOVNI_IZRAZI = [
    // Srpski: bez dijakritika da bi se pokrile latinica, ćirilica i pojednostavljeni unos.
    'jebem', 'jebes', 'jebeš', 'jebi', 'jebite', 'jebao', 'jebala', 'jebali', 'jebo', 'jebe se', 'jebi se', 'odjebi', 'odjebite',
    'jebote', 'jebiga', 'jebanje', 'jebac', 'jebač', 'jebem ti', 'mamu ti jebem',
    'kurac', 'kurca', 'kurcem', 'kuracina', 'kurčina', 'kurvo', 'kurva', 'kurve', 'kurvetina', 'kurvin sin', 'kurvin sine',
    'picka', 'pička', 'picke', 'pičke', 'picko', 'pičko', 'pizda', 'pizde', 'pizdo', 'pizdurina', 'pizdurino',
    'govno', 'govna', 'govnar', 'govnaru', 'sranje', 'sranja', 'serem', 'seres', 'sereš', 'seronja', 'seronjo', 'usrao', 'usrala', 'usrati',
    'drkati', 'drkac', 'drkač', 'drkadžija', 'drkadzija', 'drkas', 'drkaš', 'puši kurac', 'pusi kurac', 'sisaj kurac',
    'pusim', 'pušim', 'pusis', 'pušiš', 'dupe', 'mamu ti', 'mrs', 'mrš',
    // Uvrede i omalovažavanje: česti padežni oblici su navedeni da granice reči ne propuste poruku.
    'idiot', 'idiote', 'idioti', 'idiotkinja', 'kreten', 'kretencina', 'kretenu', 'debil', 'debilu', 'debili',
    'imbecil', 'imbecile', 'moron', 'moronu', 'budala', 'budalo', 'glupan', 'glupane', 'smrad', 'smrade', 'stoka', 'stoko',
    'majmun', 'majmune', 'majmuni',
    'peder', 'pederu', 'pederi', 'pederčina', 'pederčino',
    // Engleski: samostalne reči i njihove česte izvedenice.
    'fuck', 'fck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'btch', 'bitches',
    'asshole', 'dick', 'cock', 'cunt', 'pussy', 'bastard', 'whore', 'slut',
    'fag', 'faggot', 'nigger', 'nigga', 'retard',
    'idiot', 'idiots', 'moron', 'morons', 'imbecile', 'imbeciles', 'dumbass', 'dumbasses',
    'jackass', 'jackasses', 'loser', 'losers', 'monkey', 'monkeys',
    'arsehole', 'dickhead', 'dipshit', 'douche', 'douchebag', 'prick', 'scumbag', 'shithead', 'twat', 'wanker'
];

const ZAMENE_SLOVA = {
    a: '[aа@4]', b: '[bб8]', c: '[cсцčć]', d: '[dд]', e: '[eе3]', f: '[fф]',
    g: '[gг69]', h: '[hн]', i: '[iіи1!|]', j: '[jј]', k: '[kк]', l: '[lл1|]',
    m: '[mм]', n: '[nн]', o: '[oо0]', p: '[pпр]', q: '[q]', r: '[rр]',
    s: '[sсш$5]', t: '[tт7+]', u: '[uу]', v: '[vв]', w: '[wш]', x: '[xх]',
    y: '[yу]', z: '[zз2]'
};

const RAZDVAJACI = '[\\s._\\-*!?]*';
const CIRILICNE_SPOJENICE = {
    dj: '[đђ]',
    lj: '[љ]',
    nj: '[њ]',
    dz: '[џ]'
};

function ukloniDijakritike(tekst) {
    return String(tekst || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'dj')
        .replace(/Đ/g, 'dj');
}

function normalizujIzraz(izraz) {
    return ukloniDijakritike(izraz)
        .toLocaleLowerCase('sr')
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function obrazacZaIzraz(izraz) {
    const normalizovan = normalizujIzraz(izraz);
    if (!normalizovan || normalizovan.length < 2) return null;

    let telo = '';
    for (let indeks = 0; indeks < normalizovan.length; indeks += 1) {
        const spojenica = normalizovan.slice(indeks, indeks + 2);
        if (CIRILICNE_SPOJENICE[spojenica]) {
            const prviZnak = ZAMENE_SLOVA[spojenica[0]] || spojenica[0];
            const drugiZnak = ZAMENE_SLOVA[spojenica[1]] || spojenica[1];
            telo += `(?:${prviZnak}${RAZDVAJACI}${drugiZnak}|${CIRILICNE_SPOJENICE[spojenica]})${RAZDVAJACI}`;
            indeks += 1;
            continue;
        }

        const znak = normalizovan[indeks];
        if (znak === ' ') {
            telo += RAZDVAJACI;
            continue;
        }
        telo += `${ZAMENE_SLOVA[znak] || znak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${RAZDVAJACI}`;
    }

    // Granice sprečavaju lažno maskiranje dela obične reči, npr. "ass" u "class".
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${telo})(?=$|[^\\p{L}\\p{N}])`, 'giu');
}

function napraviPravila(dodatniIzrazi = []) {
    const jedinstveni = [...new Set([...OSNOVNI_IZRAZI, ...dodatniIzrazi]
        .map(normalizujIzraz)
        .filter(Boolean))]
        .sort((a, b) => b.length - a.length);

    return jedinstveni
        .map(izraz => ({ izraz, obrazac: obrazacZaIzraz(izraz) }))
        .filter(pravilo => pravilo.obrazac);
}

function maskirajNeprimerenTekst(tekst, dodatniIzrazi = []) {
    let rezultat = String(tekst || '');
    let pronadjeno = false;

    napraviPravila(dodatniIzrazi).forEach(({ obrazac }) => {
        rezultat = rezultat.replace(obrazac, (poklapanje, pocetak, pogodjeniIzraz) => {
            pronadjeno = true;
            const zavrsniRazdvajaci = pogodjeniIzraz.match(/[\s._\-*!?]+$/u)?.[0] || '';
            return `${pocetak || ''}***${zavrsniRazdvajaci}`;
        });
    });

    return { tekst: rezultat, maskirano: pronadjeno };
}

module.exports = {
    maskirajNeprimerenTekst,
    normalizujIzraz,
    napraviPravila
};
