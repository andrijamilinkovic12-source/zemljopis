(function(window) {
    const kategorije = {
        drzava: {
            naziv: 'Država',
            src: 'assets/category-drzava-clay-3d.png',
            fallbackSrc: 'assets/category-drzava.svg'
        },
        grad: {
            naziv: 'Grad',
            src: 'assets/category-grad-clay-3d.png',
            fallbackSrc: 'assets/category-grad.svg'
        },
        reka: {
            naziv: 'Reka',
            src: 'assets/category-reka-clay-3d.png',
            fallbackSrc: 'assets/category-reka.svg'
        },
        planina: {
            naziv: 'Planina',
            src: 'assets/category-planina-clay-3d.png',
            fallbackSrc: 'assets/category-planina.svg'
        },
        biljka: {
            naziv: 'Biljka',
            src: 'assets/category-biljka-clay-3d.png',
            fallbackSrc: 'assets/category-biljka.svg'
        },
        zivotinja: {
            naziv: 'Životinja',
            src: 'assets/category-zivotinja-clay-3d.png',
            fallbackSrc: 'assets/category-zivotinja.svg'
        },
        predmet: {
            naziv: 'Predmet',
            src: 'assets/category-predmet-clay-3d.png',
            fallbackSrc: 'assets/category-predmet.svg'
        }
    };

    function escapeHtml(vrednost) {
        return String(vrednost === null || typeof vrednost === 'undefined' ? '' : vrednost)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatirajTekst(tekst) {
        if (
            window.PodesavanjaManager
            && typeof window.PodesavanjaManager.formatirajTekst === 'function'
        ) {
            return window.PodesavanjaManager.formatirajTekst(tekst);
        }
        return tekst === null || typeof tekst === 'undefined' ? '' : String(tekst);
    }

    function podaci(id) {
        return kategorije[String(id || '').toLowerCase()] || null;
    }

    function naziv(id, fallback) {
        const kategorija = podaci(id);
        return kategorija ? kategorija.naziv : (fallback || id || '');
    }

    function iconHtml(id, opcije = {}) {
        const kategorija = podaci(id);
        if (!kategorija) return '';

        const safeId = String(id || '').toLowerCase();
        const klasa = [
                'category-icon',
                'category-icon-slot',
                `category-icon--${safeId}`,
                opcije.iconClass || ''
            ]
            .filter(Boolean)
            .join(' ');

        return `<span class="${escapeHtml(klasa)}" data-category-id="${escapeHtml(safeId)}"><img class="category-icon-img" src="${escapeHtml(kategorija.src)}" alt="" aria-hidden="true" decoding="async"></span>`;
    }

    function labelHtml(id, fallback, opcije = {}) {
        const kategorija = podaci(id);
        const labela = formatirajTekst(naziv(id, fallback));
        const klasa = opcije.labelClass || 'category-label';
        const fallbackIkonica = !kategorija && opcije.fallbackIcon
            ? `<span class="category-icon category-icon--emoji" aria-hidden="true">${escapeHtml(opcije.fallbackIcon)}</span>`
            : '';
        const ikonica = kategorija ? iconHtml(id, opcije) : fallbackIkonica;

        return `<span class="${escapeHtml(klasa)}">${ikonica}<span class="category-label-text">${escapeHtml(labela)}</span></span>`;
    }

    function enhanceLabels(root = document) {
        root.querySelectorAll('[data-category-label]').forEach(label => {
            const id = label.getAttribute('data-category-label');
            const fallback = label.getAttribute('data-category-name') || label.textContent.trim();
            label.innerHTML = labelHtml(id, fallback, {
                labelClass: 'category-label category-label--input'
            });
        });
    }

    window.CategoryIcons = {
        categories: kategorije,
        escapeHtml,
        formatirajTekst,
        podaci,
        naziv,
        iconHtml,
        labelHtml,
        enhanceLabels
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => enhanceLabels());
    } else {
        enhanceLabels();
    }
})(window);
