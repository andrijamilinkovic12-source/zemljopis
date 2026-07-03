// auth.js - Google povezivanje profila i migracija lokalnog napretka u cloud

const GoogleAuthManager = {
    povezivanjeUToku: false,

    normalizujOdgovor: function(odgovor) {
        if (!odgovor || typeof odgovor !== "object") return null;

        const user = odgovor.user || odgovor.profile || {};
        const credential = odgovor.credential || odgovor.authentication || {};
        const googleUid = odgovor.googleUid
            || odgovor.uid
            || odgovor.id
            || user.googleUid
            || user.uid
            || user.id;
        const idToken = odgovor.idToken
            || odgovor.googleIdToken
            || credential.idToken
            || credential.id_token
            || user.idToken;

        if (!googleUid && !idToken) return null;

        return {
            googleUid: googleUid ? String(googleUid) : undefined,
            idToken: idToken ? String(idToken) : undefined,
            email: odgovor.email || user.email || "",
            ime: odgovor.name || odgovor.displayName || user.name || user.displayName || ""
        };
    },

    pokusajPrilagodjeniAdapter: async function() {
        if (
            window.ZemljopisGoogleAuth
            && typeof window.ZemljopisGoogleAuth.signIn === "function"
        ) {
            return this.normalizujOdgovor(await window.ZemljopisGoogleAuth.signIn());
        }
        return null;
    },

    pokusajCapacitorFirebase: async function() {
        const plugin = window.Capacitor
            && window.Capacitor.Plugins
            && window.Capacitor.Plugins.FirebaseAuthentication;
        if (!plugin || typeof plugin.signInWithGoogle !== "function") return null;

        return this.normalizujOdgovor(await plugin.signInWithGoogle());
    },

    pokusajCapacitorGoogle: async function() {
        const plugin = window.Capacitor
            && window.Capacitor.Plugins
            && window.Capacitor.Plugins.GoogleAuth;
        if (!plugin || typeof plugin.signIn !== "function") return null;

        return this.normalizujOdgovor(await plugin.signIn());
    },

    dohvatiDevIdentitet: function() {
        const host = window.location && window.location.hostname;
        const lokalno = window.location.protocol === "file:"
            || host === "localhost"
            || host === "127.0.0.1"
            || host === "";

        if (!lokalno) return null;

        const sacuvan = localStorage.getItem("zemljopis_dev_google_uid") || "dev-google-player";
        const uid = window.prompt("Unesi test Google UID za lokalni razvoj:", sacuvan);
        if (!uid) return null;

        const ociscen = uid.trim();
        localStorage.setItem("zemljopis_dev_google_uid", ociscen);
        return { googleUid: ociscen };
    },

    dohvatiGoogleIdentitet: async function() {
        const pokusaji = [
            () => this.pokusajPrilagodjeniAdapter(),
            () => this.pokusajCapacitorFirebase(),
            () => this.pokusajCapacitorGoogle()
        ];

        for (const pokusaj of pokusaji) {
            const identitet = await pokusaj();
            if (identitet) return identitet;
        }

        const devIdentitet = this.dohvatiDevIdentitet();
        if (devIdentitet) return devIdentitet;

        throw new Error("Google prijava nije dostupna na ovom uređaju.");
    },

    posaljiServeru: function(identitet) {
        return new Promise((resolve, reject) => {
            if (!Game.socket || !Game.socket.connected) {
                reject(new Error("Za povezivanje Google naloga potrebna je internet veza."));
                return;
            }

            Game.socket.timeout(15000).emit(
                "poveziGoogleNalog",
                {
                    ...identitet,
                    profilKljuc: PodesavanjaManager.postavke.profilKljuc,
                    napredak: typeof SinhronizacijaManager !== "undefined"
                        ? SinhronizacijaManager.prikupiLokalniNapredak()
                        : {}
                },
                (greska, odgovor) => {
                    if (greska) {
                        reject(new Error("Server se nije javio. Pokušaj ponovo."));
                        return;
                    }
                    resolve(odgovor || { uspeh: false, poruka: "Google nalog nije povezan." });
                }
            );
        });
    },

    posaljiPrijavuServeru: function(identitet) {
        return new Promise((resolve, reject) => {
            if (!Game.socket || !Game.socket.connected) {
                reject(new Error("Za Google prijavu potrebna je internet veza."));
                return;
            }

            Game.socket.timeout(15000).emit(
                "prijavaGoogleNaloga",
                {
                    ...identitet,
                    profilKljuc: PodesavanjaManager.postavke.profilKljuc
                },
                (greska, odgovor) => {
                    if (greska) {
                        reject(new Error("Server se nije javio. Pokušaj ponovo."));
                        return;
                    }
                    resolve(odgovor || { uspeh: false, poruka: "Google profil nije pronađen." });
                }
            );
        });
    },

    primeniProfil: function(odgovor, identitet) {
        const profil = odgovor && odgovor.profil;
        if (!profil || typeof PodesavanjaManager === "undefined") return;

        if (profil.nadimak) PodesavanjaManager.postavke.nadimak = profil.nadimak;
        if (profil.avatar) PodesavanjaManager.postavke.avatar = profil.avatar;
        if (profil.playerId) PodesavanjaManager.postavke.playerId = profil.playerId;
        PodesavanjaManager.postavke.profilTip = "google";
        PodesavanjaManager.postavke.googleUid = profil.googleUid || odgovor.googleUid || identitet.googleUid || null;
        PodesavanjaManager.postavke.profilZavrsen = true;
        PodesavanjaManager.snimiULokalnuMemoriju();
        PodesavanjaManager.primeniPostavkeGlobalno();
        PodesavanjaManager.azurirajProfilOpcije();

        if (typeof SinhronizacijaManager !== "undefined") {
            SinhronizacijaManager.obradiProfil(profil, { prisilno: true });
        }
        if (typeof Game !== "undefined") {
            Game.profilPrijavljen = true;
        }
    },

    poveziTrenutniProfil: async function() {
        if (this.povezivanjeUToku) return;
        if (typeof PodesavanjaManager === "undefined" || !PodesavanjaManager.zahtevajProfil()) return;

        this.povezivanjeUToku = true;
        if (typeof PodesavanjaManager.azurirajProfilOpcije === "function") {
            PodesavanjaManager.azurirajProfilOpcije();
        }

        try {
            const identitet = await this.dohvatiGoogleIdentitet();
            const odgovor = await this.posaljiServeru(identitet);

            if (!odgovor.uspeh) {
                throw new Error(odgovor.poruka || "Google nalog nije moguće povezati.");
            }

            this.primeniProfil(odgovor, identitet);
            if (typeof UIManager !== "undefined") {
                UIManager.prikaziObavestenje(
                    "Google nalog je povezan",
                    "Sav lokalni napredak, dukati, tokeni i kupovine iz Riznice sada su vezani za tvoj Google nalog.",
                    null,
                    "Odlično"
                );
            }
        } catch (error) {
            if (typeof UIManager !== "undefined") {
                UIManager.prikaziObavestenje(
                    "Google prijava",
                    error && error.message ? error.message : "Pokušaj ponovo malo kasnije.",
                    null,
                    "U redu"
                );
            } else {
                console.warn("Google prijava nije uspela.", error);
            }
        } finally {
            this.povezivanjeUToku = false;
            if (typeof PodesavanjaManager !== "undefined") {
                PodesavanjaManager.azurirajProfilOpcije();
            }
        }
    },

    prijaviPostojeciProfil: async function() {
        if (this.povezivanjeUToku) return;
        this.povezivanjeUToku = true;
        const dugmad = Array.from(document.querySelectorAll('.login-google-action'));
        const postaviDugmad = (zakljucano, html) => {
            dugmad.forEach(dugme => {
                dugme.disabled = zakljucano;
                dugme.innerHTML = html;
            });
        };
        if (dugmad.length) {
            postaviDugmad(true, '<i class="fa-solid fa-spinner fa-spin"></i><span>Prijavljivanje...</span>');
        }

        try {
            if (typeof PodesavanjaManager !== 'undefined') {
                await PodesavanjaManager.osigurajStabilniProfilKljuc();
            }
            const identitet = await this.dohvatiGoogleIdentitet();
            const odgovor = await this.posaljiPrijavuServeru(identitet);
            if (!odgovor.uspeh) {
                const poruka = odgovor.kod === 'GOOGLE_PROFIL_NIJE_PRONADJEN'
                    ? 'Ovaj Google nalog još nema Zemljopis profil. Napravi profil, pa ga zatim poveži sa Google nalogom u Podešavanjima.'
                    : (odgovor.poruka || 'Google prijava nije uspela.');
                throw new Error(poruka);
            }

            this.primeniProfil(odgovor, identitet);
            if (typeof UIManager !== 'undefined') {
                UIManager.prikaziObavestenje(
                    'Profil je vraćen',
                    'Nadimak, poeni i napredak uspešno su učitani sa Google naloga.',
                    () => UIManager.prikaziEkran('main-menu'),
                    'Nastavi'
                );
            }
        } catch (error) {
            if (typeof UIManager !== 'undefined') {
                UIManager.prikaziObavestenje(
                    'Google prijava',
                    error && error.message ? error.message : 'Pokušaj ponovo malo kasnije.',
                    null,
                    'U redu'
                );
            }
        } finally {
            this.povezivanjeUToku = false;
            if (dugmad.length) {
                postaviDugmad(false, '<i class="fa-brands fa-google"></i><span>Prijavi se preko Google</span>');
            }
        }
    }
};
