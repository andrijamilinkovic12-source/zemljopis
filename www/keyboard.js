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
                    // NOVO: Blokira otvaranje tastature ako je runda gotova i polje zaključano!
                    if (input.disabled) return; 

                    this.setActiveInput(input);
                    this.showKeyboard();
                });
                
                // Označavamo da je polje već povezano sa tastaturom
                input.setAttribute('data-kb-bound', 'true');
            }
        });
    },

    setActiveInput: function(input) {
        if (this.activeInput) {
            this.activeInput.classList.remove('active-keyboard-input');
        }
        this.activeInput = input;
        this.activeInput.classList.add('active-keyboard-input');
        
        // Skroluj polje da bude vidljivo iznad tastature
        setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
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
        // Pronađi sledeće slobodno polje
        const inputs = Array.from(document.querySelectorAll('.game-input'));
        const currentIndex = inputs.indexOf(this.activeInput);
        
        if (currentIndex > -1 && currentIndex < inputs.length - 1) {
            let nextInput = inputs[currentIndex + 1];
            // NOVO: Preskače polje i gasi tastaturu ako je sledeće polje zaključano
            if (!nextInput.disabled) {
                this.setActiveInput(nextInput);
            } else {
                this.hideKeyboard();
            }
        } else {
            this.hideKeyboard();
        }
    },

    togglePismo: function() {
        this.pismo = this.pismo === 'latinica' ? 'cirilica' : 'latinica';
        this.renderKeyboard();
    },

    showKeyboard: function() {
        document.getElementById('custom-keyboard').classList.add('active');
        // Povećaj padding na dnu containera da tastatura ne prekrije polja
        document.querySelector('.inputs-container').style.paddingBottom = '260px';
    },

    hideKeyboard: function() {
        document.getElementById('custom-keyboard').classList.remove('active');
        if (this.activeInput) {
            this.activeInput.classList.remove('active-keyboard-input');
            this.activeInput = null;
        }
        
        // Vraćamo padding u zavisnosti od ekrana (ako postoji inputs-container)
        const container = document.querySelector('.inputs-container');
        if (container) {
            container.style.paddingBottom = '75px';
        }
    }
};

// Inicijalizuj nakon učitavanja DOM-a
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { KeyboardManager.init(); }, 500); // Malo kašnjenje da se učitaju podešavanja
});