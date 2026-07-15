// Posebna poruka uz red Država. „Kosovo“ se može uneti, ali nije tačan odgovor.
const KosovoPorukaManager = {
    vremePreRezimea: 1900,

    jeKosovoOdgovor: function(odgovor) {
        if (!odgovor) return false;

        const latinica = typeof BazaPodataka !== 'undefined'
            ? BazaPodataka.presloviULatinicu(String(odgovor).trim().toUpperCase())
            : String(odgovor).trim().toUpperCase();

        return latinica.replace(/\s+/g, ' ') === 'KOSOVO';
    },

    napraviPoruku: function(input) {
        const grupa = input?.closest('.input-group');
        if (!grupa) return null;

        let poruka = grupa.querySelector('.kosovo-poruka-u-redu');
        if (poruka) return poruka;

        poruka = document.createElement('div');
        poruka.className = 'kosovo-poruka-u-redu';
        poruka.setAttribute('aria-live', 'polite');

        const prviDeo = document.createElement('span');
        prviDeo.className = 'kosovo-poruka-tekst';
        prviDeo.textContent = 'KOSOVO JE';

        const srce = document.createElement('span');
        srce.className = 'kosovo-srce-zastava';
        srce.setAttribute('aria-hidden', 'true');

        const drugiDeo = document.createElement('span');
        drugiDeo.className = 'kosovo-poruka-tekst';
        drugiDeo.textContent = 'SRBIJE';

        poruka.append(prviDeo, srce, drugiDeo);
        grupa.appendChild(poruka);
        return poruka;
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

        grupa.classList.add('ima-kosovo-poruku');
        poruka.classList.remove('active');
        void poruka.offsetWidth;
        poruka.classList.add('active');
        return true;
    },

    inicijalizuj: function() {
        document.addEventListener('input', event => {
            const input = event.target;
            if (input instanceof HTMLInputElement) this.osveziZaUnos(input);
        });

        document.querySelectorAll('.game-input[data-kategorija="drzava"]').forEach(input => this.osveziZaUnos(input));
    }
};

KosovoPorukaManager.inicijalizuj();
window.KosovoPorukaManager = KosovoPorukaManager;
