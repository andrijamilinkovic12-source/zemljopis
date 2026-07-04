// podesavanja.js - Upravljanje opcijama, zvukom i korisničkim podacima

const PodesavanjaManager = {
    postavke: {
        nadimak: "",
        avatar: null,
        profilTip: "lokalni",
        googleUid: null,
        profilKljuc: null,
        androidProfilKljuc: null,
        stabilniProfilKljucPovezan: false,
        playerId: null,
        profilZavrsen: false,
        zvuk: true,
        tema: "tamna",
        pismo: "latinica" // Podrazumevano pismo
    },

    // NAŠI NOVI VIRTUALNI DJ PLEJERI ZA CROSSFADE (NEPRIMETAN PRELAZ)
    audio1: null,
    audio2: null,
    aktivniAudio: 1,
    muzikaInterakcijaHandler: null,
    avatarPickerDokumentHandler: null,
    androidProfilKljucPromise: null,
    povezivanjeStabilnogKljuca: false,
    cirilicaObserver: null,
    avatari: [
        { id: "atlas", naziv: "Atlas", tip: "kartograf", kosa: "#273244", koza: "#ffd1a6", kozaSenka: "#d88b61", odelo: "#1fbf75", detalj: "#f6c453", pozadina: "#0d3b32", pozadina2: "#38ef7d" },
        { id: "luna", naziv: "Luna", tip: "zvezdana", kosa: "#5630a4", koza: "#f4c6a4", kozaSenka: "#c9816a", odelo: "#4f8cff", detalj: "#ffd166", pozadina: "#18214d", pozadina2: "#8b5cf6" },
        { id: "orion", naziv: "Orion", tip: "pilot", kosa: "#1b2333", koza: "#d99b73", kozaSenka: "#9f5c3f", odelo: "#ff8a2a", detalj: "#38d9ff", pozadina: "#162133", pozadina2: "#f59e0b" },
        { id: "tara", naziv: "Tara", tip: "planinarka", kosa: "#184f3b", koza: "#f3c39b", kozaSenka: "#c47e59", odelo: "#b53cf5", detalj: "#7ee787", pozadina: "#123f2d", pozadina2: "#22c55e" },
        { id: "niko", naziv: "Niko", tip: "cyber", kosa: "#101827", koza: "#e8b891", kozaSenka: "#ac704f", odelo: "#22c55e", detalj: "#00e5ff", pozadina: "#07111f", pozadina2: "#16a34a" },
        { id: "mila", naziv: "Mila", tip: "mornarka", kosa: "#87391f", koza: "#ffcf99", kozaSenka: "#c87948", odelo: "#06b6d4", detalj: "#f9fafb", pozadina: "#083c5f", pozadina2: "#38bdf8" },
        { id: "sava", naziv: "Sava", tip: "ucenjak", kosa: "#6b3f21", koza: "#f1bd8f", kozaSenka: "#af724e", odelo: "#8b5cf6", detalj: "#f5d061", pozadina: "#2f225c", pozadina2: "#c084fc" },
        { id: "zara", naziv: "Zara", tip: "pustinjska", kosa: "#3a2318", koza: "#c8895d", kozaSenka: "#7d4f35", odelo: "#eab308", detalj: "#ef4444", pozadina: "#5b3414", pozadina2: "#f59e0b" },
        { id: "vuk", naziv: "Vuk", tip: "polarni", kosa: "#2f3a4a", koza: "#efc6a6", kozaSenka: "#b87b5f", odelo: "#60a5fa", detalj: "#e5f7ff", pozadina: "#102a43", pozadina2: "#7dd3fc" },
        { id: "iris", naziv: "Iris", tip: "carobnica", kosa: "#d946ef", koza: "#f7c9b0", kozaSenka: "#bd7a65", odelo: "#7c3aed", detalj: "#34d399", pozadina: "#2a174f", pozadina2: "#ec4899" },
        { id: "leo", naziv: "Leo", tip: "sportista", kosa: "#f59e0b", koza: "#f2b47d", kozaSenka: "#ba7445", odelo: "#ef4444", detalj: "#facc15", pozadina: "#4a1722", pozadina2: "#fb7185" },
        { id: "nova", naziv: "Nova", tip: "astro", kosa: "#18b7c8", koza: "#d9f7ff", kozaSenka: "#7aa8b6", odelo: "#111827", detalj: "#a78bfa", pozadina: "#07101d", pozadina2: "#22d3ee" }
    ],

    init: function() {
        const sacuvano = localStorage.getItem('zemljopis_postavke');
        if (sacuvano) {
            try {
                this.postavke = { ...this.postavke, ...JSON.parse(sacuvano) };
            } catch (error) {
                console.warn("Sačuvane postavke profila nisu ispravne.", error);
            }
            // Zbog starih sačuvanih verzija
            if (!this.postavke.pismo) this.postavke.pismo = "latinica";
            if (!this.avatari.some(a => a.id === this.postavke.avatar)) this.postavke.avatar = null;
            if (!this.postavke.profilTip) this.postavke.profilTip = "lokalni";
            if (typeof this.postavke.googleUid === 'undefined') this.postavke.googleUid = null;
            if (typeof this.postavke.androidProfilKljuc === 'undefined') this.postavke.androidProfilKljuc = null;
            if (typeof this.postavke.stabilniProfilKljucPovezan !== 'boolean') this.postavke.stabilniProfilKljucPovezan = false;
            if (typeof this.postavke.playerId === 'undefined') this.postavke.playerId = null;
            if (typeof this.postavke.profilZavrsen !== 'boolean') this.postavke.profilZavrsen = false;
            if (typeof this.postavke.zvuk !== 'boolean') this.postavke.zvuk = true;
        }

        if (!this.postavke.profilKljuc) {
            this.postavke.profilKljuc = this.generisiProfilKljuc();
        }
        if (this.postavke.nadimak === "Gost" || this.postavke.nadimak === "Igrač") {
            this.postavke.nadimak = "";
            this.postavke.profilZavrsen = false;
        }
        this.snimiULokalnuMemoriju();
        document.body.setAttribute('data-tema', this.postavke.tema || 'tamna');
        
        this.primeniPostavkeGlobalno();

        // Ako je uključena ćirilica, odmah prevodi sve na ekranu i aktiviraj posmatrača
        if (this.postavke.pismo === "cirilica") {
            this.primeniCirilicu(document.body);
            this.pokreniCirilicaPosmatraca();
        }

        this.poveziAvatarPicker();
        this.renderujAvatare();
        this.azurirajAvatarPreview();

        // Pokušaj puštanja muzike ako je uključena; browser/WebView može da traži interakciju.
        this.osluskujPokretanjeMuzike();
        this.upravljajMuzikom().then((pokrenuta) => {
            if (pokrenuta) this.ukloniOsluskivanjeMuzike();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.postavke.zvuk) {
                this.upravljajMuzikom();
            }
        });

        if (typeof Game !== "undefined" && Game.socket && Game.socket.connected) {
            Game.prijaviSacuvanProfil();
        }
        this.osigurajStabilniProfilKljuc();
    },

    osluskujPokretanjeMuzike: function() {
        if (this.muzikaInterakcijaHandler) return;

        this.muzikaInterakcijaHandler = () => {
            if (!this.postavke.zvuk) {
                this.ukloniOsluskivanjeMuzike();
                return;
            }

            this.upravljajMuzikom().then((pokrenuta) => {
                if (pokrenuta) this.ukloniOsluskivanjeMuzike();
            });
        };

        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((eventName) => {
            document.addEventListener(eventName, this.muzikaInterakcijaHandler, { passive: true });
        });
    },

    ukloniOsluskivanjeMuzike: function() {
        if (!this.muzikaInterakcijaHandler) return;

        ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((eventName) => {
            document.removeEventListener(eventName, this.muzikaInterakcijaHandler);
        });
        this.muzikaInterakcijaHandler = null;
    },

    upravljajMuzikom: function() {
        // Inicijalizacija plejera pri prvom pokretanju
        if (!this.audio1) {
            this.audio1 = document.getElementById('bg-music');
            if (!this.audio1) return Promise.resolve(false);

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
                return aktuelniPlej.play()
                    .then(() => true)
                    .catch(e => {
                        console.log("Čekam interakciju za muziku...", e);
                        this.osluskujPokretanjeMuzike();
                        return false;
                    });
            }
            return Promise.resolve(true);
        } else {
            aktuelniPlej.pause();
            pauzirani.pause();
            this.ukloniOsluskivanjeMuzike();
            return Promise.resolve(false);
        }
    },

    generisiProfilKljuc: function() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID().replace(/-/g, "");
        }

        const nasumicniDeo = Math.random().toString(36).slice(2);
        return `profil_${Date.now().toString(36)}_${nasumicniDeo}_${Math.random().toString(36).slice(2)}`;
    },

    profilKljucIzAndroidId: function(androidId) {
        const ociscen = String(androidId || "")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 80);
        if (ociscen.length < 8) return null;
        return `android_${ociscen}`;
    },

    preuzmiAndroidProfilKljuc: async function() {
        const plugin = window.Capacitor
            && window.Capacitor.Plugins
            && window.Capacitor.Plugins.DeviceIdentity;
        if (!plugin || typeof plugin.getId !== "function") return null;

        const odgovor = await plugin.getId();
        return this.profilKljucIzAndroidId(odgovor && odgovor.id);
    },

    osigurajStabilniProfilKljuc: async function() {
        if (this.androidProfilKljucPromise) return this.androidProfilKljucPromise;

        this.androidProfilKljucPromise = (async () => {
            try {
                const stabilniKljuc = await this.preuzmiAndroidProfilKljuc();
                if (!stabilniKljuc) return null;

                const stariAndroidKljuc = this.postavke.androidProfilKljuc;
                const stariProfilKljuc = this.postavke.profilKljuc;
                const lokalniProfil = this.postavke.profilTip !== "google" && !this.postavke.googleUid;
                const noviProfil = !this.postavke.profilZavrsen || !this.postavke.playerId;

                this.postavke.androidProfilKljuc = stabilniKljuc;
                if (lokalniProfil && noviProfil && this.postavke.profilKljuc !== stabilniKljuc) {
                    this.postavke.profilKljuc = stabilniKljuc;
                    this.postavke.stabilniProfilKljucPovezan = true;
                } else if (this.postavke.profilKljuc === stabilniKljuc) {
                    this.postavke.stabilniProfilKljucPovezan = true;
                }

                if (
                    stariAndroidKljuc !== this.postavke.androidProfilKljuc
                    || stariProfilKljuc !== this.postavke.profilKljuc
                ) {
                    this.snimiULokalnuMemoriju();
                }

                if (lokalniProfil && !noviProfil && this.postavke.profilKljuc !== stabilniKljuc) {
                    this.poveziStabilniProfilKljuc();
                }
                return stabilniKljuc;
            } catch (error) {
                console.warn("Android stabilni profil ključ nije dostupan.", error);
                return null;
            } finally {
                this.androidProfilKljucPromise = null;
            }
        })();

        return this.androidProfilKljucPromise;
    },

    poveziStabilniProfilKljuc: function() {
        const stabilniKljuc = this.postavke.androidProfilKljuc;
        if (
            this.povezivanjeStabilnogKljuca
            || !stabilniKljuc
            || this.postavke.profilKljuc === stabilniKljuc
            || this.postavke.profilTip === "google"
            || this.postavke.googleUid
            || !this.profilKompletan()
            || typeof Game === "undefined"
            || !Game.socket
            || !Game.socket.connected
        ) {
            return;
        }

        this.povezivanjeStabilnogKljuca = true;
        Game.socket.timeout(12000).emit(
            'poveziProfilKljuc',
            { profilKljuc: stabilniKljuc },
            (greska, odgovor) => {
                this.povezivanjeStabilnogKljuca = false;
                if (greska || !odgovor || !odgovor.uspeh) {
                    console.warn("Stabilni profil ključ nije povezan.", odgovor || greska);
                    return;
                }

                this.postavke.profilKljuc = stabilniKljuc;
                this.postavke.stabilniProfilKljucPovezan = true;
                if (odgovor.profil) {
                    this.postavke.playerId = odgovor.profil.playerId || this.postavke.playerId;
                    this.postavke.profilTip = odgovor.profil.googlePovezan ? "google" : "lokalni";
                    this.postavke.googleUid = odgovor.profil.googleUid || null;
                }
                this.snimiULokalnuMemoriju();
            }
        );
    },

    profilKompletan: function() {
        const nadimak = String(this.postavke.nadimak || "").trim();
        const avatarPostoji = this.avatari.some(avatar => avatar.id === this.postavke.avatar);
        return this.postavke.profilZavrsen === true
            && nadimak.length >= 2
            && avatarPostoji
            && Boolean(this.postavke.profilKljuc);
    },

    zahtevajProfil: function() {
        if (this.profilKompletan()) return true;
        this.prikaziObavezniProfil();
        return false;
    },

    prikaziObavezniProfil: function() {
        const input = document.getElementById('profil-setup-nadimak');
        if (input) input.value = this.postavke.nadimak || "";

        this.renderujAvatare();
        this.azurirajAvatarPreview();
        this.zatvoriSetupAvatarPicker();
        this.postaviSetupPoruku("Izaberi avatar i ime da uđeš kao gost.");

        if (typeof UIManager !== "undefined") {
            UIManager.prikaziEkran('profil-setup-screen', true);
        }
    },

    postaviSetupPoruku: function(poruka, tip = "") {
        const elementi = document.querySelectorAll('#profil-setup-poruka, #splash-setup-poruka');
        if (!elementi.length) return;
        elementi.forEach(element => {
            element.textContent = poruka;
            element.classList.remove('error', 'success');
            if (tip) element.classList.add(tip);
        });
    },

    posaljiProfilServeru: function(nadimak, avatar, callback) {
        if (typeof Game === "undefined" || !Game.socket || !Game.socket.connected) {
            callback({
                uspeh: false,
                kod: "NEMA_KONEKCIJE",
                poruka: "Za rezervaciju nadimka potrebna je internet veza."
            });
            return;
        }

        Game.socket.timeout(12000).emit(
            'registrujProfil',
            {
                nadimak,
                avatar,
                profilKljuc: this.postavke.profilKljuc
            },
            (greska, odgovor) => {
                if (greska) {
                    callback({
                        uspeh: false,
                        kod: "ISTEKLO_VREME",
                        poruka: "Server se nije javio. Proveri internet i pokušaj ponovo."
                    });
                    return;
                }
                callback(odgovor || {
                    uspeh: false,
                    kod: "GRESKA_SERVERA",
                    poruka: "Profil trenutno nije moguće sačuvati."
                });
            }
        );
    },

    registrujObavezniProfil: async function() {
        const input = document.getElementById('profil-setup-nadimak');
        const dugme = document.getElementById('profil-setup-submit');
        const nadimak = input ? input.value.trim().replace(/\s+/g, " ") : "";
        const avatar = this.postavke.avatar;

        if (nadimak.length < 2 || nadimak.length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(nadimak)) {
            this.postaviSetupPoruku("Unesi nadimak od 2-20 slova ili brojeva.", "error");
            if (input) input.focus();
            return;
        }
        if (!this.avatari.some(a => a.id === avatar)) {
            this.postaviSetupPoruku("Prvo izaberi svoj avatar.", "error");
            this.toggleSetupAvatarPicker();
            return;
        }

        await this.osigurajStabilniProfilKljuc();

        if (dugme) {
            dugme.disabled = true;
            dugme.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Provera imena...</span>';
        }
        this.postaviSetupPoruku("Proveravamo da li je nadimak slobodan...");

        this.posaljiProfilServeru(nadimak, avatar, (odgovor) => {
            if (dugme) {
                dugme.disabled = false;
                dugme.innerHTML = '<span>Uđi kao gost</span><i class="fa-solid fa-arrow-right"></i>';
            }

            if (!odgovor.uspeh) {
                this.postaviSetupPoruku(odgovor.poruka || "Nadimak nije moguće sačuvati.", "error");
                if (odgovor.kod === "NADIMAK_ZAUZET" && input) {
                    input.select();
                    input.focus();
                }
                return;
            }

            this.postavke.nadimak = odgovor.profil && odgovor.profil.nadimak
                ? odgovor.profil.nadimak
                : nadimak;
            this.postavke.avatar = odgovor.profil && odgovor.profil.avatar
                ? odgovor.profil.avatar
                : avatar;
            this.postavke.playerId = odgovor.profil && odgovor.profil.playerId
                ? odgovor.profil.playerId
                : this.postavke.playerId;
            this.postavke.profilTip = odgovor.profil && odgovor.profil.googlePovezan ? "google" : "lokalni";
            this.postavke.googleUid = odgovor.profil && odgovor.profil.googleUid
                ? odgovor.profil.googleUid
                : null;
            this.postavke.profilZavrsen = true;
            this.snimiULokalnuMemoriju();
            this.primeniPostavkeGlobalno();
            this.postaviSetupPoruku("Profil je spreman.", "success");

            if (typeof Game !== "undefined") Game.profilPrijavljen = true;
            setTimeout(() => UIManager.prikaziEkran('main-menu'), 250);
        });
    },

    generisiGostNadimak: function() {
        const broj = Math.floor(10000 + Math.random() * 90000);
        return `Gost${broj}`;
    },

    primeniServerProfil: function(profil, profilKljuc) {
        if (!profil) return false;

        if (profilKljuc) this.postavke.profilKljuc = profilKljuc;
        if (profil.nadimak) this.postavke.nadimak = profil.nadimak;
        if (profil.avatar) this.postavke.avatar = profil.avatar;
        if (profil.playerId) this.postavke.playerId = profil.playerId;
        this.postavke.profilTip = profil.googlePovezan ? "google" : "lokalni";
        this.postavke.googleUid = profil.googleUid || null;
        this.postavke.profilZavrsen = true;
        this.snimiULokalnuMemoriju();
        this.primeniPostavkeGlobalno();
        this.azurirajAvatarPreview();
        this.azurirajProfilOpcije();
        return true;
    },

    oporaviGostProfilAkoPostoji: async function() {
        if (this.profilKompletan()) {
            return true;
        }

        const stabilniKljuc = await this.osigurajStabilniProfilKljuc();
        if (
            !stabilniKljuc
            || typeof Game === "undefined"
            || !Game.socket
            || !Game.socket.connected
        ) {
            return false;
        }

        return new Promise(resolve => {
            Game.socket.timeout(9000).emit(
                'prijavaProfila',
                { profilKljuc: stabilniKljuc },
                (greska, odgovor) => {
                    if (greska || !odgovor || !odgovor.uspeh || !odgovor.profil) {
                        resolve(false);
                        return;
                    }

                    const primenjen = this.primeniServerProfil(odgovor.profil, stabilniKljuc);
                    if (primenjen && typeof Game !== "undefined") Game.profilPrijavljen = true;
                    resolve(primenjen);
                }
            );
        });
    },

    postaviLoginDugmad: function(zakljucano) {
        document.querySelectorAll('.login-guest-action, .login-google-action').forEach(dugme => {
            dugme.disabled = zakljucano;
        });
    },

    prijaviSeKaoGost: async function() {
        if (this.profilKompletan()) {
            if (typeof Game !== "undefined") Game.profilPrijavljen = true;
            if (typeof UIManager !== "undefined") UIManager.prikaziEkran('main-menu');
            return;
        }

        this.postaviLoginDugmad(true);
        this.postaviSetupPoruku("Proveravamo da li gost profil već postoji...");
        const oporavljen = await this.oporaviGostProfilAkoPostoji();
        this.postaviLoginDugmad(false);

        if (oporavljen && this.profilKompletan()) {
            if (typeof Game !== "undefined") Game.profilPrijavljen = true;
            if (typeof UIManager !== "undefined") UIManager.prikaziEkran('main-menu');
            return;
        }

        this.prikaziObavezniProfil();
    },

    otvoriEkran: function() {
        const inputNadimak = document.getElementById('postavke-nadimak');
        if (inputNadimak) {
            inputNadimak.value = this.postavke.nadimak || "";
            inputNadimak.blur();
        }
        this.poveziAvatarPicker();
        this.renderujAvatare();
        this.azurirajAvatarPreview();
        this.azurirajProfilOpcije();
        this.zatvoriAvatarPicker();
        
        this.azurirajDugmeZvuk();
        this.azurirajDugmadTeme();
        this.azurirajDugmePismo();
        
        UIManager.prikaziEkran('podesavanja-screen');

        this.poveziStranicePodesavanja();
        requestAnimationFrame(() => this.idiNaStranicuPodesavanja(0, false));
    },

    poveziStranicePodesavanja: function() {
        const sadrzaj = document.querySelector('#podesavanja-screen .settings-content');
        if (!sadrzaj || sadrzaj.dataset.settingsPagerReady) return;

        let zakazanoAzuriranje = false;
        sadrzaj.addEventListener('scroll', () => {
            if (zakazanoAzuriranje) return;
            zakazanoAzuriranje = true;
            requestAnimationFrame(() => {
                zakazanoAzuriranje = false;
                const stranica = sadrzaj.clientWidth
                    ? Math.round(sadrzaj.scrollLeft / sadrzaj.clientWidth)
                    : 0;
                this.azurirajIndikatorStranicePodesavanja(stranica);
            });
        }, { passive: true });

        sadrzaj.dataset.settingsPagerReady = "1";
    },

    idiNaStranicuPodesavanja: function(stranica, animiraj = true) {
        const sadrzaj = document.querySelector('#podesavanja-screen .settings-content');
        if (!sadrzaj) return;

        const ciljnaStranica = Math.max(0, Math.min(1, Number(stranica) || 0));
        sadrzaj.scrollTo({
            left: ciljnaStranica * sadrzaj.clientWidth,
            top: 0,
            behavior: animiraj ? 'smooth' : 'auto'
        });
        this.azurirajIndikatorStranicePodesavanja(ciljnaStranica);
    },

    azurirajIndikatorStranicePodesavanja: function(stranica) {
        document.querySelectorAll('[data-settings-page-dot]').forEach((dugme, indeks) => {
            const aktivno = indeks === stranica;
            dugme.classList.toggle('active', aktivno);
            dugme.setAttribute('aria-selected', aktivno ? 'true' : 'false');
        });
    },

    sacuvajNadimak: function() {
        const unos = document.getElementById('postavke-nadimak').value.trim().replace(/\s+/g, " ");
        const inputPolje = document.getElementById('postavke-nadimak');

        if (unos.length < 2 || unos.length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(unos)) {
            inputPolje.style.borderColor = "#ff416c";
            setTimeout(() => inputPolje.style.borderColor = "rgba(255, 255, 255, 0.1)", 1500);
            UIManager.prikaziObavestenje("Upozorenje", "Nadimak mora imati 2-20 slova ili brojeva.", null, "Pokušaj ponovo");
            return;
        }

        this.posaljiProfilServeru(unos, this.getAvatarId(), (odgovor) => {
            if (!odgovor.uspeh) {
                inputPolje.style.borderColor = "#ff416c";
                setTimeout(() => inputPolje.style.borderColor = "rgba(255, 255, 255, 0.1)", 1500);
                UIManager.prikaziObavestenje(
                    odgovor.kod === "NADIMAK_ZAUZET" ? "Nadimak je zauzet" : "Nije sačuvano",
                    odgovor.poruka || "Pokušaj ponovo.",
                    null,
                    "U redu"
                );
                return;
            }

            this.postavke.nadimak = odgovor.profil && odgovor.profil.nadimak
                ? odgovor.profil.nadimak
                : unos;
            this.postavke.playerId = odgovor.profil && odgovor.profil.playerId
                ? odgovor.profil.playerId
                : this.postavke.playerId;
            this.postavke.profilTip = odgovor.profil && odgovor.profil.googlePovezan ? "google" : "lokalni";
            this.postavke.googleUid = odgovor.profil && odgovor.profil.googleUid
                ? odgovor.profil.googleUid
                : this.postavke.googleUid;
            this.postavke.profilZavrsen = true;
            this.snimiULokalnuMemoriju();
            this.primeniPostavkeGlobalno();
            this.azurirajProfilOpcije();

            inputPolje.value = this.postavke.nadimak;
            inputPolje.style.borderColor = "#38ef7d";
            setTimeout(() => inputPolje.style.borderColor = "rgba(255, 255, 255, 0.1)", 1500);

            UIManager.prikaziObavestenje("Uspešno", "Tvoj nadimak je promenjen i rezervisan.", null, "U redu");
        });
    },

    renderujAvatare: function() {
        const html = this.avatari.map(avatar => `
            <button type="button" class="avatar-option ${avatar.id === this.postavke.avatar ? 'active' : ''}" title="${avatar.naziv}" data-avatar="${avatar.id}" onclick="PodesavanjaManager.izaberiAvatar('${avatar.id}')">
                ${this.napraviAvatarSvg(avatar)}
            </button>
        `).join('');

        ['postavke-avatar-lista', 'profil-setup-avatar-lista'].forEach(id => {
            const kontejner = document.getElementById(id);
            if (kontejner) kontejner.innerHTML = html;
        });
    },

    izaberiProfilTip: function(tip) {
        if (tip === "google") {
            if (typeof GoogleAuthManager !== "undefined") {
                GoogleAuthManager.poveziTrenutniProfil();
            } else {
                UIManager.prikaziObavestenje(
                    "Google nalog",
                    "Google prijava nije učitana. Ponovo pokreni aplikaciju i pokušaj opet.",
                    null,
                    "U redu"
                );
            }
            return;
        }

        if (this.postavke.googleUid) {
            this.postavke.profilTip = "google";
            this.snimiULokalnuMemoriju();
            this.azurirajProfilOpcije();
            UIManager.prikaziObavestenje(
                "Google nalog je aktivan",
                "Ovaj profil je već povezan sa Google nalogom, pa se napredak čuva u cloudu.",
                null,
                "U redu"
            );
            return;
        }

        this.postavke.profilTip = "lokalni";
        this.snimiULokalnuMemoriju();
        this.azurirajProfilOpcije();
    },

    prikaziGoogleUskoro: function() {
        this.izaberiProfilTip("google");
    },

    odjaviProfil: function() {
        const izvrsiOdjavu = () => {
            this.snimiULokalnuMemoriju();
            this.primeniPostavkeGlobalno();
            this.azurirajProfilOpcije();
            this.azurirajAvatarPreview();

            if (typeof Game !== "undefined") Game.profilPrijavljen = false;
            const splash = document.getElementById('splash-screen');
            if (splash) splash.classList.add('login-ready');
            this.postaviSetupPoruku("");
            if (typeof UIManager !== "undefined") UIManager.prikaziEkran('splash-screen', true);
        };

        if (typeof UIManager !== "undefined" && UIManager.prikaziObavestenje) {
            UIManager.prikaziObavestenje(
                "Odjava",
                "Bićeš vraćen na uvodni ekran. Gost profil, ime i avatar ostaju sačuvani.",
                izvrsiOdjavu,
                "Odjavi se"
            );
            return;
        }

        izvrsiOdjavu();
    },

    izaberiAvatar: function(id) {
        if (!this.avatari.some(a => a.id === id)) return;

        this.postavke.avatar = id;
        this.snimiULokalnuMemoriju();
        this.azurirajAvatarPreview();
        this.azurirajProfilOpcije();
        this.primeniPostavkeGlobalno();
        this.zatvoriAvatarPicker();
        this.zatvoriSetupAvatarPicker();

        if (this.profilKompletan()) {
            this.posaljiProfilServeru(this.postavke.nadimak, id, () => {});
        } else {
            this.postaviSetupPoruku("Avatar je izabran. Sada unesi jedinstven nadimak.");
        }
    },

    fokusirajAvatare: function() {
        this.toggleAvatarPicker();
    },

    poveziAvatarPicker: function() {
        const dugme = document.getElementById('postavke-avatar-preview');
        const picker = document.getElementById('postavke-avatar-picker');

        if (dugme && !dugme.dataset.avatarPickerReady) {
            dugme.dataset.avatarPickerReady = "1";
        }

        if (picker && !picker.dataset.avatarPickerReady) {
            picker.addEventListener('click', (event) => event.stopPropagation());
            picker.dataset.avatarPickerReady = "1";
        }

        if (!this.avatarPickerDokumentHandler) {
            this.avatarPickerDokumentHandler = (event) => {
                const ekran = document.getElementById('podesavanja-screen');
                const trenutnoDugme = document.getElementById('postavke-avatar-preview');
                const trenutniPicker = document.getElementById('postavke-avatar-picker');

                if (!ekran || !ekran.classList.contains('active') || !trenutnoDugme || !trenutniPicker) return;
                if (!trenutnoDugme.contains(event.target) && !trenutniPicker.contains(event.target)) {
                    this.zatvoriAvatarPicker();
                }
            };
            document.addEventListener('click', this.avatarPickerDokumentHandler);
        }
    },

    toggleAvatarPicker: function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const picker = document.getElementById('postavke-avatar-picker');
        if (picker) {
            const otvoren = picker.classList.toggle('active');
            picker.setAttribute('aria-hidden', otvoren ? 'false' : 'true');
        }
    },

    zatvoriAvatarPicker: function() {
        const picker = document.getElementById('postavke-avatar-picker');
        if (picker) {
            picker.classList.remove('active');
            picker.setAttribute('aria-hidden', 'true');
        }
    },

    toggleSetupAvatarPicker: function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const picker = document.getElementById('profil-setup-avatar-picker');
        if (!picker) return;
        this.renderujAvatare();
        const otvoren = picker.classList.toggle('active');
        picker.setAttribute('aria-hidden', otvoren ? 'false' : 'true');
    },

    zatvoriSetupAvatarPicker: function() {
        const picker = document.getElementById('profil-setup-avatar-picker');
        if (!picker) return;
        picker.classList.remove('active');
        picker.setAttribute('aria-hidden', 'true');
    },

    azurirajAvatarPreview: function() {
        const figura = document.getElementById('postavke-avatar-figura');
        if (figura) {
            figura.innerHTML = this.napraviAvatarSvg(this.getAvatarPodaci());
        }

        const setupFigura = document.getElementById('profil-setup-avatar-figura');
        const setupPrazno = document.getElementById('profil-setup-avatar-empty');
        const avatarIzabran = this.avatari.some(a => a.id === this.postavke.avatar);
        if (setupFigura) {
            setupFigura.innerHTML = avatarIzabran ? this.napraviAvatarSvg(this.getAvatarPodaci()) : "";
        }
        if (setupPrazno) setupPrazno.style.display = avatarIzabran ? "none" : "grid";

        document.querySelectorAll('.avatar-option').forEach(btn => {
            const aktivan = btn.getAttribute('data-avatar') === this.postavke.avatar;
            btn.classList.toggle('active', aktivan);
        });
    },

    azurirajProfilOpcije: function() {
        const lokalni = document.getElementById('profil-opcija-lokalni');
        const google = document.getElementById('profil-opcija-google');
        const lokalniStatus = document.getElementById('profil-lokalni-status');
        const googleStatus = document.getElementById('profil-google-status');
        const profilInfoTip = document.getElementById('profil-info-tip');
        const profilInfoOpis = document.getElementById('profil-info-opis');
        const profilGoogleInfo = document.getElementById('profil-google-info');
        const odjavaDugme = document.getElementById('profil-odjava-dugme');
        const googlePovezan = this.postavke.profilTip === "google" && Boolean(this.postavke.googleUid);
        const povezivanjeUToku = typeof GoogleAuthManager !== "undefined" && GoogleAuthManager.povezivanjeUToku;
        const profilSpreman = this.profilKompletan();

        if (lokalni) lokalni.classList.toggle('active', this.postavke.profilTip === "lokalni");
        if (google) {
            google.classList.toggle('active', googlePovezan || povezivanjeUToku);
            google.disabled = Boolean(povezivanjeUToku);
        }
        if (lokalniStatus) {
            lokalniStatus.innerText = this.formatirajTekst(profilSpreman ? "AKTIVNO" : "NIJE SPREMNO");
        }
        if (googleStatus) {
            googleStatus.classList.toggle('soon', !googlePovezan);
            if (povezivanjeUToku) {
                googleStatus.innerText = this.formatirajTekst("POVEZUJE");
            } else if (googlePovezan) {
                googleStatus.innerText = this.formatirajTekst("POVEZANO");
            } else {
                googleStatus.innerText = this.formatirajTekst("USKORO");
            }
        }
        if (profilInfoTip) {
            if (googlePovezan) {
                profilInfoTip.innerText = this.formatirajTekst("Google profil");
            } else if (profilSpreman) {
                profilInfoTip.innerText = this.formatirajTekst("Gost profil");
            } else {
                profilInfoTip.innerText = this.formatirajTekst("Profil nije napravljen");
            }
        }
        if (profilInfoOpis) {
            if (googlePovezan) {
                profilInfoOpis.innerText = "Google profil čuva napredak preko naloga.";
            } else if (profilSpreman) {
                profilInfoOpis.innerText = `${this.postavke.nadimak} igra kao gost. Ime, avatar i napredak ostaju vezani za ovaj gost profil; odjava ih ne briše.`;
            } else {
                profilInfoOpis.innerText = "Za ulazak kao gost izaberi ime i avatar na uvodnom ekranu.";
            }
        }
        if (profilGoogleInfo) {
            profilGoogleInfo.innerText = googlePovezan
                ? "Google nalog je povezan."
                : "Google prijava je u pripremi. Za sada koristi Igraj kao gost.";
        }
        if (odjavaDugme) {
            odjavaDugme.disabled = !profilSpreman;
        }
    },

    getAvatarId: function() {
        return this.avatari.some(a => a.id === this.postavke.avatar)
            ? this.postavke.avatar
            : "atlas";
    },

    getAvatarPodaci: function() {
        return this.avatari.find(a => a.id === this.getAvatarId()) || this.avatari[0];
    },

    napraviAvatarSvg: function(avatar) {
        const a = avatar || this.avatari[0];
        const kosa = a.kosa || "#243044";
        const koza = a.koza || "#ffd0a8";
        const kozaSenka = a.kozaSenka || "#c47e59";
        const odelo = a.odelo || "#38ef7d";
        const detalj = a.detalj || "#11998e";
        const pozadina = a.pozadina || detalj;
        const pozadina2 = a.pozadina2 || odelo;

        let dekor = `
            <circle cx="51" cy="12" r="15" fill="${pozadina2}" opacity="0.48"/>
            <circle cx="12" cy="49" r="18" fill="${detalj}" opacity="0.22"/>
            <path d="M8 22c9-8 20-10 32-7 7 1.8 13 1 18-2" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.16" stroke-linecap="round"/>
        `;
        let telo = `
            <path d="M10 58c2.5-9.7 10.1-15.4 22-15.4S51.5 48.3 54 58Z" fill="${odelo}"/>
            <path d="M21 58l5.3-13.3 5.7 8.2 5.7-8.2L43 58Z" fill="${detalj}" opacity="0.72"/>
        `;
        let vrat = `<path d="M24.2 40.1h15.6v8.2c-4.2 3-11.4 3-15.6 0Z" fill="${koza}"/>`;
        let usi = `<circle cx="18.8" cy="29.6" r="3.7" fill="${kozaSenka}"/><circle cx="45.2" cy="29.6" r="3.7" fill="${kozaSenka}"/>`;
        let lice = `<path d="M18.4 28c0-9.8 6.8-16.4 13.6-16.4S45.6 18.2 45.6 28c0 10.1-6.6 17.1-13.6 17.1S18.4 38.1 18.4 28Z" fill="${koza}"/>`;
        let kosaNazad = `<path d="M17.4 30.5c-.5-11 6.6-19.7 17.5-18.8 7.5.7 12.2 6.4 12.5 15.1-6.5-1.6-12.4-4.6-16.2-8.4-2.9 4.9-6.9 8.3-13.8 12.1Z" fill="${kosa}"/>`;
        let kosaNapred = "";
        let dodaci = "";
        let liceDetalji = "";
        let oci = `
            <circle cx="26.2" cy="29.5" r="1.7" fill="#111827"/>
            <circle cx="37.8" cy="29.5" r="1.7" fill="#111827"/>
        `;
        let usta = `<path d="M27.3 36.4c2.8 2.2 6.4 2.2 9.4 0" fill="none" stroke="#7c3b22" stroke-width="2" stroke-linecap="round"/>`;
        let prednjiDetalji = "";

        switch (a.tip) {
            case "kartograf":
                dekor = `
                    <path d="M9 17c6-5 12-5 18-1s12 4 19-1" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.2"/>
                    <path d="M10 46c8-3 15-2 22 3s14 4 22-2" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.18"/>
                    <circle cx="49" cy="16" r="8" fill="${detalj}" opacity="0.52"/>
                    <path d="M49 11l2.1 4.1 4.5.7-3.3 3.1.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.3-3.1 4.5-.7Z" fill="#fff7cc" opacity="0.9"/>
                `;
                kosaNazad = `<path d="M19 28c.5-9 7.4-14.9 15.5-13.7 5.9.9 10 5.5 10.5 12.1-5.7-.9-10.7-3.4-14.9-7.4-2.1 3.4-5.5 6.2-11.1 9Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M19 18.6c4.1-6 14.7-8.6 23.8-2.4l-2 4.2c-6.8-2.7-13.1-2.7-19.3.2Z" fill="${odelo}"/>
                    <path d="M18.3 21.4c7.9-2.1 15.6-2.1 23.4 0l2.6 2.6c-9.5-1.5-18.2-1.5-26.6 0Z" fill="${detalj}"/>
                `;
                prednjiDetalji = `
                    <path d="M20 58h24l-3.5-9.4-8.5 5.1-8.5-5.1Z" fill="#0b2f24" opacity="0.45"/>
                    <circle cx="41.5" cy="50" r="3.2" fill="#fff4b8"/>
                    <path d="M41.5 47.6v4.8M39.1 50h4.8" stroke="${pozadina}" stroke-width="1.2" stroke-linecap="round"/>
                `;
                break;

            case "zvezdana":
                dekor = `
                    <circle cx="15" cy="16" r="1.4" fill="#ffffff" opacity="0.85"/>
                    <circle cx="50" cy="11" r="1.2" fill="#ffffff" opacity="0.72"/>
                    <circle cx="52" cy="39" r="1.7" fill="#ffffff" opacity="0.74"/>
                    <path d="M12 47c14-6 26-5 42 1" fill="none" stroke="${pozadina2}" stroke-width="4" opacity="0.25" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M11 58c2.7-9 10-14.4 21-14.4S50.3 49 53 58Z" fill="${odelo}"/>
                    <path d="M18 58c3.5-7.5 8.4-12 14-12s10.5 4.5 14 12Z" fill="${kosa}" opacity="0.36"/>
                    <path d="M26 45l6 7 6-7 4 13H22Z" fill="${detalj}" opacity="0.76"/>
                `;
                kosaNazad = `<path d="M15.5 55c2.4-8 1.1-15.9.7-23.5-.6-11.6 7.5-20.7 18.2-19.5 7.5.8 13 7.2 13.2 15.5.2 8.2-3.3 13.9-1.1 22.2-5.8 1-10.1-1-13.7-4.5-4 4.1-9.5 5.9-17.3 9.8Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M18.4 26.6c2.5-8.2 8.5-12.1 16.5-11.5 3.9.3 7.7 2.1 10.3 5.4-5 1-9.4.1-13.2-2.7-2.6 4.1-6.7 6.8-13.6 8.8Z" fill="#7b3fd1"/>
                    <path d="M42.5 15.2c-2.9 2.1-3.7 5.5-1.7 8.2-3.5-1.1-5.4-4.2-4.7-7.6 2.2 1.2 4.4 1.1 6.4-.6Z" fill="${detalj}"/>
                `;
                oci = `
                    <path d="M24.7 29.4c1.1-1.1 2.7-1.1 3.8 0" fill="none" stroke="#111827" stroke-width="1.7" stroke-linecap="round"/>
                    <path d="M35.5 29.4c1.1-1.1 2.7-1.1 3.8 0" fill="none" stroke="#111827" stroke-width="1.7" stroke-linecap="round"/>
                `;
                prednjiDetalji = `<circle cx="20.4" cy="33.6" r="1.5" fill="${detalj}"/><circle cx="43.6" cy="33.6" r="1.5" fill="${detalj}"/>`;
                break;

            case "pilot":
                dekor = `
                    <circle cx="14" cy="14" r="1.4" fill="#ffffff" opacity="0.7"/>
                    <circle cx="47" cy="9" r="1.1" fill="#ffffff" opacity="0.6"/>
                    <path d="M8 45c9-10 24-15 48-15" fill="none" stroke="${detalj}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.7-9.8 10.6-15.2 22-15.2S51.3 48.2 54 58Z" fill="${odelo}"/>
                    <path d="M22 58l3-12h14l3 12Z" fill="#202938"/>
                    <rect x="27" y="47" width="10" height="6" rx="2" fill="${detalj}" opacity="0.86"/>
                `;
                kosaNazad = `<circle cx="32" cy="28.4" r="18" fill="#e9eef5" opacity="0.9"/><circle cx="32" cy="28.4" r="15.3" fill="#243044"/>`;
                lice = `<path d="M20.4 28.3c0-8.3 5.6-13.4 11.6-13.4s11.6 5.1 11.6 13.4c0 8.5-5.5 14.2-11.6 14.2s-11.6-5.7-11.6-14.2Z" fill="${koza}"/>`;
                usi = `<rect x="15.2" y="25" width="5" height="9" rx="2.2" fill="${detalj}"/><rect x="43.8" y="25" width="5" height="9" rx="2.2" fill="${detalj}"/>`;
                kosaNapred = `
                    <path d="M18.4 24.6c7.7-5 19.1-5 27.2 0v5.5c-9.6-3-18.7-3-27.2 0Z" fill="#101827" opacity="0.58"/>
                    <path d="M17.4 25.1c7.8-3.5 20.4-3.5 29.2 0l-1.5 7.4c-8.2-2.2-16.4-2.2-24.6 0Z" fill="${detalj}" opacity="0.42"/>
                `;
                oci = `<circle cx="26.3" cy="30" r="1.55" fill="#101827"/><circle cx="37.7" cy="30" r="1.55" fill="#101827"/>`;
                break;

            case "planinarka":
                dekor = `
                    <path d="M7 48l11-15 8 10 8-14 17 19Z" fill="#ffffff" opacity="0.2"/>
                    <path d="M8 51h48" stroke="${pozadina2}" stroke-width="3" opacity="0.24" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.2-8.7 9.1-14.2 22-14.2S51.8 49.3 54 58Z" fill="${odelo}"/>
                    <path d="M24 45h16l-8 7Z" fill="${detalj}" opacity="0.8"/>
                    <path d="M18 58c3-7 8.2-10.5 14-10.5S43 51 46 58Z" fill="#1a2b24" opacity="0.35"/>
                `;
                kosaNazad = `
                    <path d="M18 42c-1.9-11.6.1-24.2 12.5-25.8 10.8-1.4 16.2 6.1 16.6 15.1.2 5.3-1.1 9.7-3.6 13.2-2.1-6.2-5.3-11.2-9.8-15.2-4.3 5.5-9.4 9.6-15.7 12.7Z" fill="${kosa}"/>
                    <circle cx="44.8" cy="42" r="3.2" fill="${kosa}"/><circle cx="46.2" cy="47" r="2.8" fill="${kosa}"/><circle cx="44.3" cy="51.3" r="2.4" fill="${kosa}"/>
                `;
                kosaNapred = `
                    <path d="M18.5 28.1c2.6-8 8.3-12.8 16-12.3 4.5.3 8.6 2.3 10.8 6.5-5.1-.3-9.7-1.9-13.8-4.8-2.9 4.4-6.8 7.7-13 10.6Z" fill="#206a4d"/>
                    <path d="M42.4 17.8c-3 1.4-4.5 3.8-4.3 7.1 3.7-.7 6.3-2.6 7.8-5.7-1.5.2-2.9-.1-3.5-1.4Z" fill="${detalj}"/>
                `;
                break;

            case "cyber":
                dekor = `
                    <path d="M10 16h12v5H10zM43 43h12v5H43z" fill="${detalj}" opacity="0.26"/>
                    <path d="M16 50V38h9M48 15v12h-9" fill="none" stroke="${detalj}" stroke-width="1.8" opacity="0.36" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.5-9.5 10-14.7 22-14.7S51.5 48.5 54 58Z" fill="${odelo}"/>
                    <path d="M18 58l5-12 9 6 9-6 5 12Z" fill="#07111f" opacity="0.54"/>
                    <path d="M25 49h14" stroke="${detalj}" stroke-width="1.8" stroke-linecap="round"/>
                `;
                kosaNazad = `<path d="M18.5 28c.8-10.2 7.4-15.4 15.1-15.4 6.7 0 11.4 4 13 10.4l-6.8-2.4-2.5-5-3.1 4.5-4.8-5.8-1.5 6.4-7.1-3.3Z" fill="${kosa}"/>`;
                kosaNapred = `<path d="M20 25.5l5.6-11 4.2 8 4.7-10.5 3.4 9 6.9-5.2-2.3 9.7c-8.1-2.3-15.6-2.3-22.5 0Z" fill="${kosa}"/>`;
                oci = `
                    <rect x="22.2" y="27.1" width="8.2" height="5" rx="2" fill="#06131f"/>
                    <rect x="33.6" y="27.1" width="8.2" height="5" rx="2" fill="#06131f"/>
                    <path d="M30.4 29.6h3.2" stroke="${detalj}" stroke-width="1.5"/>
                    <circle cx="26.5" cy="29.5" r="1.2" fill="${detalj}"/><circle cx="37.5" cy="29.5" r="1.2" fill="${detalj}"/>
                `;
                usta = `<path d="M29 36.8h6" stroke="#7c3b22" stroke-width="1.6" stroke-linecap="round"/>`;
                prednjiDetalji = `<path d="M45.5 27v10" stroke="${detalj}" stroke-width="2" stroke-linecap="round"/><circle cx="45.5" cy="39.5" r="2" fill="${detalj}"/>`;
                break;

            case "mornarka":
                dekor = `
                    <path d="M5 44c7 4 13 4 20 0s13-4 20 0 12 4 17 1" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25" stroke-linecap="round"/>
                    <path d="M5 51c7 4 13 4 20 0s13-4 20 0 12 4 17 1" fill="none" stroke="${pozadina2}" stroke-width="2.2" opacity="0.34" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.5-9.1 10.4-14.5 22-14.5S51.5 48.9 54 58Z" fill="${odelo}"/>
                    <path d="M22 46l10 8 10-8 3.8 12H18.2Z" fill="${detalj}" opacity="0.9"/>
                    <path d="M27 51h10" stroke="${odelo}" stroke-width="1.6" stroke-linecap="round"/>
                `;
                kosaNazad = `<path d="M16.5 34.8c-.3-10.5 5.4-18.8 15.4-18.8 9.8 0 15.5 8.1 15.5 18.6 0 8-4.1 12.2-9.6 14.8l-5.8-4.7-5.8 4.7c-5.6-2.4-9.7-6.6-9.7-14.6Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M18.7 25.8c3.7-7.2 11.2-10.1 18.5-7.1 3.8 1.5 6.2 4.4 7.2 8.3-6.2.4-11.8-1-16.6-4.3-2.2 2.7-5.3 4.6-9.1 5.8Z" fill="#a64927"/>
                    <path d="M22.2 17.1c5.8-4.9 12.5-4.9 19.3 0l-1.4 3.6c-5.9-2.8-11.5-2.8-16.8 0Z" fill="${detalj}"/>
                    <path d="M26 16.2h13.8l-3.2-4.7h-7.4Z" fill="${pozadina2}"/>
                `;
                prednjiDetalji = `<path d="M39.5 49.2c0 2.3-1.8 4.1-4.1 4.1 1.2-1.2 1.2-3 0-4.1 2.3 0 4.1-1.8 4.1-4.1 1.2 1.2 3 1.2 4.1 0 0 2.3-1.8 4.1-4.1 4.1Z" fill="${odelo}" opacity="0.8"/>`;
                break;

            case "ucenjak":
                dekor = `
                    <rect x="9" y="12" width="15" height="20" rx="3" fill="#fff8dc" opacity="0.2"/>
                    <path d="M12 18h9M12 23h8M45 15l3 6 6 .8-4.4 4.3 1 6-5.6-3-5.4 3 1-6-4.5-4.3 6.2-.8Z" fill="${detalj}" opacity="0.6"/>
                `;
                telo = `
                    <path d="M10 58c2.4-9.8 9.8-15.2 22-15.2S51.6 48.2 54 58Z" fill="${odelo}"/>
                    <path d="M21 58l6-13 5 8.5 5-8.5 6 13Z" fill="#2f225c" opacity="0.62"/>
                    <path d="M32 45v12" stroke="${detalj}" stroke-width="1.6" opacity="0.7"/>
                `;
                kosaNazad = `<path d="M17.8 29.3c.5-10.3 7-16.1 14.5-16.1 7 0 12.7 4.8 14.4 13.6-6.7-1.1-12.4-3.6-17-7.4-2.1 4.1-5.9 7.1-11.9 9.9Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M25.4 13.2c1.4-3 3.8-4.5 7.2-4.5s5.8 1.5 7.2 4.5l-2 3.1H27.4Z" fill="${detalj}"/>
                    <path d="M24.2 15.5h15.6l-2 4c-3.8-1.3-7.6-1.3-11.6 0Z" fill="#fff4b8"/>
                `;
                oci = `
                    <circle cx="26.5" cy="29.4" r="3.3" fill="none" stroke="#3f2d1c" stroke-width="1.5"/>
                    <circle cx="37.5" cy="29.4" r="3.3" fill="none" stroke="#3f2d1c" stroke-width="1.5"/>
                    <path d="M29.8 29.4h4.4" stroke="#3f2d1c" stroke-width="1.2"/>
                    <circle cx="26.5" cy="29.4" r="1.1" fill="#111827"/><circle cx="37.5" cy="29.4" r="1.1" fill="#111827"/>
                `;
                break;

            case "pustinjska":
                dekor = `
                    <circle cx="48" cy="14" r="9" fill="${pozadina2}" opacity="0.55"/>
                    <path d="M8 47c7-5 14-5 21 0s14 5 25-1" fill="none" stroke="#fef3c7" stroke-width="2.2" opacity="0.25" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.2-9.3 9.8-14.9 22-14.9S51.8 48.7 54 58Z" fill="${odelo}"/>
                    <path d="M18 58l5.5-12.4C29 49 35 49 40.5 45.6L46 58Z" fill="${detalj}" opacity="0.72"/>
                    <path d="M23 46c4.7 2.6 11.3 2.6 18 0" fill="none" stroke="#fff2bd" stroke-width="2" opacity="0.55"/>
                `;
                kosaNazad = `<path d="M16.5 33c-.2-8.9 4.2-16.3 11.8-18.6 8.9-2.7 17.1 3.2 18.6 13.2-3.4 1.1-6.5.9-9.3-.7-5.1 4.6-11.9 6.5-21.1 6.1Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M17.3 20.6c6.8-6.5 16.4-7.7 27.4-2.2l1.8 7.5c-10.8-5.2-20.4-4.4-28.7 2.2Z" fill="${odelo}"/>
                    <path d="M16.8 24.3c10.5-3.5 20.3-3.6 29.7-.2l-1.3 4.4c-9-2.8-17.7-2.8-26.2.2Z" fill="#fff0b8" opacity="0.85"/>
                `;
                prednjiDetalji = `<circle cx="17.1" cy="34.4" r="2" fill="${detalj}"/><circle cx="46.9" cy="34.4" r="2" fill="${detalj}"/>`;
                break;

            case "polarni":
                dekor = `
                    <path d="M10 20l5 3 5-3 5 3 5-3 5 3 5-3 5 3 5-3" fill="none" stroke="#ffffff" stroke-width="1.7" opacity="0.24" stroke-linecap="round"/>
                    <circle cx="50" cy="48" r="10" fill="${pozadina2}" opacity="0.22"/>
                `;
                telo = `
                    <path d="M9 58c2.5-9.3 10.2-15.1 23-15.1S52.5 48.7 55 58Z" fill="${odelo}"/>
                    <path d="M18 58c2.5-7.4 7.2-11.8 14-11.8s11.5 4.4 14 11.8Z" fill="${detalj}" opacity="0.72"/>
                `;
                usi = "";
                kosaNazad = `<path d="M12.8 32.5c0-13.5 8.5-23 19.2-23s19.2 9.5 19.2 23c0 9.1-4.3 15.9-10.4 19.3L32 45.6l-8.8 6.2c-6.1-3.4-10.4-10.2-10.4-19.3Z" fill="#eef7ff"/><path d="M16.5 31c0-10.3 6.6-17.2 15.5-17.2s15.5 6.9 15.5 17.2c0 3.7-.9 7-2.5 9.7-4.2-4.5-8.5-6.8-13-6.8s-8.8 2.3-13 6.8c-1.6-2.7-2.5-6-2.5-9.7Z" fill="${kosa}"/>`;
                lice = `<path d="M20.4 29.7c0-7.4 5.5-12.4 11.6-12.4s11.6 5 11.6 12.4c0 8.2-5.2 13.7-11.6 13.7s-11.6-5.5-11.6-13.7Z" fill="${koza}"/>`;
                kosaNapred = `
                    <rect x="22.5" y="12.7" width="19" height="6.2" rx="3" fill="#111827" opacity="0.8"/>
                    <circle cx="27.7" cy="15.8" r="3.3" fill="${pozadina2}"/><circle cx="36.3" cy="15.8" r="3.3" fill="${pozadina2}"/>
                `;
                break;

            case "carobnica":
                dekor = `
                    <circle cx="13" cy="16" r="1.5" fill="#ffffff" opacity="0.8"/>
                    <path d="M49 11l1.2 3 3.1 1.1-3.1 1.1-1.2 3-1.2-3-3.1-1.1 3.1-1.1Z" fill="${detalj}"/>
                    <path d="M13 49l1.5 3.6 3.6 1.4-3.6 1.4L13 60l-1.5-3.6L7.9 54l3.6-1.4Z" fill="${pozadina2}" opacity="0.8"/>
                `;
                telo = `
                    <path d="M10 58c2.5-9.6 9.7-15 22-15s19.5 5.4 22 15Z" fill="${odelo}"/>
                    <path d="M19 58l7-13 6 8.7 6-8.7 7 13Z" fill="${detalj}" opacity="0.72"/>
                `;
                kosaNazad = `
                    <path d="M15.5 47c2.5-8.1.9-14.9 1.1-22 .3-9.3 7-15.8 15.4-15.8s15.1 6.5 15.4 15.8c.2 7.1-1.4 13.9 1.1 22-6.2-.6-10.2-3.7-12.2-8.8-2.9 3.1-5.8 3.1-8.6 0-2 5.1-6 8.2-12.2 8.8Z" fill="${kosa}"/>
                `;
                kosaNapred = `
                    <path d="M18.2 26.5c2.2-8.7 8.5-13.8 16.3-13.1 5.1.4 9.4 3.2 11.3 7.9-4.5 1.8-9.3 1.2-14.2-1.9-2.9 4.1-7.2 6.2-13.4 7.1Z" fill="#f472e8"/>
                    <path d="M27 14.2l5-5.2 5 5.2-5 3.1Z" fill="${detalj}"/>
                `;
                oci = `<circle cx="26.2" cy="29.4" r="1.5" fill="#111827"/><circle cx="37.8" cy="29.4" r="1.5" fill="#111827"/><circle cx="26.8" cy="28.8" r=".45" fill="#fff"/><circle cx="38.4" cy="28.8" r=".45" fill="#fff"/>`;
                break;

            case "sportista":
                dekor = `
                    <path d="M11 16h12M43 16h12M9 47h10M45 47h10" stroke="${detalj}" stroke-width="2.2" opacity="0.35" stroke-linecap="round"/>
                    <circle cx="49" cy="42" r="6" fill="${detalj}" opacity="0.4"/>
                `;
                telo = `
                    <path d="M10 58c2.4-9.4 9.8-14.7 22-14.7S51.6 48.6 54 58Z" fill="${odelo}"/>
                    <path d="M24 46h16l-2.3 12H26.3Z" fill="#ffffff" opacity="0.86"/>
                    <path d="M29 51h6M32 48v10" stroke="${odelo}" stroke-width="1.4" stroke-linecap="round"/>
                `;
                kosaNazad = `
                    <circle cx="22" cy="21" r="4.4" fill="${kosa}"/><circle cx="27" cy="16.5" r="4.8" fill="${kosa}"/><circle cx="33" cy="15.2" r="5" fill="${kosa}"/><circle cx="39" cy="18" r="4.6" fill="${kosa}"/><circle cx="43" cy="23" r="4" fill="${kosa}"/>
                    <path d="M18.4 29c.8-7.4 6.4-12.3 13.8-12.3S44.5 21.6 45.2 29Z" fill="${kosa}"/>
                `;
                kosaNapred = `<path d="M19.2 23.2c8.4-3.2 16.8-3.2 25.2 0v4c-8.2-2.3-16.6-2.3-25.2 0Z" fill="${detalj}"/>`;
                liceDetalji = `<circle cx="23.5" cy="34.4" r=".8" fill="#9d5a3b"/><circle cx="25.8" cy="35.4" r=".7" fill="#9d5a3b"/><circle cx="40.5" cy="34.4" r=".8" fill="#9d5a3b"/><circle cx="38.2" cy="35.4" r=".7" fill="#9d5a3b"/>`;
                break;

            case "astro":
                dekor = `
                    <circle cx="13" cy="13" r="1.5" fill="#ffffff" opacity="0.75"/>
                    <circle cx="50" cy="17" r="1.2" fill="#ffffff" opacity="0.65"/>
                    <path d="M8 44c14-14 30-19 49-17" fill="none" stroke="${pozadina2}" stroke-width="2.2" opacity="0.32" stroke-linecap="round"/>
                `;
                telo = `
                    <path d="M10 58c2.6-9.5 10-14.8 22-14.8S51.4 48.5 54 58Z" fill="${odelo}"/>
                    <path d="M20 58l4.5-13 7.5 6.8 7.5-6.8 4.5 13Z" fill="${detalj}" opacity="0.58"/>
                    <circle cx="32" cy="50.5" r="3.6" fill="${pozadina2}" opacity="0.88"/>
                `;
                kosaNazad = `<path d="M15.8 38c-1.8-10.8 3.2-20.7 13-22.5 9.8-1.8 17.3 4.9 18.3 14.7-5.6-1.1-10.5-3.8-14.8-8.1-3.4 5.7-8.7 9.6-16.5 15.9Z" fill="${kosa}"/>`;
                kosaNapred = `
                    <path d="M18.7 26.4c3-7.5 8.9-11.4 16-10.4 4.9.7 8.4 3.5 10.5 8.4-6.2-.2-11.1-2.1-14.8-5.8-2.7 4.3-6.6 7-11.7 8.8Z" fill="#22d3ee"/>
                    <path d="M20.7 28.2h22.6v5.6c-8.3 1.6-15.8 1.6-22.6 0Z" fill="#050b15" opacity="0.7"/>
                    <path d="M22.4 30.7c6.5 1.4 12.9 1.4 19.2 0" stroke="${pozadina2}" stroke-width="1.2" opacity="0.8"/>
                `;
                oci = `<circle cx="26.4" cy="30" r="1.25" fill="#07101d"/><circle cx="37.6" cy="30" r="1.25" fill="#07101d"/>`;
                usta = `<path d="M28.8 36.8c2.3 1.4 5.3 1.4 7.6 0" fill="none" stroke="#6b4f5c" stroke-width="1.6" stroke-linecap="round"/>`;
                prednjiDetalji = `<path d="M16.4 35c-3.2-1.7-4.9-4.6-5-8.7 3.5 1.8 5.7 4.5 6.6 8.1Z" fill="${detalj}" opacity="0.55"/><path d="M47.6 35c3.2-1.7 4.9-4.6 5-8.7-3.5 1.8-5.7 4.5-6.6 8.1Z" fill="${detalj}" opacity="0.55"/>`;
                break;
        }

        return `
            <svg class="avatar-svg" viewBox="0 0 64 64" role="img" aria-label="${a.naziv}">
                <circle cx="32" cy="32" r="30" fill="${pozadina}"/>
                ${dekor}
                <circle cx="32" cy="32" r="29" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.22"/>
                <path d="M6 57c13-4 33-4 52 0v6H6Z" fill="#000000" opacity="0.16"/>
                ${telo}
                ${vrat}
                ${kosaNazad}
                ${usi}
                ${lice}
                <path d="M23 34.5c1.8 1 3.8 1 5.4 0" stroke="#ffffff" stroke-width="1.1" opacity="0.2" stroke-linecap="round"/>
                <path d="M35.6 34.5c1.6 1 3.6 1 5.4 0" stroke="#ffffff" stroke-width="1.1" opacity="0.2" stroke-linecap="round"/>
                ${oci}
                ${liceDetalji}
                ${usta}
                ${kosaNapred}
                ${dodaci}
                ${prednjiDetalji}
            </svg>
        `;
    },

    tematskeBoje: function() {
        const stil = getComputedStyle(document.body);
        const uzmi = (naziv, fallback) => stil.getPropertyValue(naziv).trim() || fallback;

        return {
            primary: uzmi('--theme-primary', '#38ef7d'),
            primaryRgb: uzmi('--theme-primary-rgb', '56, 239, 125'),
            danger: uzmi('--theme-danger', '#ff416c'),
            dangerRgb: uzmi('--theme-danger-rgb', '255, 65, 108'),
            muted: uzmi('--theme-muted', '#a0aec0'),
            controlBg: uzmi('--theme-control-bg', 'rgba(255,255,255,0.05)'),
            border: uzmi('--theme-border', 'rgba(255,255,255,0.12)')
        };
    },

    toggleZvuk: function() {
        this.postavke.zvuk = !this.postavke.zvuk;
        this.snimiULokalnuMemoriju();
        this.azurirajDugmeZvuk();
        this.upravljajMuzikom(); // Pozivamo funkciju za muziku
        if (this.postavke.zvuk) {
            this.osluskujPokretanjeMuzike();
        } else {
            this.ukloniOsluskivanjeMuzike();
        }
    },

    azurirajDugmeZvuk: function() {
        const btn = document.getElementById('btn-zvuk');
        const statusTekst = document.getElementById('zvuk-status');
        const ikona = document.getElementById('ikona-zvuk');
        const boje = this.tematskeBoje();

        if (btn && statusTekst && ikona) {
            if (this.postavke.zvuk) {
                statusTekst.innerText = this.formatirajTekst("UKLJ");
                statusTekst.style.color = boje.primary;
                btn.style.borderColor = `rgba(${boje.primaryRgb}, 0.42)`;
                btn.style.background = `rgba(${boje.primaryRgb}, 0.1)`;
                ikona.className = "fa-solid fa-volume-high";
            } else {
                statusTekst.innerText = this.formatirajTekst("ISKLJ");
                statusTekst.style.color = boje.danger;
                btn.style.borderColor = `rgba(${boje.dangerRgb}, 0.42)`;
                btn.style.background = `rgba(${boje.dangerRgb}, 0.1)`;
                ikona.className = "fa-solid fa-volume-xmark";
            }
        }
    },

    togglePismo: function() {
        this.postavke.pismo = this.postavke.pismo === "latinica" ? "cirilica" : "latinica";
        this.snimiULokalnuMemoriju();
        
        let poruka = this.formatirajTekst(
            `Aplikacija će se ponovo učitati kako bi se primenila ${this.postavke.pismo === "cirilica" ? "ćirilica" : "latinica"}.`
        );
            
        UIManager.prikaziObavestenje("Pismo promenjeno", poruka, () => location.reload(), "U redu");
    },

    azurirajDugmePismo: function() {
        const statusTekst = document.getElementById('pismo-status');
        const boje = this.tematskeBoje();
        if (statusTekst) {
            statusTekst.innerText = this.formatirajTekst(this.postavke.pismo === "cirilica" ? "ĆIRILICA" : "LATINICA");
            statusTekst.style.color = this.postavke.pismo === "cirilica" ? boje.primary : boje.muted;
        }
    },

    cirilicnaMapa: {
        "nj":"њ", "Nj":"Њ", "NJ":"Њ", "lj":"љ", "Lj":"Љ", "LJ":"Љ", "dž":"џ", "Dž":"Џ", "DŽ":"Џ",
        "a":"а", "b":"б", "v":"в", "g":"г", "d":"д", "đ":"ђ", "e":"е", "ž":"ж", "z":"з", "i":"и",
        "j":"ј", "k":"к", "l":"л", "m":"м", "n":"н", "o":"о", "p":"п", "r":"р", "s":"с", "t":"т",
        "ć":"ћ", "u":"у", "f":"ф", "h":"х", "c":"ц", "č":"ч", "š":"ш", "q":"к", "w":"в", "x":"кс", "y":"и",
        "A":"А", "B":"Б", "V":"В", "G":"Г", "D":"Д", "Đ":"Ђ", "E":"Е", "Ž":"Ж", "Z":"З", "I":"И",
        "J":"Ј", "K":"К", "L":"Л", "M":"М", "N":"Н", "O":"О", "P":"П", "R":"Р", "S":"С", "T":"Т",
        "Ć":"Ћ", "U":"У", "F":"Ф", "H":"Х", "C":"Ц", "Č":"Ч", "Š":"Ш", "Q":"К", "W":"В", "X":"КС", "Y":"И"
    },

    cirilicniRegex: /nj|Nj|NJ|lj|Lj|LJ|dž|Dž|DŽ|[a-zđžćčšA-ZĐŽĆČŠ]/g,

    presloviUCirilicu: function(tekst) {
        let vrednost = tekst === null || typeof tekst === 'undefined' ? "" : String(tekst);
        vrednost = vrednost.replace(/MULTIPLAYER/g, "МУЛТИПЛЕЈЕР");
        vrednost = vrednost.replace(/Multiplayer/g, "Мултиплејер");
        return vrednost.replace(this.cirilicniRegex, m => this.cirilicnaMapa[m] || m);
    },

    formatirajTekst: function(tekst) {
        const vrednost = tekst === null || typeof tekst === 'undefined' ? "" : String(tekst);
        return this.postavke.pismo === "cirilica" ? this.presloviUCirilicu(vrednost) : vrednost;
    },

    primeniPismoNaElement: function(element) {
        if (this.postavke.pismo === "cirilica" && element) {
            this.primeniCirilicu(element);
        }
    },

    // Glavni engine za prevod na ćirilicu
    primeniCirilicu: function(element) {
        if (!element) return;

        const obradi = (cvor) => {
            if (cvor.nodeType === 3) {
                const prevedeno = this.presloviUCirilicu(cvor.nodeValue);
                if (cvor.nodeValue !== prevedeno) {
                    cvor.nodeValue = prevedeno;
                }
            } else if (cvor.nodeType === 1) {
                if (cvor.tagName === "SCRIPT" || cvor.tagName === "STYLE" || cvor.id === "room-code-input") return;

                ["placeholder", "title", "aria-label"].forEach(atribut => {
                    if (!cvor.hasAttribute(atribut)) return;
                    const trenutnaVrednost = cvor.getAttribute(atribut);
                    const prevedenaVrednost = this.presloviUCirilicu(trenutnaVrednost);
                    if (trenutnaVrednost !== prevedenaVrednost) {
                        cvor.setAttribute(atribut, prevedenaVrednost);
                    }
                });

                cvor.childNodes.forEach(obradi);
            }
        };

        obradi(element);
    },

    pokreniCirilicaPosmatraca: function() {
        if (this.cirilicaObserver) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.type === "childList") {
                    m.addedNodes.forEach(node => this.primeniCirilicu(node));
                } else if (m.type === "characterData") {
                    this.primeniCirilicu(m.target);
                } else if (m.type === "attributes") {
                    this.primeniCirilicu(m.target);
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["placeholder", "title", "aria-label"]
        });
        this.cirilicaObserver = observer;
    },

    promeniTemu: function(novaTema) {
        let prikazNazivaTeme = novaTema;

        // PROVERA VLASNIŠTVA U RIZNICI
        if (typeof RiznicaManager !== 'undefined') {
            const temaPodaci = RiznicaManager.podaci.teme.find(t => t.id === 'tema_' + novaTema);
            if (temaPodaci) prikazNazivaTeme = temaPodaci.naziv;
            
            if (temaPodaci && !RiznicaManager.jeOtkljucano(temaPodaci)) {
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
        document.body.setAttribute('data-tema', novaTema);
        this.azurirajDugmadTeme();
        this.azurirajDugmeZvuk();
        this.azurirajDugmePismo();
        const boje = this.tematskeBoje();
        
        UIManager.prikaziObavestenje(
            "Tema primenjena", 
            `Uspešno ste aktivirali temu: <b style="color:${boje.primary}; text-transform:uppercase;">${prikazNazivaTeme}</b>.`,
            null, 
            "Super"
        );
    },

    azurirajDugmadTeme: function() {
        const naziviTema = {
            'tamna': 'Tamna',
            'svetla': 'Svetla',
            'neon': 'Neon',
            'okean': 'Okean',
            'zlatna': 'Zlatna',
            'aurora': 'Aurora',
            'pustinja': 'Pustinja',
            'sakura': 'Sakura',
            'noir': 'Noir',
            'tropi': 'Tropi',
            'glina': 'Glina'
        };
        const teme = ['tamna', 'svetla', 'neon', 'okean', 'zlatna', 'aurora', 'pustinja', 'sakura', 'noir', 'tropi', 'glina'];
        const boje = this.tematskeBoje();
        
        teme.forEach(tema => {
            const btn = document.getElementById(`btn-tema-${tema}`);
            if (btn) {
                let kupljeno = true;
                if (typeof RiznicaManager !== 'undefined') {
                    const temaPodaci = RiznicaManager.podaci.teme.find(t => t.id === 'tema_' + tema);
                    if (temaPodaci) kupljeno = RiznicaManager.jeOtkljucano(temaPodaci);
                }

                // Dodavanje ikonice katanca ako tema nije otključana
                btn.innerHTML = naziviTema[tema] + (!kupljeno ? ' <i class="fa-solid fa-lock" style="font-size:0.7rem; margin-left:4px;"></i>' : '');

                if (this.postavke.tema === tema) {
                    btn.style.background = `rgba(${boje.primaryRgb}, 0.18)`;
                    btn.style.borderColor = boje.primary;
                    btn.style.color = boje.primary;
                    btn.style.fontWeight = "800";
                } else {
                    btn.style.background = boje.controlBg;
                    btn.style.borderColor = boje.border;
                    btn.style.color = !kupljeno ? `rgba(${boje.primaryRgb}, 0.45)` : boje.muted;
                    btn.style.fontWeight = "600";
                }
            }
        });
    },

    primeniPostavkeGlobalno: function() {
        const myPlayerName = document.getElementById('my-player-name');
        if (myPlayerName) {
            myPlayerName.innerHTML = "";
            const avatarMini = document.createElement('span');
            avatarMini.className = 'player-avatar-mini';
            avatarMini.innerHTML = this.napraviAvatarSvg(this.getAvatarPodaci());
            myPlayerName.appendChild(avatarMini);
            myPlayerName.appendChild(document.createTextNode(` ${this.postavke.nadimak}`));
        }
    },

    snimiULokalnuMemoriju: function() {
        localStorage.setItem('zemljopis_postavke', JSON.stringify(this.postavke));
        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.zakaziSlanje();
        }
    },

    prikaziPravila: function() {
        const tekst = `
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
                <b style="color:#38ef7d;">1. CILJ IGRE:</b> Upiši po jedan tačan pojam za svaku kategoriju koji počinje zadatim slovom.<br><br>
                <b style="color:#38ef7d;">2. SOLO MOD:</b> U solo treningu skupljaš samo tačne odgovore. Poeni se ne računaju.<br><br>
                <b style="color:#38ef7d;">3. BODOVANJE (Multiplayer):</b><br>
                <span style="color:#38ef7d; font-weight:800;">20 pts</span> - Tvoj pojam je jedinstven i tačan.<br>
                <span style="color:#f5af19; font-weight:800;">10 pts</span> - Tvoj pojam je tačan, ali su i drugi upisali tačne (ali različite) pojmove.<br>
                <span style="color:#a0aec0; font-weight:800;">5 pts</span> - Upišeš potpuno isti pojam kao i tvoj protivnik.<br><br>
                <b style="color:#38ef7d;">4. RUNDA:</b> Traje tačno 2 minuta (120 sekundi).
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
