// podesavanja.js - Upravljanje opcijama, zvukom i korisničkim podacima

const PodesavanjaManager = {
    postavke: {
        nadimak: "Gost",
        zvuk: true,
        tema: "tamna",
        pismo: "latinica" // Podrazumevano pismo
    },

    // NAŠI NOVI VIRTUALNI DJ PLEJERI ZA CROSSFADE (NEPRIMETAN PRELAZ)
    audio1: null,
    audio2: null,
    aktivniAudio: 1,

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_postavke');
        if (sacuvano) {
            this.postavke = JSON.parse(sacuvano);
            // Zbog starih sačuvanih verzija
            if (!this.postavke.pismo) this.postavke.pismo = "latinica";
        }
        
        this.primeniPostavkeGlobalno();

        // Ako je uključena ćirilica, odmah prevodi sve na ekranu i aktiviraj posmatrača
        if (this.postavke.pismo === "cirilica") {
            this.primeniCirilicu(document.body);
            this.pokreniCirilicaPosmatraca();
        }

        // Učitavanje izabrane teme na body element
        document.body.setAttribute('data-tema', this.postavke.tema || 'tamna');

        // Pokušaj puštanja muzike ako je uključena (verovatno će biti blokirano dok korisnik ne klikne)
        this.upravljajMuzikom();

        // Osluškujemo bilo koju interakciju da bismo zaobišli zabranu pregledača
        const pokreniMuzikuNaInterakciju = () => {
            if (this.postavke.zvuk) {
                let trenutni = this.aktivniAudio === 1 ? this.audio1 : this.audio2;
                if (trenutni && trenutni.paused) {
                    trenutni.play().catch(e => console.log("Nije moguće pustiti muziku:", e));
                }
            }
            // Uklanjamo listenere nakon prve interakcije kako se ne bi gomilali
            document.removeEventListener('click', pokreniMuzikuNaInterakciju);
            document.removeEventListener('touchstart', pokreniMuzikuNaInterakciju);
        };

        document.addEventListener('click', pokreniMuzikuNaInterakciju);
        document.addEventListener('touchstart', pokreniMuzikuNaInterakciju);
    },

    upravljajMuzikom: function() {
        // Inicijalizacija plejera pri prvom pokretanju
        if (!this.audio1) {
            this.audio1 = document.getElementById('bg-music');
            if (!this.audio1) return;

            // Pronalazimo putanju do pesme i pravimo drugog plejera (klona)
            let izvor = this.audio1.querySelector('source') ? this.audio1.querySelector('source').src : this.audio1.src;
            this.audio2 = new Audio(izvor);
            this.audio2.preload = 'auto';

            const vremePreklapanja = 2; // 2 sekunde pred kraj počinje prelaz
            const maxJacina = 0.3;      // Maksimalna jačina tvoje zen muzike

            // Magija preklapanja (Crossfade)
            const proveriKraj = (trenutni, sledeci) => {
                // Ako je pesma pri kraju i sledeća je pauzirana
                if (trenutni.duration && trenutni.currentTime >= trenutni.duration - vremePreklapanja && sledeci.paused) {
                    if (this.postavke.zvuk) {
                        sledeci.currentTime = 0; 
                        sledeci.volume = 0; // Kreće utišano
                        sledeci.play().catch(e => console.log(e));

                        // Postepeno preklapanje (traje 1 sekundu)
                        let koraci = 20;
                        let intervalVreme = 1000 / koraci; // 50ms po koraku
                        let step = maxJacina / koraci;

                        let fadeInterval = setInterval(() => {
                            if (trenutni.volume - step >= 0) trenutni.volume -= step; // Stišaj staru
                            if (sledeci.volume + step <= maxJacina) sledeci.volume += step; // Pojačaj novu

                            koraci--;
                            if (koraci <= 0) {
                                clearInterval(fadeInterval);
                                trenutni.pause(); // Gasi staru potpuno
                                trenutni.volume = maxJacina; // Resetuj za sledeći krug
                                sledeci.volume = maxJacina;
                                this.aktivniAudio = this.aktivniAudio === 1 ? 2 : 1; // Promeni glavnog plejera
                            }
                        }, intervalVreme);
                    }
                }
            };

            // Osluškujemo napredak pesme stalno dok svira
            this.audio1.addEventListener('timeupdate', () => { if (this.aktivniAudio === 1) proveriKraj(this.audio1, this.audio2); });
            this.audio2.addEventListener('timeupdate', () => { if (this.aktivniAudio === 2) proveriKraj(this.audio2, this.audio1); });
        }

        // Standardna kontrola on/off na dugme
        let aktuelniPlej = this.aktivniAudio === 1 ? this.audio1 : this.audio2;
        let pauzirani = this.aktivniAudio === 1 ? this.audio2 : this.audio1;

        if (this.postavke.zvuk) {
            if (aktuelniPlej.paused) {
                aktuelniPlej.volume = 0.3;
                aktuelniPlej.play().catch(e => console.log("Čekam interakciju..."));
            }
        } else {
            aktuelniPlej.pause();
            pauzirani.pause();
        }
    },

    otvoriEkran: function() {
        document.getElementById('postavke-nadimak').value = this.postavke.nadimak;
        
        this.azurirajDugmeZvuk();
        this.azurirajDugmadTeme();
        this.azurirajDugmePismo();
        
        UIManager.prikaziEkran('podesavanja-screen');
    },

    sacuvajNadimak: function() {
        const unos = document.getElementById('postavke-nadimak').value.trim();
        const inputPolje = document.getElementById('postavke-nadimak');

        // Promenjen uslov na <= 20
        if (unos.length >= 2 && unos.length <= 20) {
            this.postavke.nadimak = unos;
            this.snimiULokalnuMemoriju();
            this.primeniPostavkeGlobalno();
            
            inputPolje.style.borderColor = "#38ef7d";
            setTimeout(() => inputPolje.style.borderColor = "rgba(255, 255, 255, 0.1)", 1500);
            
            UIManager.prikaziObavestenje("Uspešno", `Tvoj nadimak je promenjen!`, null, "U redu");
        } else {
            inputPolje.style.borderColor = "#ff416c";
            setTimeout(() => inputPolje.style.borderColor = "rgba(255, 255, 255, 0.1)", 1500);
            // Promenjen tekst obaveštenja
            UIManager.prikaziObavestenje("Upozorenje", "Nadimak mora imati između 2 i 20 slova!", null, "Pokušaj ponovo");
        }
    },

    toggleZvuk: function() {
        this.postavke.zvuk = !this.postavke.zvuk;
        this.snimiULokalnuMemoriju();
        this.azurirajDugmeZvuk();
        this.upravljajMuzikom(); // Pozivamo funkciju za muziku
    },

    azurirajDugmeZvuk: function() {
        const btn = document.getElementById('btn-zvuk');
        const statusTekst = document.getElementById('zvuk-status');
        const ikona = document.getElementById('ikona-zvuk');

        if (btn && statusTekst && ikona) {
            if (this.postavke.zvuk) {
                statusTekst.innerText = this.postavke.pismo === "cirilica" ? "УКЉ" : "UKLJ";
                statusTekst.style.color = "#38ef7d";
                btn.style.borderColor = "rgba(56, 239, 125, 0.4)";
                btn.style.background = "rgba(56, 239, 125, 0.05)";
                ikona.className = "fa-solid fa-volume-high";
            } else {
                statusTekst.innerText = this.postavke.pismo === "cirilica" ? "ИСКЉ" : "ISKLJ";
                statusTekst.style.color = "#ff416c";
                btn.style.borderColor = "rgba(255, 65, 108, 0.4)";
                btn.style.background = "rgba(255, 65, 108, 0.05)";
                ikona.className = "fa-solid fa-volume-xmark";
            }
        }
    },

    togglePismo: function() {
        this.postavke.pismo = this.postavke.pismo === "latinica" ? "cirilica" : "latinica";
        this.snimiULokalnuMemoriju();
        
        let poruka = this.postavke.pismo === "cirilica" 
            ? "Апликација ће се поново учитати како би се применила Ћирилица." 
            : "Aplikacija će se ponovo učitati kako bi se primenila Latinica.";
            
        UIManager.prikaziObavestenje("Pismo promenjeno", poruka, () => location.reload(), "U redu");
    },

    azurirajDugmePismo: function() {
        const statusTekst = document.getElementById('pismo-status');
        if (statusTekst) {
            statusTekst.innerText = this.postavke.pismo === "cirilica" ? "ЋИРИЛИЦА" : "LATINICA";
            statusTekst.style.color = this.postavke.pismo === "cirilica" ? "#38ef7d" : "#a0aec0";
        }
    },

    // Glavni engine za prevod na ćirilicu
    primeniCirilicu: function(element) {
        const mapa = {
            "nj":"њ", "Nj":"Њ", "NJ":"Њ", "lj":"љ", "Lj":"Љ", "LJ":"Љ", "dž":"џ", "Dž":"Џ", "DŽ":"Џ",
            "a":"а", "b":"б", "v":"в", "g":"г", "d":"д", "đ":"ђ", "e":"е", "ž":"ж", "z":"з", "i":"и", 
            "j":"ј", "k":"к", "l":"л", "m":"м", "n":"н", "o":"о", "p":"п", "r":"р", "s":"с", "t":"т", 
            "ć":"ћ", "u":"у", "f":"ф", "h":"х", "c":"ц", "č":"ч", "š":"ш",
            "A":"А", "B":"Б", "V":"В", "G":"Г", "D":"Д", "Đ":"Ђ", "E":"Е", "Ž":"Ж", "Z":"З", "I":"И", 
            "J":"Ј", "K":"К", "L":"Л", "M":"М", "N":"Н", "O":"О", "P":"П", "R":"Р", "S":"С", "T":"Т", 
            "Ć":"Ћ", "U":"У", "F":"Ф", "H":"Х", "C":"Ц", "Č":"Ч", "Š":"Ш"
        };
        const regex = /nj|Nj|NJ|lj|Lj|LJ|dž|Dž|DŽ|[a-zđžćčšA-ZĐŽĆČŠ]/g;

        function obradi(cvor) {
            if (cvor.nodeType === 3) {
                // NOVO: Specifične engleske reči prevodimo ručno u bloku pre pojedinačnih slova
                let tekst = cvor.nodeValue;
                tekst = tekst.replace(/MULTIPLAYER/g, "МУЛТИПЛЕЈЕР");
                tekst = tekst.replace(/Multiplayer/g, "Мултиплејер");

                // Zatim prevodimo ostatak teksta slovo po slovo
                cvor.nodeValue = tekst.replace(regex, m => mapa[m] || m);
            } else if (cvor.nodeType === 1) {
                if (cvor.tagName !== "SCRIPT" && cvor.tagName !== "STYLE" && cvor.id !== "room-code-input") {
                    if (cvor.hasAttribute("placeholder")) {
                        let placeholderText = cvor.getAttribute("placeholder");
                        placeholderText = placeholderText.replace(/MULTIPLAYER/g, "МУЛТИПЛЕЈЕР");
                        placeholderText = placeholderText.replace(/Multiplayer/g, "Мултиплејер");

                        cvor.setAttribute("placeholder", placeholderText.replace(regex, m => mapa[m] || m));
                    }
                    cvor.childNodes.forEach(obradi);
                }
            }
        }
        obradi(element);
    },

    pokreniCirilicaPosmatraca: function() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => this.primeniCirilicu(node));
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    promeniTemu: function(novaTema) {
        // PROVERA VLASNIŠTVA U RIZNICI
        if (typeof RiznicaManager !== 'undefined') {
            const temaPodaci = RiznicaManager.podaci.teme.find(t => t.id === 'tema_' + novaTema);
            
            if (temaPodaci && !temaPodaci.kupljeno) {
                UIManager.prikaziObavestenje(
                    "Tema je zaključana", 
                    `Ova tema mora prvo da se otključa u <b>Riznici</b>.<br><br>Cena: <i class="fa-solid fa-coins" style="color:#f5af19;"></i> <b style="color:#f5af19;">${temaPodaci.cena}</b>`, 
                    () => { 
                        UIManager.prikaziEkran('riznica-screen'); 
                        RiznicaManager.promeniKategoriju('teme'); 
                    }, 
                    "Idi u Riznicu"
                );
                return; // Prekida se menjanje teme
            }

            // Ako je sve u redu, ažuriramo i Riznicu da piše "Opremljeno"
            RiznicaManager.podaci.teme.forEach(t => t.opremljeno = false);
            if (temaPodaci) temaPodaci.opremljeno = true;
            RiznicaManager.snimiStanje();
        }

        // PRIMENA TEME
        this.postavke.tema = novaTema;
        this.snimiULokalnuMemoriju();
        this.azurirajDugmadTeme();
        
        document.body.setAttribute('data-tema', novaTema);
        
        UIManager.prikaziObavestenje(
            "Tema primenjena", 
            `Uspešno ste aktivirali temu: <b style="color:#38bdf8; text-transform:uppercase;">${novaTema}</b>.`, 
            null, 
            "Super"
        );
    },

    azurirajDugmadTeme: function() {
        const naziviTema = { 'tamna': 'Tamna', 'svetla': 'Svetla', 'neon': 'Neon', 'okean': 'Okean', 'zlatna': 'Zlatna' };
        const teme = ['tamna', 'svetla', 'neon', 'okean', 'zlatna'];
        
        teme.forEach(tema => {
            const btn = document.getElementById(`btn-tema-${tema}`);
            if (btn) {
                let kupljeno = true;
                if (typeof RiznicaManager !== 'undefined') {
                    const temaPodaci = RiznicaManager.podaci.teme.find(t => t.id === 'tema_' + tema);
                    if (temaPodaci) kupljeno = temaPodaci.kupljeno;
                }

                // Dodavanje ikonice katanca ako tema nije otključana
                btn.innerHTML = naziviTema[tema] + (!kupljeno ? ' <i class="fa-solid fa-lock" style="font-size:0.7rem; margin-left:4px;"></i>' : '');

                if (this.postavke.tema === tema) {
                    btn.style.background = "rgba(56,239,125,0.2)";
                    btn.style.borderColor = "#38ef7d";
                    btn.style.color = "#38ef7d";
                    btn.style.fontWeight = "800";
                } else {
                    btn.style.background = "rgba(255,255,255,0.05)";
                    btn.style.borderColor = "transparent";
                    btn.style.color = !kupljeno ? "rgba(160,174,192,0.5)" : "#a0aec0";
                    btn.style.fontWeight = "600";
                }
            }
        });
    },

    primeniPostavkeGlobalno: function() {
        const myPlayerName = document.getElementById('my-player-name');
        if (myPlayerName) {
            myPlayerName.innerHTML = `👤 ${this.postavke.nadimak}`;
        }
    },

    snimiULokalnuMemoriju: function() {
        localStorage.setItem('zemljopis_postavke', JSON.stringify(this.postavke));
    },

    prikaziPravila: function() {
        const tekst = `
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
                <b style="color:#38ef7d;">1. CILJ IGRE:</b> Upiši po jedan tačan pojam za svaku kategoriju koji počinje zadatim slovom.<br><br>
                <b style="color:#38ef7d;">2. BODOVANJE (Multiplayer):</b><br>
                <span style="color:#38ef7d; font-weight:800;">20 pts</span> - Tvoj pojam je jedinstven i tačan.<br>
                <span style="color:#f5af19; font-weight:800;">10 pts</span> - Tvoj pojam je tačan, ali su i drugi upisali tačne (ali različite) pojmove.<br>
                <span style="color:#a0aec0; font-weight:800;">5 pts</span> - Upišeš potpuno isti pojam kao i tvoj protivnik.<br><br>
                <b style="color:#38ef7d;">3. RUNDA:</b> Traje tačno 2 minuta (120 sekundi).
            </div>
        `;
        UIManager.prikaziObavestenje("📖 Pravila Igre", tekst, null, "Razumem");
    },

    prikaziObavestenja: function() {
        const tekst = `
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
                <b style="color:#38ef7d; font-size: 1.1rem;">Verzija 1.0 (Trenutna)</b><br>
                <i class="fa-solid fa-check" style="color:#38ef7d;"></i> Lansirana je osnovna igra!<br>
                <i class="fa-solid fa-check" style="color:#38ef7d;"></i> Dostupan Solo i Multiplayer mod.<br><br>
                
                <b style="color:#f5af19; font-size: 1.1rem;">Šta sledi? (Uskoro)</b><br>
                <i class="fa-solid fa-clock" style="color:#f5af19;"></i> Dnevni izazovi sa nagradama.<br>
                <i class="fa-solid fa-clock" style="color:#f5af19;"></i> Proširenje baze reči.<br>
                <i class="fa-solid fa-clock" style="color:#f5af19;"></i> Implementacija svetle i neon teme.
            </div>
        `;
        UIManager.prikaziObavestenje("🔔 Najnovija Obaveštenja", tekst, null, "Zatvori");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PodesavanjaManager.init();
});