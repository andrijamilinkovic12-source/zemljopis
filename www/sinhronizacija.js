// sinhronizacija.js - Rezervna kopija napretka spremna za buduće povezivanje Google naloga

const SinhronizacijaManager = {
    verzijaFormata: 1,
    revizija: 0,
    playerId: null,
    spreman: false,
    obradaUToku: false,
    primenaUToku: false,
    slanjeNakonPrimene: false,
    tajmerSlanja: null,

    procitajJSON: function(kljuc, podrazumevano) {
        const vrednost = localStorage.getItem(kljuc);
        if (vrednost === null) return podrazumevano;

        try {
            return JSON.parse(vrednost);
        } catch (error) {
            console.warn(`Lokalni podatak ${kljuc} nije ispravan.`, error);
            return podrazumevano;
        }
    },

    prikupiLokalniNapredak: function() {
        const postavke = typeof PodesavanjaManager !== "undefined"
            ? PodesavanjaManager.postavke
            : {};

        return {
            verzija: this.verzijaFormata,
            podesavanja: {
                zvuk: postavke.zvuk !== false,
                tema: postavke.tema || "tamna",
                pismo: postavke.pismo || "latinica"
            },
            riznica: this.procitajJSON("zemljopis_riznica", null),
            trofeji: this.procitajJSON("zemljopis_trofeji", []),
            dnevniIzazov: this.procitajJSON("zemljopis_dnevni_izazov", null),
            tokeni: {
                stanje: Number(localStorage.getItem("zemljopis_tokeni_stanje") || 3),
                datum: localStorage.getItem("zemljopis_datum_tokena")
            },
            kvartal: this.procitajJSON("zemljopis_kvartal", {
                sezonskiPojmovi: 0,
                svaVremenaPojmovi: 0
            }),
            prijatelji: {
                lista: this.procitajJSON("zemljopis_prijatelji_detalji", []),
                zahtevi: this.procitajJSON("zemljopis_zahtevi", [])
            }
        };
    },

    obradiProfil: function(profil, opcije = {}) {
        if (!profil || !profil.playerId || this.obradaUToku) return;
        if (this.spreman && this.playerId === profil.playerId && !opcije.prisilno) return;

        this.obradaUToku = true;
        this.playerId = profil.playerId;
        this.revizija = profil.sinhronizacija && Number.isInteger(profil.sinhronizacija.revizija)
            ? profil.sinhronizacija.revizija
            : 0;

        if (profil.sinhronizacija && profil.sinhronizacija.imaPodatke) {
            this.primeniNapredak(profil.sinhronizacija.napredak || {});
            this.spreman = true;
            this.obradaUToku = false;
            if (this.slanjeNakonPrimene) {
                this.slanjeNakonPrimene = false;
                this.zakaziSlanje();
            }
            return;
        }

        this.posaljiOdmah(() => {
            this.spreman = true;
            this.obradaUToku = false;
        });
    },

    zakaziSlanje: function() {
        if (this.primenaUToku) {
            this.slanjeNakonPrimene = true;
            return;
        }
        if (!this.spreman) return;
        clearTimeout(this.tajmerSlanja);
        this.tajmerSlanja = setTimeout(() => this.posaljiOdmah(), 700);
    },

    posaljiOdmah: function(zavrseno) {
        if (
            typeof Game === "undefined"
            || !Game.socket
            || !Game.socket.connected
            || !this.playerId
        ) {
            if (typeof zavrseno === "function") zavrseno(false);
            return;
        }

        Game.socket.timeout(12000).emit(
            "sacuvajCloudNapredak",
            {
                revizija: this.revizija,
                napredak: this.prikupiLokalniNapredak()
            },
            (greska, odgovor) => {
                if (greska || !odgovor) {
                    console.warn("Sinhronizacija napretka nije uspela.", greska);
                    if (typeof zavrseno === "function") zavrseno(false);
                    return;
                }

                if (odgovor.kod === "SUKOB_REVIZIJE" && odgovor.sinhronizacija) {
                    this.revizija = odgovor.sinhronizacija.revizija || 0;
                    this.primeniNapredak(odgovor.sinhronizacija.napredak || {});
                    if (typeof zavrseno === "function") zavrseno(false);
                    return;
                }

                if (odgovor.uspeh && odgovor.sinhronizacija) {
                    this.revizija = odgovor.sinhronizacija.revizija || this.revizija;
                    if (odgovor.playerId) this.playerId = odgovor.playerId;
                }

                if (typeof zavrseno === "function") zavrseno(Boolean(odgovor.uspeh));
            }
        );
    },

    primeniNapredak: function(napredak) {
        if (!napredak || typeof napredak !== "object") return;
        this.primenaUToku = true;

        const upisiJSON = (kljuc, vrednost) => {
            if (vrednost !== null && typeof vrednost !== "undefined") {
                localStorage.setItem(kljuc, JSON.stringify(vrednost));
            }
        };

        if (napredak.podesavanja && typeof PodesavanjaManager !== "undefined") {
            const dozvoljenaPodesavanja = ["zvuk", "tema", "pismo"];
            dozvoljenaPodesavanja.forEach(polje => {
                if (Object.prototype.hasOwnProperty.call(napredak.podesavanja, polje)) {
                    PodesavanjaManager.postavke[polje] = napredak.podesavanja[polje];
                }
            });
            PodesavanjaManager.snimiULokalnuMemoriju();
            PodesavanjaManager.primeniPostavkeGlobalno();
        }

        upisiJSON("zemljopis_riznica", napredak.riznica);
        if (napredak.riznica && typeof RiznicaManager !== "undefined") {
            RiznicaManager.init();
            RiznicaManager.azurirajPrikazDukata();
        }

        upisiJSON("zemljopis_trofeji", napredak.trofeji);
        if (Array.isArray(napredak.trofeji) && typeof TrofejiManager !== "undefined") {
            TrofejiManager.init();
        }

        upisiJSON("zemljopis_dnevni_izazov", napredak.dnevniIzazov);
        if (napredak.dnevniIzazov && typeof DnevniIzazovManager !== "undefined") {
            DnevniIzazovManager.dnevniPodaci = napredak.dnevniIzazov;
        }

        if (napredak.tokeni) {
            if (napredak.tokeni.datum) {
                localStorage.setItem("zemljopis_datum_tokena", napredak.tokeni.datum);
            }
            if (typeof napredak.tokeni.stanje !== "undefined") {
                localStorage.setItem("zemljopis_tokeni_stanje", String(napredak.tokeni.stanje));
                if (typeof TokeniManager !== "undefined") {
                    TokeniManager.tokeni = TokeniManager.normalizujTokeni(napredak.tokeni.stanje);
                    TokeniManager.proveriDnevniReset();
                }
            }
        }

        upisiJSON("zemljopis_kvartal", napredak.kvartal);
        if (napredak.kvartal && typeof KvartalniNivoManager !== "undefined") {
            KvartalniNivoManager.statistika = napredak.kvartal;
            KvartalniNivoManager.azurirajBedzUMeniju();
        }

        if (napredak.prijatelji) {
            upisiJSON("zemljopis_prijatelji_detalji", napredak.prijatelji.lista || []);
            upisiJSON("zemljopis_zahtevi", napredak.prijatelji.zahtevi || []);
            if (typeof SobaPrijateljaManager !== "undefined") {
                SobaPrijateljaManager.prijatelji = napredak.prijatelji.lista || [];
                SobaPrijateljaManager.zahtevi = napredak.prijatelji.zahtevi || [];
            }
        }

        this.primenaUToku = false;
        if (this.slanjeNakonPrimene && this.spreman) {
            this.slanjeNakonPrimene = false;
            this.zakaziSlanje();
        }
    }
};
