// Posebna poruka uz red Država. Lokalizovani nazivi Kosova nisu tačni odgovori.
const KosovoPorukaManager = {
    vremePreRezimea: 1900,
    normalizovaniOblici: null,

    // Rezervni oblici za najzastupljenija pisma. Dodatni nazivi se dobijaju iz
    // ugrađenih lokalizacija uređaja preko Intl.DisplayNames.
    rezervniOblici: [
        'Kosovo', 'Kosova', 'Kosovë', 'Kosowo', 'Koszovó', 'Kosovas', 'Kossovo', 'Kossowo',
        'Косово', 'Косова', 'Κοσσυφοπέδιο', 'Κόσοβο', '科索沃', 'コソボ', '코소보',
        'كوسوفو', 'کوسوو', 'קוסובו', 'კოსოვო', 'Կոսովո', 'कोसोवो', 'কসোভো',
        'கொசோவோ', 'కొసోవో', 'ಕೊಸೊವೊ', 'കൊസോവോ', 'โคโซโว', 'คอซอวอ',
        'កូសូវ៉ូ', 'ຄໍໂຊໂວ'
    ],

    // ISO 639-1 jezici i nekoliko široko korišćenih kompatibilnih oznaka.
    jeziciZaLokalizaciju: (
        'aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de ' +
        'dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ' +
        'ig ii ik in io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv ' +
        'mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ' +
        'ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ' +
        'ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu sh iw'
    ).split(' '),

    normalizujNaziv: function(vrednost) {
        if (!vrednost) return '';

        const tekst = typeof BazaPodataka !== 'undefined'
            ? BazaPodataka.presloviULatinicu(String(vrednost).trim().toUpperCase())
            : String(vrednost).trim().toUpperCase();

        return tekst
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .replace(/[^\p{L}\p{N}]/gu, '');
    },

    pripremiOblike: function() {
        if (this.normalizovaniOblici) return;

        this.normalizovaniOblici = new Set(
            this.rezervniOblici.map(oblik => this.normalizujNaziv(oblik)).filter(Boolean)
        );

        if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return;

        this.jeziciZaLokalizaciju.forEach(jezik => {
            try {
                if (Intl.DisplayNames.supportedLocalesOf([jezik]).length === 0) return;

                const naziv = new Intl.DisplayNames([jezik], { type: 'region' }).of('XK');
                const normalizovan = naziv && naziv !== 'XK' ? this.normalizujNaziv(naziv) : '';
                if (normalizovan) this.normalizovaniOblici.add(normalizovan);
            } catch (_) {
                // Uređaj može da nema podatke za pojedine ređe lokalizacije.
            }
        });
    },

    jeKosovoOdgovor: function(odgovor) {
        this.pripremiOblike();
        return this.normalizovaniOblici.has(this.normalizujNaziv(odgovor));
    },

    dodajDelovePoruke: function(poruka) {
        const prviDeo = document.createElement('span');
        prviDeo.className = 'kosovo-poruka-tekst';
        prviDeo.textContent = 'JE';

        const srce = document.createElement('span');
        srce.className = 'kosovo-srce-zastava';
        srce.setAttribute('aria-hidden', 'true');

        const drugiDeo = document.createElement('span');
        drugiDeo.className = 'kosovo-poruka-tekst';
        drugiDeo.textContent = 'SRBIJE';

        poruka.append(prviDeo, srce, drugiDeo);
    },

    izmeriUnosSaRazmakom: function(input, stil) {
        if (typeof document === 'undefined' || !document.body) return String(input?.value || '').length * 9;

        const merac = document.createElement('span');
        merac.textContent = `${input.value} `;
        Object.assign(merac.style, {
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            visibility: 'hidden',
            pointerEvents: 'none',
            whiteSpace: 'pre',
            font: stil.font,
            letterSpacing: stil.letterSpacing,
            textTransform: stil.textTransform
        });
        document.body.appendChild(merac);
        const sirina = merac.getBoundingClientRect().width;
        merac.remove();
        return sirina;
    },

    postaviPosleUnosa: function(input, poruka, grupa, rtl) {
        const stil = getComputedStyle(input);
        const inputOkvir = input.getBoundingClientRect();
        const grupaOkvir = grupa.getBoundingClientRect();
        const unosIRazmak = this.izmeriUnosSaRazmakom(input, stil);
        const broj = vrednost => Number.parseFloat(vrednost) || 0;

        poruka.style.top = `${inputOkvir.top - grupaOkvir.top + (inputOkvir.height / 2)}px`;

        if (rtl) {
            const doDesneIviceSadrzaja = grupaOkvir.right - inputOkvir.right
                + broj(stil.borderRightWidth)
                + broj(stil.paddingRight);
            poruka.style.left = 'auto';
            poruka.style.right = `${doDesneIviceSadrzaja + unosIRazmak}px`;
        } else {
            const doLeveIviceSadrzaja = inputOkvir.left - grupaOkvir.left
                + broj(stil.borderLeftWidth)
                + broj(stil.paddingLeft);
            poruka.style.right = 'auto';
            poruka.style.left = `${doLeveIviceSadrzaja + unosIRazmak - input.scrollLeft}px`;
        }
    },

    napraviPoruku: function(input) {
        const grupa = input?.closest('.input-group');
        if (!grupa) return null;

        let poruka = grupa.querySelector('.kosovo-poruka-u-redu');
        if (poruka) return poruka;

        poruka = document.createElement('div');
        poruka.className = 'kosovo-poruka-u-redu';
        poruka.setAttribute('aria-live', 'polite');
        this.dodajDelovePoruke(poruka);
        grupa.appendChild(poruka);
        return poruka;
    },

    dodajURezime: function(kontejner) {
        if (!kontejner || typeof document === 'undefined') return 0;

        let brojDodatih = 0;
        kontejner.querySelectorAll('.kosovo-rezime-vrednost[data-kategorija="drzava"]').forEach(vrednost => {
            if (vrednost.querySelector('.kosovo-poruka-rezime')) return;

            const odgovor = vrednost.querySelector('.kosovo-rezime-odgovor')?.textContent || '';
            if (!this.jeKosovoOdgovor(odgovor)) return;

            const poruka = document.createElement('span');
            poruka.className = 'kosovo-poruka-rezime';
            poruka.setAttribute('aria-label', 'je Srbije');
            this.dodajDelovePoruke(poruka);

            // Tekstualni čvor daje tačno jedan normalan razmak posle odgovora.
            vrednost.append(document.createTextNode(' '), poruka);
            brojDodatih++;
        });

        return brojDodatih;
    },

    sakrijURedu: function(input) {
        const grupa = input?.closest('.input-group');
        if (!grupa) return;

        grupa.classList.remove('ima-kosovo-poruku');
        grupa.querySelector('.kosovo-poruka-u-redu')?.classList.remove('active');
    },

    osveziZaUnos: function(input) {
        if (!input || input.dataset.kategorija !== 'drzava') return false;
        if (this.jeKosovoOdgovor(input.value)) return this.ponoviURedu(input);

        this.sakrijURedu(input);
        return false;
    },

    ponoviURedu: function(input) {
        if (!input || input.dataset.kategorija !== 'drzava' || !this.jeKosovoOdgovor(input.value)) return false;

        const poruka = this.napraviPoruku(input);
        const grupa = input.closest('.input-group');
        if (!poruka || !grupa) return false;

        const smerTeksta = typeof getComputedStyle === 'function'
            ? getComputedStyle(input).direction
            : 'ltr';
        const rtl = smerTeksta === 'rtl';
        const duzinaPutanje = Math.min(64, Math.max(38, Math.round(input.clientWidth * 0.16)));

        grupa.classList.add('ima-kosovo-poruku');
        poruka.classList.toggle('kosovo-poruka-rtl', rtl);
        this.postaviPosleUnosa(input, poruka, grupa, rtl);
        poruka.style.setProperty('--kosovo-let-x', `${rtl ? -duzinaPutanje : duzinaPutanje}px`);
        poruka.setAttribute('aria-label', 'je Srbije');
        poruka.classList.remove('active');
        void poruka.offsetWidth;
        poruka.classList.add('active');
        return true;
    },

    inicijalizuj: function() {
        this.pripremiOblike();

        document.addEventListener('input', event => {
            const input = event.target;
            if (input instanceof HTMLInputElement) this.osveziZaUnos(input);
        });

        document.querySelectorAll('.game-input[data-kategorija="drzava"]').forEach(input => this.osveziZaUnos(input));
    }
};

if (typeof window !== 'undefined') window.KosovoPorukaManager = KosovoPorukaManager;
if (typeof document !== 'undefined') {
    try {
        KosovoPorukaManager.inicijalizuj();
    } catch (greska) {
        console.warn('Višejezična Kosovo poruka nije potpuno inicijalizovana:', greska);
    }
}
if (typeof module !== 'undefined' && module.exports) module.exports = KosovoPorukaManager;
