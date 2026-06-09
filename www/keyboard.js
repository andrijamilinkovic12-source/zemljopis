// keyboard.js - Custom tastatura za igru ZEMLJOPIS

const KeyboardManager = {
    activeInput: null,
    pismo: 'latinica', 
    
    // Optimizovan srpski QWERTZ raspored sa svih 30 slova
    latinLayout: [
        ['LJ', 'NJ', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Š'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Č', 'Ć'],
        ['{lang}', 'DŽ', 'C', 'V', 'B', 'N', 'M', 'Đ', 'Ž', '{backspace}'],
        ['{space}', '{enter}']
    ],
    cyrillicLayout: [
        ['Љ', 'Њ', 'Е', 'Р', 'Т', 'З', 'У', 'И', 'О', 'П', 'Ш'],
        ['А', 'С', 'Д', 'Ф', 'Г', 'Х', 'Ј', 'К', 'Л', 'Ч', 'Ћ'],
        ['{lang}', 'Џ', 'Ц', 'В', 'Б', 'Н', 'М', 'Ђ', 'Ж', '{backspace}'],
        ['{space}', '{enter}']
    ],

    init: function() {
        if (typeof PodesavanjaManager !== 'undefined') {
            this.pismo = PodesavanjaManager.postavke.pismo;
        }
        this.renderKeyboard();
        this.bindInputs();

        // Sakrij tastaturu klikom van nje i polja
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#custom-keyboard') && !e.target.classList.contains('game-input')) {
                this.hideKeyboard();
            }
        });
    },

    bindInputs: function() {
        const inputs = document.querySelectorAll('.game-input');
        inputs.forEach(input => {
            // Sprečavamo duplo vezivanje na ista polja
            if (!input.hasAttribute('data-kb-bound')) {
                // Readonly sprečava nativnu tastaturu na telefonu
                input.setAttribute('readonly', 'readonly'); 
                
                input.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Blokira otvaranje tastature ako je runda gotova i polje zaključano!
                    if (input.disabled) return; 

                    this.setActiveInput(input);
                    this.showKeyboard();
                });
                
                // Označavamo da je polje već povezano sa tastaturom
                input.setAttribute('data-kb-bound', 'true');
            }
        });
    },

    getInputScope: function(input) {
        const screen = input ? input.closest('.screen') : document.querySelector('.screen.active');
        return screen || document;
    },

    getInputScrollContainer: function(input = this.activeInput) {
        if (input) {
            const dnevniContainer = input.closest('.dnevni-izazov-inputs');
            if (dnevniContainer) return dnevniContainer;

            const gameContainer = input.closest('.inputs-container');
            if (gameContainer) return gameContainer;
        }

        const activeScreen = document.querySelector('.screen.active');
        return activeScreen ? activeScreen.querySelector('.inputs-container, .dnevni-izazov-inputs') : null;
    },

    scrollInputIntoView: function(input) {
        setTimeout(() => {
            const container = this.getInputScrollContainer(input);
            if (!container || !input) return;

            const inputRect = input.getBoundingClientRect();
            const group = input.closest('.input-group');
            const groupRect = group ? group.getBoundingClientRect() : inputRect;
            const containerRect = container.getBoundingClientRect();
            const keyboard = document.getElementById('custom-keyboard');
            const keyboardRect = keyboard && keyboard.classList.contains('active') ? keyboard.getBoundingClientRect() : null;
            const visibleBottom = keyboardRect ? Math.min(containerRect.bottom, keyboardRect.top) : containerRect.bottom;
            const visibleHeight = Math.max(visibleBottom - containerRect.top, 80);
            const offsetInVisibleArea = Math.max((visibleHeight - groupRect.height) / 2, 8);
            const targetScroll = container.scrollTop + (groupRect.top - containerRect.top) - offsetInVisibleArea;

            container.scrollTo({
                top: Math.max(targetScroll, 0),
                behavior: 'smooth'
            });
        }, 50);
    },

    setActiveInput: function(input) {
        if (!input || input.disabled) return;

        if (this.activeInput && this.activeInput !== input) {
            this.activeInput.classList.remove('active-keyboard-input');
        }

        this.activeInput = input;
        this.activeInput.classList.add('active-keyboard-input');

        if (document.activeElement !== input) {
            try {
                input.focus({ preventScroll: true });
            } catch (e) {
                input.focus();
            }
        }
        
        this.scrollInputIntoView(input);
    },

    renderKeyboard: function() {
        const container = document.getElementById('custom-keyboard');
        container.innerHTML = '';
        
        const layout = this.pismo === 'cirilica' ? this.cyrillicLayout : this.latinLayout;

        layout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            
            row.forEach(key => {
                const keyEl = document.createElement('button');
                keyEl.className = 'kb-key';
                
                if (key === '{lang}') {
                    keyEl.classList.add('kb-special');
                    keyEl.innerText = this.pismo === 'cirilica' ? 'ABC' : 'АБВ';
                    keyEl.onclick = () => this.togglePismo();
                } else if (key === '{space}') {
                    keyEl.classList.add('kb-special', 'kb-space');
                    keyEl.innerHTML = '<i class="fa-solid fa-arrows-left-right"></i>';
                    keyEl.onclick = () => this.handleKeyPress(' ');
                } else if (key === '{backspace}') {
                    keyEl.classList.add('kb-special');
                    keyEl.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
                    keyEl.onclick = () => this.handleBackspace();
                } else if (key === '{enter}') {
                    keyEl.classList.add('kb-special', 'kb-enter');
                    keyEl.innerText = 'OK';
                    keyEl.onclick = () => this.handleEnter();
                } else {
                    keyEl.innerText = key;
                    keyEl.onclick = () => this.handleKeyPress(key);
                }
                
                rowEl.appendChild(keyEl);
            });
            container.appendChild(rowEl);
        });
    },

    handleKeyPress: function(char) {
        if (this.activeInput && !this.activeInput.disabled) {
            this.activeInput.value += char;
        }
    },

    handleBackspace: function() {
        if (this.activeInput && !this.activeInput.disabled) {
            this.activeInput.value = this.activeInput.value.slice(0, -1);
        }
    },

    handleEnter: function() {
        if (!this.activeInput) return;

        // Pronađi sledeće slobodno polje samo u aktivnom ekranu igre
        const scope = this.getInputScope(this.activeInput);
        const inputs = Array.from(scope.querySelectorAll('.game-input')).filter(input => !input.disabled);
        const currentIndex = inputs.indexOf(this.activeInput);
        
        if (currentIndex > -1 && currentIndex < inputs.length - 1) {
            this.setActiveInput(inputs[currentIndex + 1]);
            this.showKeyboard();
        } else {
            this.hideKeyboard();
        }
    },

    togglePismo: function() {
        this.pismo = this.pismo === 'latinica' ? 'cirilica' : 'latinica';
        this.renderKeyboard();
    },

    showKeyboard: function() {
        const kb = document.getElementById('custom-keyboard');
        if (kb) kb.classList.add('active');
        document.body.classList.add('keyboard-open');
        
        // Povećaj padding na dnu containera da tastatura ne prekrije polja
        const container = this.getInputScrollContainer();
        if (container) {
            const keyboardHeight = kb ? Math.ceil(kb.getBoundingClientRect().height || 260) : 260;
            container.style.paddingBottom = `${keyboardHeight + 24}px`;
        }
        if (this.activeInput) {
            setTimeout(() => this.scrollInputIntoView(this.activeInput), 80);
            setTimeout(() => this.scrollInputIntoView(this.activeInput), 320);
        }
    },

    hideKeyboard: function() {
        const kb = document.getElementById('custom-keyboard');
        if (kb) kb.classList.remove('active');
        document.body.classList.remove('keyboard-open');

        const container = this.getInputScrollContainer();
        
        if (this.activeInput) {
            this.activeInput.classList.remove('active-keyboard-input');
            this.activeInput.blur(); // Agresivno ukidamo fokus sa polja
            this.activeInput = null;
        }
        
        // Vraćamo padding u zavisnosti od ekrana
        if (container) {
            container.style.paddingBottom = container.classList.contains('dnevni-izazov-inputs') ? '250px' : '75px';
        }
    }
};

// Inicijalizuj nakon učitavanja DOM-a
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { KeyboardManager.init(); }, 500); // Malo kašnjenje da se učitaju podešavanja
});
